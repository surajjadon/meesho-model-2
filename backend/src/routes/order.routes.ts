import { Router } from 'express';
import { getOrders, processInventoryUpdates } from '../controllers/order.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();
// router.use(protect);

// GET /api/orders?gstin=...
// Fetches the list of all saved orders for the UI
router.get('/', getOrders);

// POST /api/orders/process-inventory
// Triggers the batch inventory update process
router.post('/process-inventory', processInventoryUpdates);

export default router;