import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/feed',
  '/api/checkout',
  '/api/plans(.*)',
  '/api/unsubscribe',
  '/api/webhooks/stripe(.*)',
])

const reservedSegments = new Set(['dashboard', 'api', 'sign-in', 'sign-up', 'feed'])

function isPublicContentRoute(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return true
  if (segments.length > 2) return false
  return !reservedSegments.has(segments[0])
}

export default clerkMiddleware(async (auth, request) => {
  const pathname = request.nextUrl.pathname
  if (!isPublicRoute(request) && !isPublicContentRoute(pathname)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
