import { Request, Response } from "express";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { User } from "../models/User";

// Create a comment
export const createComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!content) {
      res.status(400).json({ message: "Comment content is required" });
      return;
    }

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    // Check response mode
    if (post.responseMode === "listen_only") {
      res
        .status(403)
        .json({
          message: "Comments are disabled for this post (Listen Only mode)",
        });
      return;
    }

    const comment = new Comment({
      content,
      post: postId,
      author: userId,
    });

    await comment.save();

    // Increment comment count
    post.commentsCount += 1;
    await post.save();

    // Populate author before returning
    await comment.populate("author", "name avatar");

    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ message: "Error creating comment" });
  }
};

// Get comments for a post
export const getPostComments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { postId } = req.params;

    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 }) // Oldest first for chronological conversation
      .populate(
        "author",
        "name avatar role professionalProfile.verificationStatus"
      );

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ message: "Error fetching comments" });
  }
};

// Delete a comment
export const deleteComment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { commentId } = req.params;
    const userId = req.user?.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      res.status(404).json({ message: "Comment not found" });
      return;
    }

    // Find the post to check ownership (post author can also delete)
    const post = await Post.findById(comment.post);

    if (
      comment.author.toString() !== userId &&
      post?.author.toString() !== userId &&
      req.user?.role !== "admin"
    ) {
      res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
      return;
    }

    await Comment.findByIdAndDelete(commentId);

    // Decrement comment count
    if (post && post.commentsCount > 0) {
      post.commentsCount -= 1;
      await post.save();
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Error deleting comment" });
  }
};
