import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithToxicity {
  timestamp: string;
  comments_data: {
    toxicity_score: number;
  }[] | {
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

    // Get videos for this channel with their comments' toxicity data
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        channel_id
      `)
      .eq('channel_id', channelId)
      .order('id', { ascending: true });

    if (videosError) {
      throw videosError;
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    console.log(`📹 Found ${videos.length} videos for channel ${channelId}`);

    // For each video, get aggregated toxicity data
    const toxicityData = await Promise.all(
      videos.map(async (video) => {
        const { data: comments, error: commentsError } = await supabase
          .from('comments')
          .select(`
            timestamp,
            comments_data (
              toxicity_score
            )
          `)
          .eq('video_id', video.id)
          .not('comments_data', 'is', null)
          .order('timestamp', { ascending: true })
          .limit(1000); // Limit to avoid fetching too many comments per video

        if (commentsError) {
          console.error(`Error fetching comments for video ${video.id}:`, commentsError);
          return null;
        }

        if (!comments || comments.length === 0) {
          return null;
        }

        // Type assertion for the comments
        const typedComments = comments as unknown as CommentWithToxicity[];

        // Calculate average toxicity for this video
        const validComments = typedComments.filter(c => {
          if (!c.comments_data) return false;
          
          // Handle both array and object structures
          if (Array.isArray(c.comments_data)) {
            return c.comments_data.length > 0 && c.comments_data[0]?.toxicity_score !== undefined;
          } else if (typeof c.comments_data === 'object') {
            return c.comments_data.toxicity_score !== undefined;
          }
          return false;
        });

        if (validComments.length === 0) {
          console.log(`No valid comments with toxicity data for video ${video.id}`);
          return null;
        }

        const avgToxicity = validComments.reduce((sum, comment) => {
          // Handle both array and object structures
          if (!comment.comments_data) return sum; // Additional null check
          
          const toxicity = Array.isArray(comment.comments_data) 
            ? comment.comments_data[0].toxicity_score 
            : comment.comments_data.toxicity_score;
          return sum + toxicity;
        }, 0) / validComments.length;

        console.log(`Video ${video.id}: ${validComments.length} valid comments, avg toxicity: ${avgToxicity.toFixed(3)}`);

        // Use earliest comment timestamp as video timestamp
        const timestamp = typedComments[0].timestamp;

        return {
          timestamp,
          toxicity_score: avgToxicity,
          video_title: video.title,
          video_id: video.id,
        };
      })
    );

    // Filter out null results and sort by timestamp
    const validToxicityData = toxicityData
      .filter(data => data !== null)
      .sort((a, b) => new Date(a!.timestamp).getTime() - new Date(b!.timestamp).getTime());

    console.log(`📊 Processed toxicity data for ${validToxicityData.length} videos`);

    return NextResponse.json({
      success: true,
      data: validToxicityData,
    });
  } catch (error) {
    console.error('Error in toxicity data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch toxicity data' },
      { status: 500 }
    );
  }
} 