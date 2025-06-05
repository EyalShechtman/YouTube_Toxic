import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithUser {
  id: string;
  text: string;
  like_count: number;
  timestamp: string;
  user_id: string | null;
  author_name: string;
  comments_data: {
    toxicity_score: number;
  } | null;
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params to get the video ID
    const { id: videoId } = await params;

    if (!videoId) {
      return NextResponse.json(
        { success: false, message: 'Video ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching insights for video: ${videoId}`);

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      console.error('Error fetching video:', videoError);
      return NextResponse.json(
        { success: false, message: 'Video not found' },
        { status: 404 }
      );
    }

    // Get all comments for this video with pagination
    let allComments: CommentWithUser[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: comments, error: commentsError } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          like_count,
          timestamp,
          user_id,
          author_name,
          comments_data (
            toxicity_score
          )
        `)
        .eq('video_id', videoId)
        .not('comments_data', 'is', null)
        .range(offset, offset + pageSize - 1);

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        throw commentsError;
      }

      if (comments && comments.length > 0) {
        allComments = [...allComments, ...(comments as unknown as CommentWithUser[])];
        offset += pageSize;
        hasMoreData = comments.length === pageSize;
      } else {
        hasMoreData = false;
      }
    }

    console.log(`Found ${allComments.length} comments for video ${videoId}`);

    // Remove duplicate comments (same user, same text)
    const deduplicatedComments = allComments.filter((comment, index, array) => {
      const key = `${comment.user_id || comment.author_name || 'anonymous'}_${comment.text?.trim().toLowerCase() || ''}`;
      return array.findIndex(c => {
        const cKey = `${c.user_id || c.author_name || 'anonymous'}_${c.text?.trim().toLowerCase() || ''}`;
        return cKey === key;
      }) === index;
    });

    console.log(`After deduplication: ${deduplicatedComments.length} unique comments (removed ${allComments.length - deduplicatedComments.length} duplicates)`);

    if (deduplicatedComments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          video,
          stats: {
            total_comments: 0,
            average_toxicity: 0,
            max_toxicity: 0,
            min_toxicity: 0,
            high_toxicity_count: 0,
            medium_toxicity_count: 0,
            low_toxicity_count: 0,
          },
          most_toxic_comments: [],
          most_liked_comments: [],
          user_stats: {
            total_unique_users: 0,
            most_active_user: null,
            most_toxic_user: null,
          },
        },
      });
    }

    // Calculate toxicity statistics
    const toxicityScores = deduplicatedComments
      .filter(c => c.comments_data)
      .map(c => c.comments_data!.toxicity_score);

    const averageToxicity = toxicityScores.reduce((sum, score) => sum + score, 0) / toxicityScores.length;
    const maxToxicity = Math.max(...toxicityScores);
    const minToxicity = Math.min(...toxicityScores);

    // Count toxicity levels
    const highToxicityCount = toxicityScores.filter(score => score >= 0.6).length;
    const mediumToxicityCount = toxicityScores.filter(score => score >= 0.3 && score < 0.6).length;
    const lowToxicityCount = toxicityScores.filter(score => score < 0.3).length;

    // Get most toxic comments (top 5)
    const mostToxicComments = deduplicatedComments
      .filter(c => c.comments_data)
      .sort((a, b) => b.comments_data!.toxicity_score - a.comments_data!.toxicity_score)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        text: c.text,
        author_name: c.author_name,
        like_count: c.like_count,
        toxicity_score: c.comments_data!.toxicity_score,
        timestamp: c.timestamp,
      }));

    // Get most liked comments (top 5)
    const mostLikedComments = deduplicatedComments
      .filter(c => c.comments_data && c.like_count > 0)
      .sort((a, b) => b.like_count - a.like_count)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        text: c.text,
        author_name: c.author_name,
        like_count: c.like_count,
        toxicity_score: c.comments_data!.toxicity_score,
        timestamp: c.timestamp,
      }));

    // Calculate user statistics
    const userStatsMap = new Map<string, {
      user_id: string | null;
      author_name: string;
      comment_count: number;
      total_toxicity: number;
      total_likes: number;
    }>();

    deduplicatedComments.forEach(comment => {
      if (!comment.comments_data) return;
      
      const userId = comment.user_id || comment.author_name || 'Anonymous';
      
      if (!userStatsMap.has(userId)) {
        userStatsMap.set(userId, {
          user_id: comment.user_id,
          author_name: comment.author_name || 'Anonymous',
          comment_count: 0,
          total_toxicity: 0,
          total_likes: 0,
        });
      }
      
      const userStats = userStatsMap.get(userId)!;
      userStats.comment_count++;
      userStats.total_toxicity += comment.comments_data.toxicity_score;
      userStats.total_likes += comment.like_count || 0;
    });

    // Find most active and most toxic users
    const users = Array.from(userStatsMap.values());
    const mostActiveUser = users.reduce((max, user) => 
      user.comment_count > max.comment_count ? user : max, users[0]
    );
    
    const mostToxicUser = users.reduce((max, user) => {
      const avgToxicity = user.total_toxicity / user.comment_count;
      const maxAvgToxicity = max.total_toxicity / max.comment_count;
      return avgToxicity > maxAvgToxicity ? user : max;
    }, users[0]);

    return NextResponse.json({
      success: true,
      data: {
        video: {
          id: video.id,
          title: video.title,
          view_count: video.view_count,
          comment_count: video.comment_count,
          upload_date: video.upload_date || (deduplicatedComments.length > 0 ? 
            deduplicatedComments.reduce((earliest, comment) => 
              new Date(comment.timestamp) < new Date(earliest) ? comment.timestamp : earliest, 
              deduplicatedComments[0].timestamp
            ) : null),
          duration: video.duration,
        },
        stats: {
          total_comments: deduplicatedComments.length,
          average_toxicity: averageToxicity,
          max_toxicity: maxToxicity,
          min_toxicity: minToxicity,
          high_toxicity_count: highToxicityCount,
          medium_toxicity_count: mediumToxicityCount,
          low_toxicity_count: lowToxicityCount,
        },
        most_toxic_comments: mostToxicComments,
        most_liked_comments: mostLikedComments,
        user_stats: {
          total_unique_users: users.length,
          most_active_user: mostActiveUser ? {
            author_name: mostActiveUser.author_name,
            comment_count: mostActiveUser.comment_count,
            total_likes: mostActiveUser.total_likes,
          } : null,
          most_toxic_user: mostToxicUser ? {
            author_name: mostToxicUser.author_name,
            comment_count: mostToxicUser.comment_count,
            average_toxicity: mostToxicUser.total_toxicity / mostToxicUser.comment_count,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('Error in video insights:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch video insights' },
      { status: 500 }
    );
  }
} 