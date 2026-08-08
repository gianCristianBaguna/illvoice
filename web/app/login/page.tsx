'use client';

import { AdminLogin } from '@/components/AdminLogin';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { isAuthenticated, adminRole, emailVerified } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      if (!emailVerified && adminRole !== 'ADMIN' && adminRole !== 'BARANGAY_OFFICIAL') {
        router.replace('/verify-email');
      } else if (adminRole === 'BARANGAY_OFFICIAL') {
        router.replace('/barangay-dashboard');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, adminRole, emailVerified, router]);

  return <AdminLogin />;
}
