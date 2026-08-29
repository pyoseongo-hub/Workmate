import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  location: varchar("location", { length: 160 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ ownerIdx: uniqueIndex("workspaces_owner_name_idx").on(table.ownerId, table.name) }));

export const workspaceMembers = mysqlTable("workspaceMembers", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  memberRole: mysqlEnum("memberRole", ["owner", "staff"]).default("staff").notNull(),
  displayName: varchar("displayName", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ memberIdx: uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId) }));

export const recurringSchedules = mysqlTable("recurringSchedules", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  memberId: int("memberId").notNull(),
  weekday: int("weekday").notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  breakMinutes: int("breakMinutes").default(30).notNull(),
  effectiveFrom: varchar("effectiveFrom", { length: 10 }).notNull(),
  effectiveTo: varchar("effectiveTo", { length: 10 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workShifts = mysqlTable("workShifts", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  memberId: int("memberId").notNull(),
  workDate: varchar("workDate", { length: 10 }).notNull(),
  startTime: varchar("startTime", { length: 5 }).notNull(),
  endTime: varchar("endTime", { length: 5 }).notNull(),
  breakMinutes: int("breakMinutes").default(30).notNull(),
  status: mysqlEnum("status", ["scheduled", "holiday", "swapped", "cancelled"]).default("scheduled").notNull(),
  source: mysqlEnum("source", ["recurring", "manual", "swap"]).default("recurring").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const shiftSwaps = mysqlTable("shiftSwaps", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  shiftId: int("shiftId").notNull(),
  requesterId: int("requesterId").notNull(),
  targetMemberId: int("targetMemberId").notNull(),
  status: mysqlEnum("status", ["pending_target", "pending_owner", "approved", "rejected", "cancelled"]).default("pending_target").notNull(),
  reason: varchar("reason", { length: 180 }),
  targetConfirmedAt: timestamp("targetConfirmedAt"),
  ownerDecidedAt: timestamp("ownerDecidedAt"),
  ownerDecisionNote: text("ownerDecisionNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workLogs = mysqlTable("workLogs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  shiftId: int("shiftId").notNull(),
  memberId: int("memberId").notNull(),
  workDate: varchar("workDate", { length: 10 }).notNull(),
  clockInAt: timestamp("clockInAt"),
  clockOutAt: timestamp("clockOutAt"),
  breakMinutes: int("breakMinutes").default(30).notNull(),
  note: text("note"),
  lockedAt: timestamp("lockedAt"),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  actorId: int("actorId").notNull(),
  entityType: varchar("entityType", { length: 40 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  beforeValue: text("beforeValue"),
  afterValue: text("afterValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
