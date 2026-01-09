import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

// Professional profile interface
export interface IProfessionalProfile {
  licenseNumber: string;
  licenseType:
    | "psychologist"
    | "psychiatrist"
    | "counselor"
    | "therapist"
    | "social_worker"
    | "other";
  issuingAuthority: string;
  verificationStatus: "pending" | "verified" | "rejected";
  verifiedAt?: Date;
  verifiedBy?: mongoose.Types.ObjectId;
  rejectionReason?: string;
  specializations: string[];
  bio: string;
  yearsOfExperience: number;
  institutionAffiliation?: string;

  // Rate limiting
  dailyResponseLimit: number;
  responsesGivenToday: number;
  lastResponseReset: Date;

  // Opt-in topics
  optInTopics: (
    | "anxiety"
    | "depression"
    | "self-care"
    | "wellness"
    | "general"
  )[];

  // Availability
  isAvailable: boolean;
  availabilitySchedule?: {
    day: number; // 0-6 (Sunday-Saturday)
    startHour: number; // 0-23
    endHour: number; // 0-23
  }[];
}

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  authProvider: "local" | "google";
  role: "user" | "professional" | "admin";
  isActive: boolean;

  // Professional-specific fields
  professionalProfile?: IProfessionalProfile;

  // Privacy settings
  dmConsent: boolean;

  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const professionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    licenseNumber: { type: String, required: true },
    licenseType: {
      type: String,
      enum: [
        "psychologist",
        "psychiatrist",
        "counselor",
        "therapist",
        "social_worker",
        "other",
      ],
      required: true,
    },
    issuingAuthority: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
    specializations: [{ type: String }],
    bio: { type: String, maxlength: 1000 },
    yearsOfExperience: { type: Number, min: 0 },
    institutionAffiliation: { type: String },

    // Rate limiting
    dailyResponseLimit: { type: Number, default: 20 },
    responsesGivenToday: { type: Number, default: 0 },
    lastResponseReset: { type: Date, default: Date.now },

    // Opt-in topics
    optInTopics: [
      {
        type: String,
        enum: ["anxiety", "depression", "self-care", "wellness", "general"],
      },
    ],

    // Availability
    isAvailable: { type: Boolean, default: true },
    availabilitySchedule: [
      {
        day: { type: Number, min: 0, max: 6 },
        startHour: { type: Number, min: 0, max: 23 },
        endHour: { type: Number, min: 0, max: 23 },
      },
    ],
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "local";
      },
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Don't include password in queries by default
    },
    googleId: {
      type: String,
      sparse: true,
      unique: true,
    },
    avatar: {
      type: String,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    role: {
      type: String,
      enum: ["user", "professional", "admin"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    professionalProfile: {
      type: professionalProfileSchema,
      default: undefined,
    },
    dmConsent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc: any, ret: any) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    return false;
  }
};

export const User = mongoose.model<IUser>("User", userSchema);
