import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { SkuMappingHistory } from '../models/SkuMappingHistory.model'; 
import { UnmappedSku } from '../models/unmappedSku.model';
import LabelData from '../models/labelData.model'; 
import { logAction } from '../utils/logger';
import mongoose from "mongoose";
import {unmappedskufromprofitloss} from '../models/unmappedskufromprofitloss.model';



//mappings/check-sku/:sku
export const checkSku = async (req: Request, res: Response) => {
    const { sku } = req.params;
    const { gstin } = req.query;

    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    // ✅ SECURITY FIX: Force string to prevent NoSQL Injection
    const safeGstin = String(gstin);

    try {
        const existingMapping = await SkuMapping.findOne({ 
            gstin: safeGstin, 
            sku: sku.trim() 
        });

        if (existingMapping) {
            return res.status(200).json({ 
                isTaken: true, 
                productTitle: 'an existing product'
            });
        }

        res.status(200).json({ isTaken: false });

    } catch (error: any) {
        console.error("CHECK SKU ERROR:", error);
        res.status(500).json({ message: 'Server Error while checking SKU', error: error.message });
    }
}

// GET /mappings
// GET /mappings
export const getMappings = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    const safeGstin = String(gstin);

    try {
        // 1. Fetch mappings
        const mappings = await SkuMapping.find({ gstin: safeGstin })
            .populate('mappedProducts.inventoryItem', 'title stock')
            .sort({ createdAt: -1 })
            .lean(); // ✅ Use .lean() to return plain JS objects we can modify

        // 2. Inject Expiry Status Logic
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        const mappingsWithStatus = mappings.map((mapping: any) => {
            let status = 'active'; // default
            let daysLeft = null;

            if (mapping.validTill) {
                const validTillDate = new Date(mapping.validTill);
                
                // Calculate difference in days
                const diffTime = validTillDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                daysLeft = diffDays;

                if (diffTime < 0) {
                    status = 'expired';
                } else if (diffDays <= 3) {
                    status = 'expiring_soon';
                }
            }

            return { ...mapping, expiryStatus: status, daysLeft };
        });

        res.json(mappingsWithStatus);

    } catch (error: any) {
        console.error("GET MAPPINGS ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// GET /mappings/history/:id
export const getMappingHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const history = await SkuMappingHistory.find({ skuMappingId: id })
            .populate('mappedProducts.inventoryItem', 'title stock') // <--- ADD THIS
            .sort({ updatedAt: -1 });
        
        res.status(200).json(history);
    } catch (error: any) {
        console.error("GET HISTORY ERROR:", error);
        res.status(500).json({ message: 'Server Error fetching history', error: error.message });
    }
}
// POST /mappings
// POST /mappings
export const createMapping = async (req: Request, res: Response) => {
  try {
    const {
      gstin,
      sku,
      manufacturingPrice,
      packagingCost,
      mappedProducts,
      validFrom // User provides this with timestamp
    } = req.body;

    if (!gstin || !sku || !Array.isArray(mappedProducts) || mappedProducts.length === 0) {
      return res.status(400).json({
        message: "GSTIN, SKU, and at least one mapped product are required"
      });
    }

    if (!validFrom) {
        return res.status(400).json({ message: "validFrom date is required" });
    }

    // --- Date Logic: Start Date + Infinite End Date ---
    const from = new Date(validFrom);
    // Set "Infinite" date (e.g., Dec 31, 9999)
    const till = new Date('9999-12-31T23:59:59.999Z');

    if (isNaN(from.getTime())) {
      return res.status(400).json({ message: "Invalid validFrom date format" });
    }

    // --- Sanitization ---
    const safeGstin = String(gstin);
    const sanitizedSku = String(sku).trim();
    const cleanMfgPrice = Number(manufacturingPrice) || 0;
    const cleanPackagingCost = Number(packagingCost) || 0;

    const safeMappedProducts = mappedProducts.map((mp: any) => ({
      inventoryItem: String(mp.inventoryItem),
      quantity: Number(mp.quantity) || 0
    }));

    // --- Duplicate Check ---
    const existingMapping = await SkuMapping.findOne({
      gstin: safeGstin,
      sku: sanitizedSku
    });

    if (existingMapping) {
      return res.status(409).json({
        message: `A mapping for SKU "${sanitizedSku}" already exists.`
      });
    }

    // --- Create Mapping (Main Current State) ---
    const newMapping = await SkuMapping.create({
      gstin: safeGstin,
      sku: sanitizedSku,
      manufacturingPrice: cleanMfgPrice,
      packagingCost: cleanPackagingCost,
      mappedProducts: safeMappedProducts,
      validFrom: from,
      validTill: till // Infinite
    });

    // --- Create History (Initial Record) ---
    await SkuMappingHistory.create({
      skuMappingId: newMapping._id,
      gstin: safeGstin,
      sku: sanitizedSku,
      manufacturingPrice: cleanMfgPrice,
      packagingCost: cleanPackagingCost,
      mappedProducts: safeMappedProducts,
      validFrom: from,
      validTill: till, // Infinite
      updatedAt: new Date()
    });

    // --- Update Unmapped SKUs ---
    await UnmappedSku.updateMany(
      { gstin: safeGstin, sku: sanitizedSku, status: "pending" },
      { $set: { status: "mapped" } }
    );

    await unmappedskufromprofitloss.updateMany(
      { gstin: safeGstin, sku: sanitizedSku, status: "pending" },
      { $set: { status: "mapped" } }
    );

    const populatedMapping = await SkuMapping.findById(newMapping._id)
      .populate("mappedProducts.inventoryItem", "title stock");

    // --- Audit Log ---
    if ((req as any).user) {
      await logAction(
        (req as any).user._id,
        (req as any).user.name,
        "CREATE",
        "Mappings",
        `Created SKU mapping: ${sanitizedSku}`,
        safeGstin
      );
    }

    res.status(201).json(populatedMapping);
  } catch (error: any) {
    console.error("CREATE MAPPING ERROR:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message
    });
  }
};

