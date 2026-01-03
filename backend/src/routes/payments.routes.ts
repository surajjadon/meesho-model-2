import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware';
import { 
    analyzePaymentsController, 
    getPaymentHistory,
    getAggregatePaymentStats,
    getAllTimePaymentTrend,
    getPaymentDetails,
     getPaymentDetailsPaginated
} from '../controllers/payments.controller';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 1. Upload and analyze a new payment file
router.post(
    '/upload', 
    protect, 
    upload.single('paymentFile'), 
    analyzePaymentsController
);

// 2. Get a list of all uploaded payment histories for a business
router.get(
    '/history', 
    protect, 
    getPaymentHistory
);

router.get('/history/:id',protect, getPaymentDetails);

// 3. Get aggregate (all-time) stats for a business
router.get(
    '/stats', 
    protect, 
    getAggregatePaymentStats
);

// 4. Get all-time payment trend data for a business
router.get(
    '/trend', 
    protect, 
    getAllTimePaymentTrend
);
router.get('/history/:id/paginated',protect, getPaymentDetailsPaginated);

export default router;