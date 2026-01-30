import { ShippingLabel, ValidationResult, ExtractedOrder } from "../types";

// ================== HELPER FUNCTIONS ==================

/**
 * Identifies the logistics partner based on specific keywords or COD labels found in the text chunk.
 * Scans for major Indian logistics companies (Delhivery, Blue Dart, etc.).
 * @param chunk - The text segment of the shipping label.
 * @returns The name of the delivery partner or "Unknown".
 */
function extractDeliveryParent(chunk: string): string {
  try {
    // 1. Split text into clean, non-empty lines
    const lines = chunk.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // ---------------------------------------------------------
    // STRATEGY 1: The "Pickup" Anchor (Most Reliable)
    // The carrier is almost always the line strictly ABOVE "Pickup"
    // ---------------------------------------------------------
    const pickupIndex = lines.findIndex(l => l.toLowerCase() === 'pickup');

    if (pickupIndex > 0) {
      const candidate = lines[pickupIndex - 1];
      
      // Sanity Check: Ensure the line above isn't a Payment instruction
      // (Just in case the format implies: COD -> Pickup)
      if (!/^(COD|Prepaid|Cash|Amount|Payable)/i.test(candidate)) {
        return candidate;
      }
    }

    // ---------------------------------------------------------
    // STRATEGY 2: The "Payment" Anchor (Fallback)
    // The carrier is often the line strictly BELOW "COD/Prepaid"
    // ---------------------------------------------------------
    const paymentIndex = lines.findIndex(l => /^(COD|Prepaid):/i.test(l));

    if (paymentIndex !== -1 && paymentIndex + 1 < lines.length) {
      const candidate = lines[paymentIndex + 1];
      
      // Ensure we didn't accidentally grab the "Pickup" line itself
      if (candidate.toLowerCase() !== 'pickup') {
        return candidate;
      }
    }

    // ---------------------------------------------------------
    // STRATEGY 3: Destination Code Fallback
    // ---------------------------------------------------------
    const destCodeMatch = chunk.match(/Destination Code\s*\n\s*([^\n]+)\n\s*([^\n]+)/i);
    return destCodeMatch?.[2]?.trim() || "Unknown";

  } catch (error) {
    return "Unknown";
  }
}

/**
 * Extracts the payment method (COD or Prepaid).
 */
function extractPaymentMethod(chunk: string): string | undefined {
  const match = chunk.match(/(COD|Prepaid)\s*:/i);
  return match?.[1]?.toUpperCase();
}

/**
 * Determines if the order is for Pickup or standard Delivery.
 */
function extractDeliveryType(chunk: string): string | undefined {
  const match = chunk.match(/\b(Pickup)\b/i);
  return match?.[1] || "Delivery";
}

/**
 * Extracts the 'Bill To' address details.
 */
function extractBillTo(chunk: string): string | undefined {
  return chunk.match(/BILL TO \/ SHIP TO([\s\S]*?)Sold by :/i)?.[1]
    ?.replace(/\n/g, " ").replace(/\s+/g, " ").replace(/, ,/g, ",").trim();
}

/**
 * Extracts the 'Sold By' vendor details.
 */
function extractSoldBy(chunk: string): string | undefined {
  return chunk.match(/Sold by :([\s\S]*?)GSTIN -/i)?.[1]
    ?.split("\n").map(l => l.trim()).filter(Boolean).join(", ")
    .replace(/\s+/g, " ").replace(/, ,/g, ",");
}

/**
 * Parses the Tax Invoice section to extract line items and financial totals.
 * Handles tabular data where columns may be misaligned in the raw text extraction.
 * @param chunk - The text segment containing the invoice table.
 */
