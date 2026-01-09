import express from "express";
import { authenticate } from "../middleware/auth";
import {
  recordMood,
  getMoodHistory,
  getMoodTrends,
  getMoodStats,
  getMoodInsights,
  getMoodPatterns,
  deleteMoodEntry,
  exportMoodData,
} from "../controllers/moodController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/mood - Record new mood entry
router.post("/", recordMood);

// GET /api/mood/history - Get mood history
router.get("/history", getMoodHistory);

// GET /api/mood/trends - Get mood trends (aggregated)
router.get("/trends", getMoodTrends);

// GET /api/mood/stats - Get mood statistics
router.get("/stats", getMoodStats);

// GET /api/mood/insights - Get AI-generated insights
router.get("/insights", getMoodInsights);

// GET /api/mood/patterns - Get detected patterns
router.get("/patterns", getMoodPatterns);

// GET /api/mood/export - Export all mood data
router.get("/export", exportMoodData);

// DELETE /api/mood/:id - Delete mood entry
router.delete("/:id", deleteMoodEntry);

export default router;
