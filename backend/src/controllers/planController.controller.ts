// src/controllers/subscription.controller.ts

import { Request, Response } from 'express';
import { SubscriptionPlan } from './../models/subscriptionPlans.model';
import { PlanPricing } from './../models/PlanPricing.model';

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ displayOrder: 1 })
      .lean();

    if (!plans.length) return res.json({ success: true, data: [] });

    const planIds = plans.map(p => p.id);

    const pricing = await PlanPricing.find({
      planId: { $in: planIds }
    }).lean();

    const formatted = plans.map(plan => {
      const prices: Record<string, number> = {};
      pricing
        .filter(p => p.planId === plan.id)
        .forEach(p => {
          prices[p.cycle] = p.price;
        });

      return {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        prices,
        features: plan.features,
        highlight: plan.highlight,
        badge: plan.badge,
        trialDays: plan.trialDays
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (err: any) {
    console.error('❌ getPlans failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /plan
 * Create a new subscription plan
 */
export const createPlan = async (req: Request, res: Response) => {
  try {
    const plan = await SubscriptionPlan.create(req.body);
    return res.status(201).json({ success: true, data: plan });
  } catch (err: any) {
    console.error('❌ createPlan failed:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * POST /pricing
 * Create a pricing entry for a plan
 */
export const createPricing = async (req: Request, res: Response) => {
  try {
    const pricing = await PlanPricing.create(req.body);
    return res.status(201).json({ success: true, data: pricing });
  } catch (err: any) {
    console.error('❌ createPricing failed:', err);
    return res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /plans
 * Delete all plans and pricing (DEV ONLY)
 */
export const deleteAllPlans = async (_: Request, res: Response) => {
  try {
    await SubscriptionPlan.deleteMany({});
    await PlanPricing.deleteMany({});
    return res.json({ success: true, message: 'All plans and pricing deleted' });
  } catch (err: any) {
    console.error('❌ deleteAllPlans failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
