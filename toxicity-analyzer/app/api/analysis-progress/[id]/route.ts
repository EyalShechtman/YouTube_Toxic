import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is properly awaited
    const { id: analysisId } = await params;

    if (!analysisId) {
      return NextResponse.json(
        { success: false, message: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    // Check progress from the backend
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/analysis-progress/${analysisId}`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to get progress');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in analysis-progress:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get progress' },
      { status: 500 }
    );
  }
} 