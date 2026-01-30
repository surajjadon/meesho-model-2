import { Request, Response } from 'express';
import PaymentHistory from '../models/PaymentHistory.model';
import ReturnOrder from '../models/returnOrder.model';
import { logAction } from '../utils/logger'; 
import { OrderData } from '../models/OrderData.model';
import { unmappedskufromprofitloss } from '../models/unmappedskufromprofitloss.model';

// --- Helper: Clean Numbers ---
const cleanNumber = (v: any): number => {
    if (v === undefined || v === null || v === '') return 0;
    return parseFloat(String(v).replace(/[₹,]/g, '')) || 0;
};

export const getInventoryMatchedOrders = async (req: Request, res: Response) => {
    try {
        const { gstin } = req.query;
        if (!gstin) return res.status(400).json({ message: 'GSTIN is required.' });

        const safeGstin = String(gstin);

        // 1. Check for Unmapped SKUs (But DO NOT BLOCK execution)
        const pendingUnmapped = await unmappedskufromprofitloss.find({
            gstin: safeGstin,
            status: 'pending'
        }).select('sku').lean();

        const pendingSkuSet = new Set(pendingUnmapped.map((item: any) => item.sku));
        const pendingSkuList = Array.from(pendingSkuSet);

        // 2. Fetch Order Data (Inventory Costs)
        const inventoryItems = await OrderData.find({
            gstin: safeGstin,
            packagingCost: { $gt: 0 }
        })
        .select('packagingCost orderDate batchConsumption products')
        .lean();

        type CostRecord = {
            totalCost: number; 
            pkg: number;
        };

        const costMap = new Map<string, CostRecord>();

        inventoryItems.forEach((item: any) => {
            let totalBatchCost = 0;
            if (item.batchConsumption && Array.isArray(item.batchConsumption)) {
                item.batchConsumption.forEach((b: any) => {
                    totalBatchCost += (b.costPerUnit * b.qtyConsumed);
                });
            }

            if (item.products && item.products.length > 0) {
                const subOrderNo = item.products[0].orderNo; 
                if (subOrderNo) {
                    costMap.set(String(subOrderNo).trim(), {
                        totalCost: Number(totalBatchCost) || 0,
                        pkg: Number(item.packagingCost) || 0
                    });
                }
            }
        });

        // 3. Prepare Return/Damage Data
        const returnOrders = await ReturnOrder.find({ businessGstin: safeGstin })
            .select('subOrderNo verificationStatus notes')
            .lean();

        const damageMap = new Map<string, boolean>();
        returnOrders.forEach((r: any) => {
             const subOrderId = String(r.subOrderNo || '').trim();
             const status = String(r.verificationStatus || '').toLowerCase();
             const notes = String(r.notes || '').toLowerCase();
             const isDamaged = status.includes('damaged') || status === 'undelivered' || notes.includes('damaged');      
             damageMap.set(subOrderId, isDamaged);
        });

        // 4. Process Payment History
        const histories = await PaymentHistory.find({ businessGstin: safeGstin }).lean();
        
        let matchedOrders: any[] = [];
        let unmatchedCount = 0;
        let totalNetOrderAmount = 0;
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalProfit = 0;

        for (const history of histories) {
            if (!history.rawOrderPayments || !Array.isArray(history.rawOrderPayments)) continue;

            for (const order of history.rawOrderPayments) {
                const settlementAmount = cleanNumber((order as any)['Final Settlement Amount']);
                const sheetSku = String((order as any)['Supplier SKU'] || '').trim();
                const subOrderNo = String((order as any)['Sub Order No'] || '').trim(); 
                const status = String((order as any)['Live Order Status'] || '').toLowerCase();
                
                // Track total Settlement received regardless of mapping
                totalNetOrderAmount += settlementAmount;

                // CHECK 1: Is this SKU Unmapped?
                const isUnmappedSku = pendingSkuSet.has(sheetSku);

                if (costMap.has(subOrderNo)) {
                    // --- CASE A: MAPPED & CALCULATED ---
                    const costs = costMap.get(subOrderNo)!
                    const totalCostForLine = costs.totalCost;
                    const pkg = costs.pkg;
                    const isDamaged = damageMap.get(subOrderNo) || false;

                    totalCOGS += totalCostForLine; 

                    let actualDeduction = 0;
                    if (status.includes('delivered') || status.includes('shipped')) {
                        actualDeduction = totalCostForLine + pkg; 
                    } else if (status.includes('return') || status.includes('rto')) {
                        actualDeduction = isDamaged ? (totalCostForLine + pkg) : pkg;
                    }

                    const profit = settlementAmount - actualDeduction;
                    const itemMargin = settlementAmount !== 0 ? (profit / Math.abs(settlementAmount)) * 100 : 0;

                    totalRevenue += settlementAmount;
                    totalProfit += profit;

                    matchedOrders.push({
                        ...order,
                        _isInventoryMatched: true,
                        _needsMapping: false, // It is mapped
                        _matchedSku: sheetSku,
                        costPrice: totalCostForLine,
                        packagingCost: pkg,
                        _isDamaged: isDamaged,
                        profit,
                        marginPercent: itemMargin.toFixed(2) + "%",
                    });

                } else if (isUnmappedSku) {
                    // --- CASE B: UNMAPPED (Show in table, but flag it) ---
                    // We push it to matchedOrders so the frontend renders the row
                    // But we flag `_needsMapping: true`
                    matchedOrders.push({
                        ...order,
                        _isInventoryMatched: false,
                        _needsMapping: true, // This triggers the "Map NOW" button
                        _matchedSku: sheetSku,
                        costPrice: 0,
                        packagingCost: 0,
                        profit: 0, 
                        marginPercent: "0%",
                    });
                } else {
                    // --- CASE C: TRULY UNMATCHED (Maybe data missing, not in unmapped list yet) ---
                    unmatchedCount++;
                }
            }
        }

        const profitMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // Audit Log
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "PROCESS", 
                "ProfiteLoss", 
                `Generated P&L Report for GSTIN: ${safeGstin}. Revenue: ${totalRevenue.toFixed(2)}`,
                safeGstin
            );
        }

        // Return BOTH the data AND the action requirement
        res.status(200).json({
            actionRequired: pendingSkuList.length > 0 ? "MAP_SKUS" : "NONE",
            pendingSkus: pendingSkuList,
            stats: {
                totalNetOrderAmount,
                totalRevenue,
                totalCOGS,
                totalProfit,
                profitMargin: Number(profitMargin.toFixed(2)) + "%"
            },
            count: matchedOrders.length,
            unmatchedCount,
            orders: matchedOrders
        });

    } catch (error: any) {
        console.error("❌ Error generating P&L:", error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};