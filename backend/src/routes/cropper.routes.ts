import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.middleware';
import { parsePDFController, getProcessingHistory } from '../controllers/pdfController'; // ✅ Import Both

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload Route
router.post('/upload', protect, upload.single('pdfFile'), parsePDFController);

// ✅ History Route
router.get('/history', protect, getProcessingHistory);

export default router;