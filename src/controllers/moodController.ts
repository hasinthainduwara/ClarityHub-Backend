import { Request, Response } from "express";
import MoodEntry, { MoodScore, MoodLabel } from "../models/MoodEntry";
import crypto from "crypto";

// Helper: Sanitize note (remove identifiers)
const sanitizeNote = (note: string): string => {
  return note
    .replace(/\b\d{10,}\b/g, "[number]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[email]")
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, "[name]")
    .trim()
    .substring(0, 500);
};

// Helper: Hash note for deduplication
const hashNote = (note: string): string => {
  return crypto
    .createHash("sha256")
    .update(note.trim().toLowerCase())
    .digest("hex");
};

// Helper: Get date range
const getDateRange = (range: "7d" | "30d" | "90d" | "all") => {
  const now = new Date();
  const startDate = new Date();

  switch (range) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "all":
      return null;
  }

  return startDate;
};

// POST /api/mood - Record a new mood entry (atomic operation)
export const recordMood = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { moodScore, moodLabel, note, source = "USER_ENTRY" } = req.body;

    // Validate required fields
    if (moodScore === undefined || !moodLabel) {
      return res.status(400).json({
        error: "moodScore and moodLabel are required",
      });
    }

    // Validate mood score
    if (![-2, -1, 0, 1, 2].includes(moodScore)) {
      return res.status(400).json({
        error: "moodScore must be -2, -1, 0, 1, or 2",
      });
    }

    // Validate mood label
    const validLabels = ["VERY_SAD", "SAD", "NEUTRAL", "HAPPY", "VERY_HAPPY"];
    if (!validLabels.includes(moodLabel)) {
      return res.status(400).json({
        error: "Invalid moodLabel",
      });
    }

    // Process note if provided
    let noteSummary: string | undefined;
    let noteHash: string | undefined;

    if (note && note.trim()) {
      noteSummary = sanitizeNote(note);
      noteHash = hashNote(note);
    }

    // Create mood entry (atomic operation)
    const moodEntry = await MoodEntry.create({
      userId,
      timestamp: new Date(),
      moodScore,
      moodLabel,
      noteSummary,
      noteHash,
      source,
    });

    res.status(201).json({
      success: true,
      data: moodEntry,
    });
  } catch (error: any) {
    console.error("Error recording mood:", error);
    res.status(500).json({
      error: "Failed to record mood entry",
      details: error.message,
    });
  }
};

// GET /api/mood/history - Get mood history
export const getMoodHistory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const range = (req.query.range as string) || "7d";
    const startDate = getDateRange(range as "7d" | "30d" | "90d" | "all");

    const query: any = { userId };
    if (startDate) {
      query.timestamp = { $gte: startDate };
    }

    const entries = await MoodEntry.find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .select("-noteEncrypted -noteHash");

    res.json({
      success: true,
      data: entries,
    });
  } catch (error: any) {
    console.error("Error fetching mood history:", error);
    res.status(500).json({
      error: "Failed to fetch mood history",
      details: error.message,
    });
  }
};

