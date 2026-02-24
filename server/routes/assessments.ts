import { Router } from "express";
import { db } from "../db";
import { assessments, organizationMembers } from "@shared/models/app";
import { eq, desc } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth/index";

const router = Router();

router.post("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { organizationId, scores, leadershipFamily, leadershipType, responses } = req.body;

    let resolvedOrgId = organizationId ?? null;

    if (!resolvedOrgId) {
      const [membership] = await db
        .select({ organizationId: organizationMembers.organizationId })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId))
        .limit(1);
      if (membership) resolvedOrgId = membership.organizationId;
    }

    const [assessment] = await db
      .insert(assessments)
      .values({
        userId,
        organizationId: resolvedOrgId,
        scores,
        leadershipFamily,
        leadershipType,
        responses,
      })
      .returning();

    res.status(201).json(assessment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save assessment" });
  }
});

router.get("/mine", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const results = await db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(desc(assessments.completedAt));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assessments" });
  }
});

router.get("/org/:orgId", isAuthenticated, async (req: any, res) => {
  try {
    const { orgId } = req.params;
    const results = await db
      .select()
      .from(assessments)
      .where(eq(assessments.organizationId, orgId));
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch org assessments" });
  }
});

export default router;
