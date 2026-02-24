import express from "express";
import cors from "cors";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth/index";
import profilesRouter from "./routes/profiles";
import organizationsRouter from "./routes/organizations";
import membersRouter from "./routes/members";
import invitationsRouter from "./routes/invitations";
import assessmentsRouter from "./routes/assessments";
import emailRouter from "./routes/email";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "http://localhost:5000",
    credentials: true,
  })
);

await setupAuth(app);
registerAuthRoutes(app);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/profile", profilesRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/organizations/:id/members", membersRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/assessments", assessmentsRouter);
app.use("/api", emailRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
