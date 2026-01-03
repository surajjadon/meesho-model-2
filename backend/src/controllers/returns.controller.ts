import { Request, Response } from "express";
import ReturnOrder from "../models/returnOrder.model";
import { logAction } from '../utils/logger'; // ✅ Imported Logger

// 🛡️ SECURITY HELPER: Escape Regex special characters
// This prevents users from sending regex operators in the search bar
const escapeRegex = (text: string) => {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// ✅ Get all returns with filtering options
export const getReturns = async (req: Request, res: Response) => {
  console.log(`\n📦 getReturns called`);
  try {
    const { gstin, search = "", returnType, receivedStatus, tab } = req.query;
    
    // 🛡️ SECURITY FIX: Force input to String to prevent NoSQL Injection
    const safeGstin = String(gstin);

    console.log(`   📋 Query params:`);
    console.log(`      - gstin: ${safeGstin}`);
    console.log(`      - tab: ${tab}`);
    console.log(`      - search: "${search}"`);
    console.log(`      - returnType: ${returnType}`);
    console.log(`      - receivedStatus: ${receivedStatus}`);
    
    if (!gstin) {
      console.log(`   ❌ ERROR: GSTIN is required`);
      return res.status(400).json({ message: "GSTIN is required." });
    }

    const query: any = { businessGstin: safeGstin };
    
    // --- Date Calculation for 'Missing' Logic ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // --- TAB LOGIC ---
    if (tab === 'missing') {
      console.log(`   🚨 Applying 'Missing' Logic (Pending > 30 days)`);
      // Logic: Must be Pending AND Order Date must be older than 30 days
      query.receivedStatus = 'Pending';
      query.orderDate = { $lt: thirtyDaysAgo };
    } 
    else {
      // --- STANDARD LOGIC (RTO / Customer) ---
      
      // Filter by returnType
      if (returnType && returnType !== 'all') {
        // 🛡️ SECURITY FIX: Cast to String
        query.returnType = String(returnType);
        console.log(`   🔍 Filtering by returnType: ${query.returnType}`);
      }

      // Filter by receivedStatus
      if (receivedStatus && receivedStatus !== 'all') {
        // 🛡️ SECURITY FIX: Cast to String
        query.receivedStatus = String(receivedStatus);
        console.log(`   🔍 Filtering by receivedStatus: ${query.receivedStatus}`);
      }
    }

    // --- SEARCH LOGIC ---
    if (search) {
      // 🛡️ SECURITY FIX: Escape regex characters
      const safeSearch = escapeRegex(String(search));
      const searchRegex = new RegExp(safeSearch, "i");
      
      query.$or = [
        { subOrderNo: searchRegex },
        { supplierSku: searchRegex },
        { productName: searchRegex },
        { awbNumber: searchRegex },
      ];
      console.log(`   🔍 Searching for: "${safeSearch}"`);
    }

    console.log(`   📝 Final query:`, JSON.stringify(query, null, 2));

    // Sorting: If Missing tab, show Oldest first. Otherwise, show Newest first.
    const sortOptions: any = tab === 'missing' ? { orderDate: 1 } : { createdAt: -1 };

    const returns = await ReturnOrder.find(query).sort(sortOptions);
    
    console.log(`   ✅ Found ${returns.length} records`);
    
    // Log first few records for debugging
    if (returns.length > 0) {
      console.log(`   📋 Sample records:`);
      returns.slice(0, 3).forEach((r, i) => {
        console.log(`      [${i}] subOrderNo: ${r.subOrderNo}, orderDate: ${r.orderDate}, status: ${r.receivedStatus}`);
      });
    }
    
    res.status(200).json(returns);
  } catch (error: any) {
    console.log(`   ❌ ERROR:`, error.message);
    res.status(500).json({ message: "Error fetching returns.", error: error.message });
  }
};

// ✅ Get summary counts for dashboard
export const getReturnsSummary = async (req: Request, res: Response) => {
  console.log(`\n📊 getReturnsSummary called`);
  try {
    const { gstin } = req.query;
    
    if (!gstin) {
      console.log(`   ❌ ERROR: GSTIN is required`);
      return res.status(400).json({ message: "GSTIN is required." });
    }

    // 🛡️ SECURITY FIX: Force String
    const safeGstin = String(gstin);
    console.log(`   📋 GSTIN: ${safeGstin}`);

    // Date calculation for aggregation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log(`   🗓️ Missing threshold date: ${thirtyDaysAgo.toISOString()}`);

    const summary = await ReturnOrder.aggregate([
      { $match: { businessGstin: safeGstin } },
      {
        $group: {
          _id: null,
          totalRTO: {
            $sum: { $cond: [{ $eq: ["$returnType", "RTO"] }, 1, 0] }
          },
          pendingRTO: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$returnType", "RTO"] },
                  { $eq: ["$receivedStatus", "Pending"] }
                ]},
                1, 0
              ]
            }
          },
          receivedRTO: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$returnType", "RTO"] },
                  { $eq: ["$receivedStatus", "Received"] }
                ]},
                1, 0
              ]
            }
          },
          totalCustomerReturns: {
            $sum: { $cond: [{ $eq: ["$returnType", "CustomerReturn"] }, 1, 0] }
          },
          pendingCustomerReturns: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$returnType", "CustomerReturn"] },
                  { $eq: ["$receivedStatus", "Pending"] }
                ]},
                1, 0
              ]
            }
          },
          receivedCustomerReturns: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$returnType", "CustomerReturn"] },
                  { $eq: ["$receivedStatus", "Received"] }
                ]},
                1, 0
              ]
            }
          },
          // ✅ NEW: Missing Orders Count
          missingOrders: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$receivedStatus", "Pending"] },
                  { $lt: ["$orderDate", thirtyDaysAgo] }
                ]},
                1, 0
              ]
            }
          },
          missingAWB: {
            $sum: {
              $cond: [
                { $or: [
                  { $eq: ["$awbNumber", null] },
                  { $eq: ["$awbNumber", ""] },
                  { $not: ["$awbNumber"] } // Covers undefined
                ]},
                1, 0
              ]
            }
          }
        }
      }
    ]);

    console.log(`   📊 Aggregation result:`, JSON.stringify(summary, null, 2));

    const result = summary[0] || {
      totalRTO: 0,
      pendingRTO: 0,
      receivedRTO: 0,
      totalCustomerReturns: 0,
      pendingCustomerReturns: 0,
      receivedCustomerReturns: 0,
      missingOrders: 0,
      missingAWB: 0,
    };

    console.log(`   ✅ Summary result:`);
    console.log(`      - totalRTO: ${result.totalRTO}`);
    console.log(`      - pendingRTO: ${result.pendingRTO}`);
    console.log(`      - receivedRTO: ${result.receivedRTO}`);
    console.log(`      - totalCustomerReturns: ${result.totalCustomerReturns}`);
    console.log(`      - pendingCustomerReturns: ${result.pendingCustomerReturns}`);
    console.log(`      - receivedCustomerReturns: ${result.receivedCustomerReturns}`);
    console.log(`      - 🚨 missingOrders: ${result.missingOrders}`);
    console.log(`      - missingAWB: ${result.missingAWB}`);

    res.status(200).json(result);
  } catch (error: any) {
    console.log(`   ❌ ERROR:`, error.message);
    res.status(500).json({ message: "Error fetching summary.", error: error.message });
  }
};

