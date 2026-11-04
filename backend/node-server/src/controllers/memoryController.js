import { MemoryService } from "../services/memoryService.js";
import {
  createMemorySchema,
  updateMemorySchema,
  searchMemorySchema,
} from "../validators/memoryValidator.js";

export class MemoryController {
  static async create(req, res, next) {
    try {
      const validated = createMemorySchema.parse(req.body);
      const memory = await MemoryService.createMemory(req.user.id, validated);
      res.status(201).json({ success: true, data: memory });
    } catch (error) {
      next(error);
    }
  }

  static async list(req, res, next) {
    try {
      const paginated = await MemoryService.listMemories(req.user.id, req.query);
      res.status(200).json({ success: true, ...paginated });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const memory = await MemoryService.getMemoryById(req.params.memoryId, req.user.id);
      res.status(200).json({ success: true, data: memory });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const validated = updateMemorySchema.parse(req.body);
      const updated = await MemoryService.updateMemory(req.params.memoryId, req.user.id, validated);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const result = await MemoryService.deleteMemory(req.params.memoryId, req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async search(req, res, next) {
    try {
      const validated = searchMemorySchema.parse(req.body);
      const results = await MemoryService.searchMemories(req.user.id, validated);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
}

