'use client';
import { LoginForm } from '@/components/auth/login-form';
import { supabase } from '@/lib/supabase/client';
import { getDefaultRouteForRole } from '@/lib/auth-config';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getUser();

      if (data.user && !error) {
        const userRole = data.user.user_metadata?.role || data.user.role;
        if (userRole) {
          // Route to role-specific default page
          const defaultRoute = getDefaultRouteForRole(userRole);
          router.push(defaultRoute);
        }
      }
    };

    fetchSession();
  }, [router]);

  return (
    <div className="px-3 relative flex h-screen flex-col items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex w-full flex-col justify-center space-y-6">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Login to your account</h1>
            <p className="text-sm text-muted-foreground">
              Enter your email and password to access your dashboard
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
