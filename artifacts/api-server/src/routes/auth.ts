import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { createHash, randomBytes } from "crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "studioflow_salt").digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(`${userId}:${randomBytes(16).toString("hex")}`).toString("base64");
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const userId = parseInt(decoded.split(":")[0], 10);
    if (!userId) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      businessName: user.businessName,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = generateToken(user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      businessName: user.businessName,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

const INVITE_CODE = "REALDOCK2026";

router.post("/auth/register", async (req, res): Promise<void> => {
  const inviteCode = (req.body as Record<string, unknown>).inviteCode;
  if (inviteCode !== INVITE_CODE) {
    res.status(403).json({ error: "Invalid invite code. RealDock is currently invite-only." });
    return;
  }

  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name, businessName } = parsed.data;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase()));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    businessName: businessName ?? null,
    plan: "free",
  }).returning();
  const token = generateToken(user.id);
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      businessName: user.businessName,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ success: true });
});

/** POST /api/auth/forgot-password — generate a password reset token and (when email is live) send it */
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  // Look up user — always return success to prevent enumeration
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (user) {
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.update(usersTable).set({
      resetToken: token,
      resetTokenExpiry: expiry,
    }).where(eq(usersTable.id, user.id));

    // TODO: When support@realdock.ai is active, send the email here via your email provider.
    // The reset link to include in the email:
    const resetPath = `/reset-password?token=${token}`;
    logger.info(
      { email: user.email, resetPath },
      "Password reset requested — send reset link to user (email delivery not yet configured)",
    );
  }

  res.json({
    success: true,
    message: "If an account exists with that email address, a reset link has been sent.",
  });
});

/** POST /api/auth/reset-password — validate token and set new password */
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const body = req.body as Record<string, unknown>;
  const token = typeof body.token === "string" ? body.token.trim() : null;
  const password = typeof body.password === "string" ? body.password : null;

  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const now = new Date();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(
      and(
        eq(usersTable.resetToken, token),
        sql`${usersTable.resetTokenExpiry} > ${now}`,
      ),
    );

  if (!user) {
    res.status(400).json({
      error: "This reset link is invalid or has expired. Please request a new one.",
    });
    return;
  }

  await db.update(usersTable).set({
    passwordHash: hashPassword(password),
    resetToken: null,
    resetTokenExpiry: null,
  }).where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

export default router;
