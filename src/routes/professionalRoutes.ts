import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import {
  applyForProfessional,
  getPendingApplications,
  verifyProfessional,
  getProfessionalProfile,
  updateProfessionalProfile,
  submitProfessionalResponse,
  getPostProfessionalResponses,
  getResponseTemplates,
  updateDMConsent,
} from "../controllers/professionalController";

const router = Router();

// User can apply to become a professional
router.post("/apply", authenticate, applyForProfessional);

// Get own professional profile
router.get("/profile", authenticate, getProfessionalProfile);

// Update professional profile (verified professionals only)
router.patch(
  "/profile",
  authenticate,
  requireRole("professional"),
  updateProfessionalProfile
);

// Update DM consent setting
router.patch("/dm-consent", authenticate, updateDMConsent);

// Get response templates
router.get(
  "/templates",
  authenticate,
  requireRole("professional"),
  getResponseTemplates
);

// Submit professional response to a post
router.post(
  "/posts/:postId/response",
  authenticate,
  requireRole("professional"),
  submitProfessionalResponse
);

// Get professional responses for a post (public)
router.get("/posts/:postId/responses", getPostProfessionalResponses);

// Admin routes
router.get(
  "/admin/applications",
  authenticate,
  requireRole("admin"),
  getPendingApplications
);

router.patch(
  "/admin/:id/verify",
  authenticate,
  requireRole("admin"),
  verifyProfessional
);

export default router;
