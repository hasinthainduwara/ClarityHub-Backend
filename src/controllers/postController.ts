import { Request, Response, NextFunction } from "express";
import { Post } from "../models/Post";

// Create a new post
export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { content, category, mood, isAnonymous } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Post content is required",
      });
      return;
    }

    const post = await Post.create({
      author: userId,
      content: content.trim(),
      category: category || "general",
      mood: mood || undefined,
      isAnonymous: isAnonymous || false,
    });

    // Populate author details
    await post.populate("author", "name email avatar");

    res.status(201).json({
      success: true,
      message: "Post created successfully",
      data: {
        post,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all posts (with pagination)
export const getPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const sortBy = (req.query.sortBy as string) || "recent";

    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};
    if (category && category !== "all") {
      query.category = category;
    }

    // Build sort
    let sort: any = { createdAt: -1 }; // Default: recent
    if (sortBy === "trending") {
      sort = { likesCount: -1, createdAt: -1 };
    }

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate("author", "name email avatar")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    // Transform posts to hide author info for anonymous posts
    const transformedPosts = posts.map((post) => {
      if (post.isAnonymous) {
        return {
          ...post,
          author: {
            name: "Anonymous",
            avatar: null,
          },
        };
      }
      return post;
    });

    res.status(200).json({
      success: true,
      data: {
        posts: transformedPosts,
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

// Get single post by ID
export const getPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate("author", "name email avatar")
      .lean();

    if (!post) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    // Hide author info for anonymous posts
    const responsePost = post.isAnonymous
      ? {
          ...post,
          author: {
            name: "Anonymous",
            avatar: null,
          },
        }
      : post;

    res.status(200).json({
      success: true,
      data: { post: responsePost },
    });
  } catch (error) {
    next(error);
  }
};

// Like/Unlike a post
export const toggleLike = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const post = await Post.findById(id);

    if (!post) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    const likeIndex = post.likes.findIndex(
      (like) => like.toString() === userId
    );

    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(req.user!._id as any);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: likeIndex > -1 ? "Post unliked" : "Post liked",
      data: {
        likesCount: post.likes.length,
        isLiked: likeIndex === -1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Bookmark/Unbookmark a post
export const toggleBookmark = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const post = await Post.findById(id);

    if (!post) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    const bookmarkIndex = post.bookmarks.findIndex(
      (bookmark) => bookmark.toString() === userId
    );

    if (bookmarkIndex > -1) {
      // Remove bookmark
      post.bookmarks.splice(bookmarkIndex, 1);
    } else {
      // Add bookmark
      post.bookmarks.push(req.user!._id as any);
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: bookmarkIndex > -1 ? "Bookmark removed" : "Post bookmarked",
      data: {
        isBookmarked: bookmarkIndex === -1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete a post
export const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const post = await Post.findById(id);

    if (!post) {
      res.status(404).json({
        success: false,
        message: "Post not found",
      });
      return;
    }

    // Check if user is the author
    if (post.author.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
      return;
    }

    await Post.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get user's posts
export const getUserPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ author: userId })
        .populate("author", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ author: userId }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        posts,
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
