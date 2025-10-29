'use client';

import type React from 'react';
import { UnifiedRoleGuard } from '@/components/auth/unified-role-guard';

export default function Protected({ children }: { children: React.ReactNode }) {
  return <UnifiedRoleGuard allowedRoles={["admin", "namdan_user"]}>{children}</UnifiedRoleGuard>;
}