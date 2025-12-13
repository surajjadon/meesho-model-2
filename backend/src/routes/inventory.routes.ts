import express from 'express';
import multer from 'multer';
import { 
  getInventoryItems, 
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryHistory // <-- 1. IMPORT THE NEW HISTORY FUNCTION
} from '../controllers/inventory.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

const upload = multer({ dest: 'uploads/' });

// This middleware protects all inventory routes.
router.use(protect);

// Routes for the whole collection (/api/inventory)
router.route('/')
  .get(getInventoryItems)
  .post(upload.single("featuredImage"), addInventoryItem);

// =================================================================
// === 2. ADD THE NEW ROUTE FOR HISTORY
// =================================================================
// This needs to come BEFORE the '/:id' route to be matched correctly.
// Express matches routes in the order they are defined.
router.get('/:id/history', getInventoryHistory);


// Routes for a specific item by its ID (/api/inventory/:id)
router.route('/:id')
  // Handles PUT requests to /api/inventory/some_item_id
  .put(upload.single("featuredImage"), updateInventoryItem)
  
  // Handles DELETE requests to /api/inventory/some_item_id
  .delete(deleteInventoryItem);

export default router;