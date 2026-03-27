'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import {
  HiOutlineChartBar, HiOutlineCube, HiOutlineShoppingCart,
  HiOutlineTruck, HiOutlineUsers, HiOutlineCash,
  HiOutlineCog, HiOutlineLogout
} from 'react-icons/hi';

const links = [
  { href: '/dashboard', label: 'menu.dashboard', icon: HiOutlineChartBar },
  { href: '/inventory', label: 'menu.inventory', icon: HiOutlineCube },
  { href: '/sales', label: 'menu.sales', icon: HiOutlineShoppingCart },
  { href: '/purchases', label: 'menu.purchases', icon: HiOutlineTruck },
  { href: '/customers', label: 'menu.customers', icon: HiOutlineUsers },
  { href: '/expenses', label: 'menu.expenses', icon: HiOutlineCash },
  { href: '/settings', label: 'menu.settings', icon: HiOutlineCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { t, isRTL } = useLanguage();

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
          La Boutique
        </h1>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Retail management system
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
              flexDirection: isRTL ? 'row-reverse' : 'row',
            }}>
              <Icon size={20} />
              <span>{t(label)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div style={{
        padding: '1rem', borderTop: '1px solid var(--border-color)',
      }}>
        <LanguageSelector />
        {user && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', marginTop: '0.75rem' }}>
            👤 {user.username}
          </p>
        )}
        <button onClick={logout} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          color: 'var(--accent-red)', background: 'none', border: 'none',
          cursor: 'pointer', fontSize: '0.875rem', padding: '0.5rem 0',
          flexDirection: isRTL ? 'row-reverse' : 'row',
        }}>
          <HiOutlineLogout size={18} />
          {t('menu.logout')}
        </button>
      </div>
    </aside>
  );
}
