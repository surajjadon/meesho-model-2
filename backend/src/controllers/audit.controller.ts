import { Request, Response } from 'express';
import { AuditLog } from '../models/auditLog.model';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const { resource, action, startDate, endDate } = req.query;

    // 1. Build Filter Object
    let query: any = {};

    if (resource) query.resource = resource;
    if (action) query.action = action;
    
    // Date Range Filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // 2. Fetch Logs (Newest First)
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 actions to keep it fast
      .populate('userId', 'email role'); // Get email/role from User model

    res.status(200).json(logs);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch logs", error: error.message });
  }
};

