import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithToxicity {
  id: string;
  timestamp: string;
  comments_data: {
    toxicity_score: number;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params to get the channel ID
    const { id: channelId } = await params;

    if (!channelId) {
      return NextResponse.json(
        { success: false, message: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // First get all videos for this channel
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .eq('channel_id', channelId);

    if (videosError) {
      throw videosError;
    }

    const videoIds = videos.map(v => v.id);

    // Then get comments for these videos
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        timestamp,
        comments_data (
          toxicity_score
        )
      `)
      .in('video_id', videoIds)
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    // Transform data to match the expected format
    const toxicityData = (data as unknown as CommentWithToxicity[])
      .filter(item => item.comments_data)
      .map(item => ({
        timestamp: item.timestamp,
        toxicity_score: item.comments_data!.toxicity_score,
      }));

    return NextResponse.json({
      success: true,
      data: toxicityData,
    });
  } catch (error) {
    console.error('Error in toxicity data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch toxicity data' },
      { status: 500 }
    );
  }
} 