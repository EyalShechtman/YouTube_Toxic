import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface UserStats {
  user_id: string | null;
  author_name: string;
  comment_count: number;
  average_toxicity: number;
  max_toxicity: number;
  most_toxic_comment: string;
  total_likes: number;
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

    console.log(`Fetching user stats for channel: ${channelId}`);

    // Get all comments with toxicity scores for this channel
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        id,
        user_id,
        author_name,
        text,
        like_count,
        videos!inner (
          channel_id
        ),
        comments_data (
          toxicity_score
        )
      `)
      .eq('videos.channel_id', channelId)
      .not('comments_data', 'is', null);

    if (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }

    console.log(`Found ${comments.length} comments with user data`);

    // Group comments by user and calculate statistics
    const userStatsMap = new Map<string, {
      user_id: string | null;
      author_name: string;
      comments: Array<{
        text: string;
        toxicity_score: number;
        like_count: number;
      }>;
    }>();

    comments.forEach(comment => {
      // Better null checking for comments_data
      if (!comment.comments_data) return;
      
      let toxicityScore: number;
      
      // Handle different possible structures of comments_data
      if (Array.isArray(comment.comments_data)) {
        if (comment.comments_data.length === 0 || !comment.comments_data[0]) return;
        toxicityScore = comment.comments_data[0].toxicity_score;
      } else if (comment.comments_data && typeof comment.comments_data === 'object') {
        // If it's a single object instead of array
        toxicityScore = (comment.comments_data as any).toxicity_score;
      } else {
        return; // Skip if we can't determine the structure
      }
      
      // Skip if toxicity_score is null or undefined
      if (toxicityScore === null || toxicityScore === undefined) return;
      
      const authorKey = comment.user_id || comment.author_name || 'Anonymous';
      
      if (!userStatsMap.has(authorKey)) {
        userStatsMap.set(authorKey, {
          user_id: comment.user_id,
          author_name: comment.author_name || 'Anonymous',
          comments: []
        });
      }
      
      userStatsMap.get(authorKey)!.comments.push({
        text: comment.text || '',
        toxicity_score: toxicityScore,
        like_count: comment.like_count || 0
      });
    });

    // Calculate final statistics for each user
    const userStats: UserStats[] = Array.from(userStatsMap.entries()).map(([key, userData]) => {
      const comments = userData.comments;
      const toxicityScores = comments.map(c => c.toxicity_score);
      const totalLikes = comments.reduce((sum, c) => sum + c.like_count, 0);
      
      // Find most toxic comment
      const mostToxicComment = comments.reduce((max, current) => 
        current.toxicity_score > max.toxicity_score ? current : max
      );

      return {
        user_id: userData.user_id,
        author_name: userData.author_name,
        comment_count: comments.length,
        average_toxicity: toxicityScores.reduce((sum, score) => sum + score, 0) / toxicityScores.length,
        max_toxicity: Math.max(...toxicityScores),
        most_toxic_comment: mostToxicComment.text,
        total_likes: totalLikes
      };
    });

    // Filter out users with very few comments to focus on meaningful data
    const significantUsers = userStats.filter(user => user.comment_count >= 2);

    // Sort by different criteria
    const mostActiveUsers = [...significantUsers]
      .sort((a, b) => b.comment_count - a.comment_count)
      .slice(0, 10);

    const mostToxicUsers = [...significantUsers]
      .sort((a, b) => b.average_toxicity - a.average_toxicity)
      .slice(0, 10);

    const mostLikedUsers = [...significantUsers]
      .sort((a, b) => b.total_likes - a.total_likes)
      .slice(0, 10);

    console.log(`Processed ${significantUsers.length} users with meaningful data`);

    return NextResponse.json({
      success: true,
      data: {
        most_active: mostActiveUsers,
        most_toxic: mostToxicUsers,
        most_liked: mostLikedUsers,
        total_users: significantUsers.length
      }
    });
  } catch (error) {
    console.error('Error in user stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
} 