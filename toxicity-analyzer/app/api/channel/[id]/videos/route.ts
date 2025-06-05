import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VideoWithToxicity {
  id: string;
  title: string;
  view_count: number;
  comment_count: number;
  comments: {
    comments_data: {
      toxicity_score: number;
    } | null;
  }[];
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

    // Fetch videos with their comments and toxicity scores
    const { data, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        view_count,
        comment_count,
        comments (
          comments_data (
            toxicity_score
          )
        )
      `)
      .eq('channel_id', channelId);

    if (error) {
      throw error;
    }

    // Transform data to match the expected format
    const videosData = (data as unknown as VideoWithToxicity[])
      .map(video => {
        const toxicityScores = video.comments
          .filter(comment => comment.comments_data)
          .map(comment => comment.comments_data!.toxicity_score);

        const averageToxicity = toxicityScores.length > 0
          ? toxicityScores.reduce((acc, curr) => acc + curr, 0) / toxicityScores.length
          : 0;

        return {
          id: video.id,
          title: video.title,
          view_count: video.view_count,
          comment_count: video.comment_count,
          average_toxicity: averageToxicity,
        };
      })
      .sort((a, b) => b.average_toxicity - a.average_toxicity); // Sort by toxicity (highest first)

    return NextResponse.json({
      success: true,
      data: videosData,
    });
  } catch (error) {
    console.error('Error in videos data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch videos data' },
      { status: 500 }
    );
  }
} 