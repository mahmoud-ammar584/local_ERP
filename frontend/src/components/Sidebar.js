'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers';
import {
  HiOutlineChartBar, HiOutlineCube, HiOutlineShoppingCart,
  HiOutlineTruck, HiOutlineUsers, HiOutlineCash,
  HiOutlineCog, HiOutlineLogout
} from 'react-icons/hi';

const links = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: HiOutlineChartBar },
  { href: '/inventory', label: 'المخزون', icon: HiOutlineCube },
  { href: '/sales', label: 'المبيعات', icon: HiOutlineShoppingCart },
  { href: '/purchases', label: 'المشتريات', icon: HiOutlineTruck },
  { href: '/customers', label: 'العملاء', icon: HiOutlineUsers },
  { href: '/expenses', label: 'المصروفات', icon: HiOutlineCash },
  { href: '/settings', label: 'الإعدادات', icon: HiOutlineCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  return (
    <aside style={{
      width: '260px', minHeight: '100vh', background: 'var(--dark-sidebar)',
      borderLeft: '1px solid var(--border-color)', position: 'fixed',
      right: 0, top: 0, display: 'flex', flexDirection: 'column',
      zIndex: 40
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.5rem', borderBottom: '1px solid var(--border-color)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '1.5rem', fontWeight: 800,
          background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: '0.05em'
        }}>
          لا بوتيك
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          نظام إدارة المتجر
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.75rem' }}>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '0.5rem',
              marginBottom: '0.25rem', textDecoration: 'none',
              color: active ? 'var(--gold)' : 'var(--text-secondary)',
              background: active ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
              transition: 'all 0.2s', fontWeight: active ? 600 : 400,
            }}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div style={{
        padding: '1rem', borderTop: '1px solid var(--border-color)',
      }}>
        {user && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            👤 {user.username}
          </p>
        )}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--accent-red)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '0.875rem', padding: '0.5rem 0',
        }}>
          <HiOutlineLogout size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
