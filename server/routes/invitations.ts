import { Router } from "express";
import { db } from "../db";
import { invitations, organizations, organizationMembers } from "@shared/models/app";
import { eq, and } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth/index";
import { randomBytes } from "crypto";

const router = Router({ mergeParams: true });

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

router.get("/org/:orgId", isAuthenticated, async (req: any, res) => {
  try {
    const { orgId } = req.params;
    const pending = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.organizationId, orgId), eq(invitations.status, "pending")));
    res.json(pending);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
});

router.get("/token/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token));

    if (!invitation) return res.status(404).json({ message: "Invitation not found" });
    if (invitation.status !== "pending") return res.status(410).json({ message: "Invitation expired or already used" });

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, invitation.organizationId));

    res.json({ ...invitation, organization: org });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch invitation" });
  }
});

router.post("/", isAuthenticated, async (req: any, res) => {
  try {
    const { organizationId, email, memberType } = req.body;
    if (!organizationId || !email || !memberType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const [existing] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.email, email),
          eq(invitations.status, "pending")
        )
      );
    if (existing) return res.status(409).json({ message: "Pending invitation already exists for this email" });

    const token = generateToken();
    const [invitation] = await db
      .insert(invitations)
      .values({ organizationId, email, memberType, token, status: "pending" })
      .returning();

    res.status(201).json(invitation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create invitation" });
  }
});

router.post("/token/:token/accept", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { token } = req.params;

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(and(eq(invitations.token, token), eq(invitations.status, "pending")));

    if (!invitation) return res.status(404).json({ message: "Invitation not found or already used" });

    const [alreadyMember] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, invitation.organizationId),
          eq(organizationMembers.userId, userId)
        )
      );

    if (!alreadyMember) {
      await db.insert(organizationMembers).values({
        organizationId: invitation.organizationId,
        userId,
        memberType: invitation.memberType,
      });
    }

    await db
      .update(invitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    res.json({ success: true, memberType: invitation.memberType, organizationId: invitation.organizationId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
});

router.patch("/:id/revoke", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    await db
      .update(invitations)
      .set({ status: "expired" })
      .where(and(eq(invitations.id, id), eq(invitations.status, "pending")));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to revoke invitation" });
  }
});

router.post("/:id/resend", isAuthenticated, async (req: any, res) => {
  try {
    const { id } = req.params;
    const newToken = generateToken();
    const [updated] = await db
      .update(invitations)
      .set({ token: newToken, status: "pending", createdAt: new Date() })
      .where(eq(invitations.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to resend invitation" });
  }
});

export default router;
