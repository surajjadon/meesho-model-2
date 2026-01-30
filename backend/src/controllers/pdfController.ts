import { Request, Response } from 'express';
import { parsePDF } from '../services/pdfParser';
import { extractShippingLabels } from '../services/extractData';
import ReturnOrder from '../models/returnOrder.model'; 
import LabelData from '../models/labelData.model'; 
import { OrderData } from '../models/OrderData.model';
import { InventoryItem } from '../models/inventoryItem.model'; 
import { SkuMapping } from '../models/skuMapping.model'; 
import ProcessingHistory from '../models/processingHistory.model';
import { StockHistory } from '../models/stockHistory.model';
import mongoose from 'mongoose';
import { logAction } from '../utils/logger'; 

// Helper function to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const parsePDFController = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file provided' });
      return;
    }

    // 1. Initialize GSTIN from request (Force String for safety)
    let targetGstin = String(req.body.gstin || '');
    
    // 2. Parse PDF
    const { text } = await parsePDF(req.file.buffer);
console.log(text);
    // 3. 🔍 SMART DETECT: Scan PDF for GSTIN
    const gstinRegex = /\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/g;
    const foundGstins = text.match(gstinRegex);

    if (foundGstins && foundGstins.length > 0) {
        const extractedGstin = foundGstins[0]; 
        if (extractedGstin !== targetGstin) {
            targetGstin = extractedGstin;
        }
    }
    
    // 4. Extract Orders from PDF
    const extractedOrders = extractShippingLabels(text);

    // Stats tracking
    let createdCount = 0;
    let skippedCount = 0;
    let labelDataSaved = 0;
    let inventoryDeductedCount = 0;

    const details: any[] = [];
    const unmappedSkus = new Set<string>();
    
    // Accumulator for inventory updates (to batch at the end)
    const inventoryUpdates = new Map<string, { 
      item: any; 
      deduction: number; 
      orderIds: string[] 
    }>();

    // ============================================================
    // ✅ NEW: Packaging Summary Accumulator
    // Structure: { "10-10-2023": { "Amazon": 5, "Flipkart": 2 } }
    // ============================================================
    const packagingSummary: Record<string, Record<string, number>> = {};

    // ==================== PROCESS EACH ORDER ====================
    for (const order of extractedOrders) {
      
      const awbNumber = order.awbNumber;
      const rawOrderNo = order.purchaseOrderNo || order.products[0]?.orderNo || order.invoiceNo;
      
      if (!rawOrderNo) {
        skippedCount++;
        details.push({
          orderId: 'Unknown',
          sku: order.products[0]?.sku || 'Unknown',
          quantity: order.products[0]?.quantity || 0,
          awb: awbNumber || 'Missing',
          status: 'skipped',
          reason: 'Missing order number',
          customerName: order.customer?.lines[0] || 'Unknown'
        });
        continue;
      }

      // -------------------------------------------------------------
      // ✅ NEW: Aggregate Data for Packaging Team View
      // We count this BEFORE checking duplicates so you know exactly 
      // what was inside this specific PDF file.
      // -------------------------------------------------------------
      const orderDateKey = order.orderDate || "Unknown Date"; 
      const partnerKey = order.deliveryPartner || "Unknown Partner";

      // Initialize date object if missing
      if (!packagingSummary[orderDateKey]) {
        packagingSummary[orderDateKey] = {};
      }
      // Increment count for this Partner on this Date
      packagingSummary[orderDateKey][partnerKey] = (packagingSummary[orderDateKey][partnerKey] || 0) + 1;
      // -------------------------------------------------------------


      // Build order ID variations for duplicate checking
      const orderVariations = [rawOrderNo];
      if (rawOrderNo.includes('_')) {
        orderVariations.push(rawOrderNo.split('_')[0]);
      } else {
        orderVariations.push(`${rawOrderNo}_1`);
      }

      // ==================== CHECK FOR DUPLICATE ORDER ====================
      const existingOrder = await OrderData.findOne({
        gstin: targetGstin,
        $or: [
          { purchaseOrderNo: { $in: orderVariations } },
          { invoiceNo: { $in: orderVariations } },
          { 'products.orderNo': { $in: orderVariations } }
        ]
      }).session(session);

      if (existingOrder) {
        skippedCount++;
        details.push({
          orderId: rawOrderNo,
          sku: order.products[0]?.sku || 'Unknown',
          quantity: order.products[0]?.quantity || 0,
          awb: awbNumber || 'N/A',
          status: 'skipped',
          reason: 'Duplicate order',
          customerName: order.customer?.lines[0] || 'Unknown'
        });
        continue;
      }

      // ==================== PROCESS PRODUCTS & CHECK MAPPINGS ====================
      let orderCanDeductInventory = true;
      const productDeductions: Array<{
        sku: string;
        quantity: number;
        targets: Array<{ inventoryId: string; qtyPerUnit: number }>;
      }> = [];

      for (const product of order.products) {
        // Clean SKU
        const cleanSku = (product.sku || 'Unknown').trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        const orderQty = product.quantity || 1;

        if (cleanSku === 'Unknown') {
          orderCanDeductInventory = false;
          continue;
        }

        const escapedSku = escapeRegex(cleanSku);

        // Check 1: SKU Mapping (for combo/bundle products)
        const skuMapping = await SkuMapping.findOne({
          gstin: targetGstin,
          sku: { $regex: new RegExp(`^${escapedSku}$`, 'i') }
        }).session(session);

        // Check 2: Direct Inventory Match
        const directInventory = await InventoryItem.findOne({
          gstin: targetGstin,
          $or: [
            { sku: { $regex: new RegExp(`^${escapedSku}$`, 'i') } },
            { title: { $regex: new RegExp(`^${escapedSku}$`, 'i') } }
          ]
        }).session(session);

        if (skuMapping && skuMapping.mappedProducts && skuMapping.mappedProducts.length > 0) {
          // ✅ Found SKU Mapping (combo product)
          productDeductions.push({
            sku: cleanSku,
            quantity: orderQty,
            targets: skuMapping.mappedProducts.map(mp => ({
              inventoryId: mp.inventoryItem.toString(),
              qtyPerUnit: mp.quantity
            }))
          });

        } else if (directInventory) {
          // ✅ Found Direct Inventory Match
          const inventoryId = (directInventory._id as mongoose.Types.ObjectId).toString();
          
          productDeductions.push({
            sku: cleanSku,
            quantity: orderQty,
            targets: [{ inventoryId, qtyPerUnit: 1 }]
          });

        } else {
          // ❌ SKU is UNMAPPED
          unmappedSkus.add(cleanSku);
          orderCanDeductInventory = false;
        }
      }

      // ==================== SAVE ORDER DATA ====================
      try {
        const newOrder = await OrderData.create([{
          gstin: targetGstin,
          customer: { lines: order.customer?.lines || [] },
          returnTo: order.returnTo,
          soldBy: order.soldBy,
          billTo: order.billTo,
          returnCodes: order.returnCodes || [],
          barcode: order.barcode,
          products: order.products.map(p => ({
            sku: (p.sku || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, ''),
            size: p.size,
            quantity: p.quantity || 1,
            color: p.color,
            orderNo: p.orderNo
          })),
          purchaseOrderNo: rawOrderNo,
          invoiceNo: order.invoiceNo,
          orderDate: order.orderDate,
          invoiceDate: order.invoiceDate,
          lineItems: order.lineItems || [],
          invoiceTotals: order.invoiceTotals,
          deliveryPartner: order.deliveryPartner || 'Unknown',
          paymentMethod: order.paymentMethod,
          deliveryType: order.deliveryType,
          // ✅ Mark as processed ONLY if we can deduct inventory
          inventoryProcessed: orderCanDeductInventory
        }], { session });

        createdCount++;

        // ==================== ACCUMULATE INVENTORY DEDUCTIONS ====================
        if (orderCanDeductInventory && productDeductions.length > 0) {
          for (const pd of productDeductions) {
            for (const target of pd.targets) {
              const totalDeduction = target.qtyPerUnit * pd.quantity;

              if (!inventoryUpdates.has(target.inventoryId)) {
                const itemDoc = await InventoryItem.findById(target.inventoryId).session(session);
                if (itemDoc) {
                  inventoryUpdates.set(target.inventoryId, {
                    item: itemDoc,
                    deduction: 0,
                    orderIds: []
                  });
                }
              }

              const entry = inventoryUpdates.get(target.inventoryId);
              if (entry) {
                entry.deduction += totalDeduction;
                if (!entry.orderIds.includes(rawOrderNo)) {
                  entry.orderIds.push(rawOrderNo);
                }
              }
            }
          }
          inventoryDeductedCount++;
        }

        // ==================== SAVE LABEL DATA ====================
        try {
          await LabelData.findOneAndUpdate(
            { businessGstin: targetGstin, orderNo: rawOrderNo },
            {
              $set: {
                businessGstin: targetGstin,
                orderNo: rawOrderNo,
                awbNumber: awbNumber || '',
                sku: order.products[0]?.sku || 'Unknown',
                deliveryPartner: order.deliveryPartner || '',
                isMapped: orderCanDeductInventory
              }
            },
            { upsert: true, new: true, session }
          );
          labelDataSaved++;
        } catch (labelErr) {
          // Label save error suppressed
        }

        // ==================== SAVE RETURN ORDER (for backward compatibility) ====================
        const existingReturn = await ReturnOrder.findOne({
          businessGstin: targetGstin,
          subOrderNo: { $in: orderVariations }
        }).session(session);

        if (!existingReturn) {
          await ReturnOrder.create([{
            businessGstin: targetGstin,
            subOrderNo: rawOrderNo,
            awbNumber: awbNumber || '',
            orderDate: order.orderDate ? new Date(order.orderDate.split('.').reverse().join('-')) : new Date(),
            productName: order.products[0]?.sku || 'Unknown',
            supplierSku: order.products[0]?.sku || 'Unknown',
            liveOrderStatus: "Pending",
            returnType: "CustomerReturn",
            receivedStatus: "Pending"
          }], { session });
        } else if (awbNumber && existingReturn.awbNumber !== awbNumber) {
          existingReturn.awbNumber = awbNumber;
          await existingReturn.save({ session });
        }

        details.push({
          orderId: rawOrderNo,
          sku: order.products.map(p => p.sku).join(', ') || 'Unknown',
          quantity: order.products.reduce((sum, p) => sum + (p.quantity || 1), 0),
          awb: awbNumber || 'N/A',
          status: 'saved',
          inventoryDeducted: orderCanDeductInventory,
          customerName: order.customer?.lines[0] || 'Unknown'
        });

      } catch (orderError: any) {
        details.push({
          orderId: rawOrderNo,
          sku: order.products[0]?.sku || 'Unknown',
          quantity: order.products[0]?.quantity || 0,
          awb: awbNumber || 'N/A',
          status: 'error',
          reason: orderError.message,
          customerName: order.customer?.lines[0] || 'Unknown'
        });
      }
    }

    // ==================== APPLY ALL INVENTORY DEDUCTIONS ====================
    
    for (const [itemId, { item, deduction, orderIds }] of inventoryUpdates.entries()) {
      const previousStock = item.stock || 0;
      const newStock = Math.max(0, previousStock - deduction); // Prevent negative stock

      await InventoryItem.findByIdAndUpdate(
        itemId,
        { $set: { stock: newStock } },
        { session }
      );

      // Create stock history record
      await StockHistory.create([{
        gstin: targetGstin,
        inventoryItem: item._id,
        change: -deduction,
        previousStock,
        newStock,
        reason: "Order Fulfillment",
        notes: `Auto-deducted from PDF: ${req.file?.originalname || 'Unknown'}. Orders: ${orderIds.slice(0, 5).join(', ')}${orderIds.length > 5 ? ` (+${orderIds.length - 5} more)` : ''}`
      }], { session });
    }

    // ============================================================
    // ✅ NEW: Transform Packaging Summary to Array for DB Storage
    // ============================================================
    const dailyBreakdown = Object.entries(packagingSummary).map(([date, partners]) => ({
        date,
        partners,
        totalOrders: Object.values(partners).reduce((sum, count) => sum + count, 0)
    }));

    // ==================== SAVE PROCESSING HISTORY ====================
    await ProcessingHistory.create([{
      businessGstin: targetGstin,
      fileName: req.file?.originalname || 'Unknown PDF',
      stats: {
        saved: createdCount,
        skipped: skippedCount,
        totalProcessed: createdCount + skippedCount,
        unmappedCount: unmappedSkus.size,
        inventoryDeducted: inventoryDeductedCount
      },
      // ✅ SAVE BREAKDOWN TO HISTORY
      dailyBreakdown: dailyBreakdown 
    }], { session });

    // ==================== COMMIT TRANSACTION ====================
    await session.commitTransaction();

    // ✅ AUDIT LOG: PDF Processed
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "PROCESS",
            "Cropper",
            `Processed PDF: ${req.file?.originalname || 'Unknown'}. Saved: ${createdCount}, Skipped: ${skippedCount}, Inv Deducted: ${inventoryDeductedCount}`,
            targetGstin 
        );
    }

    res.json({
      success: true,
      results: {
        saved: createdCount,
        skipped: skippedCount,
        labelDataSaved,
        inventoryDeducted: inventoryDeductedCount,
        unmappedSkus: Array.from(unmappedSkus),
        details,
        dailyBreakdown, // ✅ Return breakdown to frontend for immediate display
        detectedGstin: targetGstin
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process PDF',
      details: error.message 
    });
  } finally {
    session.endSession();
  }
};

// --- History Fetcher ---
export const getProcessingHistory = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: "GSTIN required" });

    // ✅ SECURITY FIX: Force String (Prevent NoSQL Injection on GET)
    const safeGstin = String(gstin);

    const history = await ProcessingHistory.find({ businessGstin: safeGstin })
      .sort({ processedAt: -1 })
      .limit(20);

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
};