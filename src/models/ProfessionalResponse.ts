import mongoose, { Document, Schema } from "mongoose";

// Resource item interface
export interface IResourceItem {
  title: string;
  url?: string;
  type: "article" | "hotline" | "service" | "exercise" | "book" | "app";
  description: string;
}

// Next step item interface
export interface INextStep {
  step: string;
  priority: "immediate" | "short_term" | "long_term";
}

// Response content interface
export interface IResponseContent {
  reflection?: string;
  resources?: IResourceItem[];
  nextSteps?: INextStep[];
  encouragement?: string;
}

export interface IProfessionalResponse extends Document {
  post: mongoose.Types.ObjectId;
  professional: mongoose.Types.ObjectId;

  // Structured response type
  responseType:
    | "reflective"
    | "resource"
    | "next_steps"
    | "encouragement"
    | "combined";

  // Content based on type
  content: IResponseContent;

  // AI assistance tracking
  aiAssisted: boolean;
  aiSuggestions?: string[];

  // Audit trail
  createdAt: Date;
  editedAt?: Date;
  editHistory?: {
    editedAt: Date;
    previousContent: IResponseContent;
  }[];

  isVisible: boolean;

  // Disclaimer acknowledgment
  disclaimerAcknowledged: boolean;
}

const resourceSchema = new Schema<IResourceItem>(
  {
    title: { type: String, required: true, maxlength: 200 },
    url: { type: String },
    type: {
      type: String,
      enum: ["article", "hotline", "service", "exercise", "book", "app"],
      required: true,
    },
    description: { type: String, required: true, maxlength: 500 },
  },
  { _id: false }
);

const nextStepSchema = new Schema<INextStep>(
  {
    step: { type: String, required: true, maxlength: 300 },
    priority: {
      type: String,
      enum: ["immediate", "short_term", "long_term"],
      required: true,
    },
  },
  { _id: false }
);

const professionalResponseSchema = new Schema<IProfessionalResponse>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    professional: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    responseType: {
      type: String,
      enum: [
        "reflective",
        "resource",
        "next_steps",
        "encouragement",
        "combined",
      ],
      required: true,
    },
    content: {
      reflection: { type: String, maxlength: 2000 },
      resources: [resourceSchema],
      nextSteps: [nextStepSchema],
      encouragement: { type: String, maxlength: 1000 },
    },
    aiAssisted: {
      type: Boolean,
      default: false,
    },
    aiSuggestions: [{ type: String }],
    editedAt: { type: Date },
    editHistory: [
      {
        editedAt: { type: Date },
        previousContent: {
          reflection: String,
          resources: [resourceSchema],
          nextSteps: [nextStepSchema],
          encouragement: String,
        },
      },
    ],
    isVisible: {
      type: Boolean,
      default: true,
    },
    disclaimerAcknowledged: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
professionalResponseSchema.index({ post: 1, createdAt: -1 });
professionalResponseSchema.index({ professional: 1, createdAt: -1 });
professionalResponseSchema.index(
  { post: 1, professional: 1 },
  { unique: true }
);

// Virtual to populate professional details
professionalResponseSchema.virtual("professionalDetails", {
  ref: "User",
  localField: "professional",
  foreignField: "_id",
  justOne: true,
});

professionalResponseSchema.set("toJSON", { virtuals: true });
professionalResponseSchema.set("toObject", { virtuals: true });

export const ProfessionalResponse = mongoose.model<IProfessionalResponse>(
  "ProfessionalResponse",
  professionalResponseSchema
);
