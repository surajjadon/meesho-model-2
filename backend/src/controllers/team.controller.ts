import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from './../models/user.model'; // Adjust path to your User model
import sendEmail from '../utils/sendEmail';
import { Business } from '../models/business.model';
import { logAction } from '../utils/logger'; // ✅ IMPORTED LOGGER


// --- 1. GET ALL TEAM MEMBERS ---


// --- 1. GET TEAM MEMBERS (FILTERED BY SHARED GSTIN) ---
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    // 1. Get the currently logged-in user (Owner/Admin)
    const currentUser = (req as any).user;

    // 2. Collect all GSTINs this user has access to.
    //    Owners have 'gstinvalue', Admins/Managers have 'allowedGSTs'.
    const myGSTINs = [
        ...(currentUser.gstinvalue || []),
    ].filter(Boolean); // Remove null/undefined/empty strings

    // Safety: If current user has no GSTINs, they see no team members
    if (myGSTINs.length === 0) {
        return res.status(200).json([]);
    }

    // 3. Database Query:
    //    Find users who are NOT 'Owner' 
    //    AND share at least one GSTIN with the current user.
    const members = await User.find({
        role: { $ne: 'Owner' }, 
        _id: { $ne: currentUser._id }, // Don't return myself
        $or: [
            { gstinvalue: { $in: myGSTINs } }
        ]
    }).select('-password');
    
    // 4. Map data for Frontend
    const formattedMembers = members.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      modules: user.permissions,
      gstAccess: {
        allFuture: user.gstAccessAll,
        selectedIds: user.allowedGSTs?.filter((g: string) => myGSTINs.includes(g)) || []
      },
      status: user.status
    }));

    res.status(200).json(formattedMembers);
  } catch (error: any) {
    console.error("Fetch Team Error:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ... (Rest of your controller: inviteUser, revokeUser, etc.)

// --- 2. INVITE USER ---
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { 
        name, email, phone, role, permissions, modules, 
        allowedGSTs, gstinvalue, gstAccessAll, gstAccess 
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); 
    const finalAllowedGSTs = allowedGSTs || (gstAccess ? gstAccess.selectedIds : []);
    const finalGstAccessAll = gstAccessAll !== undefined ? gstAccessAll : (gstAccess ? gstAccess.allFuture : true);
    const finalPermissions = permissions || modules;

    const newUser = await User.create({
      name, email, phone, role,
      permissions: finalPermissions, 
      allowedGSTs: finalAllowedGSTs,
      gstinvalue: gstinvalue,     
      gstAccessAll: finalGstAccessAll,
      status: 'invited',
      inviteToken,
      inviteTokenExpire
    });

    const newUserId = newUser._id;

    // Business creation loop
    if (gstinvalue && Array.isArray(gstinvalue)) {
        for (const gstin of gstinvalue) {
            const upperGstin = gstin.toUpperCase();
            const gstinExists = await Business.findOne({ gstin: upperGstin });
            
            if (gstinExists) {
                const { accountName, brandName } = gstinExists;
                await Business.create({
                    userId: newUserId,
                    accountName,
                    brandName,
                    gstin: upperGstin,
                });
            }    
        }
    }

    const frontendUrl = process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:3000';
    const joinUrl = `${frontendUrl}/join?token=${inviteToken}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2563eb;">Welcome to Store Manager!</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>You have been invited to join the team as a <strong>${role}</strong>.</p>
        <p>Click below to set your password:</p>
        <a href="${joinUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">Accept Invitation</a>
        <p style="font-size: 12px; color: #666;">Link expires in 24 hours.</p>
      </div>
    `;

    await sendEmail({
      email: newUser.email,
      subject: 'You have been invited to join the team',
      html: emailHtml
    });

    // ✅ AUDIT LOG
    // 1. Safety check: Ensure gstinvalue exists
    // 2. Safety check: Ensure req.user exists
    if ((req as any).user && gstinvalue && Array.isArray(gstinvalue)) {
        for (const gstin of gstinvalue) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "INVITE",
                "Team",
                `Invited ${name} (${email}) as ${role}`,
                gstin.toUpperCase() 
            );
        }
    }

    res.status(201).json({ message: 'Invitation sent successfully', user: newUser });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Failed to send invite', error: error.message });
  }
};

// --- 4. REVOKE USER ---
export const revokeUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find before deleting to get data
    const userToDelete = await User.findById(id);
    if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(id); 

    // ✅ AUDIT LOG
    const requester = (req as any).user;
    // 1. Safe access with || [] to prevent crash if undefined
    const gstinvalue = userToDelete.gstinvalue || []; 

    if (requester && gstinvalue.length > 0) {
        for (const gstin of gstinvalue) {
            await logAction(
                requester._id,
                requester.name,
                "REVOKE",
                "Team",
                `Revoked user ${userToDelete.email}`,
                gstin.toUpperCase() // 👈 Save Uppercase
            );
        }
    }

    res.status(200).json({ message: 'User revoked successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Revoke failed', error: error.message });
  }
};

// ... include updateUser and getUserByEmail here if needed ...
// --- 4. GET USER DATA BY EMAIL ---
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find the user, excluding the password field for security
    const userData = await User.findOne({ email }).select('-password');

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(userData);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};
