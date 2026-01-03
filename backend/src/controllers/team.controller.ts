import { Request, Response } from 'express';
import crypto from 'crypto';
import { User } from './../models/user.model'; 
import sendEmail from '../utils/sendEmail';
import { Business } from '../models/business.model';
import { logAction } from '../utils/logger'; 

// 🛡️ SECURITY HELPER: Sanitize array of strings
// Ensures that GSTIN lists contain only Strings, preventing object injection
const sanitizeStringArray = (arr: any[]): string[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => String(item)).filter(item => item.trim() !== "");
};

// --- 1. GET TEAM MEMBERS (FILTERED BY SHARED GSTIN) ---
export const getTeamMembers = async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;

    // 🛡️ SECURITY FIX: Ensure gstinvalue is treated as an array of strings
    const rawGstins = currentUser.gstinvalue || [];
    const myGSTINs = sanitizeStringArray(rawGstins);

    if (myGSTINs.length === 0) {
        return res.status(200).json([]);
    }

    // 3. Database Query
    const members = await User.find({
        role: { $ne: 'Owner' }, 
        _id: { $ne: currentUser._id }, 
        $or: [
            // $in requires an array, and myGSTINs is now guaranteed to be a string array
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
        // 🛡️ SECURITY: Safe filter
        selectedIds: Array.isArray(user.allowedGSTs) 
            ? user.allowedGSTs.filter((g: string) => myGSTINs.includes(String(g))) 
            : []
      },
gstinvalue: user.gstinvalue,
      status: user.status
    }));

    res.status(200).json(formattedMembers);
  } catch (error: any) {
    console.error("Fetch Team Error:", error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// --- 2. INVITE USER ---
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { 
        name, email, phone, role, permissions, modules, 
        allowedGSTs, gstinvalue, gstAccessAll, gstAccess 
    } = req.body;

    // 🛡️ SECURITY FIX: Sanitize Email immediately
    const safeEmail = String(email);

    const existingUser = await User.findOne({ email: safeEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    // 🛡️ SECURITY FIX: Sanitize Arrays
    const safeAllowedGSTs = sanitizeStringArray(allowedGSTs || (gstAccess ? gstAccess.selectedIds : []));
    const safeGstinValue = sanitizeStringArray(gstinvalue || []);

    const finalGstAccessAll = gstAccessAll !== undefined ? gstAccessAll : (gstAccess ? gstAccess.allFuture : true);
    const finalPermissions = permissions || modules;

    const newUser = await User.create({
      name: String(name), // Force string
      email: safeEmail,
      phone: String(phone),
      role: String(role),
      permissions: finalPermissions, 
      allowedGSTs: safeAllowedGSTs,
      gstinvalue: safeGstinValue,     
      gstAccessAll: finalGstAccessAll,
      status: 'invited',
      inviteToken,
      inviteTokenExpire
    });

    const newUserId = newUser._id;

    // Business creation loop
    // 🛡️ SECURITY FIX: Loop over sanitized array
    // This prevents the `.toUpperCase()` crash if an object was injected
    if (safeGstinValue.length > 0) {
        for (const gstin of safeGstinValue) {
            const upperGstin = gstin.toUpperCase();
            
            // 🛡️ SECURITY FIX: Ensure query is safe
            const gstinExists = await Business.findOne({ gstin: String(upperGstin) });
            
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
        <p>Hi <strong>${String(name)}</strong>,</p>
        <p>You have been invited to join the team as a <strong>${String(role)}</strong>.</p>
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
    if ((req as any).user && safeGstinValue.length > 0) {
        for (const gstin of safeGstinValue) {
            await logAction(
                (req as any).user._id,
                (req as any).user.name,
                "INVITE",
                "Team",
                `Invited ${name} (${safeEmail}) as ${role}`,
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
    
    // 🛡️ SECURITY NOTE: req.params are always strings in Express, 
    // so NoSQL injection via JSON object isn't possible here.
    // However, casting it explicitly is good hygiene.
    const safeId = String(id);

    const userToDelete = await User.findById(safeId);
    if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(safeId); 

    // ✅ AUDIT LOG
    const requester = (req as any).user;
    const gstinvalue = userToDelete.gstinvalue || []; 

    // 🛡️ SECURITY FIX: Sanitize array before looping for audit log
    const safeGstinValue = sanitizeStringArray(gstinvalue);

    if (requester && safeGstinValue.length > 0) {
        for (const gstin of safeGstinValue) {
            await logAction(
                requester._id,
                requester.name,
                "REVOKE",
                "Team",
                `Revoked user ${userToDelete.email}`,
                gstin.toUpperCase()
            );
        }
    }

    res.status(200).json({ message: 'User revoked successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Revoke failed', error: error.message });
  }
};

// --- 4. GET USER DATA BY EMAIL ---
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const email = req.params.email;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // 🛡️ SECURITY FIX: Explicit String conversion
    // Even though params are strings, this prevents any middleware mutation issues
    const safeEmail = String(email);

    const userData = await User.findOne({ email: safeEmail }).select('-password');

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(userData);
  } catch (error: any) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};