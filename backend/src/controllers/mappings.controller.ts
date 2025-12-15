import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import PaymentHistory from '../models/PaymentHistory.model';
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

export const getInventoryMatchedOrders = async (req: Request, res: Response) => {
    try {
        const { gstin } = req.query;
        if (!gstin) return res.status(400).json({ message: 'GSTIN is required.' });

        console.log("🔄 Starting P&L Match for GSTIN:", gstin);

        // ---------------------------------------------------------
        // 1. Fetch SKU Data (Price & Packaging) DIRECTLY
        // ---------------------------------------------------------
        const inventoryItems = await SkuMapping.find({ gstin: gstin as string })
            .select('sku manufacturingPrice packagingCost') 
            .lean(); 

        // Create a fast lookup map: SKU -> { cost, packaging }
        const productMap = new Map<string, { cp: number, pkg: number }>();
        const validSkuSet = new Set<string>();

        inventoryItems.forEach((item: any) => {
            if (item.sku) {
                const normalizedSku = item.sku.trim().toLowerCase();
                validSkuSet.add(normalizedSku);
                
                productMap.set(normalizedSku, {
                    cp: Number(item.manufacturingPrice) || 0, // Gets 562 from your schema
                    pkg: Number(item.packagingCost) || 0      // Gets 12 from your schema
                });
            }
        });

        // ---------------------------------------------------------
        // 2. Fetch ReturnOrders (For Damaged Status)
        // ---------------------------------------------------------
        const returnOrders = await ReturnOrder.find({ businessGstin: gstin as string }).select('subOrderNo verificationStatus notes').lean();
        const damageMap = new Map<string, boolean>();
        
        returnOrders.forEach((r: any) => {
            const subOrderId = String(r.subOrderNo || '').trim();
            const isDamaged = (r.verificationStatus === 'Damaged') || 
                              (r.verificationStatus === 'Undelivered') || 
                              (String(r.notes).toLowerCase().includes('damaged'));
            damageMap.set(subOrderId, isDamaged);
        });

        // ---------------------------------------------------------
        // 3. Fetch Payment History & Calculate
        // ---------------------------------------------------------
        const histories = await PaymentHistory.find({ businessGstin: gstin as string }).lean();

        let matchedOrders: any[] = [];
        let unmatchedCount = 0;
        
        // Stats
        let totalNetOrderAmount = 0;
        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalProfit = 0;

        for (const history of histories) {
            if (!history.rawOrderPayments || !Array.isArray(history.rawOrderPayments)) continue;

            for (const order of history.rawOrderPayments) {
                const settlementAmount = cleanNumber((order as any)['Final Settlement Amount']);
                totalNetOrderAmount += settlementAmount;

                const sheetSku = String((order as any)['Supplier SKU'] || '').trim();
                const sheetSkuNormalized = sheetSku.toLowerCase();
                const subOrderNo = String((order as any)['Sub Order No'] || '').trim();

                if (validSkuSet.has(sheetSkuNormalized)) {
                    
                    // --- GET DATA FROM MAP ---
                    const productData = productMap.get(sheetSkuNormalized);
                    const costPrice = productData?.cp || 0;     // No more 0!
                    const packagingCost = productData?.pkg || 0;

                    const status = String((order as any)['Live Order Status'] || '').toLowerCase();
                    const quantity = Number((order as any)['Quantity'] || 1);
                    const isDamaged = damageMap.get(subOrderNo) || false;

                    // --- CALC 1: COGS ---
                    const standardCOGS = costPrice * quantity;
                    totalCOGS += standardCOGS;

                    // --- CALC 2: PROFIT ---
                    let actualDeduction = 0; 

                    if (status.includes('delivered') || status.includes('shipped')) {
                        actualDeduction = costPrice * quantity;
                    } 
                    else if (status.includes('return')) {
                        actualDeduction = isDamaged ? (packagingCost + costPrice) * quantity : packagingCost * quantity;
                    }
                    else if (status.includes('rto')) {
                        actualDeduction = isDamaged ? (packagingCost + costPrice) * quantity : packagingCost * quantity;
                    }

                    const profit = settlementAmount - actualDeduction;
                    const itemMargin = settlementAmount !== 0 ? (profit / Math.abs(settlementAmount)) * 100 : 0;

                    totalRevenue += settlementAmount;
                    totalProfit += profit;

                    matchedOrders.push({
                        ...order, 
                        _isInventoryMatched: true,
                        _matchedSku: sheetSku,
                        costPrice: costPrice,
                        packagingCost: packagingCost,
                        _isDamaged: isDamaged,
                        profit: profit,
                        marginPercent: itemMargin.toFixed(2) + "%",
                        _matchInfo: "Direct SKU Map"
                    });
                } else {
                    unmatchedCount++;
                }
            }
        }

        const profitMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;

        res.status(200).json({
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