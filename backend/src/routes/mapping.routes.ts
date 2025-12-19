import express from 'express';
import { 
    getMappings, 
    createMapping, 
    getUnmappedSkus,
    checkSku,
    updateMapping, // 1. Import the new update function
    deleteMapping,
    getMappingHistory,
    updateHistoryRecord
} from '../controllers/mapping.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// This middleware protects all subsequent routes in this file
router.use(protect);

// Route for checking SKU availability
router.get('/check-sku/:sku', checkSku);

// Route for getting the list of SKUs that must be mapped
router.get('/unmapped', getUnmappedSkus);

// Routes for the main /mappings collection (GET all and CREATE one)
router.route('/')
    .get(getMappings)
    .post(createMapping);

    router.get('/history/:id', getMappingHistory);
    router.put('/history/:historyId', updateHistoryRecord);
    

// --- 2. ADD THE PUT METHOD TO THIS ROUTE ---
// This route now handles updating and deleting a specific mapping by its ID
router.route('/:id')
    .put(updateMapping) // Handles PUT /api/mappings/:id
    .delete(deleteMapping);

export default router;