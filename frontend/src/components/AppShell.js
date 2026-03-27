'use client';
import { useAuth } from '@/app/providers';
import Sidebar from '@/components/Sidebar';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppShell({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (isClient && !loading && !user && !pathname.includes('/login')) {
      router.push('/login');
    }
  }, [isClient, loading, user, pathname, router]);

  if (!isClient) {
    return null;
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect happening, show nothing
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{
        marginRight: '260px', flex: 1, padding: '1.5rem 2rem',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
