import { Router } from "express";
import {
  createPost,
  getPosts,
  getPost,
  toggleLike,
  toggleBookmark,
  deletePost,
  getUserPosts,
} from "../controllers/postController";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.get("/", getPosts);
router.get("/:id", getPost);

// Protected routes (require authentication)
router.post("/", authenticate, createPost);
router.post("/:id/like", authenticate, toggleLike);
router.post("/:id/bookmark", authenticate, toggleBookmark);
router.delete("/:id", authenticate, deletePost);
router.get("/user/my-posts", authenticate, getUserPosts);

export default router;
