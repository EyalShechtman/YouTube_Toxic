import axios from 'axios';

if (!process.env.YOUTUBE_API_KEY) {
  throw new Error('YOUTUBE_API_KEY is not defined in environment variables');
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface Video {
  videoId: string;
  title: string;
}

interface Comment {
  text: string;
  videoId: string;
}

export async function getChannelId(channelUrl: string): Promise<string> {
  try {
    const url = new URL(channelUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Handle different URL formats
    if (pathParts[0] === 'c') {
      // Custom URL format: youtube.com/c/username
      const customName = pathParts[1];
      const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          q: customName,
          type: 'channel',
          key: YOUTUBE_API_KEY,
        },
      });
      return response.data.items[0].id.channelId;
    } else if (pathParts[0] === 'channel') {
      // Channel ID format: youtube.com/channel/UC...
      return pathParts[1];
    } else if (pathParts[0] === 'user') {
      // User format: youtube.com/user/username
      const username = pathParts[1];
      const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'id',
          forUsername: username,
          key: YOUTUBE_API_KEY,
        },
      });
      return response.data.items[0].id;
    } else if (pathParts[0] === '@') {
      // Handle @username format
      const username = pathParts[0].substring(1);
      const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          q: username,
          type: 'channel',
          key: YOUTUBE_API_KEY,
        },
      });
      return response.data.items[0].id.channelId;
    } else {
      // Try to search for the channel
      const searchQuery = pathParts.join('/');
      const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
        params: {
          part: 'snippet',
          q: searchQuery,
          type: 'channel',
          key: YOUTUBE_API_KEY,
        },
      });
      if (response.data.items && response.data.items.length > 0) {
        return response.data.items[0].id.channelId;
      }
    }
    
    throw new Error('Could not resolve channel ID from URL');
  } catch (error) {
    console.error('Error in getChannelId:', error);
    throw new Error('Invalid channel URL format');
  }
}

export async function getLatestVideos(channelId: string): Promise<Video[]> {
  const response = await axios.get(`${YOUTUBE_API_BASE}/search`, {
    params: {
      part: 'snippet',
      channelId,
      maxResults: 10,
      order: 'date',
      type: 'video',
      key: YOUTUBE_API_KEY,
    },
  });
  
  return response.data.items.map((item: any) => ({
    videoId: item.id.videoId,
    title: item.snippet.title,
  }));
}

export async function getVideoComments(videoId: string): Promise<Comment[]> {
  const response = await axios.get(`${YOUTUBE_API_BASE}/commentThreads`, {
    params: {
      part: 'snippet',
      videoId,
      maxResults: 30, // YouTube API limit per request
      key: YOUTUBE_API_KEY,
    },
  });
  
  return response.data.items.map((item: any) => ({
    text: item.snippet.topLevelComment.snippet.textDisplay,
    videoId,
  }));
} 