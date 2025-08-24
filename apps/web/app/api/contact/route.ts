import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, company, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Store contact form submission in database
    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        company,
        subject,
        message,
        status: 'new',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Contact form error:', error);
      return NextResponse.json(
        { error: 'Failed to submit form. Please try again.' },
        { status: 500 }
      );
    }

    // Log activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'contact.submitted',
          resource_type: 'contact',
          resource_id: data.id,
          metadata: { subject }
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!',
      id: data.id
    });
  } catch (error: any) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}