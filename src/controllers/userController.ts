import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin only)
export const getAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const totalUsers = await User.countDocuments();
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin or own profile)
export const getUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if user is admin or accessing their own profile
    if (req.user?.role !== 'admin' && req.user?._id !== id) {
      res.status(403).json({
        error: 'Access denied. You can only view your own profile.',
      });
      return;
    }

    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin or own profile)
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive } = req.body;
    
    // Check if user is admin or updating their own profile
    const isAdmin = req.user?.role === 'admin';
    const isOwnProfile = req.user?._id === id;
    
    if (!isAdmin && !isOwnProfile) {
      res.status(403).json({
        error: 'Access denied. You can only update your own profile.',
      });
      return;
    }
    
    // Non-admin users cannot change role or isActive status
    if (!isAdmin && (role !== undefined || isActive !== undefined)) {
      res.status(403).json({
        error: 'Access denied. Only admins can change role or active status.',
      });
      return;
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id } });
      if (existingUser) {
        res.status(400).json({
          error: 'Email already in use',
        });
        return;
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (isAdmin && role !== undefined) updateData.role = role;
    if (isAdmin && isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user?._id === id) {
      res.status(400).json({
        error: 'You cannot delete your own account',
      });
      return;
    }

    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({
        error: 'User not found',
      });
      return;
    }

    await User.findByIdAndDelete(id);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};