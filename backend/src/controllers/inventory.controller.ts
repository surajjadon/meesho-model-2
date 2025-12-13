import { Request, Response } from 'express';
import { InventoryItem } from '../models/inventoryItem.model';
import { StockHistory } from '../models/stockHistory.model';
import mongoose from 'mongoose';

// GET all inventory items for a business
export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;
    if (!gstin) {
      return res.status(400).json({ message: 'GSTIN query parameter is required' });
    }
    
    const items = await InventoryItem.find({ gstin: gstin as string });
    res.status(200).json(items);
  } catch (error: any) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Server error while fetching inventory.", error: error.message });
  }
};

// --- MODIFIED: ADD a new inventory item (with history logging) ---
export const addInventoryItem = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const rawData = req.body;

    if (!rawData.gstin || !rawData.title) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'GSTIN and Title are required' });
    }

    // ✅ FIX: Remove MongoDB-specific fields that shouldn't be sent from frontend
    const { _id, __v, createdAt, updatedAt, featuredImageFile, ...cleanData } = rawData;

    const newItemData = {
      ...cleanData,
      price: Number(cleanData.price) || 0,
      stock: Number(cleanData.stock) || 0,
      featuredImage: req.file ? req.file.path : undefined,
    };

    const newItem = new InventoryItem(newItemData);
    await newItem.save({ session });
    
    // Log the initial stock
    const initialStock = newItem.stock || 0;
    if (initialStock > 0) {
        await StockHistory.create([{
            gstin: newItem.gstin,
            inventoryItem: newItem._id,
            change: initialStock,
            previousStock: 0,
            newStock: initialStock,
            reason: 'Initial Stock'
        }], { session });
    }

    await session.commitTransaction();
    console.log(`✅ Created inventory item: ${newItem.title} (Stock: ${initialStock})`);
    res.status(201).json(newItem);
    
  } catch (error: any) {
    await session.abortTransaction();
    console.error("Error adding inventory item:", error);
    res.status(500).json({ message: 'Server error while creating item.', error: error.message });
  } finally {
      session.endSession();
  }
};

// --- MODIFIED: UPDATE an existing inventory item (with history logging) ---
export const updateInventoryItem = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const itemToUpdate = await InventoryItem.findById(id).session(session);
    if (!itemToUpdate) {
        await session.abortTransaction();
        return res.status(404).json({ message: "Inventory item not found." });
    }
    
    // Check if stock is being updated
    const previousStock = itemToUpdate.stock || 0;
    if (updateData.stock !== undefined) {
        const newStock = Number(updateData.stock);
        if (!isNaN(newStock) && newStock !== previousStock) {
            await StockHistory.create([{
                gstin: itemToUpdate.gstin,
                inventoryItem: itemToUpdate._id,
                change: newStock - previousStock,
                previousStock,
                newStock,
                reason: 'Manual Update'
            }], { session });
            
            console.log(`📊 Stock updated for ${itemToUpdate.title}: ${previousStock} → ${newStock}`);
        }
    }
    
    // Remove fields that shouldn't be updated
    delete updateData.gstin;
    delete updateData._id;
    delete updateData.__v;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    if (req.file) {
      updateData.featuredImage = req.file.path;
    }

    const updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true, session }
    );
    
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

// DELETE an existing inventory item
export const deleteInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; 

    const deletedItem = await InventoryItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ message: "Inventory item not found." });
    }
    
    console.log(`🗑️  Deleted inventory item: ${deletedItem.title}`);
    
    // Optional: Also delete related stock history
    // await StockHistory.deleteMany({ inventoryItem: id });

    res.status(200).json({ message: "Item deleted successfully." });

  } catch (error: any) {
    console.error("Error deleting inventory item:", error);
    res.status(500).json({ message: "Server error while deleting item.", error: error.message });
  }
};

// GET the stock history for an item
export const getInventoryHistory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const history = await StockHistory.find({ inventoryItem: id }).sort({ createdAt: -1 });
        res.json(history);
    } catch (error: any) {
        console.error("Error fetching history:", error);
        res.status(500).json({ message: 'Failed to fetch history', error: error.message });
    }
};