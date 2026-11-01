import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const hasClerkKeys = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && 
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_')
);

let clerkHandler: any = null;

if (hasClerkKeys) {
  const isPublicRoute = createRouteMatcher([
    '/',
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
    '/sign-in(.*)',
    '/sign-up(.*)',
  ]);

  const isCandidateAssessmentRoute = createRouteMatcher([
    '/assess/candidate(.*)',
    '/assess/exam(.*)',
    '/assess/instructions(.*)',
    '/assess/completed(.*)',
  ]);

  clerkHandler = clerkMiddleware(async (auth: any, req: any) => {
    const pathname = req.nextUrl.pathname;

    // Prevent authenticated users from getting stuck on sign-in or sign-up pages
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
      const session = await auth();
      if (session?.userId) {
        const rawRedirect = req.nextUrl.searchParams.get('redirect_url') || req.nextUrl.searchParams.get('fallback_redirect_url') || '/portal';
        // Validate redirect target to prevent open redirect vulnerabilities
        const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/portal';
        return NextResponse.redirect(new URL(redirectUrl, req.url));
      }
      return NextResponse.next();
    }

    // Allow users with valid STRUCT token to access portal and candidate routes
    const examToken = req.cookies.get('struct_exam_token')?.value || req.cookies.get('talvyn_assess_token')?.value;
    if (examToken && (pathname.startsWith('/portal') || isCandidateAssessmentRoute(req))) {
      return NextResponse.next();
    }

    // Allow admin access if STRUCT token present (page and API perform strict server-side RBAC validation)
    if (examToken && pathname.startsWith('/assess/admin')) {
      return NextResponse.next();
    }

    // Protect administrative routes with Clerk when using Clerk auth
    if (pathname.startsWith('/assess/admin') || pathname.startsWith('/superadmin') || pathname.startsWith('/portal')) {
      await auth.protect();
      return NextResponse.next();
    }

    // Protect private application routes
    if (!isPublicRoute(req)) {
      await auth.protect();
    }

    return NextResponse.next();
  });
}

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (clerkHandler) {
    return clerkHandler(req, event);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
