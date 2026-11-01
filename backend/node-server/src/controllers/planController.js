import { PlanService } from "../services/planService.js";
import { updatePlanSchema, rejectPlanSchema } from "../validators/planValidator.js";

export class PlanController {
  static async getByRunId(req, res, next) {
    try {
      const plan = await PlanService.getPlanByRunId(req.params.runId, req.user.id);
      res.status(200).json({ success: true, data: plan });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const validated = updatePlanSchema.parse(req.body);
      const updated = await PlanService.updatePlan(req.params.planId, req.user.id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req, res, next) {
    try {
      const result = await PlanService.approvePlan(req.params.planId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req, res, next) {
    try {
      const validated = rejectPlanSchema.parse(req.body);
      const result = await PlanService.rejectPlan(req.params.planId, req.user.id, validated.reason);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async regenerate(req, res, next) {
    try {
      const result = await PlanService.regeneratePlan(req.params.planId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

