import mongoose, { Document, Schema } from "mongoose";

export interface IResponseTemplate extends Document {
  type: "reflective" | "resource" | "next_steps" | "encouragement";
  category:
    | "anxiety"
    | "depression"
    | "self-care"
    | "wellness"
    | "general"
    | "all";
  title: string;
  template: string;
  placeholders: string[]; // Variables that can be filled in, e.g., "{user_feeling}", "{specific_concern}"
  exampleUsage: string;
  isActive: boolean;
  usageCount: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const responseTemplateSchema = new Schema<IResponseTemplate>(
  {
    type: {
      type: String,
      enum: ["reflective", "resource", "next_steps", "encouragement"],
      required: true,
    },
    category: {
      type: String,
      enum: [
        "anxiety",
        "depression",
        "self-care",
        "wellness",
        "general",
        "all",
      ],
      default: "all",
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    template: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    placeholders: [
      {
        type: String,
      },
    ],
    exampleUsage: {
      type: String,
      maxlength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
responseTemplateSchema.index({ type: 1, category: 1, isActive: 1 });
responseTemplateSchema.index({ usageCount: -1 });

export const ResponseTemplate = mongoose.model<IResponseTemplate>(
  "ResponseTemplate",
  responseTemplateSchema
);

// Seed default templates
export const defaultTemplates = [
  // Reflective templates
  {
    type: "reflective",
    category: "all",
    title: "Validate Feelings",
    template:
      "It sounds like you're experiencing {feeling}. That must be really {impact} for you. Thank you for sharing this with us.",
    placeholders: ["{feeling}", "{impact}"],
    exampleUsage:
      "It sounds like you're experiencing a lot of anxiety. That must be really overwhelming for you.",
  },
  {
    type: "reflective",
    category: "anxiety",
    title: "Acknowledge Anxiety",
    template:
      "I hear that you're feeling anxious about {situation}. Anxiety can be incredibly challenging, and your feelings are valid.",
    placeholders: ["{situation}"],
    exampleUsage:
      "I hear that you're feeling anxious about your upcoming presentation.",
  },
  {
    type: "reflective",
    category: "depression",
    title: "Acknowledge Depression",
    template:
      "What you're describing sounds really difficult. Feeling {feeling} when dealing with depression is a common experience, and you're not alone in this.",
    placeholders: ["{feeling}"],
    exampleUsage:
      "What you're describing sounds really difficult. Feeling hopeless when dealing with depression is a common experience.",
  },

  // Encouragement templates
  {
    type: "encouragement",
    category: "all",
    title: "Affirm Strength",
    template:
      "The fact that you're reaching out and talking about this shows incredible strength. Taking this step is not easy, and you should be proud of yourself.",
    placeholders: [],
    exampleUsage:
      "The fact that you're reaching out shows incredible strength.",
  },
  {
    type: "encouragement",
    category: "self-care",
    title: "Celebrate Progress",
    template:
      "Every small step counts. {action} is a meaningful act of self-care, and recognizing that is a positive sign.",
    placeholders: ["{action}"],
    exampleUsage:
      "Every small step counts. Taking a walk today is a meaningful act of self-care.",
  },

  // Next steps templates
  {
    type: "next_steps",
    category: "all",
    title: "Gentle Suggestion",
    template:
      "When you feel ready, you might consider {suggestion}. There's no pressure—move at your own pace.",
    placeholders: ["{suggestion}"],
    exampleUsage:
      "When you feel ready, you might consider talking to a trusted friend about this.",
  },
  {
    type: "next_steps",
    category: "anxiety",
    title: "Grounding Technique",
    template:
      "A technique that many find helpful is the 5-4-3-2-1 grounding exercise: identify 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste.",
    placeholders: [],
    exampleUsage:
      "A technique that many find helpful is the 5-4-3-2-1 grounding exercise.",
  },

  // Resource templates
  {
    type: "resource",
    category: "all",
    title: "Crisis Resources",
    template:
      "If you're in crisis, please know that help is available 24/7. You can call the 988 Suicide & Crisis Lifeline or text HOME to 741741 to reach a trained crisis counselor.",
    placeholders: [],
    exampleUsage:
      "If you're in crisis, please know that help is available 24/7.",
  },
];
