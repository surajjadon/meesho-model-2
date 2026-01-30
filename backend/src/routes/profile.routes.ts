import express from 'express';
import { getProfiles, addProfile, deleteProfile } from '../controllers/profile.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

// Apply the 'protect' middleware to all routes in this file
router.use(protect);

router.route('/')
  .get(getProfiles)
  .post(addProfile);

router.route('/:id')
  .delete(deleteProfile);

export default router;