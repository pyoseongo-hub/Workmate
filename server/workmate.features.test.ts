import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type TestUser = NonNullable<TrpcContext["user"]>;

function createContext(user: TestUser | null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("WorkMate feature contracts", () => {
  it("returns the current user through auth.me", async () => {
    const user: TestUser = {
      id: 7,
      openId: "staff-7",
      name: "서연",
      email: "staff@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(createContext(user));
    await expect(caller.auth.me()).resolves.toMatchObject({ id: 7, role: "user" });
  });

  it("prevents staff users from deciding a swap", async () => {
    const user: TestUser = {
      id: 7,
      openId: "staff-7",
      name: "서연",
      email: null,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(createContext(user));
    await expect(caller.swaps.decide({ id: 1, workspaceId: 1, approved: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns null for unauthenticated auth.me calls", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.auth.me()).resolves.toBeNull();
  });
});
