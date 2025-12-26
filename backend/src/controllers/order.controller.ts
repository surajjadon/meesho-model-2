import { Request, Response } from "express";
import { OrderData } from "../models/OrderData.model";
import { InventoryItem } from "../models/inventoryItem.model";
import { SkuMapping } from "../models/skuMapping.model";
import { UnmappedSku } from "../models/unmappedSku.model";
import mongoose from "mongoose";
import { StockHistory } from "../models/stockHistory.model";
import { logAction } from "../utils/logger"; // ✅ Imported Logger

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
  
  console.log(`\n📦 Processing ${orders?.length || 0} orders for GSTIN: ${gstin}`);
  
  if (!gstin || !orders || !Array.isArray(orders) || orders.length === 0) {
    return res.status(400).json({ message: "GSTIN and orders array are required", success: false });
  }
  
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
        gstin,
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
        gstin,
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
          const inventoryItem = await InventoryItem.findOne({ gstin, $or: [{ sku: sanitizedSku }, { title: sanitizedSku }] }).session(session);
          const mapping = await SkuMapping.findOne({ gstin, sku: sanitizedSku }).session(session);
          
          if (!inventoryItem && !mapping) {
            const existingUnmapped = await UnmappedSku.findOne({ gstin, sku: sanitizedSku, orderId: orderId, status: 'pending' }).session(session);
            if (!existingUnmapped) {
              await UnmappedSku.create([{ gstin, sku: sanitizedSku, orderId: orderId, status: 'pending' }], { session });
              if (!results.unmappedSkus.includes(sanitizedSku)) results.unmappedSkus.push(sanitizedSku);
            }
          }
        }
      }
    }
    
    await session.commitTransaction();
    console.log('✅ Order Processing Complete. Saved:', results.saved);

    // ✅ AUDIT LOG: Orders Imported (Passed GSTIN)
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "PROCESS",
            "Orders",
            `Imported ${orders.length} raw orders. Saved: ${results.saved}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
            gstin // 👈 6th Argument
        );
    }
    
    res.status(200).json({
      success: true,
      message: 'Orders saved successfully.',
      results,
    });
    
  } catch (error: any) {
    await session.abortTransaction();
    console.error("❌ ORDER PROCESSING ERROR:", error);
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
  
  console.log(`\n🔄 Processing inventory updates for GSTIN: ${gstin}`);
  
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const unprocessedOrders = await OrderData.find({
      gstin,
      inventoryProcessed: false,
    }).session(session);
    
    console.log(`📊 Found ${unprocessedOrders.length} unprocessed orders`);
    
    const inventoryUpdates = new Map<string, { item: any; deduction: number; orderIds: string[] }>();
    
    let processedCount = 0;
    let skippedCount = 0;

    for (const order of unprocessedOrders) {
      const orderId = order.purchaseOrderNo || order.invoiceNo || 'Unknown';
      let orderHasDeductions = false;
      
      for (const product of order.products) {
        if (!product.sku) continue;
        
        const sanitizedSku = product.sku.trim();
        const orderQty = product.quantity || 1;
        
        // 1. Check for MAPPING First
        const mapping = await SkuMapping.findOne({ gstin, sku: sanitizedSku }).session(session);
        
        let itemsToDeduct: Array<{ id: string; qtyPerUnit: number }> = [];

        if (mapping && mapping.mappedProducts && mapping.mappedProducts.length > 0) {
            // Case A: Found Mapping
            console.log(`   🔗 Mapped: "${sanitizedSku}" -> ${mapping.mappedProducts.length} items`);
            itemsToDeduct = mapping.mappedProducts.map(mp => ({
                id: mp.inventoryItem.toString(),
                qtyPerUnit: mp.quantity
            }));
        } 
        else {
            // Case B: No Mapping, Check DIRECT Inventory Match
            const directItem = await InventoryItem.findOne({ 
                gstin, 
                $or: [{ sku: sanitizedSku }, { title: sanitizedSku }] 
            }).session(session);

            if (directItem) {
                const directId = (directItem._id as mongoose.Types.ObjectId).toString();
                console.log(`   🎯 Direct Match: "${sanitizedSku}" -> Inventory ID: ${directId}`);
                
                itemsToDeduct.push({
                    id: directId,
                    qtyPerUnit: 1
                });
            } else {
                console.log(`   ⚠️ SKIPPED: "${sanitizedSku}" (No mapping AND no direct inventory match)`);
                continue; 
            }
        }

        // 2. Calculate Deductions
        if (itemsToDeduct.length > 0) {
            orderHasDeductions = true;

            for (const target of itemsToDeduct) {
                const totalQtyToDeduct = target.qtyPerUnit * orderQty;

                if (!inventoryUpdates.has(target.id)) {
                    const itemDoc = await InventoryItem.findById(target.id).session(session);
                    if (itemDoc) {
                        inventoryUpdates.set(target.id, { item: itemDoc, deduction: 0, orderIds: [] });
                    }
                }

                const currentEntry = inventoryUpdates.get(target.id);
                if (currentEntry) {
                    currentEntry.deduction += totalQtyToDeduct;
                    if (!currentEntry.orderIds.includes(orderId)) {
                        currentEntry.orderIds.push(orderId);
                    }
                }
            }
        }
      }
      
      if (orderHasDeductions) {
        await OrderData.findByIdAndUpdate(
          order._id,
          { $set: { inventoryProcessed: true } },
          { session }
        );
        processedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n💾 Applying ${inventoryUpdates.size} inventory item updates...`);
    
    for (const [itemId, { item, deduction, orderIds }] of inventoryUpdates.entries()) {
      const previousStock = item.stock || 0;
      const newStock = previousStock - deduction;

      await InventoryItem.findByIdAndUpdate(
        itemId,
        { $set: { stock: newStock } },
        { session }
      );

      await StockHistory.create([{
        gstin,
        inventoryItem: item._id,
        change: -deduction,
        previousStock,
        newStock,
        reason: "Order Fulfillment",
        notes: `Deducted for ${orderIds.length} orders.`,
      }], { session });

      console.log(`  ✅ ${item.title}: ${previousStock} → ${newStock} (deducted ${deduction})`);
    }

    await session.commitTransaction();
    console.log(`✅ Inventory processing complete. Processed: ${processedCount}, Skipped: ${skippedCount}\n`);
    
    // ✅ AUDIT LOG: Inventory Synced (Passed GSTIN)
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "UPDATE",
            "Inventory",
            `Synced stock for ${processedCount} new orders. Total items updated: ${inventoryUpdates.size}`,
            gstin // 👈 6th Argument
        );
    }

    res.json({
      success: true,
      message: "Inventory updated successfully",
      results: {
        ordersProcessed: processedCount,
        ordersSkipped: skippedCount,
        itemsUpdated: inventoryUpdates.size,
      },
    });
    
  } catch (error: any) {
    await session.abortTransaction();
    console.error("❌ INVENTORY PROCESSING ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to process inventory", error: error.message });
  } finally {
    session.endSession();
  }
};

// --- 3. GET ORDERS (For Dashboard) ---
export const getOrders = async (req: Request, res: Response) => {
  const { gstin, fromDate, toDate } = req.query;
  
  if (!gstin) return res.status(400).json({ message: "GSTIN is required" });
  
  try {
    const matchQuery: any = { gstin: gstin as string };
    
    if (fromDate && toDate) {
      matchQuery.createdAt = {
        $gte: new Date(fromDate as string),
        $lte: new Date(new Date(toDate as string).setHours(23, 59, 59, 999)),
      };
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
                // Calculate pending value from invoiceTotals.totalAmount
                pendingValue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$inventoryProcessed", false] },
                      { 
                        $toDouble: { 
                          $ifNull: [
                            { $replaceAll: { input: { $ifNull: ["$invoiceTotals.totalAmount", "0"] }, find: ",", replacement: "" } },
                            "0"
                          ]
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
    console.error("GET ORDERS AGGREGATION ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};