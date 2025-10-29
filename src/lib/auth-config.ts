// Centralized configuration for authentication and authorization.
export const VALID_ROLES: string[] = ['admin', 'authenticated', 'namdan_user'];

// Default routes for each role after login
export const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  admin: '/dashboard/admin',
  authenticated: '/dashboard/authenticated/member/add',
  namdan_user: '/dashboard/namdan_user/attendance/namdan',
};

// Helper function to get default route for a role
export function getDefaultRouteForRole(role: string): string {
  return ROLE_DEFAULT_ROUTES[role] || `/dashboard/${role}`;
}
