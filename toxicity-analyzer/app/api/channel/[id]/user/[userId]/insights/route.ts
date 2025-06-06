import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithVideo {
  id: string;
  text: string;
  like_count: number;
  timestamp: string;
  video_id: string;
  user_id: string | null;
  author_name: string;
  videos: {
    title: string;
  };
  comments_data: {
    toxicity_score: number;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    // Await params to get the channel ID and user ID
    const { id: channelId, userId } = await params;

    if (!channelId || !userId) {
      return NextResponse.json(
        { success: false, message: 'Channel ID and User ID are required' },
        { status: 400 }
      );
    }

    console.log(`Fetching insights for user: ${userId} in channel: ${channelId}`);

    // Decode the userId in case it's URL encoded (for author names)
    const decodedUserId = decodeURIComponent(userId);

    // Get user comments with pagination
    let allComments: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          like_count,
          timestamp,
          video_id,
          user_id,
          author_name,
          videos!inner (
            title,
            channel_id
          ),
          comments_data!inner (
            toxicity_score
          )
        `)
        .eq('videos.channel_id', channelId)
        .not('comments_data.toxicity_score', 'is', null)
        .or(`user_id.eq."${decodedUserId}",author_name.eq."${decodedUserId}"`)
        .order('timestamp', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching user comments:', error);
        throw error;
      }

      if (comments && comments.length > 0) {
        allComments = [...allComments, ...comments];
        offset += pageSize;
        hasMoreData = comments.length === pageSize;
      } else {
        hasMoreData = false;
      }
    }

    console.log(`Found ${allComments?.length || 0} comments for user ${decodedUserId}`);

    // Apply efficient Map-based deduplication
    const uniqueComments = new Map();
    const deduplicatedComments = [];

    if (allComments) {
      for (const comment of allComments) {
        const key = `${(comment.text || '').trim().toLowerCase()}_${comment.video_id}_${comment.user_id || comment.author_name}`;
        
        if (!uniqueComments.has(key)) {
          uniqueComments.set(key, true);
          deduplicatedComments.push(comment);
        }
      }
    }

    console.log(`After deduplication: ${deduplicatedComments.length} unique comments (removed ${(allComments?.length || 0) - deduplicatedComments.length} duplicates)`);

    const validComments = deduplicatedComments.filter(comment => comment.comments_data);
    
    console.log(`Processing ${validComments.length} comments with toxicity data`);

    if (validComments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          user: {
            user_id: decodedUserId.startsWith('UC') ? decodedUserId : null,
            author_name: decodedUserId,
            total_comments: 0,
            total_likes: 0,
            average_toxicity: 0,
            max_toxicity: 0,
            min_toxicity: 0,
          },
          comments: [],
          stats: {
            high_toxicity_count: 0,
            medium_toxicity_count: 0,
            low_toxicity_count: 0,
          },
        },
      });
    }

    // Process comments data using deduplicated comments
    const toxicityScores = validComments.map(c => c.comments_data!.toxicity_score);
    const totalLikes = validComments.reduce((sum, c) => sum + (c.like_count || 0), 0);

    // Calculate statistics
    const averageToxicity = toxicityScores.reduce((sum, score) => sum + score, 0) / toxicityScores.length;
    const maxToxicity = Math.max(...toxicityScores);
    const minToxicity = Math.min(...toxicityScores);

    // Count toxicity levels
    const highToxicityCount = toxicityScores.filter(score => score >= 0.6).length;
    const mediumToxicityCount = toxicityScores.filter(score => score >= 0.3 && score < 0.6).length;
    const lowToxicityCount = toxicityScores.filter(score => score < 0.3).length;

    // Format comments for response
    const formattedComments = validComments.map(comment => ({
      id: comment.id,
      text: comment.text || '',
      like_count: comment.like_count || 0,
      toxicity_score: comment.comments_data!.toxicity_score,
      timestamp: comment.timestamp,
      video_title: comment.videos.title,
      video_id: comment.video_id,
    }));

    // Get the actual author name from the first comment
    const authorName = validComments[0]?.author_name || decodedUserId;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          user_id: decodedUserId.startsWith('UC') ? decodedUserId : null,
          author_name: authorName,
          total_comments: validComments.length,
          total_likes: totalLikes,
          average_toxicity: averageToxicity,
          max_toxicity: maxToxicity,
          min_toxicity: minToxicity,
        },
        comments: formattedComments,
        stats: {
          high_toxicity_count: highToxicityCount,
          medium_toxicity_count: mediumToxicityCount,
          low_toxicity_count: lowToxicityCount,
        },
      },
    });
  } catch (error) {
    console.error('Error in user insights:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user insights' },
      { status: 500 }
    );
  }
} 