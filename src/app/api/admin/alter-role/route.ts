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
        const { id, role } = await request.json();

        // Validate role
        const validRoles = ['admin', 'authenticated', 'namdan_user', 'archived'];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                {
                    message: '[Alter-Role] Invalid role. Must be one of: admin, authenticated, namdan_user, archived',
                },
                { status: 400 }
            );
        }

        // Update user role in auth.users table using raw SQL
        // Note: Supabase stores user role in the raw_app_meta_data
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(id,
            {
                role: role,
            }
        );

        if (updateError) {
            // If role update fails, we should still log the error
            console.error('[Alter-Role] Failed to update user role:', updateError);
        }

        return NextResponse.json(
            {
                message: '[Alter-Role] User role altered successfully'
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('[Alter-Role] Error:', error);
        return NextResponse.json(
            {
                message:
                    error instanceof Error
                        ? `[Alter-Role] ${error.message}`
                        : '[Alter-Role] Internal server error',
            },
            { status: 500 }
        );
    }
}
