import { Request, Response } from 'express';
import { InventoryItem } from '../models/inventoryItem.model';
import PaymentHistory from '../models/PaymentHistory.model';
import { StockHistory } from '../models/stockHistory.model';
import { SkuMapping } from '../models/skuMapping.model';
import ReturnOrder from '../models/returnOrder.model';

// --- Helper: Clean Numbers ---
const cleanNumber = (v: any): number => {
    if (v === undefined || v === null || v === '') return 0;
    return parseFloat(String(v).replace(/[₹,]/g, '')) || 0;
};

// --- Helper: Date Parser ---
const parseOrderDate = (dateStr: any): Date | null => {
    if (!dateStr) return null;
    let date = new Date(dateStr);
    if (!isNaN(date.getTime())) return date;
    
    if (typeof dateStr === 'string') {
        const parts = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (parts) {
            date = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`);
            if (!isNaN(date.getTime())) return date;
        }
    }
    return null;
};

// --- CONTROLLER: Standard COGS + Status-Based Profit ---
export const getInventoryMatchedOrders = async (req: Request, res: Response) => {
    try {
        const { gstin } = req.query;
        if (!gstin) return res.status(400).json({ message: 'GSTIN is required.' });

        console.log("🔄 Starting P&L Match for GSTIN:", gstin);

        // 1. Fetch Inventory Items
        const inventoryItems = await InventoryItem.find({ gstin: gstin as string })
            .select('hsnCode title _id').lean(); 

        const skuToIdMap = new Map<string, string>();
        const validSkuSet = new Set<string>();
        const inventoryIds: string[] = [];

        inventoryItems.forEach((item: any) => {
            if (item.hsnCode) {
                const normalizedSku = item.hsnCode.trim().toLowerCase();
                validSkuSet.add(normalizedSku);
                const idStr = String(item._id);
                skuToIdMap.set(normalizedSku, idStr);
                inventoryIds.push(idStr);
            }
        });

        // 2. Fetch Stock History (For CP)
        const allHistories = await StockHistory.find({
            inventoryItem: { $in: inventoryIds }
        })
        .sort({ updatedAt: 1 }) 
        .select('inventoryItem costPrice updatedAt').lean(); 

        const historyMap = new Map<string, any[]>();
        allHistories.forEach((h: any) => {
            const itemId = String(h.inventoryItem);
            if (!historyMap.has(itemId)) historyMap.set(itemId, []);
            historyMap.get(itemId)?.push(h);
        });

        // 3. Fetch SkuMapping (For Packaging Cost)
        const mappings = await SkuMapping.find({ gstin: gstin as string }).lean();
        const packagingMap = new Map<string, number>();
        mappings.forEach((m: any) => {
            if (m.sku) {
                packagingMap.set(m.sku.trim().toLowerCase(), m.packagingCost || 0);
            }
        });

        // 4. Fetch ReturnOrders (For Damaged Status)
        const returnOrders = await ReturnOrder.find({ businessGstin: gstin as string }).lean();
        const damageMap = new Map<string, boolean>();
        returnOrders.forEach((r: any) => {
            const subOrderId = String(r.subOrderNo || '').trim();
            const isDamaged = (r.verificationStatus === 'Damaged') || 
                              (r.verificationStatus === 'Undelivered') || 
                              (String(r.notes).toLowerCase().includes('damaged'));
            damageMap.set(subOrderId, isDamaged);
        });

        // 5. Fetch Payment History
        const histories = await PaymentHistory.find({ businessGstin: gstin as string }).lean();

        let matchedOrders: any[] = [];
        let unmatchedCount = 0;
        
        // 📊 GLOBAL STATS
        let totalNetOrderAmount = 0; // Sum of Final Settlement (All rows)
        let totalRevenue = 0;        // Sum of Final Settlement (Matched rows)
        let totalCOGS = 0;           // STRICTLY: Σ (CP × Qty)
        let totalProfit = 0;         // Sum of Calculated Profits (using rules)

        // 6. Loop & Calculate
        for (const history of histories) {
            if (!history.rawOrderPayments || !Array.isArray(history.rawOrderPayments)) continue;

            for (const order of history.rawOrderPayments) {
                const settlementAmount = cleanNumber((order as any)['Final Settlement Amount']);
                totalNetOrderAmount += settlementAmount;

                const sheetSku = String((order as any)['Supplier SKU'] || '').trim();
                const sheetSkuNormalized = sheetSku.toLowerCase();
                const subOrderNo = String((order as any)['Sub Order No'] || '').trim();

                if (validSkuSet.has(sheetSkuNormalized)) {
                    
                    const itemId = skuToIdMap.get(sheetSkuNormalized);
                    const orderDate = parseOrderDate((order as any)['Order Date']);
                    const status = String((order as any)['Live Order Status'] || '').toLowerCase();
                    const quantity = Number((order as any)['Quantity'] || 1);

                    // A. Get CP (Cost Price)
                    let costPrice = 0;
                    let priceFoundDate = null;
                    let matchInfo = "None";

                    if (itemId && orderDate && historyMap.has(itemId)) {
                        const itemHistory = historyMap.get(itemId) || [];
                        let foundEntry = null;
                        
                        for (const entry of itemHistory) {
                            if (new Date(entry.updatedAt) <= orderDate) foundEntry = entry;
                            else break;
                        }
                        if (!foundEntry && itemHistory.length > 0) {
                             foundEntry = itemHistory[0]; 
                             matchInfo = "Fallback (Oldest Available)";
                        }

                        if (foundEntry) {
                            costPrice = foundEntry.costPrice || 0;
                            priceFoundDate = foundEntry.updatedAt;
                        }
                    }

                    // B. Get Packaging Cost & Damaged Status
                    const packagingCost = packagingMap.get(sheetSkuNormalized) || 0;
                    const isDamaged = damageMap.get(subOrderNo) || false;

                    // --- 📊 STAT 1: TOTAL COGS ---
                    // Definition: COGS = CP * Qty (Applied to ALL matched orders)
                    const standardCOGS = costPrice * quantity;
                    totalCOGS += standardCOGS;

                    // --- 💰 STAT 2: PROFIT (Using Status Rules) ---
                    let actualDeduction = 0; 

                    if (status.includes('delivered') || status.includes('shipped')) {
                        // Delivered: Payout - CP
                        // (Deduction is CP)
                        actualDeduction = costPrice * quantity;
                    } 
                    else if (status.includes('return')) {
                        if (isDamaged) {
                            // Return (Damaged): Payout - Pkg - CP
                            actualDeduction = (packagingCost + costPrice) * quantity;
                        } else {
                            // Return (Good): Payout - Pkg
                            actualDeduction = packagingCost * quantity;
                        }
                    }
                    else if (status.includes('rto')) {
                        if (isDamaged) {
                            // RTO (Damaged): Payout - Pkg - CP
                            actualDeduction = (packagingCost + costPrice) * quantity;
                        } else {
                            // RTO (Good): Payout - Pkg
                            actualDeduction = packagingCost * quantity;
                        }
                    }

                    // Calculate Profit
                    const profit = settlementAmount - actualDeduction;
                    const itemMargin = settlementAmount !== 0 ? (profit / Math.abs(settlementAmount)) * 100 : 0;

                    // Add to Totals
                    totalRevenue += settlementAmount;
                    totalProfit += profit;

                    matchedOrders.push({
                        ...order, 
                        _isInventoryMatched: true,
                        _matchedSku: sheetSku,
                        costPrice: costPrice,
                        packagingCost: packagingCost,
                        _isDamaged: isDamaged,
                        
                        // Financials
                        profit: profit,
                        marginPercent: itemMargin.toFixed(2) + "%",
                        
                        // Debugging
                        _priceFoundDate: priceFoundDate,
                        _matchInfo: matchInfo
                    });
                } else {
                    unmatchedCount++;
                }
            }
        }

        const profitMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;

        console.log(`✅ P&L Generated. Total Net Order Amount: ₹${totalNetOrderAmount.toFixed(2)}`);

        res.status(200).json({
            stats: {
                totalNetOrderAmount: Number(totalNetOrderAmount.toFixed(2)),
                totalRevenue: Number(totalRevenue.toFixed(2)),
                totalCOGS: Number(totalCOGS.toFixed(2)), // ✅ EXACTLY Σ (CP × Qty)
                totalProfit: Number(totalProfit.toFixed(2)), // ✅ Sum of Formula-based Profits
                profitMargin: Number(profitMargin.toFixed(2)) + "%"
            },
            count: matchedOrders.length,
            unmatchedCount: unmatchedCount,
            orders: matchedOrders
        });

    } catch (error: any) {
        console.error("❌ Error generating P&L:", error);
        res.status(500).json({ message: 'Server error.', error: error.message });
    }
};