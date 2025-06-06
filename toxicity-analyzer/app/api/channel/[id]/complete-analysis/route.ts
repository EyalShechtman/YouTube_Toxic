import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CommentWithAllData {
  id: string;
  text: string;
  like_count: number;
  timestamp: string;
  video_id: string;
  user_id: string | null;
  author_name: string;
  videos: {
    id: string;
    title: string;
    view_count: number;
    comment_count: number;
    channel_id: string;
  };
  comments_data: {
    toxicity_score: number;
  }[] | {
    toxicity_score: number;
  } | null;
}

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
    const { id: channelId } = await params;
    console.log('🚀 Starting complete analysis for channel:', channelId);

    if (!channelId) {
      return NextResponse.json(
        { success: false, message: 'Channel ID is required' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const minCommentsParam = url.searchParams.get('min_comments') || '1';
    const minComments = Math.max(1, parseInt(minCommentsParam) || 1);
    const getAllUsers = url.searchParams.get('get_all') === 'true';

    // First, get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError || !channel) {
      console.error('Error fetching channel:', channelError);
      return NextResponse.json(
        { success: false, message: 'Channel not found' },
        { status: 404 }
      );
    }

    console.log('📺 Found channel:', channel.name);

    // Get ALL comments with video info and toxicity data in ONE query
    let allComments: CommentWithAllData[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;
    let pageCount = 0;

    console.log('🔍 Fetching ALL comments with video and toxicity data...');

    while (hasMoreData) {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}, offset: ${offset}`);
      
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
            id,
            title,
            view_count,
            comment_count,
            channel_id
          ),
          comments_data (
            toxicity_score
          )
        `)
        .eq('videos.channel_id', channelId)
        .not('comments_data', 'is', null)
        .order('id', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      if (comments && comments.length > 0) {
        console.log(`📄 Page ${pageCount}: Found ${comments.length} comments`);
        allComments = [...allComments, ...(comments as unknown as CommentWithAllData[])];
        offset += pageSize;
        hasMoreData = comments.length === pageSize;
      } else {
        console.log(`📄 Page ${pageCount}: No more comments found`);
        hasMoreData = false;
      }
    }

    console.log(`✅ Finished fetching all comments. Total: ${allComments.length}`);

    if (allComments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          channel: {
            id: channel.id,
            name: channel.name,
            video_count: 0,
            comment_count: 0,
            average_toxicity: 0,
          },
          toxicity: [],
          videos: [],
          users: {
            most_active: [],
            most_toxic: [],
            most_liked: [],
            total_users: 0,
            min_comments_threshold: minComments
          }
        }
      });
    }

    // Process all the data from the single comment fetch
    console.log('📊 Processing comment data...');

    // 1. CHANNEL STATS - Calculate from all comments
    const validComments = allComments.filter(comment => {
      if (!comment.comments_data) return false;
      
      // Handle both array and object structures
      if (Array.isArray(comment.comments_data)) {
        return comment.comments_data.length > 0 && comment.comments_data[0]?.toxicity_score !== undefined;
      } else if (typeof comment.comments_data === 'object') {
        return comment.comments_data.toxicity_score !== undefined;
      }
      return false;
    });

    const getToxicityScore = (comment: CommentWithAllData): number => {
      if (!comment.comments_data) return 0;
      
      if (Array.isArray(comment.comments_data)) {
        return comment.comments_data[0].toxicity_score;
      } else {
        return (comment.comments_data as { toxicity_score: number }).toxicity_score;
      }
    };

    const averageToxicity = validComments.length > 0 
      ? validComments.reduce((acc, comment) => acc + getToxicityScore(comment), 0) / validComments.length
      : 0;

    // Get unique videos count
    const uniqueVideoIds = new Set(allComments.map(c => c.video_id));
    const videoCount = uniqueVideoIds.size;

    console.log(`📈 Channel stats: ${videoCount} videos, ${validComments.length} comments, ${(averageToxicity * 100).toFixed(1)}% avg toxicity`);

    // 2. TOXICITY TIMELINE - Group by video and calculate averages
    const videoToxicityMap = new Map<string, {
      video_id: string;
      video_title: string;
      toxicity_scores: number[];
      earliest_timestamp: string;
    }>();

    validComments.forEach(comment => {
      const videoId = comment.video_id;
      const toxicityScore = getToxicityScore(comment);
      
      if (!videoToxicityMap.has(videoId)) {
        videoToxicityMap.set(videoId, {
          video_id: videoId,
          video_title: comment.videos.title,
          toxicity_scores: [],
          earliest_timestamp: comment.timestamp
        });
      }
      
      const videoData = videoToxicityMap.get(videoId)!;
      videoData.toxicity_scores.push(toxicityScore);
      
      // Keep the earliest timestamp for this video
      if (new Date(comment.timestamp) < new Date(videoData.earliest_timestamp)) {
        videoData.earliest_timestamp = comment.timestamp;
      }
    });

    const toxicityData = Array.from(videoToxicityMap.values())
      .map(video => ({
        timestamp: video.earliest_timestamp,
        toxicity_score: video.toxicity_scores.reduce((sum, score) => sum + score, 0) / video.toxicity_scores.length,
        video_title: video.video_title,
        video_id: video.video_id,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log(`📈 Toxicity timeline: ${toxicityData.length} data points`);

    // 3. VIDEO ANALYSIS - Calculate per-video stats
    const videoStatsMap = new Map<string, {
      id: string;
      title: string;
      view_count: number;
      comment_count: number;
      toxicity_scores: number[];
    }>();

    validComments.forEach(comment => {
      const videoId = comment.video_id;
      const toxicityScore = getToxicityScore(comment);
      
      if (!videoStatsMap.has(videoId)) {
        videoStatsMap.set(videoId, {
          id: videoId,
          title: comment.videos.title,
          view_count: comment.videos.view_count,
          comment_count: comment.videos.comment_count,
          toxicity_scores: []
        });
      }
      
      videoStatsMap.get(videoId)!.toxicity_scores.push(toxicityScore);
    });

    const videosData = Array.from(videoStatsMap.values())
      .map(video => ({
        id: video.id,
        title: video.title,
        view_count: video.view_count,
        comment_count: video.comment_count,
        average_toxicity: video.toxicity_scores.length > 0 
          ? video.toxicity_scores.reduce((sum, score) => sum + score, 0) / video.toxicity_scores.length
          : 0,
      }))
      .sort((a, b) => b.average_toxicity - a.average_toxicity);

    console.log(`📈 Video analysis: ${videosData.length} videos processed`);

    // 4. USER ANALYSIS - Group by user and calculate stats
    const userStatsMap = new Map<string, {
      user_id: string | null;
      author_name: string;
      comments: Array<{
        text: string;
        toxicity_score: number;
        like_count: number;
      }>;
    }>();

    validComments.forEach(comment => {
      const toxicityScore = getToxicityScore(comment);
      const authorKey = comment.user_id || comment.author_name || `Anonymous_${comment.id}`;
      
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

    // Calculate final user statistics
    const userStats: UserStats[] = Array.from(userStatsMap.entries()).map(([, userData]) => {
      const comments = userData.comments;
      const toxicityScores = comments.map(c => c.toxicity_score);
      const totalLikes = comments.reduce((sum, c) => sum + c.like_count, 0);
      
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

    // Filter users based on minimum comments
    const filteredUsers = userStats.filter(user => user.comment_count >= minComments);

    // Create sorted arrays for different views
    let usersData;
    if (getAllUsers) {
      // Return ALL users for client-side filtering
      const allActiveUsers = [...userStats].sort((a, b) => b.comment_count - a.comment_count);
      const allToxicUsers = [...userStats].sort((a, b) => b.average_toxicity - a.average_toxicity);
      const allLikedUsers = [...userStats].sort((a, b) => b.total_likes - a.total_likes);

      usersData = {
        most_active: allActiveUsers,
        most_toxic: allToxicUsers,
        most_liked: allLikedUsers,
        total_users: userStats.length,
        min_comments_threshold: 1
      };
    } else {
      // Return top 10 in each category
      const mostActiveUsers = [...filteredUsers].sort((a, b) => b.comment_count - a.comment_count).slice(0, 10);
      const mostToxicUsers = [...filteredUsers].sort((a, b) => b.average_toxicity - a.average_toxicity).slice(0, 10);
      const mostLikedUsers = [...filteredUsers].sort((a, b) => b.total_likes - a.total_likes).slice(0, 10);

      usersData = {
        most_active: mostActiveUsers,
        most_toxic: mostToxicUsers,
        most_liked: mostLikedUsers,
        total_users: filteredUsers.length,
        min_comments_threshold: minComments
      };
    }

    console.log(`📈 User analysis: ${userStats.length} total users, ${filteredUsers.length} with ${minComments}+ comments`);

    console.log('🎉 Complete analysis finished successfully!');

    return NextResponse.json({
      success: true,
      data: {
        channel: {
          id: channel.id,
          name: channel.name,
          video_count: videoCount,
          comment_count: validComments.length,
          average_toxicity: averageToxicity,
        },
        toxicity: toxicityData,
        videos: videosData,
        users: usersData
      }
    });

  } catch (error) {
    console.error('❌ Error in complete analysis:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch complete analysis data' },
      { status: 500 }
    );
  }
} 