function processTaxInvoice(chunk: string): { lineItems: any[]; totalTax?: string; totalAmount?: string } {
  const result = { lineItems: [] as any[], totalTax: undefined as string | undefined, totalAmount: undefined as string | undefined };
  try {
    const taxInvoiceMatch = chunk.match(/TAX INVOICE\s+Original For Recipient([\s\S]*?)Tax is not payable/i);
    if (!taxInvoiceMatch) return result;

    const lines = taxInvoiceMatch[1].trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    // Locate the header row roughly based on concatenated column names
    let i = lines.findIndex(l => l.replace(/\s+/g, "").toLowerCase().includes("descriptionhsnqty"));
    i = i === -1 ? 0 : i + 1;
    let tempDesc: string[] = [];

    while (i < lines.length) {
      const line = lines[i];
      
      // Stop if we hit the Total row
      if (/^Total\s+Rs\.(\d+\.\d+)/i.test(line)) {
        result.totalAmount = `Rs.${line.match(/^Total\s+Rs\.(\d+\.\d+)/i)?.[1]}`;
        break;
      }

      // Regex to identify a data row with pricing
      const m = line.match(/(\d{6})\s*(\d+|NA)?\s*Rs\.(\d+\.\d+)\s*Rs\.(\d+\.\d+)\s*Rs\.(\d+\.\d+)/);
      if (m) {
        result.lineItems.push({
          description: tempDesc.join(" ").trim(),
          hsn: m[1], quantity: m[2] || '', grossAmount: `Rs.${m[3]}`,
          discount: `Rs.${m[4]}`, taxableValue: `Rs.${m[5]}`,
          taxes: lines[i + 2]?.match(/Rs\.(\d+\.\d+)/)?.[0] || '',
          total: lines[i + 3]?.match(/Rs\.(\d+\.\d+)/)?.[0] || ''
        });
        tempDesc = []; i += 4;
      } else { 
        tempDesc.push(line); i++; 
      }
    }
    
    // Extract totals from summary lines
    const totalLineMatch = chunk.match(/Total\s*Rs\.([\d.]+)Rs\.([\d.]+)/i);
    if (totalLineMatch) {
        result.totalTax = `Rs.${totalLineMatch[1]}`;
        if (!result.totalAmount) result.totalAmount = `Rs.${totalLineMatch[2]}`;
    }
  } catch (e) {}
  return result;
}

/**
 * Robustly parses the "Product Details" section.
 * Supports multiple formats:
 * 1. SKU on separate lines above the data line.
 * 2. SKU embedded within the data line.
 * 3. Size/Color/Qty parsing based on pattern matching.
 */
