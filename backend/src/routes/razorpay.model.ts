// Example Route file
import express from 'express';
import { createOrder, verifyPayment } from '../controllers/razorpay.controller';

const router = express.Router();

router.post('/payments/create-order', createOrder);
router.post('/payments/verify-payment', verifyPayment);

export default router;