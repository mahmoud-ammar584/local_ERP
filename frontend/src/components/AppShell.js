'use client';
import { useAuth } from '@/app/providers';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AppShell({ children }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  if (!user) return null;

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