function extractProducts(chunk: string): Array<{
  sku: string;
  orderNo: string;
  quantity: number;
  size: string;
  color: string;
}> {
  const products: Array<{
    sku: string;
    orderNo: string;
    quantity: number;
    size: string;
    color: string;
  }> = [];

  try {
    const prodBlockMatch = chunk.match(
      /Product Details\s*([\s\S]*?)(?=TAX INVOICE|$)/i
    );
    if (!prodBlockMatch) return products;

    const prodText = prodBlockMatch[1].trim();
    const lines = prodText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // Find header line index
    const headerLineIndex = lines.findIndex(
      (line) =>
        /sku/i.test(line) &&
        /size/i.test(line) &&
        /qty/i.test(line) &&
        /color/i.test(line) &&
        /order no/i.test(line)
    );

    if (headerLineIndex === -1) return products;

    // Collect SKU lines (lines between header and the data line containing the order number)
    const skuLines: string[] = [];
    let dataLineIndex = -1;

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      // Identify data line by looking for the Order Number pattern (digits_digits) at the end
      if (/\d+_\d+\s*$/.test(line)) {
        dataLineIndex = i;
        break;
      }
      skuLines.push(line);
    }

    const skuFromLines = skuLines.join(' ').trim();

    if (dataLineIndex === -1) return products;

    let dataLine = lines[dataLineIndex];

    // Extract OrderNo (always at the end: digits_digits)
    const orderNoMatch = dataLine.match(/(\d+_\d+)\s*$/);
    if (!orderNoMatch) return products;

    const orderNo = orderNoMatch[1];
    let remaining = dataLine.substring(0, dataLine.lastIndexOf(orderNo)).trim();

    let sku = "";
    let size = "";
    let quantity = 1;
    let color = "";

    // Strategy: Parse remaining string which contains Size, Qty, Color
    if (skuFromLines) {
      sku = skuFromLines;
      
      // Attempt to parse Size, Qty, Color from the remaining string
      const sizeQtyColorMatch = remaining.match(/^(.+?)(\d)([A-Za-z].*)$/);
      
      if (sizeQtyColorMatch) {
        size = sizeQtyColorMatch[1].trim();
        quantity = parseInt(sizeQtyColorMatch[2], 10);
        color = sizeQtyColorMatch[3].trim();
      } else {
        // Fallback: Try to split by common size patterns
        const sizePatterns = [
          /^(Free\s*Size|One\s*Size)(\d)(.*)$/i,
          /^(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)(\d)(.*)$/i,
          /^(\d{2,3})(\d)(.*)$/,  // Numeric size like 32, 34
          /^([A-Z]{1,4})(\d)(.*)$/i,  // Short codes like OK, SM
        ];
        
        for (const pattern of sizePatterns) {
          const match = remaining.match(pattern);
          if (match) {
            size = match[1].trim();
            quantity = parseInt(match[2], 10);
            color = match[3].trim();
            break;
          }
        }
        
        // Final fallback for format inference
        if (!size) {
          const qtyMatch = remaining.match(/(\d)/);
          if (qtyMatch) {
            const qtyIndex = remaining.indexOf(qtyMatch[1]);
            size = remaining.substring(0, qtyIndex).trim() || "N/A";
            quantity = parseInt(qtyMatch[1], 10);
            color = remaining.substring(qtyIndex + 1).trim() || "N/A";
          }
        }
      }
    } else {
      // Scenario: SKU is embedded in the data line (no separate SKU lines)
      const sizePatterns = [
        { regex: /(Free\s*Size)(\d)([A-Za-z]+)$/, sizeGroup: 1 },
        { regex: /(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)(\d)([A-Za-z]+)$/i, sizeGroup: 1 },
        { regex: /([A-Z]{2})(\d)([A-Z]{2})$/i, sizeGroup: 1 }, 
      ];
      
      let matched = false;
      for (const { regex, sizeGroup } of sizePatterns) {
        const match = remaining.match(regex);
        if (match) {
          const matchStart = remaining.lastIndexOf(match[0]);
          sku = remaining.substring(0, matchStart).trim();
          size = match[1].trim();
          quantity = parseInt(match[2], 10);
          color = match[3].trim();
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Fallback assumption: SKU + 2-char size + 1 digit qty + remaining color
        const fallbackMatch = remaining.match(/^(.+?)([A-Z]{2})(\d)(.+)$/i);
        if (fallbackMatch) {
          sku = fallbackMatch[1].trim();
          size = fallbackMatch[2].trim();
          quantity = parseInt(fallbackMatch[3], 10);
          color = fallbackMatch[4].trim();
        } else {
          sku = remaining;
          size = "N/A";
          quantity = 1;
          color = "N/A";
        }
      }
    }

    // Sanitize results
    sku = sku.replace(/\s+/g, ' ').trim();
    size = size.replace(/\s+/g, ' ').trim();
    color = color.replace(/\s+/g, ' ').trim();

    if (sku && sku.length > 0) {
      products.push({
        sku,
        size,
        quantity,
        color,
        orderNo,
      });
    }

  } catch (error) {
    // Error suppressed for cleaner output, validation will handle missing data
  }

  return products;
}

/**
 * Extracts AWB (Air Waybill) or Tracking Numbers.
 * Supports:
 * 1. Explicit labels (AWB/Tracking ID).
 * 2. Carrier specific formats (Ecom Express/Delhivery).
 * 3. Standalone numeric barcodes (10-25 digits).
 */
