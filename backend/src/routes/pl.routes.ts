import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { getPLSummary } from '../controllers/pl.controller';
import { 
    getInventoryMatchedOrders // 👈 Import the new function
} from '../controllers/mappings.controller';


const router = express.Router();

router.get('/summary', protect, getPLSummary);

router.get('/matched-orders', getInventoryMatchedOrders);

export default router;
