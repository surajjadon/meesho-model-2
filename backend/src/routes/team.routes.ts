import { Router } from 'express';
import { 
  inviteUser, 
  getTeamMembers, 
  revokeUser ,
  getUserByEmail
} from '../controllers/team.controller';

import { protect } from './../middleware/auth.middleware'; // Assuming you have auth middleware

const router = Router();

// Apply middleware to protect these routes
 router.use(protect); 
// router.use(admin); // Optional: only admins/owners can access

router.get('/', getTeamMembers);       // GET /api/team
router.post('/invite', inviteUser);    // POST /api/team/invite      // PUT /api/team/:id
router.delete('/:id', revokeUser); 
router.get('/user-details/:email', getUserByEmail);  

import { getAuditLogs } from '../controllers/audit.controller';
// Add to your router, protected by Admin check
router.get('/audit-logs', protect, getAuditLogs);

export default router;