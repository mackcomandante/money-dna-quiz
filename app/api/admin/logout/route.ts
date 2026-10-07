import { ADMIN_COOKIE } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/** Clears the admin session and returns to the login page. */
export async function POST(req: Request) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL('/admin/login', req.url).toString(),
      'Set-Cookie': `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}
