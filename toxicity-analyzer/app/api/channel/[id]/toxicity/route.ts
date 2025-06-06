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

    // For each video, get aggregated toxicity data with efficient deduplication
    const toxicityData = await Promise.all(
      videos.map(async (video) => {
        // Get comments for this video with pagination (videos can have >1000 comments)
        let videoComments: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        let hasMoreData = true;

        while (hasMoreData) {
          const { data: comments, error: commentsError } = await supabase
            .from('comments')
            .select(`
              timestamp,
              text,
              video_id,
              user_id,
              author_name,
              comments_data!inner(toxicity_score)
            `)
            .eq('video_id', video.id)
            .not('comments_data', 'is', null)
            .order('timestamp', { ascending: true })
            .range(offset, offset + pageSize - 1);

          if (commentsError) {
            console.error(`Error fetching comments for video ${video.id}:`, commentsError);
            return null;
          }

          if (comments && comments.length > 0) {
            videoComments = [...videoComments, ...comments];
            offset += pageSize;
            hasMoreData = comments.length === pageSize;
          } else {
            hasMoreData = false;
          }
        }

        if (!videoComments || videoComments.length === 0) {
          return null;
        }

        // Apply efficient Map-based deduplication
        const uniqueComments = new Map();
        let earliestTimestamp: string | null = null;

        for (const comment of videoComments) {
          const key = `${(comment.text || '').trim().toLowerCase()}_${comment.video_id}_${comment.user_id || comment.author_name}`;
          
          if (!uniqueComments.has(key)) {
            let toxicityScore: number | undefined;
            
            if (Array.isArray(comment.comments_data)) {
              toxicityScore = comment.comments_data[0]?.toxicity_score;
            } else if (comment.comments_data && typeof comment.comments_data === 'object') {
              toxicityScore = (comment.comments_data as { toxicity_score: number }).toxicity_score;
            }
              
            if (toxicityScore !== undefined && toxicityScore !== null) {
              uniqueComments.set(key, {
                toxicity_score: toxicityScore,
                timestamp: comment.timestamp
              });
              
              if (!earliestTimestamp || new Date(comment.timestamp) < new Date(earliestTimestamp)) {
                earliestTimestamp = comment.timestamp;
              }
            }
          }
        }

        console.log(`Video ${video.id}: ${videoComments.length} total -> ${uniqueComments.size} after deduplication`);

        if (uniqueComments.size === 0) {
          return null;
        }

        // Calculate average toxicity from unique comments
        let totalToxicity = 0;
        for (const commentData of uniqueComments.values()) {
          totalToxicity += commentData.toxicity_score;
        }
        
        const avgToxicity = totalToxicity / uniqueComments.size;
        console.log(`Video ${video.id}: ${uniqueComments.size} valid comments, avg toxicity: ${avgToxicity.toFixed(3)}`);

        // Use earliest comment timestamp as video timestamp
        const timestamp = earliestTimestamp;

        return {
          timestamp: timestamp || new Date().toISOString(),
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