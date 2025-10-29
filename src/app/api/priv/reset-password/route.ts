import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

export async function POST(request: NextRequest) {
    try {

        const { new_password } = await request.json();
        const user_id = request.headers.get('x-user-id');

        if (!user_id) {
            return NextResponse.json(
                {
                    message: `[Reset-Password] missing header x-user-id`,
                },
                { status: 401 }
            );
        }

        const { data:_data, error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            password: new_password
        });

        if(error){
            return NextResponse.json(
                {
                    message: `[Reset-Password] ${error}`,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                message: '[Reset-Password] Password changed successfully',
            },
            { status: 200 }
        );

    } catch (error) {

        return NextResponse.json(
            {
                message: error instanceof Error ? `[Reset-Passwrod] ${error.message}` : '[Reset-Password] Internal server error',
            },
            { status: 500 }
        );
    }
}