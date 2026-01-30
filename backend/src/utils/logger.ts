import { AuditLog } from '../models/auditLog.model';

export const logAction = async (
  userId: string, 
  userName: string, 
  action: string, 
  resource: string, 
  details: string,
  gstin: string // 👈 NOW REQUIRED
) => {
  try {
    if (!gstin) {
        console.warn("⚠️ Audit Log missing GSTIN. Skipping...");
        return;
    }

    await AuditLog.create({
      userId,
      userName,
      action,
      resource,
      details,
      businessGstin: gstin
    });
    // console.log(`📝 Audit [${gstin}]: ${action} on ${resource}`);
  } catch (error) {
    console.error("Failed to save audit log:", error);
  }
};