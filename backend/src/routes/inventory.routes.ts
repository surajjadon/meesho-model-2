import express from 'express';
import multer from 'multer';
import { 
  getInventoryItems, 
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryHistory,
  getInventoryPriceHistory,
  updateBatchIdofStock,
  getInventoryWithPositiveStock,
  updateavailableStock,
  updatePirceofStock
} from '../controllers/inventory.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();
router.use(protect);
const upload = multer({ dest: 'uploads/' });

router.route('/')
  .get(getInventoryItems)
  .post(upload.single("featuredImage"), addInventoryItem);

router.get('/:id/history', getInventoryHistory);
router.get('/:id/price-history', getInventoryPriceHistory);


// Routes for a specific item by its ID (/api/inventory/:id)
router.route('/:id')
  // Handles PUT requests to /api/inventory/some_item_id
  .put(upload.single("featuredImage"), updateInventoryItem)
  
  // Handles DELETE requests to /api/inventory/some_item_id
  .delete(deleteInventoryItem);


router.patch('/stock-history/:id',updateBatchIdofStock);  

router.patch('/stock-history-Stock/:id', updateavailableStock);
  router.patch('/stock-history-Price/:id', updatePirceofStock);
router.get('/positive-stock', getInventoryWithPositiveStock);

export default router;