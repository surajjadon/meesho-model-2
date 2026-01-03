import { Request, Response } from 'express';
import { parseExcel } from '../services/excelParser';
import PaymentHistory from '../models/PaymentHistory.model';
import ReturnOrder from '../models/returnOrder.model';
import LabelData from '../models/labelData.model';
import mongoose from 'mongoose';
import { logAction } from '../utils/logger'; 

function cleanNumber(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  return parseFloat(String(v).replace(/[₹,]/g, "")) || 0;
}

function getReturnType(liveOrderStatus: string): 'RTO' | 'CustomerReturn' | null {
  const status = String(liveOrderStatus || '').toLowerCase().trim();
  if (status.includes('rto')) return 'RTO';
  if (status.includes('return')) return 'CustomerReturn';
  return null;
}

const COLUMN_MAP = {
  FINAL_SETTLEMENT: 'Final Settlement Amount',
  PAYMENT_DATE: 'Payment Date',
  ADS_COST: 'Total Ads Cost',
  REFERRAL_EARNING: 'Net Referral Amount',
  COMP_RECOVERY_AMOUNT: 'Amount (inc GST) INR',
  SUB_ORDER_NO: 'Sub Order No',
  ORDER_DATE: 'Order Date',
  DISPATCH_DATE: 'Dispatch Date',
  PRODUCT_NAME: 'Product Name',
  SUPPLIER_SKU: 'Supplier SKU',
  LIVE_ORDER_STATUS: 'Live Order Status',
};

async function findAWBNumber(
  gstin: string, 
  subOrderNo: string, 
  session: mongoose.ClientSession
): Promise<string | undefined> {
  const variations = [subOrderNo];
  if (subOrderNo.includes('_')) {
    variations.push(subOrderNo.split('_')[0]);
  } else {
    variations.push(`${subOrderNo}_1`);
  }

  const labelMatch = await LabelData.findOne({
    businessGstin: gstin,
    orderNo: { $in: variations },
  }).session(session);

  if (labelMatch && labelMatch.awbNumber) {
    labelMatch.isMapped = true;
    await labelMatch.save({ session });
    return labelMatch.awbNumber;
  }

  const existingReturn = await ReturnOrder.findOne({
    businessGstin: gstin,
    subOrderNo: { $in: variations },
    awbNumber: { $exists: true, $nin: [null, ''] }
  }).session(session);

  if (existingReturn) return existingReturn.awbNumber;
  return undefined;
}