// ✅ Verify returns and update receivedStatus
export const verifyReturns = async (req: Request, res: Response) => {
  console.log(`\n✅ verifyReturns called`);
  try {
    const { ids, status, gstin } = req.body;

    console.log(`   📋 Request body:`);
    console.log(`      - ids: ${JSON.stringify(ids)}`);
    console.log(`      - status: ${status}`);
    console.log(`      - gstin: ${gstin}`);

    if (!ids || !Array.isArray(ids) || !status || !gstin) {
      console.log(`   ❌ ERROR: Missing required fields`);
      return res.status(400).json({ message: "`ids` array, `status`, and `gstin` are required." });
    }

    // 🛡️ SECURITY FIX: Sanitize GSTIN and IDs
    const safeGstin = String(gstin);
    const safeStatus = String(status);
    const safeIds = ids.map((id: any) => String(id)); // Force all IDs to strings

    const result = await ReturnOrder.updateMany(
      {
        businessGstin: safeGstin,
        $or: [{ subOrderNo: { $in: safeIds } }, { awbNumber: { $in: safeIds } }],
      },
      { 
        $set: { 
          verificationStatus: safeStatus, 
          verifiedAt: new Date(),
          receivedStatus: 'Received',
          receivedAt: new Date(),
        } 
      }
    );

    console.log(`   📊 Update result:`);
    console.log(`      - matchedCount: ${result.matchedCount}`);
    console.log(`      - modifiedCount: ${result.modifiedCount}`);

    if (result.matchedCount === 0) {
      console.log(`   ⚠️ No matching returns found`);
      return res.status(404).json({ message: "No matching returns found to verify." });
    }

    // ✅ AUDIT LOG: Returns Verified
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "UPDATE",
            "Returns",
            `Verified ${result.modifiedCount} returns as '${safeStatus}' for GSTIN: ${safeGstin}`,
            safeGstin
        );
    }

    console.log(`   ✅ Successfully updated ${result.modifiedCount} returns`);
    res.status(200).json({
      message: `${result.modifiedCount} returns updated successfully.`,
      ...result,
    });
  } catch (error: any) {
    console.log(`   ❌ ERROR:`, error.message);
    res.status(500).json({ message: "Error verifying returns.", error: error.message });
  }
};

