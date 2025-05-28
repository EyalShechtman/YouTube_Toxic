import { NextResponse } from 'next/server';
import { fetchAndStoreChannelData } from '@/lib/youtubeDataFetcher';
import { analyzeComments } from '@/lib/toxicity';

interface AnalyzedComment {
  toxicityScore: number;
  text: string;
  videoId: string;
  id: string;
}

interface CorrelationData {
  toxicityVsLikes: {
    sum: number;
    count: number;
  };
  coefficient: number;
}

export async function POST(request: Request) {
  try {
    const { channelUrl } = await request.json();

    if (!channelUrl) {
      return NextResponse.json(
        { error: 'Channel URL is required' },
        { status: 400 }
      );
    }

    if (!process.env.YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }

    const { channelData, videos, comments } = await fetchAndStoreChannelData(channelUrl);

    // Analyze comments for toxicity
    const analyzedComments = await analyzeComments(comments) as AnalyzedComment[];

    // Calculate analytics
    const analytics = {
      channel: {
        name: channelData.name,
        totalVideos: videos.length,
        totalComments: comments.length,
        averageLikesPerVideo: videos.reduce((acc, v) => acc + v.likes, 0) / videos.length,
        averageViewsPerVideo: videos.reduce((acc, v) => acc + v.view_count, 0) / videos.length,
      },
      comments: {
        totalToxic: analyzedComments.filter(c => c.toxicityScore > 0.5).length,
        averageToxicity: analyzedComments.reduce((acc, c) => acc + c.toxicityScore, 0) / analyzedComments.length,
        mostLikedComment: comments.reduce((max, c) => c.likeCount > max.likeCount ? c : max, comments[0]),
        mostToxicComment: analyzedComments.reduce((max, c) => c.toxicityScore > max.toxicityScore ? c : max, analyzedComments[0]),
      },
      userStats: {
        mostActiveUser: Object.entries(
          comments.reduce((acc, c) => {
            acc[c.userId] = (acc[c.userId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).reduce((max, [id, count]) => count > max.count ? { id, count } : max, { id: '', count: 0 }),
        mostLikedUser: Object.entries(
          comments.reduce((acc, c) => {
            acc[c.userId] = (acc[c.userId] || 0) + c.likeCount;
            return acc;
          }, {} as Record<string, number>)
        ).reduce((max, [id, likes]) => likes > max.likes ? { id, likes } : max, { id: '', likes: 0 }),
      },
      correlation: {
        toxicityVsLikes: analyzedComments.reduce((acc, c) => {
          const comment = comments.find(com => com.id === c.id);
          if (comment) {
            acc.sum += c.toxicityScore * comment.likeCount;
            acc.count += 1;
          }
          return acc;
        }, { sum: 0, count: 0 }),
        coefficient: 0
      } as CorrelationData
    };

    // Calculate correlation coefficient
    const correlation = analytics.correlation.toxicityVsLikes;
    analytics.correlation.coefficient = correlation.count > 0 ? correlation.sum / correlation.count : 0;

    return NextResponse.json({
      message: 'Channel data fetched and stored successfully',
      data: {
        channel: channelData,
        videos,
        comments: analyzedComments,
        analytics
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error in test-youtube route:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 