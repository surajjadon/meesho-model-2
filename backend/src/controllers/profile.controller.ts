import { Request, Response } from 'express';
import { Business } from '../models/business.model';

/**
 * @desc    Get user's business profiles
 * @route   GET /api/profiles
 * @access  Private
 */
export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = await Business.find({ userId: req.user!._id });
    res.json(profiles);
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

/**
 * @desc    Add a new business profile
 * @route   POST /api/profiles
 * @access  Private
 */
export const addProfile = async (req: Request, res: Response) => {
  const { accountName, brandName, gstin } = req.body;

  if (!accountName || !brandName || !gstin) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const upperGstin = gstin.toUpperCase();
    const gstinExists = await Business.findOne({ gstin: upperGstin });

    if (gstinExists) {
      // Check if it belongs to the current user
      if (gstinExists.userId.equals(req.user!._id)) {
        return res.status(400).json({ message: 'You have already added this GSTIN' });
      } else {
        // GSTIN is registered by another user. This is the "claim" scenario.
        return res.status(409).json({ message: 'This GSTIN is registered to another user. Contact support to claim it.' });
      }
    }

    const newProfile = await Business.create({
      userId: req.user!._id,
      accountName,
      brandName,
      gstin: upperGstin,
    });

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
    const profile = await Business.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // CRITICAL: Ensure the user deleting the profile is the owner
    if (!profile.userId.equals(req.user!._id)) {
      return res.status(401).json({ message: 'Not authorized to delete this profile' });
    }

    await profile.deleteOne(); // Use deleteOne() on the document

    res.json({ message: 'Profile removed successfully', id: req.params.id });
  } catch (error: any) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};