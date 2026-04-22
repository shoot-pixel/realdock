import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  user?: {
    id: number;
    email: string;
    name: string;
    avatarUrl: string | null;
    businessName: string | null;
    plan: string;
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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
    req.userId = user.id;
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      businessName: user.businessName,
      plan: user.plan,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
