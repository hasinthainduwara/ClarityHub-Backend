import mongoose, { Document, Schema } from "mongoose";

export interface IPost extends Document {
  author: mongoose.Types.ObjectId;
  content: string;
  category: "anxiety" | "depression" | "self-care" | "wellness" | "general";
  responseMode: "open" | "listen_only" | "advice" | "encouragement";
  media?: {
    type: "image" | "video";
    url: string;
  }[];
  mood?: string;
  likes: mongoose.Types.ObjectId[];
  bookmarks: mongoose.Types.ObjectId[];
  commentsCount: number;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Post content is required"],
      maxlength: [2000, "Post content cannot exceed 2000 characters"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["anxiety", "depression", "self-care", "wellness", "general"],
      default: "general",
    },
    responseMode: {
      type: String,
      enum: ["open", "listen_only", "advice", "encouragement"],
      default: "open",
    },
    media: [
      {
        type: {
          type: String,
          enum: ["image", "video"],
        },
        url: {
          type: String,
        },
      },
    ],
    mood: {
      type: String,
      trim: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    bookmarks: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    commentsCount: {
      type: Number,
      default: 0,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
postSchema.index({ createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ category: 1, createdAt: -1 });

// Virtual for likes count
postSchema.virtual("likesCount").get(function () {
  return this.likes.length;
});

// Ensure virtuals are included in JSON output
postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

export const Post = mongoose.model<IPost>("Post", postSchema);
