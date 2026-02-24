import { Router } from "express";
import { db } from "../db.js";
import { organizations, organizationMembers, assessments, invitations } from "@shared/models/app";
import { users } from "@shared/models/auth";
import { eq, and, inArray, count } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth/index.js";

const router = Router();

router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;

    const [owned, memberOf] = await Promise.all([
      db.select().from(organizations).where(eq(organizations.ownerId, userId)),
      db
        .select({ organizationId: organizationMembers.organizationId, memberType: organizationMembers.memberType })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, userId)),
    ]);

    const memberOrgIds = memberOf.map((m) => m.organizationId);
    const memberOrgs =
      memberOrgIds.length > 0
        ? await db.select().from(organizations).where(inArray(organizations.id, memberOrgIds))
        : [];

    res.json({ owned, memberOf: memberOrgs, memberTypes: memberOf });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch organizations" });
  }
});

router.get("/:id/stats", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const [memberCount, assessmentCount, pendingInviteCount] = await Promise.all([
      db.select({ count: count() }).from(organizationMembers).where(eq(organizationMembers.organizationId, id)),
      db.select({ count: count() }).from(assessments).where(eq(assessments.organizationId, id)),
      db.select({ count: count() }).from(invitations).where(and(eq(invitations.organizationId, id), eq(invitations.status, "pending"))),
    ]);
    res.json({
      memberCount: Number(memberCount[0].count),
      assessmentCount: Number(assessmentCount[0].count),
      pendingInviteCount: Number(pendingInviteCount[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

router.post("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const [org] = await db
      .insert(organizations)
      .values({ name, ownerId: userId })
      .returning();

    await db
      .update(users)
      .set({ accountType: "admin", updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.status(201).json(org);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create organization" });
  }
});

router.delete("/:id", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { id } = req.params;

    const [org] = await db
      .select()
      .from(organizations)
      .where(and(eq(organizations.id, id), eq(organizations.ownerId, userId)));
    if (!org) return res.status(403).json({ message: "Not authorized or organization not found" });

    await db.delete(organizations).where(eq(organizations.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete organization" });
  }
});

export default router;
