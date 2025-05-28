import { NextResponse } from 'next/server';
import { getChannelId, getLatestVideos, getVideoComments } from '@/lib/youtube';
import { analyzeComments, aggregateResults } from '@/lib/toxicity';

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    // Get channel ID from URL
    const channelId = await getChannelId(channelUrl);

    // Get latest videos
    const videos = await getLatestVideos(channelId);

    // Get comments for all videos
    const comments = await Promise.all(
      videos.map(video => getVideoComments(video.videoId))
    ).then(comments => comments.flat());

    // Analyze comments
    const analyzedComments = await analyzeComments(comments);

    // Aggregate results
    const results = aggregateResults(analyzedComments);

    // Combine with video titles and add channel_id
    const finalResults = results.map(result => {
      const video = videos.find(v => v.videoId === result.videoId);
      return {
        ...result,
        title: video?.title || 'Unknown Title',
        channel_id: channelId,
      };
    });

    return NextResponse.json({ videos: finalResults });
  } catch (error) {
    console.error('Error in analyze route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze channel' },
      { status: 500 }
    );
  }
} 