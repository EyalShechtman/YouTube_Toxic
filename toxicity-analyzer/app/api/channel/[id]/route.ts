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
    console.log('Fetching data for channel:', channelId);

    if (!channelId) {
      return NextResponse.json(
        { success: false, message: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Fetch channel data
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError) {
      console.error('Error fetching channel:', channelError);
      return NextResponse.json(
        { success: false, message: 'Channel not found' },
        { status: 404 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { success: false, message: 'Channel not found' },
        { status: 404 }
      );
    }

    console.log('Found channel:', channel.name);

    // Fetch video count
    const { count: videoCount, error: videoError } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelId);

    if (videoError) {
      console.error('Error fetching video count:', videoError);
      throw videoError;
    }

    console.log('Video count:', videoCount);

    // Get all videos for this channel
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id')
      .eq('channel_id', channelId);

    if (videosError) {
      console.error('Error fetching videos:', videosError);
      throw videosError;
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          id: channel.id,
          name: channel.name,
          video_count: 0,
          comment_count: 0,
          average_toxicity: 0,
        },
      });
    }

    const videoIds = videos.map(v => v.id);
    console.log('Found videos:', videoIds.length);

    // Use pagination to get all comment data (Supabase limits to 1000 per call)
    console.log('Fetching comment data with pagination...');
    
    let allCommentData: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;
    let pageCount = 0;

    while (hasMoreData) {
      pageCount++;
      console.log(`Fetching page ${pageCount}, offset: ${offset}`);
      
      const { data: commentData, error: sqlError } = await supabase
        .from('comments')
        .select(`
          text,
          video_id,
          user_id,
          author_name,
          comments_data!inner(toxicity_score)
        `)
        .in('video_id', videoIds)
        .not('comments_data', 'is', null)
        .order('id')
        .range(offset, offset + pageSize - 1);

      if (sqlError) {
        console.error('Error fetching comment data:', sqlError);
        return NextResponse.json({
          success: true,
          data: {
            id: channel.id,
            name: channel.name,
            video_count: videoCount || 0,
            comment_count: 0,
            average_toxicity: 0,
          },
        });
      }

      if (commentData && commentData.length > 0) {
        console.log(`Page ${pageCount}: Found ${commentData.length} comments`);
        allCommentData = [...allCommentData, ...commentData];
        offset += pageSize;
        hasMoreData = commentData.length === pageSize;
      } else {
        console.log(`Page ${pageCount}: No more comments found`);
        hasMoreData = false;
      }
    }

    console.log(`✅ Finished fetching all pages. Total comments found: ${allCommentData.length}`);

    if (allCommentData.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          id: channel.id,
          name: channel.name,
          video_count: videoCount || 0,
          comment_count: 0,
          average_toxicity: 0,
        },
      });
    }

    console.log(`Applying efficient Map-based deduplication to ${allCommentData.length} comments...`);

    // Use Map for O(1) lookup during deduplication instead of filter/findIndex
    const uniqueComments = new Map();
    let totalToxicity = 0;

    for (const comment of allCommentData) {
      const key = `${(comment.text || '').trim().toLowerCase()}_${comment.video_id}_${comment.user_id || comment.author_name}`;
      
      if (!uniqueComments.has(key)) {
        const toxicityScore = Array.isArray(comment.comments_data) 
          ? comment.comments_data[0]?.toxicity_score 
          : comment.comments_data?.toxicity_score;
          
        if (toxicityScore !== undefined && toxicityScore !== null) {
          uniqueComments.set(key, toxicityScore);
          totalToxicity += toxicityScore;
        }
      }
    }

    const commentCount = uniqueComments.size;
    const averageToxicity = commentCount > 0 ? totalToxicity / commentCount : 0;

    console.log(`Deduplication completed: ${commentCount} unique comments (removed ${allCommentData.length - commentCount} duplicates), avg toxicity: ${averageToxicity.toFixed(3)}`);

    return NextResponse.json({
      success: true,
      data: {
        id: channel.id,
        name: channel.name,
        video_count: videoCount || 0,
        comment_count: commentCount,
        average_toxicity: averageToxicity,
      },
    });
  } catch (error) {
    console.error('Error in channel data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch channel data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 