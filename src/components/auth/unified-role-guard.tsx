'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface UnifiedRoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredRole?: string;
  redirectTo?: string;
}

export function UnifiedRoleGuard({
  children,
  allowedRoles,
  requiredRole,
  redirectTo,
}: UnifiedRoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
   
    if (allowedRoles || requiredRole) {
      if (isLoading) {
        return;
      }

      if (!user) {
        router.replace(redirectTo || '/');
        return;
      }

      const userRole = user.role;
      let isAuthorized = false;

      if (requiredRole) {
        isAuthorized = userRole === requiredRole;
      } else if (allowedRoles) {
        isAuthorized = allowedRoles.includes(userRole);
      }

      if (!isAuthorized) {
        const userDashboard = `/dashboard/${userRole}`;
        router.replace(userDashboard);
      }
    }
  }, [user, isLoading, router, allowedRoles, requiredRole, redirectTo]);


  if (!user && (allowedRoles || requiredRole)) {
    return null; // prevent flicker when redirecting unauthenticated user
  }

  if (user) {
    if (requiredRole && user.role !== requiredRole) {
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}