function extractAWBNumber(chunk: string): string | undefined {
  // Pattern 1: Explicit "AWB" or "Tracking ID" label
  const explicitMatch = chunk.match(/(?:AWB|Tracking)\s*(?:No|ID)?\s*[:#]?\s*([A-Z0-9]{8,25})/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].trim();
  }

  // Pattern 2: Carrier specific (starts with letters or specific number patterns)
  const logisticsMatch = chunk.match(/(?:^|\s)([A-Z]{2}\d{9,12})(?:\s|$)/m);
  if (logisticsMatch && logisticsMatch[1]) {
    return logisticsMatch[1].trim();
  }

  // Pattern 3: Standalone Barcode (Numeric, 10 to 25 digits)
  const barcodeMatch = chunk.match(/(?:^|\n)\s*(\d{10,25})\s*(?:\n|$)/m);
  if (barcodeMatch && barcodeMatch[1]) {
    return barcodeMatch[1].trim();
  }

  return undefined;
}

// ================== MAIN FUNCTION ==================

/**
 * Main entry point for processing the PDF text.
 * Splits text into customer chunks and extracts order details for each.
 * @param pdfText - Raw string content of the PDF.
 * @returns Array of ExtractedOrder objects.
 */
export function extractShippingLabels(pdfText: string): ExtractedOrder[] {
  const orders: ExtractedOrder[] = [];
  const invoiceChunks = pdfText.split(/(?=Customer Address)/gi);
 // console.log(invoiceChunks);
  invoiceChunks.forEach((chunk) => {
    try {
      if (!chunk || chunk.length < 100) return;

      const { lineItems, totalTax, totalAmount } = processTaxInvoice(chunk);
      
      const returnToLines = chunk.match(/If undelivered, return to:\s*([\s\S]*?)(COD:|PREPAID:|Delhivery|Pickup|Destination Code)/i)?.[1]
          ?.split(/\r?\n/).map(l => l.trim()).filter(Boolean) || [];
          
      const customerLines = chunk.match(/Customer Address\s*([\s\S]*?)If undelivered, return to:/i)?.[1]
          ?.split(/\r?\n/).map(l => l.trim()).filter(Boolean) || [];
          
      const products = extractProducts(chunk);

      if (customerLines.length === 0 && products.length === 0) return;
      
      const awb = extractAWBNumber(chunk);

      const order: ExtractedOrder = {
        customer: { lines: customerLines },
        returnTo: { brandName: returnToLines[0] || "", lines: returnToLines },
        soldBy: extractSoldBy(chunk),
        billTo: extractBillTo(chunk),
        returnCodes: chunk.match(/Return Code[\s\S]*?([\d,]+)/i)?.[1]?.split(",")?.map(c => c.trim()) || [],
        barcode: chunk.match(/Return Code[\s\S]*?\n\s*([0-9]{10,})/i)?.[1]?.trim(),
        products: products,
        purchaseOrderNo: chunk.match(/Purchase Order No\.[\r\n]+(\S+)/i)?.[1]?.trim() || products[0]?.orderNo,
        invoiceNo: chunk.match(/Invoice No\.[\r\n]+(\S+)/i)?.[1]?.trim(),
        orderDate: chunk.match(/Order Date[\r\n]+(\d{2}\.\d{2}\.\d{4})/i)?.[1],
        invoiceDate: chunk.match(/Invoice Date[\r\n]+(\d{2}\.\d{2}\.\d{4})/i)?.[1],
        lineItems,
        invoiceTotals: { totalTax, totalAmount },
        deliveryPartner: extractDeliveryParent(chunk),
        paymentMethod: extractPaymentMethod(chunk),
        deliveryType: extractDeliveryType(chunk),
        awbNumber: awb
      };

      orders.push(order);
    } catch (e) {
    }
  });

  
  return orders;
}

/**
 * Validates the extracted label data for critical missing fields.
 */
export function validateLabel(label: ShippingLabel): ValidationResult {
  const errors: string[] = [];
  if (!label.sku) errors.push("SKU not found");
  if (!label.orderId) errors.push("Order ID not found");
  if (!label.quantity || label.quantity < 1) errors.push("Invalid quantity");
  return { isValid: errors.length === 0, errors: errors };
}