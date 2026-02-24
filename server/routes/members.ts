import { Router } from "express";
import { db } from "../db";
import { organizationMembers, organizations } from "@shared/models/app";
import { users } from "@shared/models/auth";
import { eq, and, inArray } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth/index";

const router = Router({ mergeParams: true });

router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const { id: orgId } = req.params;
    const members = await db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, orgId));

    const userIds = members.map((m) => m.userId);
    const profiles =
      userIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, userIds))
        : [];

    const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));
    const result = members.map((m) => ({ ...m, profile: profileMap[m.userId] ?? null }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch members" });
  }
});

router.delete("/:memberId", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id: orgId, memberId } = req.params;

    const [org] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, orgId), eq(organizations.ownerId, userId)));
    if (!org) return res.status(403).json({ message: "Not authorized" });

    await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to remove member" });
  }
});

export default router;
