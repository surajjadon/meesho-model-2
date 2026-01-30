import { Request, Response } from 'express';
import { InventoryItem } from '../models/inventoryItem.model';
import { StockHistory } from '../models/stockHistory.model';
import { PriceHistory } from '../models/priceHistory.model';
import mongoose from 'mongoose';
import { logAction } from '../utils/logger';
import { SkuMapping } from '../models/skuMapping.model'; // ✅ Imported
import { SkuMappingHistory } from '../models/SkuMappingHistory.model'; // ✅ Imported


const sanitizeBatchId = (value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Invalid batch ID type");
  }

  const sanitized = String(value)
    .trim()
    .replace(/\$/g, "")   // remove Mongo operators
    .replace(/\./g, "");  // remove dot notation

  if (!sanitized) {
    throw new Error("Batch ID cannot be empty");
  }

  return sanitized;
};



export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;
    
    if (!gstin) {
      return res.status(400).json({ message: 'GSTIN query parameter is required' });
    }

    const safeGstin = String(gstin);
    const items = await InventoryItem.find({ gstin: safeGstin }).lean();
    const itemsWithLiveStock = await Promise.all(items.map(async (item: any) => {
      const stockStats = await StockHistory.aggregate([
        { 
          $match: { 
            inventoryItem: item._id 
          } 
        },
        {
          $group: {
            _id: "$inventoryItem",
            totalAvailableStock: { $sum: "$availableStock" }, 
            avgCostPrice: { $avg: "$costPrice" }            
          }
        }
      ]);
      const stats = stockStats[0] || { totalAvailableStock: 0, avgCostPrice: 0 };

      return {
        ...item,
        stock: stats.totalAvailableStock,    
        price: stats.avgCostPrice || 0   
      };
    }));

    res.status(200).json(itemsWithLiveStock);

  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Server error while fetching inventory.", error: error.message });
  }
};

// ADD a new inventory item
export const addInventoryItem = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rawData = req.body;

    if (!rawData.gstin || !rawData.title) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'GSTIN and Title are required' });
    }

    const { _id, __v, createdAt, updatedAt, featuredImageFile, ...cleanData } = rawData;

    const newItemData = {
      ...cleanData,
      gstin: String(cleanData.gstin), // Force String
      price: Number(cleanData.price) || 0,
      stock: Number(cleanData.stock) || 0,
      batchid:Number(cleanData.batchid) || "xyz",
      featuredImage: req.file ? req.file.path : undefined,
    };

    const newItem = new InventoryItem(newItemData);
    await newItem.save({ session });
    
    const initialStock = newItem.stock || 0;
    const initialPrice = newItem.price || 0;

    // 1. Log Initial Stock
    if (initialStock > 0) {
        await StockHistory.create([{
            gstin: newItem.gstin,
            inventoryItem: newItem._id,
            change: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Initial Stock',
            batchid:cleanData.batchid,
            availableStock:initialStock,
            costPrice: initialPrice 
        }], { session });
    }

    // 2. Log Initial Price
    await session.commitTransaction();
    console.log(`✅ Created item: ${newItem.title} (Price: ${initialPrice})`);
    res.status(201).json(newItem);
    
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error adding inventory item:", error);
    res.status(500).json({ message: 'Server error while creating item.', error: error.message });
  } finally {
      session.endSession();
  }
};

