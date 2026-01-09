import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { User } from "../models/User";
import { ProfessionalResponse } from "../models/ProfessionalResponse";
import { ResponseTemplate, defaultTemplates } from "../models/ResponseTemplate";
import { Post } from "../models/Post";

// Apply for professional status
export const applyForProfessional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const {
      licenseNumber,
      licenseType,
      issuingAuthority,
      specializations,
      bio,
      yearsOfExperience,
      institutionAffiliation,
      optInTopics,
    } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    // Validate required fields
    if (!licenseNumber || !licenseType || !issuingAuthority) {
      res.status(400).json({
        success: false,
        message: "License number, type, and issuing authority are required",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if already a professional or has pending application
    if (user.professionalProfile) {
      res.status(400).json({
        success: false,
        message: `You already have a professional application with status: ${user.professionalProfile.verificationStatus}`,
      });
      return;
    }

    // Create professional profile with pending status
    user.professionalProfile = {
      licenseNumber,
      licenseType,
      issuingAuthority,
      verificationStatus: "pending",
      specializations: specializations || [],
      bio: bio || "",
      yearsOfExperience: yearsOfExperience || 0,
      institutionAffiliation: institutionAffiliation || undefined,
      dailyResponseLimit: 20,
      responsesGivenToday: 0,
      lastResponseReset: new Date(),
      optInTopics: optInTopics || ["general"],
      isAvailable: true,
    };

    await user.save();

    res.status(201).json({
      success: true,
      message:
        "Professional application submitted successfully. You will be notified once reviewed.",
      data: {
        verificationStatus: "pending",
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Get pending applications
export const getPendingApplications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      User.find({
        "professionalProfile.verificationStatus": "pending",
      })
        .select("name email professionalProfile createdAt")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments({
        "professionalProfile.verificationStatus": "pending",
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: Verify or reject professional
export const verifyProfessional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body;
    const adminId = req.user?._id;

    if (!["approve", "reject"].includes(action)) {
      res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
      return;
    }

    const user = await User.findById(id);
    if (!user || !user.professionalProfile) {
      res.status(404).json({
        success: false,
        message: "Professional application not found",
      });
      return;
    }

    if (action === "approve") {
      user.professionalProfile.verificationStatus = "verified";
      user.professionalProfile.verifiedAt = new Date();
      user.professionalProfile.verifiedBy = adminId
        ? new mongoose.Types.ObjectId(adminId as string)
        : undefined;
      user.role = "professional";
    } else {
      user.professionalProfile.verificationStatus = "rejected";
      user.professionalProfile.rejectionReason =
        rejectionReason || "Application did not meet verification criteria";
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `Professional application ${
        action === "approve" ? "approved" : "rejected"
      } successfully`,
      data: {
        verificationStatus: user.professionalProfile.verificationStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get professional profile
export const getProfessionalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    const user = await User.findById(userId).select(
      "name email avatar professionalProfile"
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update professional profile
export const updateProfessionalProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const {
      bio,
      specializations,
      institutionAffiliation,
      optInTopics,
      isAvailable,
    } = req.body;

    const user = await User.findById(userId);
    if (!user || !user.professionalProfile) {
      res.status(404).json({
        success: false,
        message: "Professional profile not found",
      });
      return;
    }

    // Only allow updating certain fields
    if (bio !== undefined) user.professionalProfile.bio = bio;
    if (specializations !== undefined)
      user.professionalProfile.specializations = specializations;
    if (institutionAffiliation !== undefined)
      user.professionalProfile.institutionAffiliation = institutionAffiliation;
    if (optInTopics !== undefined)
      user.professionalProfile.optInTopics = optInTopics;
    if (isAvailable !== undefined)
      user.professionalProfile.isAvailable = isAvailable;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        professionalProfile: user.professionalProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Submit professional response
export const submitProfessionalResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { postId } = req.params;
    const { responseType, content, aiAssisted, disclaimerAcknowledged } =
      req.body;

    // Verify user is a verified professional
    const user = await User.findById(userId);
    if (
      !user ||
      user.role !== "professional" ||
      user.professionalProfile?.verificationStatus !== "verified"
    ) {
      res.status(403).json({
        success: false,
        message: "Only verified professionals can submit responses",
      });
      return;
    }

    // Check rate limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (user.professionalProfile.lastResponseReset < today) {
      // Reset daily count
      user.professionalProfile.responsesGivenToday = 0;
      user.professionalProfile.lastResponseReset = today;
    }

    if (
      user.professionalProfile.responsesGivenToday >=
      user.professionalProfile.dailyResponseLimit
    ) {
      res.status(429).json({
        success: false,
        message: `Daily response limit (${user.professionalProfile.dailyResponseLimit}) reached. Try again tomorrow.`,
      });
      return;
    }

    // Verify disclaimer acknowledged
    if (!disclaimerAcknowledged) {
      res.status(400).json({
        success: false,
        message: "You must acknowledge the professional response disclaimer",
      });
      return;
    }

    // Verify post exists and professional has opted into the topic
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    // Check if professional has opted into this topic
    if (!user.professionalProfile.optInTopics.includes(post.category)) {
      res.status(403).json({
        success: false,
        message: `You have not opted into the "${post.category}" topic`,
      });
      return;
    }

    // Check if already responded to this post
    const existingResponse = await ProfessionalResponse.findOne({
      post: postId,
      professional: userId,
    });

    if (existingResponse) {
      res.status(400).json({
        success: false,
        message: "You have already responded to this post",
      });
      return;
    }

    // Create response
    const response = await ProfessionalResponse.create({
      post: postId,
      professional: userId,
      responseType,
      content,
      aiAssisted: aiAssisted || false,
      disclaimerAcknowledged: true,
    });

    // Increment response count
    user.professionalProfile.responsesGivenToday += 1;
    await user.save();

    // Populate professional details
    await response.populate(
      "professional",
      "name avatar professionalProfile.licenseType professionalProfile.specializations professionalProfile.verificationStatus"
    );

    res.status(201).json({
      success: true,
      message: "Response submitted successfully",
      data: {
        response,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get professional responses for a post
export const getPostProfessionalResponses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { postId } = req.params;

    const responses = await ProfessionalResponse.find({
      post: postId,
      isVisible: true,
    })
      .populate(
        "professional",
        "name avatar professionalProfile.licenseType professionalProfile.specializations professionalProfile.verificationStatus"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        responses,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get response templates
export const getResponseTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, category } = req.query;

    const query: any = { isActive: true };
    if (type) query.type = type;
    if (category) query.category = { $in: [category, "all"] };

    const templates = await ResponseTemplate.find(query)
      .sort({ usageCount: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        templates,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update DM consent
export const updateDMConsent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { dmConsent } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { dmConsent },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `DM consent ${dmConsent ? "enabled" : "disabled"}`,
      data: {
        dmConsent: user?.dmConsent,
      },
    });
  } catch (error) {
    next(error);
  }
};
