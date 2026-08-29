import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  notifications,
  recurringSchedules,
  shiftSwaps,
  users,
  workLogs,
  workShifts,
  workspaceMembers,
  workspaces,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getWorkspaceForOwner(ownerId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).limit(1);
  return result[0];
}

export async function createWorkspace(ownerId: number, name: string, location?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(workspaces).values({ ownerId, name, location }).$returningId();
  const id = result[0]?.id;
  if (!id) throw new Error("Workspace creation failed");
  await db.insert(workspaceMembers).values({ workspaceId: id, userId: ownerId, memberRole: "owner", displayName: name });
  return id;
}

export async function getMonthlyShifts(workspaceId: number, monthPrefix: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workShifts).where(and(eq(workShifts.workspaceId, workspaceId), eq(workShifts.workDate, monthPrefix))).orderBy(workShifts.workDate);
}

export async function getPendingSwaps(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shiftSwaps).where(and(eq(shiftSwaps.workspaceId, workspaceId), eq(shiftSwaps.status, "pending_owner"))).orderBy(desc(shiftSwaps.createdAt));
}

export async function recordAudit(input: { workspaceId: number; actorId: number; entityType: string; entityId: number; action: string; beforeValue?: string; afterValue?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(input);
}

export async function listNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function createSchedule(input: typeof recurringSchedules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(recurringSchedules).values(input).$returningId();
  return result[0]?.id;
}

export async function createWorkLog(input: typeof workLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(workLogs).values(input).$returningId();
  return result[0]?.id;
}