//updatebatch
export const updateInventoryItem = async (req: Request, res: Response) => {
    const { id } = req.params;

    // 1. FIX: Check both Query AND Body for GSTIN
    const rawGstin = req.query.gstin || req.body.gstin;
    const updateData = req.body;

    if (!rawGstin) {
        return res.status(400).json({ message: "GSTIN is required to update inventory." });
    }

    const safeGstin = String(rawGstin);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 2. Find the item
        const itemToUpdate = await InventoryItem.findOne({ _id: id, gstin: safeGstin }).session(session);

        if (!itemToUpdate) {
            await session.abortTransaction();
            return res.status(404).json({ message: "Inventory item not found or access denied." });
        }

        const itemsToSet: any = {};
        
        // Track if price changed for cascade updates
        let priceHasChanged = false; 
        let finalNewPrice = itemToUpdate.price || 0;
const normalizedBatchId = String(updateData.batchid).trim();
//check if batch id is not duplicate for same invetory item
const exists = await StockHistory.findOne({
  gstin: itemToUpdate.gstin,
  inventoryItem: itemToUpdate._id,
  batchid: normalizedBatchId
}).session(session);



if (exists) {
  await session.abortTransaction();
  return res.status(409).json({
    message: "Batch ID already exists for this item under this GSTIN"
  });
}

        // --- 1. HANDLE STOCK HISTORY & UPDATE ---
        const previousStock = itemToUpdate.stock || 0;
        if (updateData.stock !== undefined && updateData.stock !== "") {
            const newStock = Number(updateData.stock);
            let costPriceForLog = itemToUpdate.price;
            if (updateData.price !== undefined && updateData.price !== "") {
                costPriceForLog = Number(updateData.price);
            }

                await StockHistory.create([{
                    gstin: itemToUpdate.gstin,
                    inventoryItem: itemToUpdate._id,
                    change: newStock - previousStock,
                    previousStock,
                    newStock,
                    reason: 'Manual Update',
                    costPrice: costPriceForLog || 0,             
                    batchid:normalizedBatchId,
                    availableStock:newStock 
                }], { session });

                itemsToSet.stock = newStock;
            }
        

      
        // --- 3. HANDLE OTHER FIELDS ---
        if (updateData.title) itemsToSet.title = updateData.title;
        if (updateData.category) itemsToSet.category = updateData.category;
        if (updateData.hsnCode) itemsToSet.hsnCode = updateData.hsnCode;
        if (updateData.variation) itemsToSet.variation = updateData.variation;

        if (req.file) {
            itemsToSet.featuredImage = req.file.path;
        }

        // --- 4. PERFORM INVENTORY UPDATE ---
        // Even if nothing changed, we might pass through if we want to ensure existing return
       let updatedItem = itemToUpdate;

        if (Object.keys(itemsToSet).length > 0) {
            const result = await InventoryItem.findOneAndUpdate(
                { _id: id, gstin: safeGstin },
                { $set: itemsToSet },
                { new: true, runValidators: true, session }
            );

            // FIX: Only assign if result is not null
            if (result) {
                updatedItem = result;
            }
        }
        // ---------------------------------------------------------
        // ✅ 5. CASCADE UPDATE: RECALCULATE AFFECTED SKUS
        // ---------------------------------------------------------
        if (priceHasChanged) {
            console.log(`💰 Price changed for Item ${id}. Triggering SKU updates...`);

            // A. Find all SKUs that use this inventory item
            const affectedSkus = await SkuMapping.find({
                "mappedProducts.inventoryItem": id
            })
            .populate('mappedProducts.inventoryItem') // Populate to get prices of OTHER ingredients
            .session(session);

            // B. Loop through each SKU and recalculate
            for (const skuMap of affectedSkus) {
                let newManufacturingPrice = 0;

                // Calculate sum of ingredients
                if (skuMap.mappedProducts && Array.isArray(skuMap.mappedProducts)) {
                    for (const prod of skuMap.mappedProducts) {
                        const productRef = prod.inventoryItem as any; 
                        
                        // SAFETY: If the populated item is null (deleted), skip or handle as 0
                        if (!productRef) continue; 

                        // CRITICAL: If this is the item we just updated, use 'finalNewPrice'. 
                        // Otherwise, use the price currently in the DB.
                        const itemPrice = (productRef._id.toString() === id) 
                            ? finalNewPrice 
                            : (productRef.price || 0);

                        const qty = prod.quantity || 0;
                        newManufacturingPrice += (itemPrice * qty);
                    }
                }

                // C. If the calculated price is different, update the SKU and Log History
                // (We compare roughly to avoid floating point micro-diffs, but strict !== is usually fine here)
                if (skuMap.manufacturingPrice !== newManufacturingPrice) {
                    
                    // Update SKU
                    skuMap.manufacturingPrice = newManufacturingPrice;
                    await skuMap.save({ session });

                    // Create SKU History Snapshot
                    await SkuMappingHistory.create([{
                        skuMappingId: skuMap._id,
                        gstin: skuMap.gstin,
                        sku: skuMap.sku,
                        manufacturingPrice: newManufacturingPrice, // The updated calculated price
                        packagingCost: skuMap.packagingCost,       // Remains unchanged
                        updatedAt: new Date()
                    }], { session });

                    console.log(`🔄 Updated SKU ${skuMap.sku}: Old MfgPrice ${skuMap.manufacturingPrice} -> New ${newManufacturingPrice}`);
                }
            }
        }


        await session.commitTransaction();
        res.status(200).json(updatedItem);

    } catch (error: any) {
        await session.abortTransaction();
        console.error("Error updating inventory item:", error);
        res.status(500).json({ message: "Server error while updating item.", error: error.message });
    } finally {
        session.endSession();
    }
};


