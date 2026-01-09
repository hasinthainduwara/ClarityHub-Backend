import { Request, Response } from "express";
import { Community } from "../models/Community";
import { Post } from "../models/Post";
import { User } from "../models/User";

// Create a new community
export const createCommunity = async (req: Request, res: Response) => {
  try {
    const { name, description, coverImage, logo, isPrivate } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingCommunity = await Community.findOne({ name });
    if (existingCommunity) {
      return res.status(400).json({ message: "Community with this name already exists" });
    }

    const community = new Community({
      name,
      description,
      coverImage,
      logo,
      isPrivate,
      creator: userId,
      members: [userId], // Creator is automatically a member
      admins: [userId],  // Creator is automatically an admin
    });

    await community.save();

    return res.status(201).json(community);
  } catch (error) {
    return res.status(500).json({ message: "Error creating community", error });
  }
};

// List communities (most popular, with limit)
export const getAllCommunities = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Aggregate to sort by members count (array length)
    // Since we have a virtual membersCount, we can't sort by it directly in find() without aggregation pipeline usually,
    // but here we can use aggregation to project size and sort.
    
    const communities = await Community.aggregate([
      {
        $addFields: {
          membersCount: { $size: "$members" }
        }
      },
      { $sort: { membersCount: -1 } },
      { $skip: skip },
      { $limit: limit },
      { // Lookup creator details if needed, or just project fields
        $project: {
          name: 1,
          description: 1,
          coverImage: 1,
          logo: 1,
          membersCount: 1,
          isPrivate: 1,
          createdAt: 1
        }
      }
    ]);

    return res.status(200).json(communities);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching communities", error });
  }
};

// Get a single community by ID
export const getCommunity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const community = await Community.findById(id)
      .populate("creator", "name avatar")
      .populate("admins", "name avatar");

    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    return res.status(200).json(community);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching community", error });
  }
};

// Join a community (Follow)
export const joinCommunity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    if (community.members.includes(userId)) {
      return res.status(400).json({ message: "Already a member of this community" });
    }

    community.members.push(userId);
    await community.save();

    return res.status(200).json({ message: "Joined community successfully", community });
  } catch (error) {
    return res.status(500).json({ message: "Error joining community", error });
  }
};

// Leave a community (Unfollow)
export const leaveCommunity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Check if user is the creator - creators might not be able to leave without transferring ownership?
    // For now, allow leaving, but maybe warn or prevent if they are the only admin.
    if (!community.members.includes(userId)) {
        return res.status(400).json({ message: "Not a member of this community" });
    }

    community.members = community.members.filter(memberId => memberId.toString() !== userId.toString());
    await community.save();

    return res.status(200).json({ message: "Left community successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error leaving community", error });
  }
};

// Create a post under a community
export const createCommunityPost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Community ID
    const { content, category, responseMode, media, mood, isAnonymous } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ message: "Community not found" });
    }

    // Check if user is a member
    if (!community.members.includes(userId)) {
        return res.status(403).json({ message: "You must be a member to post in this community" });
    }

    const post = new Post({
      author: userId,
      content,
      category,
      responseMode,
      media,
      mood,
      isAnonymous,
      community: id
    });

    await post.save();

    return res.status(201).json(post);
  } catch (error) {
    return res.status(500).json({ message: "Error creating post", error });
  }
};

// Fetch community posts
export const getCommunityPosts = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    // Verify community exists
    const community = await Community.findById(id);
    if (!community) {
        return res.status(404).json({ message: "Community not found" });
    }

    const posts = await Post.find({ community: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name avatar");

    return res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching posts", error });
  }
};

// Get communities joined by the current user
export const getUserCommunities = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const communities = await Community.find({ members: userId })
      .populate("creator", "name avatar")
      .sort({ updatedAt: -1 });

    return res.status(200).json(communities);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching user communities", error });
  }
};
