import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/models/auth";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth/index";

const router = Router();

router.get("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return res.status(404).json({ message: "Profile not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.put("/", isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { firstName, lastName, company, role, accountType } = req.body;
    const [updated] = await db
      .update(users)
      .set({
        firstName,
        lastName,
        company,
        role,
        ...(accountType ? { accountType } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

export default router;
