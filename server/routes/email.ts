import { Router } from "express";
import { isAuthenticated } from "../replit_integrations/auth/index";

const router = Router();

router.post("/send-invite", isAuthenticated, async (req: any, res) => {
  try {
    const { email, memberType, organizationName, inviteLink } = req.body;
    if (!email || !memberType || !organizationName || !inviteLink) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set — skipping email send");
      return res.json({ success: true, skipped: true });
    }

    const isCandidate = memberType === "candidate";
    const subject = isCandidate
      ? `You've been invited to take the E.Q.U.I.P. 360 Assessment`
      : `You've been invited to join ${organizationName} on E.Q.U.I.P. 360`;

    const html = isCandidate
      ? `
        <h2>You've been invited!</h2>
        <p>You've been invited by <strong>${organizationName}</strong> to take the E.Q.U.I.P. 360 Leadership Assessment.</p>
        <p>This assessment takes about 15-20 minutes and will give you a full leadership profile.</p>
        <p><a href="${inviteLink}" style="background:#1a1a2e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Accept Invitation &amp; Start Assessment</a></p>
        <p>Or copy this link: ${inviteLink}</p>
      `
      : `
        <h2>You've been invited to ${organizationName}!</h2>
        <p>You've been invited to join <strong>${organizationName}</strong> as a team member on E.Q.U.I.P. 360.</p>
        <p>You'll be able to view team assessment results and insights.</p>
        <p><a href="${inviteLink}" style="background:#1a1a2e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteLink}</p>
      `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "E.Q.U.I.P. 360 <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend error:", error);
      return res.status(500).json({ message: "Failed to send email" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send email" });
  }
});

export default router;