// GET UNMAPPED SKUS (Strict GSTIN Filtering)
export const getUnmappedSkus = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    // ✅ SECURITY FIX: Force string to prevent NoSQL Injection
    const safeGstin = String(gstin);

    try {
        const usedSkus = await LabelData.distinct('sku', { 
            businessGstin: { $eq: safeGstin } 
        });

        const mappedSkusDocs = await SkuMapping.find({ 
            gstin: { $eq: safeGstin } 
        }).select('sku');
        
        const mappedSkusSet = new Set(mappedSkusDocs.map(m => m.sku));

        const unmapped = usedSkus.filter((sku: string) => 
            sku && sku.trim() !== '' && !mappedSkusSet.has(sku)
        );
        
        const legacyUnmapped = await UnmappedSku.find({ 
            gstin: { $eq: safeGstin }, 
            status: 'pending' 
        }).distinct('sku');

        const finalUnmapped = Array.from(new Set([...unmapped, ...legacyUnmapped])).sort();

        res.json(finalUnmapped);

    } catch (error: any) {
        console.error("GET UNMAPPED SKU ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// PUT /mappings/:id (UPDATED with History Logic)


// PUT /mappings/:id
// PUT /mappings/:id
export const updateMapping = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    gstin,
    sku,
    manufacturingPrice,
    packagingCost,
    mappedProducts,
    validFrom // The NEW Start Date provided by user
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid mapping ID" });
  }

  // We only require validFrom now, validTill is calculated as Infinite automatically
  if (!validFrom) {
     return res.status(400).json({ message: "validFrom date is required for updates" });
  }

  const safeGstin = String(gstin);
  const sanitizedSku = sku.trim();
  
  // 1. New Dates Setup
  const newValidFrom = new Date(validFrom); // User defined start (with timestamp)
  const newValidTill = new Date('9999-12-31T23:59:59.999Z'); // Infinite

  if (isNaN(newValidFrom.getTime())) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  try {
    const existingMapping = await SkuMapping.findOne({ _id: id, gstin: safeGstin });
    if (!existingMapping) {
      return res.status(404).json({ message: "Mapping not found." });
    }

    // Check SKU Conflict
    const conflictingMapping = await SkuMapping.findOne({
      gstin: safeGstin,
      sku: sanitizedSku,
      _id: { $ne: id }
    });

    if (conflictingMapping) {
      return res.status(409).json({
        message: `SKU "${sanitizedSku}" is already in use by another mapping.`
      });
    }

    // ============================================================
    // 🕒 HISTORY LOGIC: Close Old Chain -> Open New Chain
    // ============================================================

    // 1. Find the most recent active history record (the one that is currently infinite)
    // We sort by validFrom descending to get the latest one.
    const latestHistory = await SkuMappingHistory.findOne({
        skuMappingId: id
    }).sort({ validFrom: -1 });

    if (latestHistory) {
        // Validate Date Chronology
        if (newValidFrom <= latestHistory.validFrom) {
            return res.status(400).json({ 
                message: `New validFrom (${newValidFrom.toISOString()}) must be later than the previous start date (${latestHistory.validFrom.toISOString()})` 
            });
        }

        // 2. CLOSE the old record
        // The old record's validTill becomes the NEW record's validFrom
        latestHistory.validTill = newValidFrom;
        await latestHistory.save();
    }

    // 3. CREATE the NEW history record (Infinite)
    const newHistoryData = {
        skuMappingId: id,
        gstin: safeGstin,
        sku: sanitizedSku,
        manufacturingPrice: parseFloat(manufacturingPrice) || 0,
        packagingCost: parseFloat(packagingCost) || 0,
        mappedProducts: mappedProducts,
        validFrom: newValidFrom, // Starts when user said
        validTill: newValidTill, // Goes to Infinity
        updatedAt: new Date()
    };

    await SkuMappingHistory.create(newHistoryData);

    // ============================================================
    // ✅ UPDATE MAIN MAPPING
    // ============================================================
    
    // The main mapping should always reflect the *latest* state (Active/Infinite)
    const updateData = {
      sku: sanitizedSku,
      manufacturingPrice: parseFloat(manufacturingPrice) || 0,
      packagingCost: parseFloat(packagingCost) || 0,
      mappedProducts: mappedProducts,
      validFrom: newValidFrom,
      validTill: newValidTill // Infinite
    };

    const updatedMapping = await SkuMapping.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("mappedProducts.inventoryItem", "title stock");

    // ✅ Audit log
    if ((req as any).user) {
      await logAction(
        (req as any).user._id,
        (req as any).user.name,
        "UPDATE",
        "Mappings",
        `Updated mapping SKU ${sanitizedSku}. Closed previous history, started new from ${newValidFrom.toISOString()}`,
        safeGstin
      );
    }

    return res.status(200).json(updatedMapping);

  } catch (error: any) {
    console.error("UPDATE MAPPING ERROR:", error);
    return res.status(500).json({
      message: "Server Error while updating mapping",
      error: error.message
    });
  }
};

