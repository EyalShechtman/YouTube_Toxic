import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { channel_url } = await request.json();

    if (!channel_url) {
      return NextResponse.json(
        { success: false, message: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // Generate a unique analysis ID
    const analysisId = crypto.randomUUID();

    // Start the analysis process
    const response = await fetch(`${process.env.BACKEND_URL}/api/analyze-channel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel_url,
        analysis_id: analysisId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to start analysis');
    }

    return NextResponse.json({
      success: true,
      analysis_id: analysisId,
      channel_id: data.channel_id,
    });
  } catch (error) {
    console.error('Error in analyze-channel:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to start analysis' },
      { status: 500 }
    );
  }
} 