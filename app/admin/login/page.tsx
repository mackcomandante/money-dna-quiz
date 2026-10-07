import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminConfigured, isValidSession } from '@/lib/admin-auth';
import LoginForm from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';

export default async function AdminLogin() {
  if (isValidSession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect('/admin');
  return <LoginForm configured={adminConfigured()} />;
}
