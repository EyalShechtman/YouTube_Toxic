import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithRelations {
  id: string;
  toxicity_score: number;
  comments: {
    timestamp: string;
    video_id: string;
    videos: {
      channel_id: string;
    };
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '24h';
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    // Fetch comments with their timestamps and toxicity scores by joining the tables
    const { data: comments, error } = await supabase
      .from('comments_data')
      .select(`
        id,
        toxicity_score,
        comments!inner (
          timestamp,
          video_id,
          videos!inner (
            channel_id
          )
        )
      `)
      .eq('comments.videos.channel_id', channelId)
      .order('comments(timestamp)', { ascending: true })
      .returns<CommentWithRelations[]>();

    if (error) throw error;

    // Group data by time intervals
    const interval = timeRange === '24h' ? 3600000 : 86400000; // 1 hour or 1 day in milliseconds
    const groupedData = new Map<string, { toxicityScores: number[], count: number }>();

    comments.forEach(comment => {
      const timestamp = new Date(comment.comments.timestamp);
      const intervalKey = new Date(Math.floor(timestamp.getTime() / interval) * interval).toISOString();
      
      if (!groupedData.has(intervalKey)) {
        groupedData.set(intervalKey, { toxicityScores: [], count: 0 });
      }
      
      const group = groupedData.get(intervalKey)!;
      group.toxicityScores.push(comment.toxicity_score);
      group.count++;
    });

    // Calculate averages and prepare response
    const timestamps: string[] = [];
    const toxicityScores: number[] = [];
    const commentCounts: number[] = [];

    groupedData.forEach((group, timestamp) => {
      timestamps.push(timestamp);
      toxicityScores.push(group.toxicityScores.reduce((a, b) => a + b, 0) / group.toxicityScores.length);
      commentCounts.push(group.count);
    });

    return NextResponse.json({
      timestamps,
      toxicityScores,
      commentCounts,
    });
  } catch (error) {
    console.error('Error fetching temporal data:', error);
    return NextResponse.json({ error: 'Failed to fetch temporal data' }, { status: 500 });
  }
} 