import { Request, Response, NextFunction } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User";
import "../types/express"; // Import to extend Express Request

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT tokens
const generateToken = (userId: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  } as SignOptions);
};

const generateRefreshToken = (userId: string): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not defined");
  }

  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  } as SignOptions);
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        error: "User with this email already exists",
      });
      return;
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
    });

    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.status(201).json({
      message: "User created successfully",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select("+password");

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "Invalid credentials",
      });
      return;
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        error: "Invalid credentials",
      });
      return;
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      message: "Login successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "User not authenticated",
      });
      return;
    }

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "User not authenticated",
      });
      return;
    }

    const { name, email } = req.body;

    // Check if email is already taken by another user
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          error: "Email already in use",
        });
        return;
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { ...(name && { name }), ...(email && { email }) },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   POST /api/auth/change-password
// @access  Private
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: "User not authenticated",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      res.status(400).json({
        error: "Current password is incorrect",
      });
      return;
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({
        error: "Refresh token is required",
      });
      return;
    }

    if (!process.env.JWT_REFRESH_SECRET) {
      throw new Error("JWT_REFRESH_SECRET is not defined");
    }

    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET) as {
      userId: string;
    };

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        error: "User not found or inactive",
      });
      return;
    }

    // Generate new access token
    const newAccessToken = generateToken(user._id);

    res.json({
      message: "Token refreshed successfully",
      token: newAccessToken,
    });
  } catch (error) {
    res.status(401).json({
      error: "Invalid or expired refresh token",
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a stateless JWT implementation, logout is handled client-side
    // by removing the token. However, we can still provide a logout endpoint
    // for consistency and potential token blacklisting in the future.

    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Google OAuth authentication
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({
        error: "Google credential is required",
      });
      return;
    }

    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      res.status(400).json({
        error: "Invalid Google token",
      });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      res.status(400).json({
        error: "Email not provided by Google",
      });
      return;
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with same email (local account)
      user = await User.findOne({ email });

      if (user) {
        // Link Google account to existing local account
        user.googleId = googleId;
        user.avatar = picture;
        if (!user.authProvider || user.authProvider === "local") {
          // Keep as local but add Google ID for future Google logins
        }
        await user.save();
      } else {
        // Create new user with Google account
        user = new User({
          name: name || email.split("@")[0],
          email,
          googleId,
          avatar: picture,
          authProvider: "google",
        });
        await user.save();
      }
    }

    if (!user.isActive) {
      res.status(401).json({
        error: "Account is deactivated",
      });
      return;
    }

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    res.json({
      message: "Google authentication successful",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({
      error: "Google authentication failed",
    });
  }
};
