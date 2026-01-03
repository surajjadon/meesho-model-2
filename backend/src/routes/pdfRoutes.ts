import express from 'express';
import upload from '../middleware/upload';
import { parsePDFController } from '../controllers/pdfController';

const router = express.Router();

// POST /api/parse-pdf
router.post('/parse-pdf', upload.single('file'), parsePDFController);

export default router;