import { Request, Response } from "express";
import { OrderData } from "../models/OrderData.model";
import { InventoryItem } from "../models/inventoryItem.model";
import { SkuMapping } from "../models/skuMapping.model";
import { UnmappedSku } from "../models/unmappedSku.model";
import mongoose from "mongoose";
import { StockHistory } from "../models/stockHistory.model";
import { logAction } from "../utils/logger";
import {SkuMappingHistory} from '../models/SkuMappingHistory.model'; 
import { OrderBatchConsumption } from "../models/orderBatchConsumption.model";
import { title } from "process";
// Updated interface to match new OrderData model
interface ParsedOrder {
  customer: { lines: string[] };
  returnTo?: { brandName?: string; lines: string[] };
  soldBy?: string;
  billTo?: string;
  returnCodes?: string[];
  barcode?: string;
  products: Array<{
    sku?: string;
    size?: string;
    quantity?: number;
    color?: string;
    orderNo?: string;
  }>;
  purchaseOrderNo?: string;
  invoiceNo?: string;
  orderDate?: string;
  invoiceDate?: string;
  lineItems?: Array<any>;
  invoiceTotals?: { totalTax?: string; totalAmount?: string };
  deliveryPartner?: string;
  paymentMethod?: string;
  deliveryType?: string;
}

