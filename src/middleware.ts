import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';

const isClerkEnabled = process.env.NEXT_PUBLIC_ENABLE_CLERK === 'true' && Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')
);

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  const pathname = req.nextUrl.pathname;
  const examToken = req.cookies.get('struct_exam_token')?.value || req.cookies.get('talvyn_assess_token')?.value;

  // 0. Temporary Feature Launch Redirects (Prioritizing ECELL Hiring Launch)
  const isFeatureRedirect =
    pathname.startsWith('/resume-builder') ||
    pathname.startsWith('/ats-checker') ||
    pathname.startsWith('/career-tools') ||
    pathname.startsWith('/interview-portal');

  if (isFeatureRedirect) {
    return NextResponse.redirect(new URL('/launching-soon', req.url));
  }

  // 1. If signed in, prevent getting stuck on auth pages unless explicitly requesting a new account or sign in
  if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
    const isExplicit = req.nextUrl.searchParams.has('new') || req.nextUrl.searchParams.has('switch');
    if (examToken && !isExplicit) {
      const rawRedirect = req.nextUrl.searchParams.get('redirect_url') || req.nextUrl.searchParams.get('fallback_redirect_url') || req.nextUrl.searchParams.get('redirect') || '/dashboard';
      const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }
    return NextResponse.next();
  }

  // 2. Protect Admin Portal
  if (pathname.startsWith('/assess/admin') || pathname.startsWith('/admin/ecell')) {
    if (!examToken) {
      const signInUrl = new URL('/ecell/login', req.url);
      signInUrl.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(signInUrl);
    }
    return NextResponse.next();
  }

  // 3. Optional Clerk fallback if explicitly configured
  if (isClerkEnabled) {
    try {
      const { clerkMiddleware, createRouteMatcher } = await import('@clerk/nextjs/server');
      const isPublicRoute = createRouteMatcher([
        '/',
        '/career-tools(.*)',
        '/ats-checker(.*)',
        '/resume-builder(.*)',
        '/terms(.*)',
        '/privacy(.*)',
        '/refund(.*)',
        '/pricing(.*)',
        '/api/assess/auth/(.*)',
        '/api/assess/candidate(.*)',
        '/assess/exam(.*)',
        '/assess/instructions(.*)',
        '/assess/completed(.*)',
        '/api/webhooks(.*)',
        '/api/plans(.*)',
        '/api/promos/validate(.*)',
        '/api/payments/(.*)',
        '/api/entitlements/(.*)',
        '/sign-in(.*)',
        '/sign-up(.*)',
      ]);

      const handler = clerkMiddleware(async (auth: any, r: any) => {
        if (examToken) return NextResponse.next();
        if (!isPublicRoute(r)) {
          await auth.protect();
        }
        return NextResponse.next();
      });
      return handler(req, event);
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
