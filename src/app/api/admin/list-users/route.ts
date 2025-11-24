import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    const { page, per_page } = Object.fromEntries(request.nextUrl.searchParams);
    const pageNum = parseInt(page, 10) || 1;
    const perPageNum = parseInt(per_page, 10) || 20;

    // Fetch users with pagination
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: pageNum,
      perPage: perPageNum,
    });

    if (usersError) {
      return NextResponse.json(
        {
          message: `[List-Users] ${usersError.message}`,
        },
        { status: 400 }
      );
    }

    // Map users with basic info only - no access data
    const users = authUsers.users.map((user) => {
      const role = user.role || user.app_metadata?.role || user.user_metadata?.role || 'anon';

      return {
        id: user.id,
        email: user.email,
        role,
        created_at: user.created_at,
      };
    });

    return NextResponse.json(
      {
        users,
        total: authUsers.total || users.length,
        page: pageNum,
        perPage: perPageNum,
        lastPage: Math.ceil((authUsers.total || users.length) / perPageNum),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[List-Users] Error:', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `[List-Users] ${error.message}`
            : '[List-Users] Internal server error',
      },
      { status: 500 }
    );
  }
}
