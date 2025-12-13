import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { UnmappedSku } from '../models/unmappedSku.model';
import LabelData from '../models/labelData.model'; 

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
        
        await UnmappedSku.updateMany(
            { gstin, sku: sanitizedSku, status: 'pending' }, 
            { $set: { status: 'mapped' } }
        );

        const populatedMapping = await SkuMapping.findById(newMapping._id)
            .populate('mappedProducts.inventoryItem', 'title stock');
        
        res.status(201).json(populatedMapping);

    } catch (error: any) {
        console.error("CREATE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// ✅ FIXED: GET UNMAPPED SKUS (Strict GSTIN Filtering)
export const getUnmappedSkus = async (req: Request, res: Response) => {
    const { gstin } = req.query;
    if (!gstin) return res.status(400).json({ message: 'GSTIN is required' });

    try {
        // console.log(`🔍 Fetching unmapped SKUs strictly for GSTIN: "${gstin}"`);

        // 1. Get distinct SKUs from LabelData ONLY for this specific GSTIN
        const usedSkus = await LabelData.distinct('sku', { 
            businessGstin: { $eq: gstin as string } // Strict equality check
        });

        // 2. Get mapped SKUs ONLY for this specific GSTIN
        const mappedSkusDocs = await SkuMapping.find({ 
            gstin: { $eq: gstin as string } 
        }).select('sku');
        
        const mappedSkusSet = new Set(mappedSkusDocs.map(m => m.sku));

        // 3. Filter (Find Used but Not Mapped)
        const unmapped = usedSkus.filter((sku: string) => 
            sku && sku.trim() !== '' && !mappedSkusSet.has(sku)
        );
        
        // 4. Include legacy UnmappedSku collection (Strictly for this GSTIN)
        const legacyUnmapped = await UnmappedSku.find({ 
            gstin: { $eq: gstin as string }, 
            status: 'pending' 
        }).distinct('sku');

        // Combine unique results
        const finalUnmapped = Array.from(new Set([...unmapped, ...legacyUnmapped])).sort();

        // console.log(`✅ Found ${finalUnmapped.length} unmapped SKUs for ${gstin}`);
        res.json(finalUnmapped);

    } catch (error: any) {
        console.error("GET UNMAPPED SKU ERROR:", error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
}

// PUT /mappings/:id
export const updateMapping = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { gstin, sku, manufacturingPrice, packagingCost, mappedProducts } = req.body;

    if (!gstin || !sku || !mappedProducts || !Array.isArray(mappedProducts) || mappedProducts.length === 0) {
        return res.status(400).json({ message: 'GSTIN, SKU, and at least one mapped product are required' });
    }

    const sanitizedSku = sku.trim();

    try {
        const conflictingMapping = await SkuMapping.findOne({ 
            gstin, 
            sku: sanitizedSku,
            _id: { $ne: id } 
        });

        if (conflictingMapping) {
            return res.status(409).json({ message: `SKU "${sanitizedSku}" is already in use by another mapping.` });
        }

        const updateData = {
            sku: sanitizedSku,
            manufacturingPrice: parseFloat(manufacturingPrice) || 0,
            packagingCost: parseFloat(packagingCost) || 0,
            mappedProducts
        };

        const updatedMapping = await SkuMapping.findByIdAndUpdate(id, updateData, { new: true })
            .populate('mappedProducts.inventoryItem', 'title stock');

        if (!updatedMapping) {
            return res.status(404).json({ message: "Mapping not found." });
        }

        res.status(200).json(updatedMapping);

    } catch (error: any)  {
        console.error("UPDATE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error while updating mapping.', error: error.message });
    }
};

// DELETE /mappings/:id
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

        await SkuMapping.findByIdAndDelete(id);

        await UnmappedSku.updateMany(
            { gstin, sku: mappingToDelete.sku, status: 'mapped' },
            { $set: { status: 'pending' } }
        );

        res.status(200).json({ message: "Mapping deleted successfully." });

    } catch (error: any) {
        console.error("DELETE MAPPING ERROR:", error);
        res.status(500).json({ message: 'Server Error while deleting mapping.', error: error.message });
    }
};