import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="adm">
      <header className="adm-top">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 26 26" fill="none" stroke="#F5B841" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 2c0 7 12 8 12 11S7 17 7 24" /><path d="M19 2c0 7-12 8-12 11s12 4 12 11" /><path d="M9 6h8M9 20h8" /></svg>
          Money DNA Admin
        </div>
        <nav className="adm-nav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/submissions">Submissions</Link>
          <form action="/api/admin/logout" method="post"><button type="submit">Sign out</button></form>
        </nav>
      </header>
      {children}
    </div>
  );
}