// GET /api/mood/trends - Get mood trends (aggregated for visualization)
export const getMoodTrends = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const range = (req.query.range as string) || "7d";
    const startDate = getDateRange(range as "7d" | "30d" | "90d");

    if (!startDate) {
      return res
        .status(400)
        .json({ error: "Range 'all' not supported for trends" });
    }

    // Aggregate by day
    const trends = await MoodEntry.aggregate([
      {
        $match: {
          userId: userId,
          timestamp: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
          },
          averageScore: { $avg: "$moodScore" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
      {
        $project: {
          _id: 0,
          period: "$_id",
          averageScore: { $round: ["$averageScore", 2] },
          count: 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: trends,
    });
  } catch (error: any) {
    console.error("Error fetching mood trends:", error);
    res.status(500).json({
      error: "Failed to fetch mood trends",
      details: error.message,
    });
  }
};

// GET /api/mood/stats - Get mood statistics
export const getMoodStats = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const range = (req.query.range as string) || "30d";
    const startDate = getDateRange(range as "7d" | "30d" | "90d" | "all");

    const query: any = { userId };
    if (startDate) {
      query.timestamp = { $gte: startDate };
    }

    const entries = await MoodEntry.find(query).sort({ timestamp: -1 });

    // Calculate statistics
    const totalEntries = entries.length;
    const averageScore =
      totalEntries > 0
        ? entries.reduce((sum, e) => sum + e.moodScore, 0) / totalEntries
        : 0;

    // Find best day
    const bestEntry = entries.reduce((best, current) => {
      return current.moodScore > best.moodScore ? current : best;
    }, entries[0] || { moodScore: 0, timestamp: new Date() });

    // Calculate mood distribution
    const distribution: Record<string, number> = {
      VERY_SAD: 0,
      SAD: 0,
      NEUTRAL: 0,
      HAPPY: 0,
      VERY_HAPPY: 0,
    };

    entries.forEach((entry) => {
      const count = distribution[entry.moodLabel];
      if (count !== undefined) {
        distribution[entry.moodLabel] = count + 1;
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const now = new Date();
    const sortedEntries = [...entries].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      if (!entry) break;

      const entryDate = new Date(entry.timestamp);
      const daysDiff = Math.floor(
        (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        averageScore: Math.round(averageScore * 100) / 100,
        totalEntries,
        bestDay: {
          date: bestEntry.timestamp.toISOString().split("T")[0],
          score: bestEntry.moodScore,
        },
        currentStreak,
        distribution,
      },
    });
  } catch (error: any) {
    console.error("Error calculating mood stats:", error);
    res.status(500).json({
      error: "Failed to calculate mood statistics",
      details: error.message,
    });
  }
};

// GET /api/mood/insights - Get AI-generated insights (placeholder)
export const getMoodInsights = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get recent entries for analysis
    const entries = await MoodEntry.find({ userId })
      .sort({ timestamp: -1 })
      .limit(30);

    // Minimum data requirement
    if (entries.length < 7) {
      return res.json({
        success: true,
        data: [],
        message: "Not enough data for insights. Keep tracking!",
      });
    }

    // TODO: Integrate with AI service for real insights
    // For now, return basic pattern-based insights
    const insights = [];

    // Calculate average score
    const avgScore =
      entries.reduce((sum, e) => sum + e.moodScore, 0) / entries.length;

    if (avgScore < -0.5) {
      insights.push({
        title: "Lower Mood Pattern Observed",
        observation:
          "Your recent mood scores have been on the lower side. This might be worth noticing, but remember - fluctuations are normal.",
        suggestion:
          "Consider exploring activities that have historically improved your mood, or reach out to someone you trust.",
        tone: "gentle" as const,
        dataPoints: entries.length,
        confidence: 0.7,
      });
    } else if (avgScore > 0.5) {
      insights.push({
        title: "Positive Mood Trend",
        observation:
          "You've been recording more positive moods recently. That's great to see!",
        suggestion:
          "Reflect on what's been going well - it might help you recognize patterns worth maintaining.",
        tone: "encouraging" as const,
        dataPoints: entries.length,
        confidence: 0.75,
      });
    }

    // Check for variability
    const scores = entries.map((e) => e.moodScore);
    const variance =
      scores.reduce(
        (sum: number, score) => sum + Math.pow(score - avgScore, 2),
        0
      ) / scores.length;

    if (variance > 1.5) {
      insights.push({
        title: "Mood Variability Noticed",
        observation:
          "Your mood has been fluctuating quite a bit. This could be influenced by various factors in your environment or routine.",
        suggestion:
          "You might find it helpful to note what's happening when you track your mood - patterns might emerge.",
        tone: "neutral" as const,
        dataPoints: entries.length,
        confidence: 0.65,
      });
    }

    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    console.error("Error generating insights:", error);
    res.status(500).json({
      error: "Failed to generate insights",
      details: error.message,
    });
  }
};

