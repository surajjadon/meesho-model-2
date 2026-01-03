import { Request, Response } from 'express';
import PaymentHistory from '../models/PaymentHistory.model';
import { SkuMapping } from '../models/skuMapping.model';
import ReturnOrder from '../models/returnOrder.model';
import { logAction } from '../utils/logger'; 

// --- Helpers ---
const cleanNumber = (v: any): number => {
    if (v === undefined || v === null || v === '') return 0;
    return parseFloat(String(v).replace(/[₹,]/g, '')) || 0;
};

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

const getDateRange = (filter: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let start: Date, end: Date;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    switch (filter) {
        case 'Last Month':
            start = new Date(currentYear, currentMonth - 1, 1);
            end = new Date(currentYear, currentMonth, 0);
            break;
        case 'Last 3 Months':
            start = new Date(currentYear, currentMonth - 3, 1);
            end = endOfToday;
            break;
        case 'Year to Date':
            start = new Date(currentYear, 0, 1);
            end = endOfToday;
            break;
        case 'All Time':
            start = new Date(2000, 0, 1);
            end = endOfToday;
            break;
        case 'This Month':
        default:
            start = new Date(currentYear, currentMonth, 1);
            end = endOfToday;
            break;
    }
    start.setHours(0, 0, 0, 0); end.setHours(23, 59, 59, 999);
    return { start, end };
};

export const getPLSummary = async (req: Request, res: Response) => {
    try {
        const { gstin, timeFilter } = req.query;
        if (!gstin) return res.status(400).json({ message: 'GSTIN is required.' });

        // ✅ SECURITY FIX: Force String to prevent NoSQL Injection
        const safeGstin = String(gstin);

        const { start, end } = getDateRange(timeFilter as string || 'This Month');
        
        // 1. Fetch Data using safeGstin
        const histories = await PaymentHistory.find({ businessGstin: safeGstin });
        
        // 2. Pre-fetch Mappings & Returns using safeGstin
        const skuMappings = await SkuMapping.find({ gstin: safeGstin });
        const skuMap = new Map<string, { packagingCost: number, manufacturingPrice: number }>();
        skuMappings.forEach(m => {
            skuMap.set(m.sku.trim(), { 
                packagingCost: m.packagingCost || 0, 
                manufacturingPrice: m.manufacturingPrice || 0 
            });
        });

        const returnOrders = await ReturnOrder.find({ businessGstin: safeGstin });
        const returnMap = new Map<string, { isDamaged: boolean, verificationStatus: string }>();
        returnOrders.forEach(r => {
             // Check for "Damaged" status in Enum OR "Undelivered" OR notes
            const isDamaged = (r.verificationStatus as string) === 'Damaged' || 
                              r.verificationStatus === 'Undelivered' || 
                              (r.notes && r.notes.toLowerCase().includes('damaged'));
            
            returnMap.set(r.subOrderNo.trim(), { 
                isDamaged: isDamaged || false, 
                verificationStatus: r.verificationStatus 
            });
        });

        let currRevenue = 0, currExpenses = 0;
        
        // Detailed SKU Map for CSV
        const skuMonthlyPL = new Map<string, {
            month: string,
            sku: string,
            units: number,
            returnedUnits: number,
            rtoUnits: number,
            deliveredUnits: number,
            inTransitUnits: number, 
            netAmount: number,      
            cogs: number            
        }>();

        for (const history of histories) {
            if (!history.rawOrderPayments || !Array.isArray(history.rawOrderPayments)) continue;

            for (const order of history.rawOrderPayments) {
                const orderDate = parseOrderDate(order['Order Date']);
                if (!orderDate || orderDate < start || orderDate > end) continue;

                const sku = String(order['Supplier SKU'] || 'Unknown').trim();
                const subOrderId = String(order['Sub Order No'] || '').trim();
                const quantity = Number(order['Quantity'] || 1);
                const payout = cleanNumber(order['Final Settlement Amount']);
                const orderStatus = String(order['Live Order Status'] || '').toLowerCase();

                // Costs
                const mappingData = skuMap.get(sku);
                const packagingCost = (mappingData?.packagingCost || 0) * quantity;
                const costPrice = (mappingData?.manufacturingPrice || 0) * quantity;

                // Return/Damage Info
                const returnInfo = returnMap.get(subOrderId);
                const isDamaged = returnInfo?.isDamaged || false;

                let expense = 0;
                let isDelivered = false, isReturn = false, isRTO = false, isInTransit = false;

                // --- LOGIC ---
                if (orderStatus.includes('delivered')) {
                    isDelivered = true;
                    expense = costPrice; 
                } 
                else if (orderStatus.includes('shipped')) {
                    isInTransit = true;
                    expense = costPrice; 
                }
                else if (orderStatus.includes('return')) {
                    isReturn = true;
                    expense = isDamaged ? (packagingCost + costPrice) : packagingCost;
                } 
                else if (orderStatus.includes('rto')) {
                    isRTO = true;
                    expense = isDamaged ? (packagingCost + costPrice) : packagingCost;
                }
                else {
                    expense = 0;
                }

                // Totals
                currRevenue += payout;
                currExpenses += expense;

                // SKU Aggregation
                const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                const mapKey = `${monthKey}_${sku}`;

                if (!skuMonthlyPL.has(mapKey)) {
                    skuMonthlyPL.set(mapKey, {
                        month: monthKey,
                        sku,
                        units: 0,
                        returnedUnits: 0,
                        rtoUnits: 0,
                        deliveredUnits: 0,
                        inTransitUnits: 0,
                        netAmount: 0,
                        cogs: 0
                    });
                }

                const entry = skuMonthlyPL.get(mapKey)!;
                entry.units += quantity;
                if (isReturn) entry.returnedUnits += quantity;
                if (isRTO) entry.rtoUnits += quantity;
                if (isDelivered) entry.deliveredUnits += quantity;
                if (isInTransit) entry.inTransitUnits += quantity;
                
                entry.netAmount += payout;
                entry.cogs += expense;
            }
        }

        const currProfit = currRevenue - currExpenses;
        const currMargin = currRevenue !== 0 ? (currProfit / currRevenue) * 100 : 0;

        const kpiStats = {
            revenue: { value: currRevenue },
            expenses: { value: currExpenses },
            profit: { value: currProfit },
            margin: { value: currMargin }
        };

        const skuPLTable = Array.from(skuMonthlyPL.values()).map(item => {
            const profitLoss = item.netAmount - item.cogs;
            return {
                ...item,
                profit: profitLoss,
                margin: item.netAmount !== 0 ? (profitLoss / item.netAmount) * 100 : 0,
                costPerUnit: item.units > 0 ? (item.cogs / item.units) : 0,
                aspPerUnit: item.units > 0 ? (item.netAmount / item.units) : 0,
                unidentifiedUnits: 0,
                unmatchedUnits: 0
            };
        }).sort((a, b) => b.month.localeCompare(a.month));

        // ✅ AUDIT LOG: P&L Summary Generated
        if ((req as any).user) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "PROCESS", 
                "Reports", 
                `Generated P&L Summary for GSTIN: ${safeGstin} (${timeFilter || 'This Month'}). Rev: ${currRevenue.toFixed(2)}, Profit: ${currProfit.toFixed(2)}`,
                safeGstin // 👈 Use safeGstin
            );
        }

        res.status(200).json({ kpiStats, skuPL: skuPLTable });

    } catch (error: any) {
        console.error("❌ Error generating P/L Summary:", error);
        res.status(500).json({ message: 'Server error while generating P/L summary.' });
    }
};