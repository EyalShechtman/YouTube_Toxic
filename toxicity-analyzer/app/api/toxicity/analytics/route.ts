import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service role key must be defined in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    // Fetch channel data
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError) throw channelError;

    // Fetch videos
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('channel_id', channelId);

    if (videosError) throw videosError;

    // Fetch comments with toxicity scores
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        *,
        comments_data (
          toxicity_score
        )
      `)
      .in('video_id', videos.map(v => v.id));

    if (commentsError) throw commentsError;

    // Calculate analytics
    const analytics = {
      channel: {
        name: channel.name,
        totalVideos: videos.length,
        totalComments: comments.length,
        averageLikesPerVideo: videos.reduce((acc, v) => acc + v.likes, 0) / videos.length,
        averageViewsPerVideo: videos.reduce((acc, v) => acc + v.view_count, 0) / videos.length,
      },
      comments: {
        totalToxic: comments.filter(c => c.comments_data?.toxicity_score > 0.5).length,
        averageToxicity: comments.reduce((acc, c) => acc + (c.comments_data?.toxicity_score || 0), 0) / comments.length,
        mostLikedComment: comments.reduce((max, c) => c.like_count > max.like_count ? c : max, comments[0]),
        mostToxicComment: comments.reduce((max, c) => 
          (c.comments_data?.toxicity_score || 0) > (max.comments_data?.toxicity_score || 0) ? c : max, 
          comments[0]
        ),
      },
      userStats: {
        mostActiveUser: Object.entries(
          comments.reduce((acc, c) => {
            acc[c.user_id] = (acc[c.user_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).reduce((max, [id, count]) => {
          const countNum = count as number;
          return countNum > max.count ? { id, count: countNum } : max;
        }, { id: '', count: 0 }),
        mostLikedUser: Object.entries(
          comments.reduce((acc, c) => {
            acc[c.user_id] = (acc[c.user_id] || 0) + c.like_count;
            return acc;
          }, {} as Record<string, number>)
        ).reduce((max, [id, likes]) => {
          const likesNum = likes as number;
          return likesNum > max.likes ? { id, likes: likesNum } : max;
        }, { id: '', likes: 0 }),
      },
      correlation: {
        toxicityVsLikes: comments.reduce((acc, c) => {
          if (c.comments_data?.toxicity_score) {
            acc.sum += c.comments_data.toxicity_score * c.like_count;
            acc.count += 1;
          }
          return acc;
        }, { sum: 0, count: 0 }),
        coefficient: 0
      }
    };

    // Calculate correlation coefficient
    const correlation = analytics.correlation.toxicityVsLikes;
    analytics.correlation.coefficient = correlation.count > 0 ? correlation.sum / correlation.count : 0;

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error in analytics route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
} 