// ✅ SECURED DELETE: Requires GSTIN to prevent IDOR
export const deleteInventoryItem = async (req: Request, res: Response) => {
  const { id } = req.params; 
  const { gstin } = req.query;

  if (!gstin) {
      return res.status(400).json({ message: "GSTIN is required to verify ownership." });
  }

  const safeGstin = String(gstin);
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 🛡️ SECURITY FIX: Scope delete by GSTIN
    const deletedItem = await InventoryItem.findOneAndDelete({ _id: id, gstin: safeGstin }).session(session);

    if (!deletedItem) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Inventory item not found or access denied." });
    }

    // Cascade Delete
    await StockHistory.deleteMany({ inventoryItem: id }).session(session);
    await PriceHistory.deleteMany({ inventoryItem: id }).session(session);
    
    await session.commitTransaction();
    
    console.log(`🗑️ Deleted inventory item: ${deletedItem.title}`);
    res.status(200).json({ message: "Item and all history deleted successfully." });

  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ message: "Server error while deleting item.", error: error.message });
  } finally {
    session.endSession();
  }
};


// GET history
export const getInventoryHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        console.log(id);
        const history = await StockHistory.find({ inventoryItem: id }).sort({ updateAt: -1 });
        res.json(history);
    } catch (error: any) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
};

//get price history
export const getInventoryPriceHistory = async (req: Request, res: Response) => {
  try {
     const { id } = req.params;
     const history = await PriceHistory.find({ inventoryItem: id }).sort({ createdAt: -1 });
     res.json(history);
  } catch (error: any) {
      console.error("Error fetching Price history:", error);
      res.status(500).json({ message: 'Failed to fetch Price history', error: error.message });
  }
};

export const updateBatchIdofStock = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const id = String(req.params.id || "").trim();
    const batchid = String(req.body.batchid || "").trim();
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    if (!batchid) {
      return res.status(400).json({ message: "Batch ID is required" });
    }

    session.startTransaction();

    const history = await StockHistory.findById(id).session(session);
    if (!history) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Stock history not found" });
    }

    const exists = await StockHistory.findOne({
      _id: { $ne: history._id }, // exclude self
      gstin: history.gstin,
      inventoryItem: history.inventoryItem,
      batchid
    }).session(session);

    if (exists) {
      await session.abortTransaction();
      return res.status(409).json({
        message: "Batch ID already exists for this item under this GSTIN"
      });
    }

    history.batchid = batchid;
    await history.save({ session });

    await session.commitTransaction();

    return res.status(200).json(history);
  } catch (err) {
    await session.abortTransaction();
    console.error("Update batch error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    session.endSession();
  }
};

