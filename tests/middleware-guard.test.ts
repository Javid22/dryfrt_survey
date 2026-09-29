import { describe, expect, it } from "vitest";
import { shouldRedirectToLogin, shouldRedirectToAdminHome } from "@/lib/supabase/middleware";

describe("admin route guard logic", () => {
  it("redirects an unauthenticated visitor away from a protected admin route", () => {
    expect(shouldRedirectToLogin("/admin", false)).toBe(true);
    expect(shouldRedirectToLogin("/admin/responses", false)).toBe(true);
    expect(shouldRedirectToLogin("/admin/responses/abc123", false)).toBe(true);
  });

  it("does not redirect an authenticated visitor away from a protected admin route", () => {
    expect(shouldRedirectToLogin("/admin", true)).toBe(false);
  });

  it("never redirects the login page itself, even when unauthenticated", () => {
    expect(shouldRedirectToLogin("/admin/login", false)).toBe(false);
  });

  it("does not touch public routes", () => {
    expect(shouldRedirectToLogin("/", false)).toBe(false);
    expect(shouldRedirectToLogin("/survey", false)).toBe(false);
  });

  it("sends an already-authenticated admin away from the login page", () => {
    expect(shouldRedirectToAdminHome("/admin/login", true)).toBe(true);
    expect(shouldRedirectToAdminHome("/admin/login", false)).toBe(false);
    expect(shouldRedirectToAdminHome("/admin", true)).toBe(false);
  });
});
