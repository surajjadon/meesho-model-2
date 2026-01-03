import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { SkuMappingHistory } from '../models/SkuMappingHistory.model'; 
import { UnmappedSku } from '../models/unmappedSku.model';
import LabelData from '../models/labelData.model'; 
import { logAction } from '../utils/logger';

// GET /mappings/check-sku/:sku
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
export const getMappings = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    // ✅ SECURITY FIX: Force string
    const safeGstin = String(gstin);

    try {
        const mappings = await SkuMapping.find({ gstin: safeGstin })
            .populate('mappedProducts.inventoryItem', 'title stock')
            .sort({ createdAt: -1 });
        res.json(mappings);
    } catch (error: any) {
        console.error("GET MAPPINGS ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// --- NEW: GET /mappings/history/:id ---
export const getMappingHistory = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const history = await SkuMappingHistory.find({ skuMappingId: id })
            .sort({ updatedAt: -1 });
        
        res.status(200).json(history);
    } catch (error: any) {
        console.error("GET HISTORY ERROR:", error);
        res.status(500).json({ message: 'Server Error fetching history', error: error.message });
    }
}

// POST /mappings
export const createMapping = async (req: Request, res: Response) => {
    const { gstin, sku, manufacturingPrice, packagingCost, mappedProducts } = req.body;

    if (!gstin || !sku || !mappedProducts || !Array.isArray(mappedProducts) || mappedProducts.length === 0) {
        return res.status(400).json({ message: 'GSTIN, SKU, and at least one mapped product are required' });
    }
    
    // Note: req.body inputs are generally handled by Mongoose Schema validation, 
    // but sanitized strings are always safer.
    const safeGstin = String(gstin); 
    const sanitizedSku = sku.trim();
    const cleanMfgPrice = parseFloat(manufacturingPrice) || 0;
    const cleanPackagingCost = parseFloat(packagingCost) || 0;

    try {
        const existingMapping = await SkuMapping.findOne({ gstin: safeGstin, sku: sanitizedSku });
        if (existingMapping) {
            return res.status(409).json({ message: `A mapping for SKU "${sanitizedSku}" already exists.` });
        }

        const newMapping = await SkuMapping.create({ 
            gstin: safeGstin, 
            sku: sanitizedSku,
            manufacturingPrice: cleanMfgPrice,
            packagingCost: cleanPackagingCost,
            mappedProducts 
        });
       
       await SkuMappingHistory.create({
            skuMappingId: newMapping._id, 
            gstin: safeGstin, 
            sku: sanitizedSku,
            manufacturingPrice: cleanMfgPrice,
            packagingCost: cleanPackagingCost,
            updatedAt: new Date() 
        });

        
        await UnmappedSku.updateMany(
            { gstin: safeGstin, sku: sanitizedSku, status: 'pending' }, 
            { $set: { status: 'mapped' } }
        );

        const populatedMapping = await SkuMapping.findById(newMapping._id)
            .populate('mappedProducts.inventoryItem', 'title stock');
        
        // ✅ AUDIT LOG: Mapping Created
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "CREATE",
                "Mappings",
                `Created SKU mapping: ${sanitizedSku} (Mfg: ${cleanMfgPrice}, Pkg: ${cleanPackagingCost})`,
                safeGstin // 👈 6th Argument
            );
        }

        res.status(201).json(populatedMapping);

    } catch (error: any) {
        console.error("CREATE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

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
export const updateMapping = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { gstin, sku, manufacturingPrice, packagingCost, mappedProducts } = req.body;

    if (!gstin || !sku || !mappedProducts || !Array.isArray(mappedProducts) || mappedProducts.length === 0) {
        return res.status(400).json({ message: 'GSTIN, SKU, and at least one mapped product are required' });
    }

    const safeGstin = String(gstin);
    const sanitizedSku = sku.trim();

    try {
        // 1. Check for conflicts (Ensure SKU isn't taken by another mapping)
        const conflictingMapping = await SkuMapping.findOne({ 
            gstin: safeGstin, 
            sku: sanitizedSku, 
            _id: { $ne: id } 
        });

        if (conflictingMapping) {
            return res.status(409).json({ message: `SKU "${sanitizedSku}" is already in use by another mapping.` });
        }

        // 2. Verify existence (We still need to ensure the ID exists before updating)
        const existingMapping = await SkuMapping.findById(id);
        if (!existingMapping) {
            return res.status(404).json({ message: "Mapping not found." });
        }

        // --- CHANGED SECTION START ---

        // 3. Perform the Update FIRST
        const updateData = {
            sku: sanitizedSku,
            manufacturingPrice: parseFloat(manufacturingPrice) || 0,
            packagingCost: parseFloat(packagingCost) || 0,
            mappedProducts
        };

        const updatedMapping = await SkuMapping.findByIdAndUpdate(id, updateData, { new: true })
            .populate('mappedProducts.inventoryItem', 'title stock');

        // 4. Create History Entry using the NEW (Updated) Data
        if (updatedMapping) {
            await SkuMappingHistory.create({
                skuMappingId: updatedMapping._id,
                gstin: updatedMapping.gstin, // Keeps consistency if gstin isn't editable
                sku: updatedMapping.sku,     // records the NEW sku
                manufacturingPrice: updatedMapping.manufacturingPrice, // records NEW price
                packagingCost: updatedMapping.packagingCost, // records NEW cost
                updatedAt: new Date()
            });
            console.log("✅ New history snapshot created with updated data");
        }

        // --- CHANGED SECTION END ---

        // ✅ AUDIT LOG: Mapping Updated
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "UPDATE",
                "Mappings",
                `Updated mapping for SKU: ${sanitizedSku} (New Mfg: ${updateData.manufacturingPrice}, New Pkg: ${updateData.packagingCost})`,
                safeGstin
            );
        }

        res.status(200).json(updatedMapping);

    } catch (error: any)  {
        console.error("UPDATE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error while updating mapping.', error: error.message });
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
    const { manufacturingPrice, packagingCost } = req.body;

    try {
        const historyRecord = await SkuMappingHistory.findById(historyId);

        if (!historyRecord) {
            return res.status(404).json({ message: "History record not found." });
        }

        const oldMfg = historyRecord.manufacturingPrice;
        const oldPkg = historyRecord.packagingCost;

        historyRecord.manufacturingPrice = parseFloat(manufacturingPrice) || 0;
        historyRecord.packagingCost = parseFloat(packagingCost) || 0;
        
        await historyRecord.save();

        // ✅ AUDIT LOG: History Record Fixed
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "UPDATE",
                "Mappings",
                `Updated historical costs for SKU: ${historyRecord.sku} (Date: ${new Date(historyRecord.updatedAt).toLocaleDateString()}). Msg: ${oldMfg}->${historyRecord.manufacturingPrice}, Pkg: ${oldPkg}->${historyRecord.packagingCost}`,
                historyRecord.gstin // 👈 6th Argument (from fetched record)
            );
        }

        res.status(200).json(historyRecord);

    } catch (error: any) {
        console.error("UPDATE HISTORY ERROR:", error);
        res.status(500).json({ message: 'Failed to update history record', error: error.message });
    }
};