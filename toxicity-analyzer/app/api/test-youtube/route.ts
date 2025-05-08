import { NextResponse } from 'next/server';
import { fetchAndStoreChannelData } from '@/lib/youtubeDataFetcher';

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

    await fetchAndStoreChannelData(channelUrl);

    return NextResponse.json(
      { message: 'Channel data fetched and stored successfully' },
      { status: 200 }
    );
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