import { Request, Response } from 'express';
import PaymentHistory from '../models/PaymentHistory.model';
import { InventoryItem } from '../models/inventoryItem.model';

// --- Helper 1: Clean Numbers ---
const cleanNumber = (v: any): number => {
  if (v === undefined || v === null || v === '') return 0;
  // Remove commas and currency symbols, convert to float
  return parseFloat(String(v).replace(/[₹,]/g, '')) || 0;
};

// --- Helper 2: Robust Date Parser (Handles DD-MM-YYYY and YYYY-MM-DD) ---
const parseOrderDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  
  // Try standard parse first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;

  // Try parsing DD-MM-YYYY or DD/MM/YYYY (Common in Indian CSVs)
  if (typeof dateStr === 'string') {
    const parts = dateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (parts) {
      // parts[1] = Day, parts[2] = Month, parts[3] = Year
      date = new Date(`${parts[3]}-${parts[2]}-${parts[1]}`); // Convert to YYYY-MM-DD
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
};

// --- Helper 3: Get Date Range ---
const getDateRange = (filter: string) => {
  const now = new Date();
  // Reset to start of day to avoid timezone offset issues on the current day
  now.setHours(0,0,0,0);
  
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  // Default End Date is "End of Today"
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  switch (filter) {
    case 'Last Month':
      start = new Date(currentYear, currentMonth - 1, 1);
      end = new Date(currentYear, currentMonth, 0);
      prevStart = new Date(currentYear, currentMonth - 2, 1);
      prevEnd = new Date(currentYear, currentMonth - 1, 0);
      break;
    case 'Last 3 Months':
      start = new Date(currentYear, currentMonth - 3, 1);
      end = endOfToday;
      prevStart = new Date(currentYear, currentMonth - 6, 1);
      prevEnd = new Date(currentYear, currentMonth - 3, 0);
      break;
    case 'Last 6 Months':
      start = new Date(currentYear, currentMonth - 6, 1);
      end = endOfToday;
      prevStart = new Date(currentYear, currentMonth - 12, 1);
      prevEnd = new Date(currentYear, currentMonth - 6, 0);
      break;
    case 'Year to Date':
      start = new Date(currentYear, 0, 1); // Jan 1
      end = endOfToday;
      prevStart = new Date(currentYear - 1, 0, 1);
      prevEnd = new Date(currentYear - 1, 11, 31);
      break;
    case 'All Time':
      start = new Date(2000, 0, 1);
      end = endOfToday;
      prevStart = new Date(1900, 0, 1); // Irrelevant
      prevEnd = new Date(1999, 11, 31);
      break;
    case 'This Month':
    default:
      start = new Date(currentYear, currentMonth, 1);
      end = endOfToday;
      prevStart = new Date(currentYear, currentMonth - 1, 1);
      prevEnd = new Date(currentYear, currentMonth, 0);
      break;
  }

  // Ensure timestamps cover the full day
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  prevStart.setHours(0, 0, 0, 0);
  prevEnd.setHours(23, 59, 59, 999);

  return { start, end, prevStart, prevEnd };
};

export const getPLSummary = async (req: Request, res: Response) => {
    console.log("📊 getPLSummary Called");
    try {
        const { gstin, timeFilter } = req.query;
        console.log(`   Params: GSTIN=${gstin}, Filter=${timeFilter}`);

        if (!gstin) return res.status(400).json({ message: 'GSTIN is required.' });

        // 1. Get Date Ranges
        const { start, end, prevStart, prevEnd } = getDateRange(timeFilter as string || 'This Month');
        console.log(`   📅 Date Range: ${start.toDateString()} to ${end.toDateString()}`);

        // 2. Fetch Data
        const [histories, inventoryItems] = await Promise.all([
            PaymentHistory.find({ businessGstin: gstin as string }),
            InventoryItem.find({ gstin: gstin as string }).select('title price')
        ]);

        console.log(`   📦 Fetched ${histories.length} PaymentHistory records.`);

        // 3. COGS Map
        const cogsMap = new Map<string, number>();
        inventoryItems.forEach(item => cogsMap.set(item.title, item.price || 0));

        // 4. Aggregation Buckets
        let currRevenue = 0, currCOGS = 0;
        let prevRevenue = 0, prevCOGS = 0;
        
        // Map for SKU Table (Only current period)
        const skuMonthlyPL = new Map<string, any>();

        let totalOrdersProcessed = 0;
        let ordersInCurrentPeriod = 0;

        // 5. Iterate and Calculate
        for (const history of histories) {
            // Check if 'rawOrderPayments' exists
            if (!history.rawOrderPayments || !Array.isArray(history.rawOrderPayments)) continue;

            for (const order of history.rawOrderPayments) {
                totalOrdersProcessed++;
                
                const orderDate = parseOrderDate(order['Order Date']);
                if (!orderDate) continue; // Skip invalid dates

                const sku = String(order['Supplier SKU'] || '').trim();
                
                // Check Date Ranges
                const isCurrent = orderDate >= start && orderDate <= end;
                const isPrevious = orderDate >= prevStart && orderDate <= prevEnd;

                if (!isCurrent && !isPrevious) continue;

                // Values
                const quantity = Number(order['Quantity'] || 1);
                const itemCOGS = (cogsMap.get(sku) || 0) * quantity;
                const finalSettlement = cleanNumber(order['Final Settlement Amount']);
                const orderStatus = String(order['Live Order Status'] || '').toLowerCase();
                
                // Calculate Actual COGS (Only if delivered/not cancelled logic applies)
                // For P&L: usually we deduct COGS for ALL dispatched items unless returned to inventory perfectly.
                // Simplification: If Delivered, COGS applies.
                let actualCOGS = 0;
                if (orderStatus.includes('delivered')) {
                    actualCOGS = itemCOGS;
                }

                // Add to Buckets
                if (isCurrent) {
                    ordersInCurrentPeriod++;
                    currRevenue += finalSettlement;
                    currCOGS += actualCOGS;

                    // SKU Level Data
                    if (sku) {
                        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                        const mapKey = `${monthKey}_${sku}`;

                        if (!skuMonthlyPL.has(mapKey)) {
                            skuMonthlyPL.set(mapKey, {
                                sku,
                                month: monthKey,
                                finalPayout: 0,
                                cogs: 0,
                                margin: 0 // Will calculate later
                            });
                        }
                        const entry = skuMonthlyPL.get(mapKey);
                        entry.finalPayout += finalSettlement;
                        entry.cogs += actualCOGS;
                    }
                } 
                else if (isPrevious) {
                    prevRevenue += finalSettlement;
                    prevCOGS += actualCOGS;
                }
            }
        }

        console.log(`   ✅ Processed ${totalOrdersProcessed} orders.`);
        console.log(`   ✅ Found ${ordersInCurrentPeriod} orders in Current Period.`);
        console.log(`   💰 Current Revenue: ${currRevenue}, Previous: ${prevRevenue}`);

        // 6. KPI Calculation
        const currProfit = currRevenue - currCOGS;
        const prevProfit = prevRevenue - prevCOGS;

        const currMargin = currRevenue !== 0 ? (currProfit / currRevenue) * 100 : 0;
        const prevMargin = prevRevenue !== 0 ? (prevProfit / prevRevenue) * 100 : 0;

        const calcTrend = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / Math.abs(prev)) * 100;
        };

        const kpiStats = {
            revenue: { value: currRevenue, trend: calcTrend(currRevenue, prevRevenue) },
            expenses: { value: currCOGS, trend: calcTrend(currCOGS, prevCOGS) },
            profit: { value: currProfit, trend: calcTrend(currProfit, prevProfit) },
            margin: { value: currMargin, trend: currMargin - prevMargin }
        };

        // 7. Format SKU Array
        const skuPLTable = Array.from(skuMonthlyPL.values()).map(item => ({
            ...item,
            margin: item.finalPayout - item.cogs
        })).sort((a, b) => b.month.localeCompare(a.month));

        res.status(200).json({
            kpiStats,
            skuPL: skuPLTable
        });

    } catch (error: any) {
        console.error("❌ Error generating P/L Summary:", error);
        res.status(500).json({ message: 'Server error while generating P/L summary.' });
    }
};