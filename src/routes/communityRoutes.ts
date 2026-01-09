import { Router } from "express";
import { body, param, query } from "express-validator";
import { authenticate } from "../middleware/auth";
import { validateRequest } from "../middleware/validation";
import {
  createCommunity,
  getAllCommunities,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  createCommunityPost,
  getCommunityPosts,
  getUserCommunities,
} from "../controllers/communityController";

const router = Router();

// Validation
const createCommunityValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Name must be between 3 and 50 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 500 })
    .withMessage("Description cannot exceed 500 characters"),
  body("coverImage")
    .trim()
    .notEmpty()
    .withMessage("Cover image is required"),
  body("logo")
    .trim()
    .notEmpty()
    .withMessage("Logo is required"),
];

const createPostValidation = [
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required"),
];

// Apply authentication to all routes
router.use(authenticate);

// POST /api/communities - Create a new community
router.post(
  "/",
  createCommunityValidation,
  validateRequest,
  createCommunity
);

// GET /api/communities - List communities (most popular, with limit)
router.get(
  "/",
  [
    query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
    query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
  ],
  validateRequest,
  getAllCommunities
);

// GET /api/communities/my-communities - Get user's joined communities
router.get("/my-communities", getUserCommunities);

// GET /api/communities/:id - Get community details
router.get(
  "/:id",
  [param("id").isMongoId().withMessage("Invalid community ID")],
  validateRequest,
  getCommunity
);

// POST /api/communities/:id/join - Join community
router.post(
  "/:id/join",
  [param("id").isMongoId().withMessage("Invalid community ID")],
  validateRequest,
  joinCommunity
);

// POST /api/communities/:id/leave - Leave community
router.post(
  "/:id/leave",
  [param("id").isMongoId().withMessage("Invalid community ID")],
  validateRequest,
  leaveCommunity
);

// POST /api/communities/:id/posts - Create post in community
router.post(
  "/:id/posts",
  [param("id").isMongoId().withMessage("Invalid community ID")],
  createPostValidation,
  validateRequest,
  createCommunityPost
);

// GET /api/communities/:id/posts - Fetch community posts
router.get(
  "/:id/posts",
  [
    param("id").isMongoId().withMessage("Invalid community ID"),
    query("limit").optional().isInt({ min: 1 }),
    query("page").optional().isInt({ min: 1 }),
  ],
  validateRequest,
  getCommunityPosts
);

export default router;