// DELETE /mappings/:id (UPDATED with History Deletion)
export const deleteMapping = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { gstin } = req.body;

    if (!gstin) {
        return res.status(400).json({ message: "GSTIN is required in the request body to authorize deletion." });
    }
    
    const safeGstin = String(gstin);

    try {
        const mappingToDelete = await SkuMapping.findOne({ _id: id, gstin: safeGstin });

        if (!mappingToDelete) {
            return res.status(404).json({ message: "Mapping not found or you do not have permission to delete it." });
        }

        await SkuMappingHistory.deleteMany({ skuMappingId: id });
        await SkuMapping.findByIdAndDelete(id);

        await UnmappedSku.updateMany(
            { gstin: safeGstin, sku: mappingToDelete.sku, status: 'mapped' },
            { $set: { status: 'pending' } }
        );
         await unmappedskufromprofitloss.updateMany(
     { gstin: safeGstin, sku: mappingToDelete.sku, status: 'mapped' },
            { $set: { status: 'pending' } }
    );

        // ✅ AUDIT LOG: Mapping Deleted
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "DELETE",
                "Mappings",
                `Deleted mapping for SKU: ${mappingToDelete.sku}`,
                safeGstin // 👈 6th Argument
            );
        }

        res.status(200).json({ message: "Mapping and history deleted successfully." });

    } catch (error: any) {
        console.error("DELETE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error while deleting mapping.', error: error.message });
    }
};


// PUT /mappings/history/:historyId
export const updateHistoryRecord = async (req: Request, res: Response) => {
    const { historyId } = req.params;
    const { manufacturingPrice, packagingCost, validFrom} = req.body;

    try {
        const historyRecord = await SkuMappingHistory.findById(historyId);

        if (!historyRecord) {
            return res.status(404).json({ message: "History record not found." });
        }

        const oldMfg = historyRecord.manufacturingPrice;
        
        // 1. Update prices (Check undefined to avoid zeroing out if not sent)
        if (manufacturingPrice !== undefined) {
            historyRecord.manufacturingPrice = parseFloat(manufacturingPrice) || 0;
        }
        if (packagingCost !== undefined) {
            historyRecord.packagingCost = parseFloat(packagingCost) || 0;
        }
        
        // 2. Update dates ONLY if provided
        // We removed the 'else' block. If validTill is missing, we KEEP the existing value (e.g., Infinite).
        if (validFrom) {
            const newFrom = new Date(validFrom);
            if (isNaN(newFrom.getTime())) {
                return res.status(400).json({ message: "Invalid validFrom date format" });
            }
            historyRecord.validFrom = newFrom;
        }

        // 3. Safety Check: Ensure From < Till
        if (historyRecord.validFrom > historyRecord.validTill) {
            return res.status(400).json({ 
                message: "validFrom cannot be later than validTill" 
            });
        }
        
        await historyRecord.save();

        // ✅ AUDIT LOG
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "UPDATE",
                "Mappings",
                `Updated history for SKU: ${historyRecord.sku}. Dates updated. Prices: ${oldMfg} -> ${historyRecord.manufacturingPrice}`,
                historyRecord.gstin
            );
        }

        res.status(200).json(historyRecord);

    } catch (error: any) {
        console.error("UPDATE HISTORY ERROR:", error);
        res.status(500).json({ message: 'Failed to update history record', error: error.message });
    }
};