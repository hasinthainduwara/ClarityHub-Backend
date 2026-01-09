import express from "express";
import { authenticate } from "../middleware/auth";
import {
  createComment,
  getPostComments,
  deleteComment,
} from "../controllers/commentController";

const router = express.Router();

// Routes for comments
router.post("/:postId", authenticate, createComment);
router.get("/:postId", authenticate, getPostComments);
router.delete("/:commentId", authenticate, deleteComment);

export default router;
