import { Request, Response } from 'express';
import { Business } from '../models/business.model';
import { User } from '../models/user.model';
import { logAction } from '../utils/logger';

/**
 * @desc    Get user's business profiles
 * @route   GET /api/profiles
 * @access  Private
 */
export const getProfiles = async (req: Request, res: Response) => {
  try {
    // Ensuring user is logged in
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const profiles = await Business.find({ userId: req.user._id });
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Add a new business profile AND update User's GSTIN list
 * @route   POST /api/profiles
 * @access  Private
 */
export const addProfile = async (req: Request, res: Response) => {
  const { accountName, brandName, gstin } = req.body;

  if (!req.user) return res.status(401).json({ message: "Unauthorized" });

  if (!accountName || !brandName || !gstin) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const upperGstin = gstin.toUpperCase();
    const gstinExists = await Business.findOne({ gstin: upperGstin });

    if (gstinExists) {
      if (gstinExists.userId.equals(req.user._id)) {
        return res.status(400).json({ message: 'You have already added this GSTIN' });
      } else {
        return res.status(409).json({ message: 'This GSTIN is registered to another user. Contact support to claim it.' });
      }
    }

    // 1. Create the Business Profile
    const newProfile = await Business.create({
      userId: req.user._id,
      accountName,
      brandName,
      gstin: upperGstin,
    });

    // 2. Add this GSTIN to the Current User's "gstinvalue" array
    await User.findByIdAndUpdate(
        req.user._id,
        { $addToSet: { gstinvalue: upperGstin } },
        { new: true }
    );

    // 3. Audit Log
    await logAction(
        req.user._id.toString(), // ✅ FIX: Added .toString()
        req.user.name,
        "CREATE",
        "Business",
        `Added new business profile: ${brandName} (${upperGstin})`,
        upperGstin
    );

    res.status(201).json(newProfile);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Delete a business profile
 * @route   DELETE /api/profiles/:id
 * @access  Private
 */
export const deleteProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const profile = await Business.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!profile.userId.equals(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized to delete this profile' });
    }

    const deletedGstin = profile.gstin;
    const deletedBrand = profile.brandName;

    // 1. Delete the Business Profile
    await profile.deleteOne();

    // 2. Remove GSTIN from User's "gstinvalue" array
    await User.findByIdAndUpdate(
        req.user._id,
        { $pull: { gstinvalue: deletedGstin } }
    );

    // 3. Audit Log
    await logAction(
        req.user._id.toString(), // ✅ FIX: Added .toString()
        req.user.name,
        "DELETE",
        "Business",
        `Deleted business profile: ${deletedBrand} (${deletedGstin})`,
        deletedGstin
    );

    res.json({ message: 'Profile removed successfully', id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};