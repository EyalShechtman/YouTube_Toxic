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

    // Get query parameters
    const url = new URL(request.url);
    const minCommentsParam = url.searchParams.get('min_comments') || '2';
    const minComments = Math.max(1, parseInt(minCommentsParam) || 2); // Ensure minimum is 1
    const getAllUsers = url.searchParams.get('get_all') === 'true';

    // Get all comments with toxicity scores for this channel (with pagination)
    let allComments: {
      user_id: string | null;
      author_name: string;
      text: string;
      like_count: number;
      video_id: string;
      videos: { channel_id: string }[];
      comments_data: { toxicity_score: number }[];
    }[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;
    let pageCount = 0;

    console.log(`Starting to fetch all comments for channel: ${channelId}`);

    while (hasMoreData) {
      pageCount++;
      console.log(`Fetching page ${pageCount}, offset: ${offset}`);
      
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          user_id,
          author_name,
          text,
          like_count,
          video_id,
          videos!inner (
            channel_id
          ),
          comments_data!inner (
            toxicity_score
          )
        `)
        .eq('videos.channel_id', channelId)
        .not('comments_data.toxicity_score', 'is', null)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching user data:', error);
        throw error;
      }

      if (comments && comments.length > 0) {
        console.log(`Page ${pageCount}: Found ${comments.length} comments`);
        allComments = [...allComments, ...comments];
        offset += pageSize;
        hasMoreData = comments.length === pageSize;
      } else {
        console.log(`Page ${pageCount}: No more comments found`);
        hasMoreData = false;
      }
    }

    console.log(`✅ Finished fetching all pages. Total comments found: ${allComments.length}`);

    if (!allComments || allComments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          most_active: [],
          most_toxic: [],
          most_liked: [],
          total_users: 0,
          min_comments_threshold: minComments
        }
      });
    }

    // Apply efficient Map-based deduplication
    const uniqueComments = new Map();
    const deduplicatedComments = [];

    for (const comment of allComments) {
      const key = `${(comment.text || '').trim().toLowerCase()}_${comment.video_id}_${comment.user_id || comment.author_name}`;
      
      if (!uniqueComments.has(key)) {
        uniqueComments.set(key, true);
        deduplicatedComments.push(comment);
      }
    }

    console.log(`After deduplication: ${deduplicatedComments.length} unique comments (removed ${allComments.length - deduplicatedComments.length} duplicates)`);

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

    let processedComments = 0;
    let skippedComments = 0;

    deduplicatedComments.forEach(comment => {
      // Better null checking for comments_data
      if (!comment.comments_data) {
        skippedComments++;
        return;
      }
      
      let toxicityScore: number;
      
      // Handle different possible structures of comments_data
      if (Array.isArray(comment.comments_data)) {
        if (comment.comments_data.length === 0 || !comment.comments_data[0]) {
          skippedComments++;
          return;
        }
        toxicityScore = comment.comments_data[0].toxicity_score;
      } else if (comment.comments_data && typeof comment.comments_data === 'object') {
        // If it's a single object instead of array
        toxicityScore = (comment.comments_data as { toxicity_score: number }).toxicity_score;
      } else {
        skippedComments++;
        return; // Skip if we can't determine the structure
      }
      
      // Skip if toxicity_score is null or undefined
      if (toxicityScore === null || toxicityScore === undefined) {
        skippedComments++;
        return;
      }
      
      // Create a more robust user key
      const authorKey = comment.user_id || comment.author_name || `Anonymous_${Date.now()}_${Math.random()}`;
      
      if (!userStatsMap.has(authorKey)) {
        userStatsMap.set(authorKey, {
          user_id: comment.user_id,
          author_name: comment.author_name || 'Anonymous',
          comments: []
        });
      }
      
      const userStats = userStatsMap.get(authorKey)!;
      
      // No need for deduplication since SQL already handled it
      userStats.comments.push({
        text: comment.text || '',
        toxicity_score: toxicityScore,
        like_count: comment.like_count || 0
      });
      processedComments++;
    });

    console.log(`📊 Comment processing complete:`)
    console.log(`   - Total comments fetched: ${allComments.length}`);
    console.log(`   - Deduplicated comments: ${deduplicatedComments.length}`);
    console.log(`   - Comments processed: ${processedComments}`);
    console.log(`   - Comments skipped (no toxicity): ${skippedComments}`);
    console.log(`   - Unique users found: ${userStatsMap.size}`);

    // Calculate final statistics for each user
    const userStats: UserStats[] = Array.from(userStatsMap.entries()).map(([, userData]) => {
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
    const significantUsers = userStats.filter(user => user.comment_count >= minComments);

    // If get_all is true, return all users for client-side filtering
    if (getAllUsers) {
      console.log(`🎯 Returning all users for client-side filtering:`);
      console.log(`   - Total user stats: ${userStats.length}`);
      
      // Return ALL users, not just top 100 from each category
      const allActiveUsers = [...userStats]
        .sort((a, b) => b.comment_count - a.comment_count);

      const allToxicUsers = [...userStats]
        .sort((a, b) => b.average_toxicity - a.average_toxicity);

      const allLikedUsers = [...userStats]
        .sort((a, b) => b.total_likes - a.total_likes);

      console.log(`   - All active users: ${allActiveUsers.length}`);
      console.log(`   - All toxic users: ${allToxicUsers.length}`);
      console.log(`   - All liked users: ${allLikedUsers.length}`);
      
      // Verify data integrity
      if (allActiveUsers.length !== allToxicUsers.length || allToxicUsers.length !== allLikedUsers.length) {
        console.error(`❌ Data integrity issue - array lengths don't match!`);
      } else {
        console.log(`✅ Data integrity verified - all arrays have ${allActiveUsers.length} users`);
      }

      return NextResponse.json({
        success: true,
        data: {
          most_active: allActiveUsers,
          most_toxic: allToxicUsers,
          most_liked: allLikedUsers,
          total_users: userStats.length,
          min_comments_threshold: 1
        }
      });
    }

    // Sort by different criteria (original behavior)
    const mostActiveUsers = [...significantUsers]
      .sort((a, b) => b.comment_count - a.comment_count)
      .slice(0, 10);

    const mostToxicUsers = [...significantUsers]
      .sort((a, b) => b.average_toxicity - a.average_toxicity)
      .slice(0, 10);

    const mostLikedUsers = [...significantUsers]
      .sort((a, b) => b.total_likes - a.total_likes)
      .slice(0, 10);

    console.log(`Processed ${significantUsers.length} users with ${minComments}+ comments (filtered from ${userStats.length} total users)`);

    return NextResponse.json({
      success: true,
      data: {
        most_active: mostActiveUsers,
        most_toxic: mostToxicUsers,
        most_liked: mostLikedUsers,
        total_users: significantUsers.length,
        min_comments_threshold: minComments
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