// Delete selected returns
export const deleteReturns = async (req: Request, res: Response) => {
  console.log(`\n🗑️ deleteReturns called`);
  try {
    const { ids } = req.body;
    console.log(`   📋 IDs to delete: ${JSON.stringify(ids)}`);
    
    if (!ids || !Array.isArray(ids)) {
      console.log(`   ❌ ERROR: Array of _ids is required`);
      return res.status(400).json({ message: "Array of _ids is required." });
    }
    
    // 🛡️ SECURITY FIX: Sanitize IDs
    const safeIds = ids.map((id: any) => String(id));

    const result = await ReturnOrder.deleteMany({ _id: { $in: safeIds } });
    console.log(`   ✅ Deleted ${result.deletedCount} returns`);
    
    // Note: If you need to log deletion, you'd likely want the GSTIN from the body or user context
    
    res.status(200).json({
      message: `${result.deletedCount} returns deleted successfully.`,
    });
  } catch (error: any) {
    console.log(`   ❌ ERROR:`, error.message);
    res.status(500).json({ message: "Error deleting returns.", error: error.message });
  }
};

// ✅ ONE-TIME MIGRATION: Fix existing documents
export const migrateReturnOrders = async (req: Request, res: Response) => {
  console.log(`\n🔄 migrateReturnOrders called`);
  try {
    const { gstin } = req.body;
    
    if (!gstin) {
      return res.status(400).json({ message: "GSTIN is required." });
    }
    
    // 🛡️ SECURITY FIX: Sanitize GSTIN
    const safeGstin = String(gstin);
    console.log(`   📋 GSTIN: ${safeGstin}`);

    // Find all documents missing the new fields
    const docsToUpdate = await ReturnOrder.find({
      businessGstin: safeGstin,
      $or: [
        { returnType: { $exists: false } },
        { receivedStatus: { $exists: false } },
        { returnType: null },
        { receivedStatus: null }
      ]
    });

    console.log(`   📋 Found ${docsToUpdate.length} documents to migrate`);

    let updated = 0;
    for (const doc of docsToUpdate) {
      const liveStatus = (doc.liveOrderStatus || '').toLowerCase();
      
      // Determine returnType from liveOrderStatus
      let returnType: 'RTO' | 'CustomerReturn' = 'CustomerReturn';
      if (liveStatus.includes('rto')) {
        returnType = 'RTO';
      }

      // Determine receivedStatus
      let receivedStatus: 'Pending' | 'Received' = 'Pending';
      if (doc.verificationStatus && doc.verificationStatus !== 'None') {
        receivedStatus = 'Received';
      }

      await ReturnOrder.updateOne(
        { _id: doc._id },
        { 
          $set: { 
            returnType: doc.returnType || returnType,
            receivedStatus: doc.receivedStatus || receivedStatus
          } 
        }
      );
      updated++;
    }

    console.log(`\n   ✅ Migration complete. Updated ${updated} documents.`);
    
    // ✅ AUDIT LOG: Migration Ran
    if ((req as any).user) {
        await logAction(
            (req as any).user._id,
            (req as any).user.name,
            "UPDATE",
            "Returns",
            `Ran migration script. Updated ${updated} return documents.`,
            safeGstin
        );
    }

    res.status(200).json({ 
      message: `Migration complete. Updated ${updated} documents.`,
      updated 
    });

  } catch (error: any) {
    console.error("   ❌ Migration error:", error);
    res.status(500).json({ message: error.message });
  }
};