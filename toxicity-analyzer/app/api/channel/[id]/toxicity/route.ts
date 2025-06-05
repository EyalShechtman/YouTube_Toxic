import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithToxicity {
  id: string;
  timestamp: string;
  video_id: string;
  videos: {
    title: string;
  };
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

    // Get all comments with video titles for this channel (with pagination)
    let allComments: CommentWithToxicity[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          timestamp,
          video_id,
          videos!inner (
            title,
            channel_id
          ),
          comments_data (
            toxicity_score
          )
        `)
        .eq('videos.channel_id', channelId)
        .order('timestamp', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        allComments = [...allComments, ...(data as unknown as CommentWithToxicity[])];
        offset += pageSize;
        hasMoreData = data.length === pageSize;
      } else {
        hasMoreData = false;
      }
    }

    console.log(`Fetched ${allComments.length} total comments for channel ${channelId}`);

    // Group comments by video and calculate average toxicity per video
    const videoMap = new Map<string, {
      video_id: string;
      video_title: string;
      comments: { toxicity_score: number; timestamp: string }[];
    }>();

    // Group comments by video
    allComments
      .filter(item => item.comments_data)
      .forEach(item => {
        const videoId = item.video_id;
        if (!videoMap.has(videoId)) {
          videoMap.set(videoId, {
            video_id: videoId,
            video_title: item.videos.title,
            comments: []
          });
        }
        videoMap.get(videoId)!.comments.push({
          toxicity_score: item.comments_data!.toxicity_score,
          timestamp: item.timestamp
        });
      });

    // Calculate average toxicity per video and use earliest comment timestamp
    const toxicityData = Array.from(videoMap.values()).map(video => {
      const avgToxicity = video.comments.reduce((sum, comment) => sum + comment.toxicity_score, 0) / video.comments.length;
      const earliestTimestamp = video.comments.reduce((earliest, comment) => 
        new Date(comment.timestamp) < new Date(earliest) ? comment.timestamp : earliest, 
        video.comments[0].timestamp
      );
      
      return {
        timestamp: earliestTimestamp,
        toxicity_score: avgToxicity,
        video_title: video.video_title,
        video_id: video.video_id,
      };
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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