// --- 1. PROCESS ORDERS (Save from PDF/Excel to DB) ---
export const processOrders = async (req: Request, res: Response) => {
  const { gstin, orders } = req.body;

  if (!gstin || !orders || !Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ message: "GSTIN and orders array are required", success: false });
  }

  // ✅ SECURITY FIX: Force String
  const safeGstin = String(gstin);


  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const results = { saved: 0, skipped: 0, unmappedSkus: [] as string[], errors: [] as string[] };

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i] as ParsedOrder;

      if (!order.products || order.products.length === 0) {
        results.errors.push(`Order ${i + 1}: No products found`);
        continue;
      }

      const orderId = order.purchaseOrderNo || order.invoiceNo || order.products[0]?.orderNo || `ORDER_${Date.now()}_${i}`;

      const existingOrder = await OrderData.findOne({
        gstin: safeGstin,
        $or: [
          { purchaseOrderNo: orderId },
          { invoiceNo: orderId },
          ...(order.products[0]?.orderNo ? [{ 'products.orderNo': order.products[0].orderNo }] : [])
        ]
      }).session(session);

      if (existingOrder) {
        results.skipped++;
        continue;
      }

      const orderToSave = {
        customer: { lines: order.customer?.lines || [] },
        returnTo: order.returnTo,
        soldBy: order.soldBy,
        billTo: order.billTo,
        returnCodes: order.returnCodes || [],
        barcode: order.barcode,
        products: order.products,
        gstin: safeGstin,
        purchaseOrderNo: orderId,
        invoiceNo: order.invoiceNo,
        orderDate: order.orderDate,
        invoiceDate: order.invoiceDate,
        lineItems: order.lineItems || [],
        invoiceTotals: order.invoiceTotals,
        deliveryPartner: order.deliveryPartner || 'Unknown',
        paymentMethod: order.paymentMethod,
        deliveryType: order.deliveryType,
        inventoryProcessed: false
      };

      await OrderData.create([orderToSave], { session });
      results.saved++;

      for (const product of order.products) {
        if (product.sku) {
          const sanitizedSku = product.sku.trim();
          const inventoryItem = await InventoryItem.findOne({ gstin: safeGstin, $or: [{ sku: sanitizedSku }, { title: sanitizedSku }] }).session(session);
          const mapping = await SkuMapping.findOne({ gstin: safeGstin, sku: sanitizedSku }).session(session);

          if (!inventoryItem && !mapping) {
            const existingUnmapped = await UnmappedSku.findOne({ gstin: safeGstin, sku: sanitizedSku, orderId: orderId, status: 'pending' }).session(session);
            if (!existingUnmapped) {
              await UnmappedSku.create([{ gstin: safeGstin, sku: sanitizedSku, orderId: orderId, status: 'pending' }], { session });
              if (!results.unmappedSkus.includes(sanitizedSku)) results.unmappedSkus.push(sanitizedSku);
            }
          }
        }
      }
    }

    await session.commitTransaction();

    // ✅ AUDIT LOG: Orders Imported
    if ((req as any).user) {
      await logAction(
        (req as any).user._id,
        (req as any).user.name,
        "PROCESS",
        "Orders",
        `Imported ${orders.length} raw orders. Saved: ${results.saved}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
        safeGstin // 👈 Use safeGstin
      );
    }

    res.status(200).json({
      success: true,
      message: 'Orders saved successfully.',
      results,
    });

  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: "Failed to process orders", error: error.message });
  } finally {
    session.endSession();
  }
};

// --- 2. PROCESS INVENTORY UPDATES ---
export const processInventoryUpdates = async (req: Request, res: Response) => {
  const { gstin } = req.body;

  if (!gstin) {
    return res.status(400).json({ message: "GSTIN is required" });
  }


  // ✅ SECURITY FIX: Force String
  const safeGstin = String(gstin);
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find orders that haven't been processed yet
    const unprocessedOrders = await OrderData.find({
      gstin: safeGstin,
      inventoryProcessed: false,
    }).session(session);
    let processedCount = 0;
    let skippedCount = 0;
    for (const order of unprocessedOrders) {
     const Datei = order.orderDate;

if (!Datei) {
  skippedCount++;
  continue;
}


 const [day, month, year] = Datei.split('.').map(Number);
   const orderDate = new Date(Date.UTC(year, month - 1, day));


      let orderHasDeductions = false;
      const orderBatchConsumption: any[] = [];
      let totalPackagingCost = 0;

      for (const product of order.products) {
        
        if (!product.sku) continue;

        const sanitizedSku = product.sku.trim();
        const orderQty = product.quantity || 1;
       //fetch mapping based in order Date if not found then get latest mapping 
        let mapping = await SkuMappingHistory.findOne({
          gstin: safeGstin,
          sku: sanitizedSku,
          validFrom: { $lte: orderDate },
          $or: [{ validTill: null }, { validTill: { $gte: orderDate } }]
        })
        .populate("mappedProducts.inventoryItem") 
        .session(session);

       
        if (!mapping) {
  mapping = await SkuMappingHistory.findOne({
    gstin: safeGstin,
    sku: sanitizedSku,
    validFrom: {
      $gt: orderDate,
    }
  })
  .sort({ validFrom: 1 }) 
  .populate("mappedProducts.inventoryItem")
  .session(session);
}


        
        if (!mapping || !mapping.mappedProducts?.length) continue;
        
        let packagingCost = mapping.packagingCost;
totalPackagingCost=packagingCost; 
        for (const mp of mapping.mappedProducts) {
          // ✅ STEP 2: EXTRACT Title and ID from the populated object
          // Since we populated, inventoryItem is now an Object, not just an ID string
          const inventoryData = mp.inventoryItem as any; 

          // Safety check: skip if the item was deleted or population failed
          if (!inventoryData || !inventoryData._id) continue;

          const inventoryItemId = inventoryData._id.toString(); // ID for stock check
          const inventoryTitle = inventoryData.title || "Unknown Item"; // Title for UI

          const totalQtyToDeduct = mp.quantity * orderQty;
        //  totalPackagingCost += packagingCost;
          
          // Check Stock using the ID
          const batches = await StockHistory.find({
            inventoryItem: inventoryItemId,
            availableStock: { $gt: 0 }
          })
            .sort({ createdAt: 1 })
            .session(session);

          const totalAvailable = batches.reduce((sum, b) => sum + b.availableStock, 0);

          if (totalAvailable < totalQtyToDeduct) {  

            if(sanitizedSku==="10 Safety lock-R6"){
            console.error(`Insufficient stock for ${inventoryTitle} (Needed: ${totalQtyToDeduct}, Available: ${totalAvailable})`);
          }
            throw new Error(`Insufficient stock for ${inventoryTitle}`);
          }

          orderHasDeductions = true;
          let remainingQty = totalQtyToDeduct;

          for (const batch of batches) {
            if (remainingQty === 0) break;

            const usedQty = Math.min(batch.availableStock, remainingQty);
            batch.availableStock -= usedQty;
            await batch.save({ session });
            // ✅ STEP 3: STORE Title in the consumption record
            const consumptionEntry = {
              inventoryItem:inventoryTitle,
              batchId: batch.batchid,
              qtyConsumed: usedQty,
              costPerUnit: batch.costPrice, // Ensure field name matches your model
              consumedDate: new Date()
            };

            orderBatchConsumption.push(consumptionEntry);
            remainingQty -= usedQty;
          }
        }
      }

      if (orderHasDeductions) {
        await OrderData.findByIdAndUpdate(
          order._id,
          {
            $set: {
              inventoryProcessed: true,
              batchConsumption: orderBatchConsumption,
              packagingCost: totalPackagingCost
            }
          },
          { session }
        );

        // Optional: Save to Audit Table (Ensure schema supports object for inventoryItem)
        await OrderBatchConsumption.insertMany(
            orderBatchConsumption.map(b => ({
              orderId: order._id,
              inventoryItem: b.inventoryItem, 
              batchId: b.batchId,
              qtyConsumed: b.qtyConsumed,
              costPerUnit: b.costPerUnit,
              consumedDate: b.consumedDate
            })),
            { session }
          );

        processedCount++;
      } else {
        skippedCount++;
      }
    }

    await session.commitTransaction();

    return res.json({
      success: true,
      message: "Inventory updated successfully",
      results: {
        ordersProcessed: processedCount,
        ordersSkipped: skippedCount
      }
    });

  } catch (error: any) {
    await session.abortTransaction();
    console.log('❌ Inventory processing failed:', error);
    return res.status(500).json({ success: false, error: error.message });
  } finally {
    session.endSession();
  }
};





// --- 3. GET ORDERS (For Dashboard) ---
export const getOrders = async (req: Request, res: Response) => {
  const { gstin, fromDate, toDate } = req.query;

  if (!gstin) return res.status(400).json({ message: "GSTIN is required" });

  // ✅ SECURITY FIX: Force String (Prevents NoSQL Injection on GET)
  const safeGstin = String(gstin);

  try {
    const matchQuery: any = { gstin: safeGstin };

    // Add date validation to prevent errors if strings are malformed
    if (fromDate && toDate) {
      const start = new Date(String(fromDate));
      const end = new Date(String(toDate));

      // Ensure date objects are valid before adding to query
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);

        matchQuery.createdAt = {
          $gte: start,
          $lte: end,
        };
      }
    }

    const aggregationResult = await OrderData.aggregate([
      { $match: matchQuery },
      {
        $facet: {
          orders: [{ $sort: { createdAt: -1 } }],
          stats: [
            { $unwind: { path: "$products", preserveNullAndEmptyArrays: true } },
            {
              $group: {
                _id: null,
                totalOrders: { $addToSet: "$_id" },
                pendingOrders: {
                  $addToSet: {
                    $cond: [{ $eq: ["$inventoryProcessed", false] }, "$_id", null]
                  }
                },
                allSkus: { $push: "$products.sku" },
                // ✅ FIX: Robust cleaning of "Rs." and "," before conversion
                pendingValue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$inventoryProcessed", false] },
                      {
                        $convert: {
                          input: {
                            $trim: {
                              input: {
                                $replaceAll: {
                                  input: {
                                    $replaceAll: {
                                      input: { $ifNull: ["$invoiceTotals.totalAmount", "0"] },
                                      find: ",",
                                      replacement: ""
                                    }
                                  },
                                  find: "Rs.",
                                  replacement: ""
                                }
                              }
                            }
                          },
                          to: "double",
                          onError: 0, // Returns 0 instead of crashing if format is weird
                          onNull: 0
                        }
                      },
                      0
                    ]
                  }
                }
              },
            },
            {
              $project: {
                _id: 0,
                totalOrders: { $size: "$totalOrders" },
                pendingCount: {
                  $size: {
                    $filter: {
                      input: "$pendingOrders",
                      cond: { $ne: ["$$this", null] }
                    }
                  }
                },
                pendingValue: 1,
                topSkus: { $slice: ["$allSkus", 5] }
              },
            },
          ],
        },
      },
    ]);

    const orders = aggregationResult[0]?.orders || [];
    const stats = aggregationResult[0]?.stats[0] || {
      totalOrders: 0,
      pendingCount: 0,
      pendingValue: 0,
      topSkus: []
    };

    res.json({ orders, stats });

  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};