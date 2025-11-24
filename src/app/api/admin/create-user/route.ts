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

export async function POST(request: NextRequest) {
  try {
    const { email, password, role, accessIds, centreIds } = await request.json();

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        {
          message: '[Create-User] Missing required fields: email, password, or role',
        },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email.includes('@')) {
      return NextResponse.json(
        {
          message: '[Create-User] Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'authenticated', 'namdan_user', 'archived'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        {
          message: '[Create-User] Invalid role. Must be one of: admin, authenticated, namdan_user, archived',
        },
        { status: 400 }
      );
    }

    // Validate access requirements based on role
    if (role === 'authenticated' && (!accessIds || accessIds.length === 0)) {
      return NextResponse.json(
        {
          message: '[Create-User] Authenticated users must have at least one access location',
        },
        { status: 400 }
      );
    }

    if (role === 'namdan_user' && (!centreIds || centreIds.length === 0)) {
      return NextResponse.json(
        {
          message: '[Create-User] Namdan users must have at least one namdan centre',
        },
        { status: 400 }
      );
    }

    // Create user with Supabase Admin API
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      role
    });

    if (createError) {
      return NextResponse.json(
        {
          message: `[Create-User] ${createError.message}`,
        },
        { status: 400 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        {
          message: '[Create-User] Failed to create user',
        },
        { status: 500 }
      );
    }

    // Update user role in auth.users table using raw SQL
    // Note: Supabase stores user role in the raw_app_meta_data
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      {
        app_metadata: { role },
      }
    );

    if (updateError) {
      // If role update fails, we should still log the error
      console.error('[Create-User] Failed to update user role:', updateError);
    }

    // Handle access location assignments for authenticated users
    if (role === 'authenticated' && accessIds && accessIds.length > 0) {
      const userAccessRecords = accessIds.map((accessId: number) => ({
        user_id: userData.user.id,
        access_id: accessId,
      }));

      const { error: accessError } = await supabaseAdmin
        .from('user_access')
        .insert(userAccessRecords);

      if (accessError) {
        console.error('[Create-User] Failed to assign access locations:', accessError);
        // Clean up: delete the user if access assignment fails
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return NextResponse.json(
          {
            message: `[Create-User] Failed to assign access locations: ${accessError.message}`,
          },
          { status: 500 }
        );
      }
    }

    // Handle namdan centre assignments for namdan users
    if (role === 'namdan_user' && centreIds && centreIds.length > 0) {
      const namdanAccessRecords = centreIds.map((centreId: number) => ({
        user_id: userData.user.id,
        centre_id: centreId,
      }));

      const { error: namdanError } = await supabaseAdmin
        .from('namdan_access')
        .insert(namdanAccessRecords);

      if (namdanError) {
        console.error('[Create-User] Failed to assign namdan centres:', namdanError);
        // Clean up: delete the user if centre assignment fails
        await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
        return NextResponse.json(
          {
            message: `[Create-User] Failed to assign namdan centres: ${namdanError.message}`,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: '[Create-User] User created successfully',
        user: {
          id: userData.user.id,
          email: userData.user.email,
          role,
          accessCount: accessIds?.length || 0,
          centreCount: centreIds?.length || 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Create-User] Error:', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? `[Create-User] ${error.message}`
            : '[Create-User] Internal server error',
      },
      { status: 500 }
    );
  }
}
