import express from 'express';
import { protect } from '../middleware/auth.middleware';
import { getPLSummary } from '../controllers/pl.controller';

const router = express.Router();

router.get('/summary', protect, getPLSummary);

export default router;