import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and protects
 * /admin/* routes (except /admin/login) by redirecting unauthenticated
 * visitors to the login page.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (shouldRedirectToLogin(pathname, Boolean(user))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (shouldRedirectToAdminHome(pathname, Boolean(user))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin";
    redirectUrl.searchParams.delete("redirectedFrom");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

/** Pure route-guard logic, unit-testable without constructing a NextRequest. */
export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export function isAdminLoginRoute(pathname: string): boolean {
  return pathname.startsWith("/admin/login");
}

/** An unauthenticated visitor hitting a protected /admin/* route -> send to login. */
export function shouldRedirectToLogin(pathname: string, hasUser: boolean): boolean {
  return isAdminRoute(pathname) && !isAdminLoginRoute(pathname) && !hasUser;
}

/** An already-authenticated admin hitting /admin/login -> send to the dashboard. */
export function shouldRedirectToAdminHome(pathname: string, hasUser: boolean): boolean {
  return isAdminLoginRoute(pathname) && hasUser;
}