export const updateavailableStock = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const id = String(req.params.id || "").trim();
        const availableStock=Number(req.body.availableStock || 0 );
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    if (req.body.availableStock === undefined || req.body.availableStock === null) {
        return res.status(400).json({ message: "Stock Quantity is required" });
    }

  if (isNaN(availableStock) || availableStock < 0) {
      return res.status(400).json({ message: "Invalid Stock Quantity" });
    }

    session.startTransaction();

    const history = await StockHistory.findById(id).session(session);
    if (!history) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Stock history not found" });
    }


    history.availableStock = availableStock;
    await history.save({ session });

    await session.commitTransaction();

    return res.status(200).json(history);
  } catch (err) {
    await session.abortTransaction();
    console.error("Update Stock error:", err);
    return res.status(500).json({ message: "Error in Changing Stock Quantity" });
  } finally {
    session.endSession();
  }
};


export const updatePirceofStock = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const id = String(req.params.id || "").trim();
      const costPrice=Number(req.body.costPrice || 0 );
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    

    if (req.body.costPrice === undefined || req.body.costPrice === null) {
        return res.status(400).json({ message: "costPrice is required" });
    }

  if (isNaN(costPrice) || costPrice < 0) {
      return res.status(400).json({ message: "Invalid costPrice" });
    }
    session.startTransaction();

    const history = await StockHistory.findById(id).session(session);
    if (!history) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Stock history not found" });
    }


    history. costPrice =  costPrice;
    await history.save({ session });

    await session.commitTransaction();

    return res.status(200).json(history);
  } catch (err) {
    await session.abortTransaction();
    console.error("Update Stock error:", err);
    return res.status(500).json({ message: "Error in Changing CostPrice" });
  } finally {
    session.endSession();
  }
};



// GET Inventory with "Active Batch" Logic (FIFO)
export const getInventoryWithPositiveStock = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;

    if (!gstin) {
      return res.status(400).json({ message: "GSTIN query parameter is required" });
    }

    const safeGstin = String(gstin);

    const items = await StockHistory.aggregate([
      // 1. Match Inventory for this Business
      { $match: { gstin: safeGstin } },

      // 2. Optimized Lookup: Fetch ONLY the single oldest batch with positive stock
      {
        $lookup: {
          from: "stockhistories", // Ensure this matches your MongoDB collection name (usually lowercase plural)
          let: { inventoryId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$inventoryItem", "$$inventoryId"] }, // Match foreign key
                availableStock: { $gt: 0 } // Filter: Stock must be > 0
              }
            },
            { $sort: { createdAt: 1 } }, // FIFO: Oldest created batch first
            { $limit: 1 } // We only need the very first one
          ],
          as: "activeBatch"
        }
      },

      // 3. Flatten the array (activeBatch becomes an object or null)
      {
        $unwind: {
          path: "$activeBatch",
          preserveNullAndEmptyArrays: true
        }
      },

      // 4. Projection: Overwrite stock/price with Batch data if it exists
      {
        $addFields: {
          stock: { $ifNull: ["$activeBatch.availableStock", 0] }, // If no batch, stock is 0
          price: { $ifNull: ["$activeBatch.costPrice", "$price"] }, // If no batch, keep original price
          batchid: { $ifNull: ["$activeBatch.batchid", "$batchid"] }, // Show active batch ID
          
          // Optional: Add a flag so frontend knows this is batch data
          isBatchData: { $cond: [{ $ifNull: ["$activeBatch", false] }, true, false] }
        }
      },

      // 5. Cleanup: Remove the temporary activeBatch object from output
      { $project: { activeBatch: 0, __v: 0 } }
    ]);

    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error fetching positive stock inventory:", error);
    res.status(500).json({ message: "Server error while fetching inventory.", error: error.message });
  }
};