import express from 'express';
import { registerUser, loginUser,acceptInvite } from '../controllers/auth.controller';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/accept-invite', acceptInvite);

export default router;