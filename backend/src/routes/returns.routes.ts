import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { getReturns, getReturnsSummary, verifyReturns, deleteReturns, migrateReturnOrders } from '../controllers/returns.controller';

const router = express.Router();

// GET /api/returns -> Fetches all returns for a business (with optional filters)
router.get('/', protect,getReturns);

// GET /api/returns/summary -> Get counts for dashboard
router.get('/summary', protect, getReturnsSummary);

// POST /api/returns/verify -> Updates the status of a batch of returns
router.post('/verify', protect, verifyReturns);

// POST /api/returns/migrate -> One-time migration for existing docs
router.post('/migrate', protect, migrateReturnOrders);

// DELETE /api/returns -> Deletes selected returns
router.delete('/', protect, deleteReturns);

export default router;