import { Request, Response } from 'express';
import { SkuMapping } from '../models/skuMapping.model';
import { SkuMappingHistory } from '../models/SkuMappingHistory.model';
import PaymentHistory from '../models/PaymentHistory.model';
import ReturnOrder from '../models/returnOrder.model';
import { logAction } from '../utils/logger'; 

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

        // ✅ SECURITY FIX: Force String to prevent P&L Data Leak
        const safeGstin = String(gstin);

        // 1. Fetch History
        const inventoryItems = await SkuMappingHistory.find({ gstin: safeGstin })
            .select('sku manufacturingPrice packagingCost updatedAt')
            .lean();

        // 2. Build Map
        type ProductRecord = {
            cp: number;
            pkg: number;
            orderDate: Date;
        };

        const productMap = new Map<string, ProductRecord[]>();

        inventoryItems.forEach((item: any) => {
            if (!item.sku) return;
            const sku = item.sku.trim().toLowerCase();

            const record: ProductRecord = {
                cp: Number(item.manufacturingPrice) || 0,
                pkg: Number(item.packagingCost) || 0,
                orderDate: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            };

            if (!productMap.has(sku)) productMap.set(sku, []);
            productMap.get(sku)!.push(record);
        });

        // 3. Sort Lists by Date
        for (const list of productMap.values()) {
            list.sort((a, b) => a.orderDate.getTime() - b.orderDate.getTime());
        }

        // --- Helper: Binary Search ---
        function findPriceAtDate(records: ProductRecord[], targetDate: Date) {
            if (records.length === 0) return { cp: 0, pkg: 0 };

            let l = 0, r = records.length;
            while (l < r) {
                const mid = (l + r) >> 1;
                if (records[mid].orderDate < targetDate) l = mid + 1;
                else r = mid;
            }
            
            if (l === 0) {
                return records[0]; 
            } else {
                return records[l - 1];
            }
        }

        // ✅ SECURITY FIX: Use safeGstin here too
        const returnOrders = await ReturnOrder.find({ businessGstin: safeGstin })
            .select('subOrderNo verificationStatus notes')
            .lean();

        const damageMap = new Map<string, boolean>();

        returnOrders.forEach((r: any) => {
             const subOrderId = String(r.subOrderNo || '').trim();
             const status = String(r.verificationStatus || '').toLowerCase();
             const notes = String(r.notes || '').toLowerCase();

             const isDamaged = 
                status.includes('damaged') ||   
                status === 'undelivered' ||     
                notes.includes('damaged');      

             damageMap.set(subOrderId, isDamaged);
        });

        // ✅ SECURITY FIX: Use safeGstin here too
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
                totalNetOrderAmount += settlementAmount;

                const sheetSku = String((order as any)['Supplier SKU'] || '').trim();
                const sheetSkuNormalized = sheetSku.toLowerCase();
                const subOrderNo = String((order as any)['Sub Order No'] || '').trim();
                const orderDateStr = String((order as any)['Order Date'] || '').trim();
                const orderDate = parseOrderDate(orderDateStr) || new Date();

                if (productMap.has(sheetSkuNormalized)) {
                    const records = productMap.get(sheetSkuNormalized)!;
                    const { cp, pkg } = findPriceAtDate(records, orderDate);

                    const status = String((order as any)['Live Order Status'] || '').toLowerCase();
                    const quantity = Number((order as any)['Quantity'] || 1);
                    const isDamaged = damageMap.get(subOrderNo) || false;

                    const standardCOGS = cp * quantity;
                    totalCOGS += standardCOGS;

                    let actualDeduction = 0;
                    if (status.includes('delivered') || status.includes('shipped')) {
                        actualDeduction = cp * quantity;
                    } else if (status.includes('return') || status.includes('rto')) {
                        actualDeduction = isDamaged ? (pkg + cp) * quantity : pkg * quantity;
                    }

                    const profit = settlementAmount - actualDeduction;
                    const itemMargin = settlementAmount !== 0 ? (profit / Math.abs(settlementAmount)) * 100 : 0;

                    totalRevenue += settlementAmount;
                    totalProfit += profit;

                    matchedOrders.push({
                        ...order,
                        _isInventoryMatched: true,
                        _matchedSku: sheetSku,
                        costPrice: cp,
                        packagingCost: pkg,
                        _isDamaged: isDamaged,
                        profit,
                        marginPercent: itemMargin.toFixed(2) + "%",
                        _matchInfo: "SKU History Lookup"
                    });
                } else {
                    unmatchedCount++;
                }
            }
        }

        const profitMargin = totalRevenue !== 0 ? (totalProfit / totalRevenue) * 100 : 0;

        // ✅ AUDIT LOG: P&L Report Generated
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "PROCESS", 
                "ProfiteLoss", 
                `Generated P&L Report for GSTIN: ${safeGstin}. Revenue: ${totalRevenue.toFixed(2)}, Profit: ${totalProfit.toFixed(2)}`,
                safeGstin // 👈 Use safeGstin here too
            );
        }

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