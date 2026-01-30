import express from 'express';
import {
  getPlans,
  createPlan,
  createPricing,
  deleteAllPlans
} from '../controllers/planController.controller';

const router = express.Router();

router.get('/plans', getPlans);
router.post('/plan', createPlan);
router.post('/pricing', createPricing);
router.delete('/plans', deleteAllPlans); 

export default router;
