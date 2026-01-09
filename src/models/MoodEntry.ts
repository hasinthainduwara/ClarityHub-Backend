import mongoose, { Document, Schema } from "mongoose";

export type MoodScore = -2 | -1 | 0 | 1 | 2;
export type MoodLabel = "VERY_SAD" | "SAD" | "NEUTRAL" | "HAPPY" | "VERY_HAPPY";
export type MoodSource = "USER_ENTRY" | "SESSION_END" | "PROMPT";

export interface IMoodEntry extends Document {
  userId: mongoose.Types.ObjectId;
  timestamp: Date;
  moodScore: MoodScore;
  moodLabel: MoodLabel;
  noteSummary?: string;
  noteEncrypted?: string;
  noteHash?: string; // For deduplication
  emotionTags?: string[];
  source: MoodSource;
  metadata?: {
    sessionId?: string;
    promptType?: string;
    deviceType?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MoodEntrySchema = new Schema<IMoodEntry>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    moodScore: {
      type: Number,
      required: true,
      enum: [-2, -1, 0, 1, 2],
      index: true,
    },
    moodLabel: {
      type: String,
      required: true,
      enum: ["VERY_SAD", "SAD", "NEUTRAL", "HAPPY", "VERY_HAPPY"],
    },
    noteSummary: {
      type: String,
      maxlength: 1000,
    },
    noteEncrypted: {
      type: String,
      select: false, // Never return encrypted notes by default
    },
    noteHash: {
      type: String,
      select: false,
    },
    emotionTags: [
      {
        type: String,
        maxlength: 50,
      },
    ],
    source: {
      type: String,
      required: true,
      enum: ["USER_ENTRY", "SESSION_END", "PROMPT"],
      default: "USER_ENTRY",
    },
    metadata: {
      sessionId: String,
      promptType: String,
      deviceType: String,
    },
  },
  {
    timestamps: true,
    collection: "mood_entries",
  }
);

// Compound indexes for efficient queries
MoodEntrySchema.index({ userId: 1, timestamp: -1 });
MoodEntrySchema.index({ userId: 1, moodScore: 1 });
MoodEntrySchema.index({ userId: 1, createdAt: -1 });

// Prevent accidental exposure of encrypted data
MoodEntrySchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.noteEncrypted;
    delete ret.noteHash;
    return ret;
  },
});

export default mongoose.model<IMoodEntry>("MoodEntry", MoodEntrySchema);