// GET /api/mood/patterns - Get detected patterns
export const getMoodPatterns = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const entries = await MoodEntry.find({ userId })
      .sort({ timestamp: -1 })
      .limit(90);

    if (entries.length < 14) {
      return res.json({
        success: true,
        data: [],
        message: "Not enough data for pattern detection",
      });
    }

    const patterns = [];

    // Pattern: Time-based (weekday vs weekend)
    const weekdayScores: number[] = [];
    const weekendScores: number[] = [];

    entries.forEach((entry) => {
      const day = entry.timestamp.getDay();
      if (day === 0 || day === 6) {
        weekendScores.push(entry.moodScore);
      } else {
        weekdayScores.push(entry.moodScore);
      }
    });

    if (weekdayScores.length > 5 && weekendScores.length > 2) {
      const weekdayAvg =
        weekdayScores.reduce((a, b) => a + b, 0) / weekdayScores.length;
      const weekendAvg =
        weekendScores.reduce((a, b) => a + b, 0) / weekendScores.length;
      const diff = Math.abs(weekdayAvg - weekendAvg);

      if (diff > 0.5) {
        patterns.push({
          type: "time_based",
          description:
            weekdayAvg < weekendAvg
              ? "Your mood tends to be lower on weekdays compared to weekends."
              : "Your mood tends to be higher on weekdays compared to weekends.",
          confidence: Math.min(diff / 2, 0.9),
          suggestion:
            "Consider what differs between weekdays and weekends that might affect your mood.",
        });
      }
    }

    // Pattern: Trend detection
    const recentEntries = entries.slice(0, 14);
    const olderEntries = entries.slice(14, 28);

    if (olderEntries.length > 0) {
      const recentAvg =
        recentEntries.reduce((sum, e) => sum + e.moodScore, 0) /
        recentEntries.length;
      const olderAvg =
        olderEntries.reduce((sum, e) => sum + e.moodScore, 0) /
        olderEntries.length;
      const trendDiff = recentAvg - olderAvg;

      if (Math.abs(trendDiff) > 0.5) {
        patterns.push({
          type: "trend",
          description:
            trendDiff > 0
              ? "Your mood has been trending upward over the past two weeks."
              : "Your mood has been trending downward over the past two weeks.",
          confidence: Math.min(Math.abs(trendDiff) / 2, 0.85),
          suggestion:
            trendDiff > 0
              ? "Whatever you're doing seems to be working. Keep it up!"
              : "If this trend continues, it might be worth exploring what's changed recently.",
        });
      }
    }

    res.json({
      success: true,
      data: patterns,
    });
  } catch (error: any) {
    console.error("Error detecting patterns:", error);
    res.status(500).json({
      error: "Failed to detect patterns",
      details: error.message,
    });
  }
};

// DELETE /api/mood/:id - Delete mood entry (privacy feature)
export const deleteMoodEntry = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const entry = await MoodEntry.findOne({ _id: id, userId });
    if (!entry) {
      return res.status(404).json({ error: "Mood entry not found" });
    }

    await entry.deleteOne();

    res.json({
      success: true,
      message: "Mood entry deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting mood entry:", error);
    res.status(500).json({
      error: "Failed to delete mood entry",
      details: error.message,
    });
  }
};

// GET /api/mood/export - Export all mood data (privacy feature)
export const exportMoodData = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const entries = await MoodEntry.find({ userId })
      .sort({ timestamp: -1 })
      .select("-noteEncrypted -noteHash");

    res.json({
      success: true,
      data: entries,
      exportedAt: new Date().toISOString(),
      totalEntries: entries.length,
    });
  } catch (error: any) {
    console.error("Error exporting mood data:", error);
    res.status(500).json({
      error: "Failed to export mood data",
      details: error.message,
    });
  }
};
