import { ShippingLabel, ValidationResult, ExtractedOrder } from "../types";

// ================== HELPER FUNCTIONS ==================

function extractDeliveryParent(chunk: string): string {
  try {
    const logisticsCompanies = ['Ecom Express', 'Delhivery', 'DTDC', 'Blue Dart', 'Xpressbees', 'Shiprocket', 'Amazon Shipping', 'Ekart'];
    
    const codMatch = chunk.match(/COD:[^\n]+\n\s*([^\n]+)/i);
    if (codMatch) return codMatch[1].trim();

    for (const company of logisticsCompanies) {
      if (chunk.includes(company)) return company;
    }

    const destCodeMatch = chunk.match(/Destination Code\s*\n\s*([^\n]+)\n\s*([^\n]+)/i);
    return destCodeMatch?.[2]?.trim() || "Unknown";
  } catch (error) {
    return "Unknown";
  }
}

function extractPaymentMethod(chunk: string): string | undefined {
  const match = chunk.match(/(COD|Prepaid)\s*:/i);
  return match?.[1]?.toUpperCase();
}

function extractDeliveryType(chunk: string): string | undefined {
  const match = chunk.match(/\b(Pickup)\b/i);
  return match?.[1] || "Delivery";
}

function extractBillTo(chunk: string): string | undefined {
  return chunk.match(/BILL TO \/ SHIP TO([\s\S]*?)Sold by :/i)?.[1]
    ?.replace(/\n/g, " ").replace(/\s+/g, " ").replace(/, ,/g, ",").trim();
}

function extractSoldBy(chunk: string): string | undefined {
  return chunk.match(/Sold by :([\s\S]*?)GSTIN -/i)?.[1]
    ?.split("\n").map(l => l.trim()).filter(Boolean).join(", ")
    .replace(/\s+/g, " ").replace(/, ,/g, ",");
}

function processTaxInvoice(chunk: string): { lineItems: any[]; totalTax?: string; totalAmount?: string } {
  const result = { lineItems: [] as any[], totalTax: undefined as string | undefined, totalAmount: undefined as string | undefined };
  try {
    const taxInvoiceMatch = chunk.match(/TAX INVOICE\s+Original For Recipient([\s\S]*?)Tax is not payable/i);
    if (!taxInvoiceMatch) return result;

    const lines = taxInvoiceMatch[1].trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let i = lines.findIndex(l => l.replace(/\s+/g, "").toLowerCase().includes("descriptionhsnqty"));
    i = i === -1 ? 0 : i + 1;
    let tempDesc: string[] = [];

    while (i < lines.length) {
      const line = lines[i];
      if (/^Total\s+Rs\.(\d+\.\d+)/i.test(line)) {
        result.totalAmount = `Rs.${line.match(/^Total\s+Rs\.(\d+\.\d+)/i)?.[1]}`;
        break;
      }
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
      } else { tempDesc.push(line); i++; }
    }
    const totalLineMatch = chunk.match(/Total\s*Rs\.([\d.]+)Rs\.([\d.]+)/i);
    if (totalLineMatch) {
        result.totalTax = `Rs.${totalLineMatch[1]}`;
        if (!result.totalAmount) result.totalAmount = `Rs.${totalLineMatch[2]}`;
    }
  } catch (e) {}
  return result;
}