export const analyzePaymentsController = async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." }); 
  }

  const { gstin } = req.body;
  if (!gstin) {
    return res.status(400).json({ message: "Business GSTIN is required." }); 
  }
  
  // ✅ SECURITY FIX: Force String (even though it's from body, good practice)
  const safeGstin = String(gstin);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const sheets = await parseExcel(req.file.buffer);

    let totalNetOrderAmount = 0, totalAdsCost = 0, totalReferralEarnings = 0,
        totalCompensation = 0, totalRecoveries = 0;

    const paymentTrend: Record<string, number> = {};
    const rawData: Record<string, any[]> = {
      orders: [], ads: [], referral: [], compRecovery: []
    };

    let returnOrdersProcessed = 0;
    let rtoOrdersCreated = 0;
    let customerReturnsCreated = 0;
    let awbMappedCount = 0;
    let awbNotFoundCount = 0;
    let existingDocsUpdated = 0;
    let newDocsCreated = 0;

    for (const { name, data } of sheets) {
      const sheet = name.toLowerCase();

      if (sheet.includes("order")) {
        rawData.orders.push(...data);
        
        for (const row of data) {
          const amt = cleanNumber(row[COLUMN_MAP.FINAL_SETTLEMENT]);
          totalNetOrderAmount += amt;

          const paymentDateStr = row[COLUMN_MAP.PAYMENT_DATE];
          if (paymentDateStr) {
            const paymentDate = new Date(paymentDateStr);
            if (!isNaN(paymentDate.getTime())) {
              const dateKey = paymentDate.toISOString().split("T")[0];
              paymentTrend[dateKey] = (paymentTrend[dateKey] || 0) + amt;
            }
          }

          const liveOrderStatus = String(row[COLUMN_MAP.LIVE_ORDER_STATUS] || '');
          const subOrderNo = row[COLUMN_MAP.SUB_ORDER_NO];
          const returnType = getReturnType(liveOrderStatus);

          if (returnType && subOrderNo) {
            const awbNumber = await findAWBNumber(safeGstin, subOrderNo, session);
            if (awbNumber) awbMappedCount++; else awbNotFoundCount++;

            const variations = [subOrderNo];
            if (subOrderNo.includes('_')) variations.push(subOrderNo.split('_')[0]);

            const updateData: any = {
              businessGstin: safeGstin,
              subOrderNo: subOrderNo,
              returnType: returnType,
              orderDate: row[COLUMN_MAP.ORDER_DATE] ? new Date(row[COLUMN_MAP.ORDER_DATE]) : undefined,
              dispatchDate: row[COLUMN_MAP.DISPATCH_DATE] ? new Date(row[COLUMN_MAP.DISPATCH_DATE]) : undefined,
              paymentDate: row[COLUMN_MAP.PAYMENT_DATE] ? new Date(row[COLUMN_MAP.PAYMENT_DATE]) : undefined,
              productName: row[COLUMN_MAP.PRODUCT_NAME],
              supplierSku: row[COLUMN_MAP.SUPPLIER_SKU],
              liveOrderStatus: liveOrderStatus,
            };

            if (awbNumber) updateData.awbNumber = awbNumber;

            Object.keys(updateData).forEach(key => {
              if (updateData[key] === undefined) delete updateData[key];
            });

            const existingDoc = await ReturnOrder.findOne({
              businessGstin: safeGstin,
              subOrderNo: { $in: variations }
            }).session(session);

            if (existingDoc) {
              const updateFields: any = { ...updateData };
              if (!existingDoc.receivedStatus) updateFields.receivedStatus = 'Pending';
              if (!existingDoc.verificationStatus) updateFields.verificationStatus = 'None';

              await ReturnOrder.updateOne(
                { _id: existingDoc._id },
                { $set: updateFields },
                { session }
              );
              existingDocsUpdated++;
            } else {
              const newDocData = {
                ...updateData,
                verificationStatus: 'None',
                receivedStatus: 'Pending',
              };
              await ReturnOrder.create([newDocData], { session });
              newDocsCreated++;
            }

            returnOrdersProcessed++;
            if (returnType === 'RTO') rtoOrdersCreated++;
            if (returnType === 'CustomerReturn') customerReturnsCreated++;
          }
        }
      }
      else if (sheet.includes("ads")) {
        rawData.ads.push(...data);
        data.forEach((row: any) => {
          totalAdsCost += cleanNumber(row[COLUMN_MAP.ADS_COST]);
        });
      }
      else if (sheet.includes("referral")) {
        rawData.referral.push(...data);
        data.forEach((row: any) => {
          totalReferralEarnings += cleanNumber(row[COLUMN_MAP.REFERRAL_EARNING]);
        });
      }
      else if (sheet.includes("compensation") || sheet.includes("recovery")) {
        rawData.compRecovery.push(...data);
        data.forEach((row: any) => {
          const amt = cleanNumber(row[COLUMN_MAP.COMP_RECOVERY_AMOUNT]);
          if (amt >= 0) totalCompensation += amt;
          else totalRecoveries += amt;
        });
      }
    }

    const dates = Object.keys(paymentTrend);
    if (dates.length === 0) {
      throw new Error("Could not determine any valid payment dates from the 'Order Payments' sheet.");
    }

    const sortedDates = dates.sort();
    const startDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length - 1]);

    const paymentsCount = dates.length;
    const averagePayment = paymentsCount > 0 ? totalNetOrderAmount / paymentsCount : 0;

    const formattedTrend = Object.entries(paymentTrend)
      .map(([date, v]) => ({ date, payment: v }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const newPayment = new PaymentHistory({
      businessGstin: safeGstin,
      fileName: req.file.originalname,
      startDate,
      endDate,
      totalNetOrderAmount, 
      totalAdsCost, 
      totalReferralEarnings, 
      totalCompensation, 
      totalRecoveries,
      paymentsCount,
      dayWisePayments: formattedTrend.map(t => ({ date: t.date, amount: t.payment })),
      rawOrderPayments: rawData.orders,
      rawAds: rawData.ads,
      rawReferral: rawData.referral,
      rawCompRecovery: rawData.compRecovery,
    });

    const savedPayment = await newPayment.save({ session });
    await session.commitTransaction();

    // ✅ AUDIT LOG: Payments Processed
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "PROCESS",
            "Payments",
            `Processed payment sheet: ${req.file.originalname}. Net Amount: ${totalNetOrderAmount.toFixed(2)}`,
            safeGstin // 👈 Use safeGstin
        );
    }

    res.status(201).json({
      success: true,
      stats: { 
        totalNetOrderAmount, 
        totalAdsCost, 
        totalReferralEarnings, 
        totalCompensation, 
        totalRecoveries, 
        paymentsCount, 
        averagePayment 
      },
      paymentTrend: formattedTrend,
      savedPayment,
      returnOrderStats: {
        processed: returnOrdersProcessed,
        rtoOrders: rtoOrdersCreated,
        customerReturns: customerReturnsCreated,
        existingUpdated: existingDocsUpdated,
        newCreated: newDocsCreated,
        awbMapped: awbMappedCount,
        awbNotFound: awbNotFoundCount,
      }
    });

  } catch (err: any) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message || "Error processing file." });
  } finally {
    session.endSession();
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;
    if (!gstin) { 
      return res.status(400).json({ message: 'GSTIN is required.' }); 
    }

    // ✅ SECURITY FIX: Force String
    const safeGstin = String(gstin);

    const history = await PaymentHistory.find({ businessGstin: safeGstin })
      .sort({ uploadedAt: -1 })
      .select('fileName uploadedAt totalNetOrderAmount startDate endDate'); 

    res.status(200).json(history);
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching history.' });
  }
};

