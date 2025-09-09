import { Router } from 'express';
import { body, param } from 'express-validator';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation rules
const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

const userIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

// Routes - All user routes require authentication
router.use(authenticate);

// GET /api/users - Get all users (admin only)
router.get('/', authorize('admin'), getAllUsers);

// GET /api/users/:id - Get user by ID (admin only or own profile)
router.get('/:id', userIdValidation, validateRequest, getUserById);

// PUT /api/users/:id - Update user (admin only or own profile)
router.put('/:id', userIdValidation, updateUserValidation, validateRequest, updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authorize('admin'), userIdValidation, validateRequest, deleteUser);

export default router;