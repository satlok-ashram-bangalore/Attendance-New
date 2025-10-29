import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;
  const normalizedRole = role.toLowerCase();
  const capitalizedRole = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
  return {
    title: `${capitalizedRole} Dashboard`,
    description: `Main dashboard page for ${normalizedRole}s.`,
  };
}

export default async function RoleDashboardPage({ 
  params 
}: { 
  params: Promise<{ role: string }> 
}) {
  const { role } = await params;
  const normalizedRole = role.toLowerCase();

  if (normalizedRole === 'admin') {
    return (
      <>
        <h1>Admin Dashboard</h1>
      </>
    );
  }

  if (normalizedRole === 'authenticated' || normalizedRole === 'namdan_user') {
    return (
      <>
        <h1>User Dashboard</h1>
      </>
    )
  }

  return (
    <div className="flex h-full items-center justify-center">
      <h1 className="text-xl font-semibold text-destructive">
        Invalid dashboard role specified: {role}
      </h1>
    </div>
  );
}