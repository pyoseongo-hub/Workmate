/**
 * ⚠️ 지금 앱이 쓰는 서버가 아닙니다.
 *
 * 실제로 도는 서버는 server/app.ts 입니다 (package.json 의 build·start 참고).
 * 이 파일은 처음 뼈대를 만들 때 딸려 온 옛 코드로, 화면 어디에도 이어져 있지 않습니다.
 *
 * ⏱️ 아래 shifts.add · recurringAdd · logs.create 에 breakMinutes 가 남아 있고
 *    drizzle/schema.ts 에도 기본값 30분 칸이 있습니다. 옛 설계의 흔적입니다.
 *    지금 방침은 "근무시간만 적고 휴게·급여는 사장님이 판단한다" 이므로,
 *    이 코드를 되살려 화면에 이어 붙이는 일이 있다면 그 칸부터 걷어내야 합니다.
 */

import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, like, gte, lte } from "drizzle-orm";
import { getDb, getPendingSwaps, getWorkspaceForOwner, listNotifications, recordAudit } from "./db";
import { notifications, recurringSchedules, shiftSwaps, users, workLogs, workShifts, workspaceMembers, workspaces } from "../drizzle/schema";

const workspaceInput = z.object({ workspaceId: z.number().int().positive() });
const ownerOnly = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "사장님 권한이 필요합니다." });
  return next();
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspaces: router({
    mine: protectedProcedure.query(async ({ ctx }) => getWorkspaceForOwner(ctx.user.id)),
    create: protectedProcedure.input(z.object({ name: z.string().min(1).max(120), location: z.string().max(160).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "데이터베이스를 사용할 수 없습니다." });
      const existing = await getWorkspaceForOwner(ctx.user.id);
      if (existing) return existing;
      const inserted = await db.insert(workspaces).values({ ownerId: ctx.user.id, name: input.name, location: input.location }).$returningId();
      const id = inserted[0]?.id;
      if (!id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "매장 생성에 실패했습니다." });
      await db.insert(workspaceMembers).values({ workspaceId: id, userId: ctx.user.id, memberRole: "owner", displayName: ctx.user.name ?? "사장님" });
      return { id, ...input };
    }),
  }),
  members: router({
    list: protectedProcedure.input(workspaceInput).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select({ id: workspaceMembers.id, displayName: workspaceMembers.displayName, memberRole: workspaceMembers.memberRole }).from(workspaceMembers).where(eq(workspaceMembers.workspaceId, input.workspaceId));
    }),
    add: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), displayName: z.string().min(1).max(80) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tempUser = await db.insert(users).values({ openId: `invite_${input.workspaceId}_${inviteCode}`, name: input.displayName, role: "user" }).$returningId();
      const tempUserId = tempUser[0]?.id;
      if (!tempUserId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(workspaceMembers).values({ workspaceId: input.workspaceId, userId: tempUserId, memberRole: "staff", displayName: input.displayName }).$returningId();
      await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "member", entityId: result[0]?.id || 0, action: "create", afterValue: JSON.stringify({ ...input, inviteCode }) });
      return { id: result[0]?.id, displayName: input.displayName, memberRole: "staff", inviteCode };
    }),
    update: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), memberId: z.number().int().positive(), displayName: z.string().min(1).max(80).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const member = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.id, input.memberId), eq(workspaceMembers.workspaceId, input.workspaceId))).limit(1);
      if (!member[0]) throw new TRPCError({ code: "NOT_FOUND", message: "직원을 찾을 수 없습니다." });
      if (member[0].memberRole === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "사장님 정보는 수정할 수 없습니다." });
      const updates: { displayName?: string } = {};
      if (input.displayName) updates.displayName = input.displayName;
      await db.update(workspaceMembers).set(updates).where(eq(workspaceMembers.id, input.memberId));
      await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "member", entityId: input.memberId, action: "update", beforeValue: JSON.stringify(member[0]), afterValue: JSON.stringify({ ...member[0], ...updates }) });
      return { success: true };
    }),
    delete: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), memberId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const member = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.id, input.memberId), eq(workspaceMembers.workspaceId, input.workspaceId))).limit(1);
      if (!member[0]) throw new TRPCError({ code: "NOT_FOUND", message: "직원을 찾을 수 없습니다." });
      if (member[0].memberRole === "owner") throw new TRPCError({ code: "FORBIDDEN", message: "사장님은 삭제할 수 없습니다." });
      await db.delete(workspaceMembers).where(eq(workspaceMembers.id, input.memberId));
      await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "member", entityId: input.memberId, action: "delete", beforeValue: JSON.stringify(member[0]) });
      return { success: true };
    }),
  }),
  schedules: router({
    list: protectedProcedure.input(workspaceInput.extend({ year: z.number().int().optional(), month: z.number().int().min(1).max(12).optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const monthPrefix = input.year && input.month ? `${input.year}-${String(input.month).padStart(2, "0")}%` : undefined;
      return db.select().from(workShifts).where(monthPrefix ? and(eq(workShifts.workspaceId, input.workspaceId), like(workShifts.workDate, monthPrefix)) : eq(workShifts.workspaceId, input.workspaceId)).orderBy(workShifts.workDate);
    }),
    add: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), memberId: z.number().int().positive(), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), breakMinutes: z.number().int().min(0).max(240).default(30), status: z.enum(["scheduled", "holiday", "cancelled"]).default("scheduled"), note: z.string().max(500).optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(workShifts).values({ ...input, source: "manual" }).$returningId();
      return { id: result[0]?.id };
    }),
    recurringAdd: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), memberId: z.number().int().positive(), weekday: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), breakMinutes: z.number().int().min(0).max(240).default(30), effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(recurringSchedules).values(input).$returningId();
      return { id: result[0]?.id };
    }),
    generateMonth: ownerOnly.input(z.object({ workspaceId: z.number().int().positive(), year: z.number().int().min(2020).max(2100), month: z.number().int().min(1).max(12) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const patterns = await db.select().from(recurringSchedules).where(eq(recurringSchedules.workspaceId, input.workspaceId));
      const monthPrefix = `${input.year}-${String(input.month).padStart(2, "0")}`;
      const existing = await db.select({ workDate: workShifts.workDate, memberId: workShifts.memberId }).from(workShifts).where(and(eq(workShifts.workspaceId, input.workspaceId), like(workShifts.workDate, `${monthPrefix}%`)));
      const existingKeys = new Set(existing.map((shift) => `${shift.workDate}:${shift.memberId}`));
      const lastDay = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
      const generated = [] as Array<{ workspaceId: number; memberId: number; workDate: string; startTime: string; endTime: string; breakMinutes: number; source: "recurring"; status: "scheduled" }>;
      for (let day = 1; day <= lastDay; day += 1) {
        const date = new Date(Date.UTC(input.year, input.month - 1, day));
        const weekday = date.getUTCDay();
        const dateValue = `${input.year}-${String(input.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        for (const pattern of patterns) if (pattern.weekday === weekday && dateValue >= pattern.effectiveFrom && (!pattern.effectiveTo || dateValue <= pattern.effectiveTo) && !existingKeys.has(`${dateValue}:${pattern.memberId}`)) generated.push({ workspaceId: input.workspaceId, memberId: pattern.memberId, workDate: dateValue, startTime: pattern.startTime, endTime: pattern.endTime, breakMinutes: pattern.breakMinutes, source: "recurring", status: "scheduled" });
      }
      if (generated.length) await db.insert(workShifts).values(generated);
      return { generated: generated.length };
    }),
  }),
  swaps: router({
    pending: protectedProcedure.input(workspaceInput).query(({ input }) => getPendingSwaps(input.workspaceId)),
    request: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), shiftId: z.number().int().positive(), targetMemberId: z.number().int().positive(), reason: z.string().max(180).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db.insert(shiftSwaps).values({ ...input, requesterId: ctx.user.id, status: "pending_target" }).$returningId();
      const target = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, input.targetMemberId)).limit(1);
      if (target[0]) await db.insert(notifications).values({ workspaceId: input.workspaceId, userId: target[0].userId, type: "swap_request", title: "교대 확인 요청", body: "새로운 교대 요청을 확인해 주세요." });
      return { id: result[0]?.id, status: "pending_target" as const };
    }),
    confirm: protectedProcedure.input(z.object({ id: z.number().int().positive(), workspaceId: z.number().int().positive(), confirmed: z.boolean() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const status = input.confirmed ? "pending_owner" : "rejected";
      const swap = await db.select().from(shiftSwaps).where(and(eq(shiftSwaps.id, input.id), eq(shiftSwaps.workspaceId, input.workspaceId))).limit(1);
      if (!swap[0]) throw new TRPCError({ code: "NOT_FOUND", message: "교대 요청을 찾을 수 없습니다." });
      const targetMembership = await db.select().from(workspaceMembers).where(and(eq(workspaceMembers.id, swap[0].targetMemberId), eq(workspaceMembers.userId, ctx.user.id))).limit(1);
      if (!targetMembership[0]) throw new TRPCError({ code: "FORBIDDEN", message: "해당 교대 요청의 상대 직원만 확인할 수 있습니다." });
      await db.update(shiftSwaps).set({ status, targetConfirmedAt: input.confirmed ? new Date() : null }).where(and(eq(shiftSwaps.id, input.id), eq(shiftSwaps.workspaceId, input.workspaceId)));
      const owner = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
      if (owner[0] && input.confirmed) await db.insert(notifications).values({ workspaceId: input.workspaceId, userId: owner[0].ownerId, type: "swap_confirmed", title: "교대 확인 완료", body: "알바생이 교대 내용을 확인했습니다. 승인해 주세요." });
      return { success: true, status };
    }),
    decide: ownerOnly.input(z.object({ id: z.number().int().positive(), workspaceId: z.number().int().positive(), approved: z.boolean(), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const status = input.approved ? "approved" : "rejected";
      const swap = await db.select().from(shiftSwaps).where(and(eq(shiftSwaps.id, input.id), eq(shiftSwaps.workspaceId, input.workspaceId))).limit(1);
      if (!swap[0]) throw new TRPCError({ code: "NOT_FOUND", message: "교대 요청을 찾을 수 없습니다." });
      await db.update(shiftSwaps).set({ status, ownerDecidedAt: new Date(), ownerDecisionNote: input.note }).where(eq(shiftSwaps.id, input.id));
      if (input.approved) await db.update(workShifts).set({ status: "swapped" }).where(eq(workShifts.id, swap[0].shiftId));
      await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "shiftSwap", entityId: input.id, action: status, beforeValue: swap[0].status, afterValue: status });
      const requester = await db.select().from(users).where(eq(users.id, swap[0].requesterId)).limit(1);
      const target = await db.select().from(workspaceMembers).where(eq(workspaceMembers.id, swap[0].targetMemberId)).limit(1);
      const recipients = [requester[0]?.id, target[0]?.userId].filter((id): id is number => Boolean(id && id !== ctx.user.id));
      if (recipients.length) await db.insert(notifications).values(recipients.map((userId) => ({ workspaceId: input.workspaceId, userId, type: "swap_decided", title: input.approved ? "교대 승인 완료" : "교대 요청 반려", body: input.approved ? "사장님이 교대를 승인했습니다." : "사장님이 교대 요청을 반려했습니다." })));
      return { success: true, status };
    }),
  }),
  workLogs: router({
    list: protectedProcedure.input(workspaceInput.extend({ year: z.number().int().optional(), month: z.number().int().min(1).max(12).optional() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const monthPrefix = input.year && input.month ? `${input.year}-${String(input.month).padStart(2, "0")}%` : undefined;
      return db.select().from(workLogs).where(monthPrefix ? and(eq(workLogs.workspaceId, input.workspaceId), like(workLogs.workDate, monthPrefix)) : eq(workLogs.workspaceId, input.workspaceId)).orderBy(desc(workLogs.workDate));
    }),
    create: protectedProcedure.input(z.object({ workspaceId: z.number().int().positive(), shiftId: z.number().int().positive(), memberId: z.number().int().positive(), workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), clockInAt: z.date().nullable().optional(), clockOutAt: z.date().nullable().optional(), breakMinutes: z.number().int().min(0).max(240).default(30), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const today = new Date().toISOString().slice(0, 10);
      const isPast = input.workDate < today;
      const lockedAt = isPast ? new Date() : null;
      const result = await db.insert(workLogs).values({ ...input, updatedBy: ctx.user.id, lockedAt }).$returningId();
      const id = result[0]?.id;
      if (id) await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "workLog", entityId: id, action: "create", afterValue: JSON.stringify(input) });
      return { id };
    }),
    update: protectedProcedure.input(z.object({ id: z.number().int().positive(), workspaceId: z.number().int().positive(), clockInAt: z.date().nullable().optional(), clockOutAt: z.date().nullable().optional(), note: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const row = await db.select().from(workLogs).where(and(eq(workLogs.id, input.id), eq(workLogs.workspaceId, input.workspaceId))).limit(1);
      if (!row[0]) throw new TRPCError({ code: "NOT_FOUND" });
      const today = new Date().toISOString().slice(0, 10);
      const isOwner = ctx.user.role === "admin";
      const isPast = row[0].workDate < today;
      if ((!isOwner && isPast) || (!isOwner && row[0].lockedAt)) throw new TRPCError({ code: "FORBIDDEN", message: "지난 날짜 기록은 사장님만 수정할 수 있습니다." });
      await db.update(workLogs).set({ clockInAt: input.clockInAt, clockOutAt: input.clockOutAt, note: input.note, updatedBy: ctx.user.id }).where(eq(workLogs.id, input.id));
      await recordAudit({ workspaceId: input.workspaceId, actorId: ctx.user.id, entityType: "workLog", entityId: input.id, action: "update", beforeValue: JSON.stringify({ clockInAt: row[0].clockInAt, clockOutAt: row[0].clockOutAt, note: row[0].note }), afterValue: JSON.stringify({ clockInAt: input.clockInAt, clockOutAt: input.clockOutAt, note: input.note }) });
      return { success: true };
    }),
  }),
  notifications: router({
    mine: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.id)),
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return 0;
      const rows = await db.select().from(notifications).where(and(eq(notifications.userId, ctx.user.id), isNull(notifications.readAt)));
      return rows.length;
    }),
  }),
});

export type AppRouter = typeof appRouter;
