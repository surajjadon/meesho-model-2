import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { SkuMappingHistory } from '../models/SkuMappingHistory.model'; 
import { UnmappedSku } from '../models/unmappedSku.model';
import LabelData from '../models/labelData.model'; 
import { logAction } from '../utils/logger'; // ✅ Imported Logger

// GET /mappings/check-sku/:sku
export const checkSku = async (req: Request, res: Response) => {
    const { sku } = req.params;
    const { gstin } = req.query;

    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    try {
        const existingMapping = await SkuMapping.findOne({ 
            gstin: gstin as string, 
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

    try {
        const mappings = await SkuMapping.find({ gstin: gstin as string })
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
    
    const sanitizedSku = sku.trim();
    const cleanMfgPrice = parseFloat(manufacturingPrice) || 0;
    const cleanPackagingCost = parseFloat(packagingCost) || 0;

    try {
        const existingMapping = await SkuMapping.findOne({ gstin, sku: sanitizedSku });
        if (existingMapping) {
            return res.status(409).json({ message: `A mapping for SKU "${sanitizedSku}" already exists.` });
        }

        const newMapping = await SkuMapping.create({ 
            gstin, 
            sku: sanitizedSku,
            manufacturingPrice: cleanMfgPrice,
            packagingCost: cleanPackagingCost,
            mappedProducts 
        });
       
       await SkuMappingHistory.create({
            skuMappingId: newMapping._id, 
            gstin, 
            sku: sanitizedSku,
            manufacturingPrice: cleanMfgPrice,
            packagingCost: cleanPackagingCost,
            updatedAt: new Date() 
        });

        
        await UnmappedSku.updateMany(
            { gstin, sku: sanitizedSku, status: 'pending' }, 
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
                gstin // 👈 6th Argument
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

    try {
        const usedSkus = await LabelData.distinct('sku', { 
            businessGstin: { $eq: gstin as string } 
        });

        const mappedSkusDocs = await SkuMapping.find({ 
            gstin: { $eq: gstin as string } 
        }).select('sku');
        
        const mappedSkusSet = new Set(mappedSkusDocs.map(m => m.sku));

        const unmapped = usedSkus.filter((sku: string) => 
            sku && sku.trim() !== '' && !mappedSkusSet.has(sku)
        );
        
        const legacyUnmapped = await UnmappedSku.find({ 
            gstin: { $eq: gstin as string }, 
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

    const sanitizedSku = sku.trim();

    try {
        // 1. Check for conflicts
        const conflictingMapping = await SkuMapping.findOne({ 
            gstin, 
            sku: sanitizedSku, 
            _id: { $ne: id } 
        });

        if (conflictingMapping) {
            return res.status(409).json({ message: `SKU "${sanitizedSku}" is already in use by another mapping.` });
        }

        // 2. Find the EXISTING mapping (The "Old" Data)
        const oldMapping = await SkuMapping.findById(id);
        if (!oldMapping) {
            return res.status(404).json({ message: "Mapping not found." });
        }

        // 3. Save "Old" Data to History
        await SkuMappingHistory.create({
            skuMappingId: oldMapping._id,
            gstin: oldMapping.gstin,
            sku: oldMapping.sku,
            manufacturingPrice: oldMapping.manufacturingPrice,
            packagingCost: oldMapping.packagingCost,
            updatedAt: new Date() // Sets the timestamp to right now
        });

        // 4. Perform the Update
        const updateData = {
            sku: sanitizedSku,
            manufacturingPrice: parseFloat(manufacturingPrice) || 0,
            packagingCost: parseFloat(packagingCost) || 0,
            mappedProducts
        };

        const updatedMapping = await SkuMapping.findByIdAndUpdate(id, updateData, { new: true })
            .populate('mappedProducts.inventoryItem', 'title stock');

        // ✅ AUDIT LOG: Mapping Updated
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "UPDATE",
                "Mappings",
                `Updated mapping for SKU: ${sanitizedSku} (New Mfg: ${updateData.manufacturingPrice}, New Pkg: ${updateData.packagingCost})`,
                gstin // 👈 6th Argument
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

    try {
        const mappingToDelete = await SkuMapping.findOne({ _id: id, gstin });

        if (!mappingToDelete) {
            return res.status(404).json({ message: "Mapping not found or you do not have permission to delete it." });
        }

        await SkuMappingHistory.deleteMany({ skuMappingId: id });
        await SkuMapping.findByIdAndDelete(id);

        await UnmappedSku.updateMany(
            { gstin, sku: mappingToDelete.sku, status: 'mapped' },
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
                gstin // 👈 6th Argument
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
        // Note: GSTIN is stored inside the history record
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