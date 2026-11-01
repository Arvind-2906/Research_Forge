import { UserService } from "../services/userService.js";
import { updateUserProfileSchema, updateUserPreferencesSchema } from "../validators/userValidator.js";

export class UserController {
  static async getMe(req, res, next) {
    try {
      const profile = await UserService.getProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMe(req, res, next) {
    try {
      const validated = updateUserProfileSchema.parse(req.body);
      const updated = await UserService.updateProfile(req.user.id, validated);
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPreferences(req, res, next) {
    try {
      const preferences = await UserService.getPreferences(req.user.id);
      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferences(req, res, next) {
    try {
      const validated = updateUserPreferencesSchema.parse(req.body);
      const preferences = await UserService.updatePreferences(req.user.id, validated);
      res.status(200).json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }
}