export const getAllTimePaymentTrend = async (req: Request, res: Response) => {
  try {
    const { gstin } = req.query;
    if (!gstin) { 
      return res.status(400).json({ message: 'GSTIN is required.' }); 
    }

    // ✅ SECURITY FIX: Force String
    const safeGstin = String(gstin);

    const trendData = await PaymentHistory.aggregate([
      { $match: { businessGstin: safeGstin } },
      { $unwind: "$dayWisePayments" },
      {
        $group: {
          _id: "$dayWisePayments.date",
          payment: { $sum: "$dayWisePayments.amount" }
        }
      },
      { $project: { _id: 0, date: "$_id", payment: 1 } },
      { $sort: { date: 1 } }
    ]);

    res.status(200).json(trendData);
    
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching trend data.' });
  }
};

export const getPaymentDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Payment ID format" });
    }
    const paymentData = await PaymentHistory.findById(id).lean();

    if (!paymentData) {
      return res.status(404).json({ message: "Payment record not found" });
    }
    
    res.status(200).json(paymentData);

  } catch (error: any) {
    res.status(500).json({ message: "Server error fetching details" });
  }
};

// --- MODIFIED: Get Stats filtered by Date (Default: This Month) ---
export const getAggregatePaymentStats = async (req: Request, res: Response) => {
  try {
    const { gstin, startDate, endDate } = req.query;
    if (!gstin) { 
      return res.status(400).json({ message: 'GSTIN is required.' }); 
    }

    // ✅ SECURITY FIX: Force String
    const safeGstin = String(gstin);

    // 1. Build Date Filter
    let dateFilter: any = {};
    
    if (startDate && endDate) {
        // Custom Range
        dateFilter = {
            $gte: new Date(startDate as string),
            $lte: new Date(new Date(endDate as string).setHours(23, 59, 59, 999))
        };
    } else {
        // Default: Current Month
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateFilter = { $gte: firstDay, $lte: lastDay };
    }

    // OPTION A: Filter by Document Date
    const matchQuery = {
        businessGstin: safeGstin,
        startDate: dateFilter 
    };

    const stats = await PaymentHistory.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalNetOrderAmount: { $sum: "$totalNetOrderAmount" },
          totalAdsCost: { $sum: "$totalAdsCost" },
          totalReferralEarnings: { $sum: "$totalReferralEarnings" },
          totalCompensation: { $sum: "$totalCompensation" },
          totalRecoveries: { $sum: "$totalRecoveries" },
          totalPaymentsCount: { $sum: "$paymentsCount" },
        }
      }
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        totalNetOrderAmount: 0, totalAdsCost: 0, totalReferralEarnings: 0,
        totalCompensation: 0, totalRecoveries: 0, paymentsCount: 0, averagePayment: 0,
      });
    }
    
    const result = stats[0];
    const averagePayment = result.totalPaymentsCount > 0 ? result.totalNetOrderAmount / result.totalPaymentsCount : 0;

    res.status(200).json({
      totalNetOrderAmount: result.totalNetOrderAmount,
      totalAdsCost: result.totalAdsCost,
      totalReferralEarnings: result.totalReferralEarnings,
      totalCompensation: result.totalCompensation,
      totalRecoveries: result.totalRecoveries,
      paymentsCount: result.totalPaymentsCount,
      averagePayment: averagePayment,
    });
    
  } catch (error: any) {
    res.status(500).json({ message: 'Server error while fetching stats.' });
  }
};

// --- NEW: Server-Side Pagination for Details ---
export const getPaymentDetailsPaginated = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid Payment ID" });
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // We use aggregation to filter and slice the 'rawOrderPayments' array
    const result = await PaymentHistory.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $project: {
          fileName: 1,
          endDate: 1,
          totalNetOrderAmount: 1,
          totalCount: { $size: "$rawOrderPayments" }, // Total rows before filter
          rawOrderPayments: {
            $filter: {
              input: "$rawOrderPayments",
              as: "item",
              cond: {
                $or: [
                  { $regexMatch: { input: "$$item.Sub Order No", regex: search as string, options: "i" } },
                  { $regexMatch: { input: "$$item.Supplier SKU", regex: search as string, options: "i" } }
                ]
              }
            }
          }
        }
      },
      {
        $project: {
          fileName: 1,
          endDate: 1,
          totalNetOrderAmount: 1,
          totalFilteredCount: { $size: "$rawOrderPayments" }, // Count after search
          paginatedResults: { $slice: ["$rawOrderPayments", skip, limitNum] } // Slice for pagination
        }
      }
    ]);

    if (!result.length) {
        return res.status(404).json({ message: "Not found" });
    }

    const data = result[0];
    
    res.status(200).json({
        fileName: data.fileName,
        endDate: data.endDate,
        totalNetOrderAmount: data.totalNetOrderAmount,
        rawOrderPayments: data.paginatedResults,
        totalItems: data.totalFilteredCount,
        totalPages: Math.ceil(data.totalFilteredCount / limitNum),
        currentPage: pageNum
    });

  } catch (error: any) {
    console.error("Pagination Error:", error);
    res.status(500).json({ message: "Server error fetching details" });
  }
};