// ✅ UPDATED: Robust Product Extraction
// ✅ FIXED: Robust Product Extraction
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
    if (!prodBlockMatch) {
      console.log("      ⚠️ No Product Details section found");
      return products;
    }

    const prodText = prodBlockMatch[1].trim();
    console.log("      📦 Raw Product Text:", prodText.substring(0, 300));

    const lines = prodText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    console.log("      🔍 Product lines found:", lines.length);

    // Find header line
    const headerLineIndex = lines.findIndex(
      (line) =>
        /sku/i.test(line) &&
        /size/i.test(line) &&
        /qty/i.test(line) &&
        /color/i.test(line) &&
        /order no/i.test(line)
    );

    if (headerLineIndex === -1) {
      console.log("      ⚠️ Product table header not found");
      return products;
    }

    console.log(`      ✅ Header found at line ${headerLineIndex}: "${lines[headerLineIndex]}"`);

    // Collect SKU lines (lines between header and data line)
    const skuLines: string[] = [];
    let dataLineIndex = -1;

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      // Data line ends with order number pattern (digits_digits)
      if (/\d+_\d+\s*$/.test(line)) {
        dataLineIndex = i;
        break;
      }
      skuLines.push(line);
    }

    // ✅ SKU is from the collected lines BEFORE the data line
    const skuFromLines = skuLines.join(' ').trim();
    console.log("      📝 SKU from separate lines:", skuFromLines);

    if (dataLineIndex === -1) {
      console.log("      ❌ No data line with order number pattern found");
      return products;
    }

    let dataLine = lines[dataLineIndex];
    console.log("      📋 Data line:", dataLine);

    // ✅ Extract OrderNo (always at the end: digits_digits)
    const orderNoMatch = dataLine.match(/(\d+_\d+)\s*$/);
    if (!orderNoMatch) {
      console.log("      ❌ Could not find order number pattern");
      return products;
    }

    const orderNo = orderNoMatch[1];
    let remaining = dataLine.substring(0, dataLine.lastIndexOf(orderNo)).trim();

    console.log(`      📋 OrderNo: ${orderNo}`);
    console.log(`      📋 Remaining after OrderNo removed: "${remaining}"`);

    let sku = "";
    let size = "";
    let quantity = 1;
    let color = "";

    // ✅ STRATEGY: Parse remaining string which contains Size, Qty, Color
    // Format is typically: [Size][Qty][Color] or [SKU][Size][Qty][Color]
    
    // If we have SKU from separate lines, use it
    if (skuFromLines) {
      sku = skuFromLines;
      
      // Now parse remaining for Size, Qty, Color
      // Pattern: Size (text/number) + Qty (single digit) + Color (text)
      // Example: "OK1OK" -> Size=OK, Qty=1, Color=OK
      // Example: "Free Size2Red" -> Size=Free Size, Qty=2, Color=Red
      
      const sizeQtyColorMatch = remaining.match(/^(.+?)(\d)([A-Za-z].*)$/);
      
      if (sizeQtyColorMatch) {
        size = sizeQtyColorMatch[1].trim();
        quantity = parseInt(sizeQtyColorMatch[2], 10);
        color = sizeQtyColorMatch[3].trim();
        console.log(`      ✅ Parsed: Size="${size}", Qty=${quantity}, Color="${color}"`);
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
            console.log(`      ✅ Pattern matched: Size="${size}", Qty=${quantity}, Color="${color}"`);
            break;
          }
        }
        
        // If still no match, assume format is just numbers
        if (!size) {
          console.log(`      ⚠️ Could not parse size/qty/color from: "${remaining}"`);
          // Last resort: take first part as size, find digit for qty
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
      // ✅ No separate SKU lines - SKU is embedded in data line
      // Format: [SKU][Size][Qty][Color][OrderNo]
      console.log("      ⚠️ No separate SKU lines, parsing from data line");
      
      // Try to find where SKU ends and Size begins
      // Look for common size patterns from the end
      const sizePatterns = [
        { regex: /(Free\s*Size)(\d)([A-Za-z]+)$/, sizeGroup: 1 },
        { regex: /(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL)(\d)([A-Za-z]+)$/i, sizeGroup: 1 },
        { regex: /([A-Z]{2})(\d)([A-Z]{2})$/i, sizeGroup: 1 },  // Like OK1OK
      ];
      
      for (const { regex, sizeGroup } of sizePatterns) {
        const match = remaining.match(regex);
        if (match) {
          // Everything before the match is SKU
          const matchStart = remaining.lastIndexOf(match[0]);
          sku = remaining.substring(0, matchStart).trim();
          size = match[1].trim();
          quantity = parseInt(match[2], 10);
          color = match[3].trim();
          console.log(`      ✅ Extracted from embedded: SKU="${sku}", Size="${size}", Qty=${quantity}, Color="${color}"`);
          break;
        }
      }
      
      // Fallback if no pattern matched
      if (!sku) {
        // Assume format: SKU + 2-char size + 1 digit qty + remaining color
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

    // Clean up values
    sku = sku.replace(/\s+/g, ' ').trim();
    size = size.replace(/\s+/g, ' ').trim();
    color = color.replace(/\s+/g, ' ').trim();

    console.log(`\n      ════════════════════════════════════════`);
    console.log(`      ✅ FINAL EXTRACTED:`);
    console.log(`         SKU:      "${sku}"`);
    console.log(`         Size:     "${size}"`);
    console.log(`         Qty:      ${quantity}`);
    console.log(`         Color:    "${color}"`);
    console.log(`         OrderNo:  "${orderNo}"`);
    console.log(`      ════════════════════════════════════════\n`);

    if (!sku || sku.length === 0) {
      console.log("      ❌ SKU extraction failed - no valid SKU found");
      return products;
    }

    products.push({
      sku: sku,
      size: size,
      quantity: quantity,
      color: color,
      orderNo: orderNo,
    });

  } catch (error) {
    console.error("      ❌ Product extraction failed:", error);
  }

  return products;
}

