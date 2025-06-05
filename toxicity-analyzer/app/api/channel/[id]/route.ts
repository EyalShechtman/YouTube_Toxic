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

    // Get all analyzed comments count and data (with pagination)
    let allAnalyzedComments: any[] = [];
    let offset = 0;
    const pageSize = 1000;
    let hasMoreData = true;

    while (hasMoreData) {
      const { data: analyzedComments, error: analyzedError } = await supabase
        .from('comments')
        .select(`
          id,
          comments_data (
            toxicity_score
          )
        `)
        .in('video_id', videoIds)
        .not('comments_data', 'is', null)
        .range(offset, offset + pageSize - 1);

      if (analyzedError) {
        console.error('Error fetching analyzed comments:', analyzedError);
        throw analyzedError;
      }

      if (analyzedComments && analyzedComments.length > 0) {
        allAnalyzedComments = [...allAnalyzedComments, ...analyzedComments];
        offset += pageSize;
        hasMoreData = analyzedComments.length === pageSize;
      } else {
        hasMoreData = false;
      }
    }

    if (!allAnalyzedComments || allAnalyzedComments.length === 0) {
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

    console.log('Found analyzed comments:', allAnalyzedComments.length);

    // Calculate average toxicity from the analyzed comments
    const averageToxicity = allAnalyzedComments.reduce(
      (acc, curr) => acc + (curr.comments_data?.toxicity_score || 0),
      0
    ) / allAnalyzedComments.length;

    console.log('Average toxicity:', averageToxicity);

    return NextResponse.json({
      success: true,
      data: {
        id: channel.id,
        name: channel.name,
        video_count: videoCount || 0,
        comment_count: allAnalyzedComments.length,
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