// ✅ KEY FIX: Updated Regex for AWB to support 17-25 digits
function extractAWBNumber(chunk: string): string | undefined {
    // Pattern 1: Explicit "AWB" or "Tracking ID" label
    const explicitMatch = chunk.match(/(?:AWB|Tracking)\s*(?:No|ID)?\s*[:#]?\s*([A-Z0-9]{8,25})/i);
    if (explicitMatch && explicitMatch[1]) {
        console.log(`      🔍 Found Explicit AWB: ${explicitMatch[1]}`);
        return explicitMatch[1].trim();
    }

    // Pattern 2: Ecom Express / Delhivery styles (starts with letters or specific number patterns)
    const logisticsMatch = chunk.match(/(?:^|\s)([A-Z]{2}\d{9,12})(?:\s|$)/m);
    if (logisticsMatch && logisticsMatch[1]) {
        console.log(`      🔍 Found Carrier AWB: ${logisticsMatch[1]}`);
        return logisticsMatch[1].trim();
    }

    // Pattern 3: Standalone Barcode (Numeric, 10 to 25 digits)
    // ⚠️ Changed {10,15} to {10,25} to catch your 17-digit barcode
    const barcodeMatch = chunk.match(/(?:^|\n)\s*(\d{10,25})\s*(?:\n|$)/m);
    if (barcodeMatch && barcodeMatch[1]) {
        console.log(`      🔍 Found Barcode AWB: ${barcodeMatch[1]}`);
        return barcodeMatch[1].trim();
    }

    return undefined;
}

// ================== MAIN FUNCTION ==================

export function extractShippingLabels(pdfText: string): ExtractedOrder[] {
  const orders: ExtractedOrder[] = [];
  const invoiceChunks = pdfText.split(/(?=Customer Address)/gi);
  
  console.log(`📄 Found ${invoiceChunks.length} potential invoice chunks`);

  invoiceChunks.forEach((chunk, index) => {
    try {
      if (!chunk || chunk.length < 100) return;
      console.log(`\n📦 Processing Chunk ${index + 1}/${invoiceChunks.length}`);

      const { lineItems, totalTax, totalAmount } = processTaxInvoice(chunk);
      
      const returnToLines = chunk.match(/If undelivered, return to:\s*([\s\S]*?)(COD:|PREPAID:|Delhivery|Pickup|Destination Code)/i)?.[1]
          ?.split(/\r?\n/).map(l => l.trim()).filter(Boolean) || [];
          
      const customerLines = chunk.match(/Customer Address\s*([\s\S]*?)If undelivered, return to:/i)?.[1]
          ?.split(/\r?\n/).map(l => l.trim()).filter(Boolean) || [];
          
      const products = extractProducts(chunk);

      if (customerLines.length === 0 && products.length === 0) return;
      
      const awb = extractAWBNumber(chunk); // Extract AWB here

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

      console.log(`   🔎 EXTRACTED: Order="${order.purchaseOrderNo || 'N/A'}" | AWB="${awb || 'N/A'}"`);
      orders.push(order);
    } catch (e) { console.error(e); }
  });
  return orders;
}

export function validateLabel(label: ShippingLabel): ValidationResult {
  const errors: string[] = [];
  if (!label.sku) errors.push("SKU not found");
  if (!label.orderId) errors.push("Order ID not found");
  if (!label.quantity || label.quantity < 1) errors.push("Invalid quantity");
  return { isValid: errors.length === 0, errors: errors };
}