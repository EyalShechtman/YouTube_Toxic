import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service role key must be defined in environment variables');
}

console.log('Initializing Supabase client with URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Verify Supabase connection and permissions
const verifySupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('channels').select('count').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    console.log('Supabase connection verified successfully');
  } catch (error) {
    console.error('Error verifying Supabase connection:', error);
    throw error;
  }
};

// Call verification on module load
verifySupabaseConnection().catch(console.error);

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Add API request counter at the top level
let youtubeApiRequestCount = 0;

// Types for our data
interface ChannelData {
  id: string;
  name: string;
}

interface VideoData {
  id: string;
  title: string;
  channel_id: string;
  likes: number;
  view_count: number;
  comment_count: number;
  timestamp: Date;
}

interface CommentData {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  timestamp: Date;
  likeCount: number;
  authorName: string;
}

interface UserData {
  id: string;
  username: string;
  channelId: string;
}

/**
 * Extracts channel ID from a YouTube channel URL
 */
export const extractChannelId = async (channelUrl: string): Promise<string> => {
  try {
    console.log('Extracting channel ID from URL:', channelUrl);
    
    // Handle different URL formats
    const patterns = [
      /youtube\.com\/channel\/([^\/\?]+)/,
      /youtube\.com\/c\/([^\/\?]+)/,
      /youtube\.com\/@([^\/\?]+)/,
      /youtube\.com\/user\/([^\/\?]+)/
    ];

    // First try direct pattern matching
    for (const pattern of patterns) {
      const match = channelUrl.match(pattern);
      if (match) {
        console.log('Pattern matched:', pattern.toString());
        const identifier = match[1];
        
        // For @username and custom URL formats, we need to get the channel ID
        if (pattern.toString().includes('@') || pattern.toString().includes('/c/')) {
          console.log('Found username format, getting channel ID for:', identifier);
          const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
              part: 'snippet',
              q: identifier,
              type: 'channel',
              key: process.env.YOUTUBE_API_KEY
            }
          });

          if (response.data.items?.[0]?.id?.channelId) {
            console.log('Found channel ID:', response.data.items[0].id.channelId);
            return response.data.items[0].id.channelId;
          }
        } else if (pattern.toString().includes('/user/')) {
          // For user format
          const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
              part: 'id',
              forUsername: identifier,
              key: process.env.YOUTUBE_API_KEY
            }
          });

          if (response.data.items?.[0]?.id) {
            console.log('Found channel ID:', response.data.items[0].id);
            return response.data.items[0].id;
          }
        } else {
          // For channel ID format, return the ID directly
          console.log('Returning direct channel ID:', identifier);
          return identifier;
        }
      }
    }

    // If no pattern matched, try searching for the channel
    const searchQuery = channelUrl.split('/').pop() || '';
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: searchQuery,
        type: 'channel',
        key: process.env.YOUTUBE_API_KEY
      }
    });

    if (response.data.items?.[0]?.id?.channelId) {
      console.log('Found channel ID through search:', response.data.items[0].id.channelId);
      return response.data.items[0].id.channelId;
    }

    throw new Error('Could not find channel ID. Please check the URL format.');
  } catch (error) {
    console.error('Error extracting channel ID:', error);
    throw new Error('Failed to extract channel ID. Please check the URL format.');
  }
};

/**
 * Fetches channel information
 */
const fetchChannelInfo = async (channelId: string): Promise<ChannelData> => {
  console.log(`Fetching channel info for ID: ${channelId}`);

  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY is not defined in the environment variables');
  }
  
  const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'snippet,statistics',
      id: channelId,
      key: process.env.YOUTUBE_API_KEY
    }
  });

  if (!response.data.items?.[0]) {
    throw new Error('Channel not found');
  }

  const channelData = {
    id: channelId,
    name: response.data.items[0].snippet?.title || 'Unknown Channel'
  };
  
  console.log('Fetched channel data:', channelData);
  return channelData;
};

/**
 * Fetches recent videos from a channel
 */
const fetchRecentVideos = async (channelId: string, maxResults: number = 10): Promise<VideoData[]> => {
  console.log(`Fetching ${maxResults} recent videos for channel: ${channelId}`);
  
  // First get the uploads playlist ID
  youtubeApiRequestCount++;
  const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'contentDetails',
      id: channelId,
      key: process.env.YOUTUBE_API_KEY
    }
  });

  const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error('Could not find uploads playlist for channel');
  }

  // Get videos from the uploads playlist
  youtubeApiRequestCount++;
  const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: maxResults,
      key: process.env.YOUTUBE_API_KEY
    }
  });

  const videoIds = response.data.items?.map((item: any) => item.snippet?.resourceId?.videoId) || [];
  console.log('Found video IDs:', videoIds);
  
  // Fetch detailed video information
  youtubeApiRequestCount++;
  const videoDetails = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'snippet,statistics',
      id: videoIds.join(','),
      key: process.env.YOUTUBE_API_KEY
    }
  });

  const videos = videoDetails.data.items?.map((video: any) => ({
    id: video.id,
    title: video.snippet?.title || 'Unknown Title',
    channel_id: channelId,
    likes: parseInt(video.statistics?.likeCount || '0'),
    view_count: parseInt(video.statistics?.viewCount || '0'),
    comment_count: parseInt(video.statistics?.commentCount || '0'),
    timestamp: new Date(video.snippet?.publishedAt || '')
  })) || [];

  console.log('Fetched videos with details:', videos);
  return videos;
};

/**
 * Fetches all comments for a video, including replies
 */
const fetchVideoComments = async (videoId: string): Promise<CommentData[]> => {
  console.log(`Fetching comments for video: ${videoId}`);
  
  const comments: CommentData[] = [];
  let nextPageToken: string | undefined;

  try {
    do {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
        params: {
          part: 'snippet,replies',
          videoId: videoId,
          maxResults: 100,
          pageToken: nextPageToken,
          key: process.env.YOUTUBE_API_KEY
        }
      });

      for (const item of response.data.items || []) {
        const comment = item.snippet?.topLevelComment?.snippet;
        if (comment) {
          // Store main comment
          comments.push({
            id: item.id, // YouTube's comment ID
            videoId: videoId,
            userId: comment.authorChannelId?.value || '',
            text: comment.textDisplay || '',
            timestamp: new Date(comment.publishedAt || ''),
            likeCount: parseInt(comment.likeCount || '0'),
            authorName: comment.authorDisplayName || 'Unknown'
          });

          // Store replies if they exist
          if (item.replies?.comments) {
            for (const reply of item.replies.comments) {
              comments.push({
                id: reply.id, // YouTube's reply ID
                videoId: videoId,
                userId: reply.snippet?.authorChannelId?.value || '',
                text: reply.snippet?.textDisplay || '',
                timestamp: new Date(reply.snippet?.publishedAt || ''),
                likeCount: parseInt(reply.snippet?.likeCount || '0'),
                authorName: reply.snippet?.authorDisplayName || 'Unknown'
              });
            }
          }
        }
      }

      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    console.log(`Successfully fetched ${comments.length} comments for video ${videoId}`);
    return comments;
  } catch (error) {
    console.error(`Error fetching comments for video ${videoId}:`, error);
    throw new Error(`Failed to fetch comments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Main function to fetch and store all data for a channel
 */
export const fetchAndStoreChannelData = async (channelUrl: string): Promise<{
  channelData: ChannelData;
  videos: VideoData[];
  comments: CommentData[];
}> => {
  try {
    console.log('Starting data fetch process...');
    
    // Reset API request counter at the start of each fetch
    youtubeApiRequestCount = 0;
    
    // Extract channel ID
    const channelId = await extractChannelId(channelUrl);
    console.log('Extracted channel ID:', channelId);
    
    // Check if channel exists in database
    const { data: existingChannel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single();

    if (channelError && channelError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error checking channel in database:', channelError);
      throw new Error(`Failed to check channel in database: ${channelError.message}`);
    }

    if (existingChannel) {
      console.log('Channel found in database, fetching existing data...');
      
      // Fetch existing videos
      const { data: existingVideos, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', channelId)
        .order('timestamp', { ascending: false });

      if (videosError) {
        console.error('Error fetching videos from database:', videosError);
        throw new Error(`Failed to fetch videos from database: ${videosError.message}`);
      }

      // Fetch existing comments
      const { data: existingComments, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .in('video_id', existingVideos.map(v => v.id));

      if (commentsError) {
        console.error('Error fetching comments from database:', commentsError);
        throw new Error(`Failed to fetch comments from database: ${commentsError.message}`);
      }

      return {
        channelData: existingChannel,
        videos: existingVideos,
        comments: existingComments
      };
    }

    // If channel doesn't exist, fetch new data
    console.log('Channel not found in database, fetching new data...');
    
    const channelData = await fetchChannelInfo(channelId);
    console.log('Channel data:', channelData);
    
    // Store channel data
    console.log('Storing channel data...');
    const { data: channelResult, error: channelStoreError } = await supabase
      .from('channels')
      .upsert([channelData], { onConflict: 'id' })
      .select();

    if (channelStoreError) {
      console.error('Error storing channel data:', channelStoreError);
      throw new Error(`Failed to store channel data: ${channelStoreError.message}`);
    }
    console.log('Channel data stored successfully:', channelResult);

    // Fetch and store videos
    console.log('Fetching videos...');
    const videos = await fetchRecentVideos(channelId);
    console.log('Fetched videos:', videos);
    
    console.log('Storing video data...');
    for (const video of videos) {
      const { data: videoResult, error: videoError } = await supabase
        .from('videos')
        .upsert([{ 
          id: video.id,
          title: video.title,
          channel_id: video.channel_id,
          topic: 'Fifa',
          likes: video.likes,
          view_count: video.view_count,
          comment_count: video.comment_count,
          timestamp: video.timestamp
        }], { onConflict: 'id' })
        .select();

      if (videoError) {
        console.error('Error storing video data:', videoError);
        throw new Error(`Failed to store video data: ${videoError.message}`);
      }
      console.log('Video data stored successfully:', videoResult);

      // Fetch and store comments
      console.log(`Fetching comments for video: ${video.id}`);
      const comments = await fetchVideoComments(video.id);
      console.log(`Fetched ${comments.length} comments for video ${video.id}`);
      
      // Store users and comments
      for (const comment of comments) {
        try {
          // Store user
          const { data: userResult, error: userError } = await supabase
            .from('users')
            .upsert([{
              id: comment.userId,
              username: comment.authorName,
              channel_id: channelId
            }], { onConflict: 'id' })
            .select();

          if (userError) {
            console.error('Error storing user data:', userError);
            continue; // Skip this comment but continue with others
          }
          console.log('User data stored successfully:', userResult);

          // Store comment
          const { data: commentResult, error: commentError } = await supabase
            .from('comments')
            .upsert([{
              id: comment.id,
              video_id: video.id,
              user_id: comment.userId,
              text: comment.text,
              timestamp: comment.timestamp,
              like_count: comment.likeCount,
              author_name: comment.authorName
            }], { onConflict: 'id' })
            .select();

          if (commentError) {
            console.error('Error storing comment data:', commentError);
            continue; // Skip this comment but continue with others
          }
        } catch (error) {
          console.error('Error processing comment:', error);
          continue; // Skip this comment but continue with others
        }
      }
    }

    // Fetch all stored comments for return
    const { data: allComments, error: allCommentsError } = await supabase
      .from('comments')
      .select('*')
      .in('video_id', videos.map(v => v.id));

    if (allCommentsError) {
      console.error('Error fetching all comments:', allCommentsError);
      throw new Error(`Failed to fetch all comments: ${allCommentsError.message}`);
    }

    console.log('Data fetch and storage completed successfully!');
    console.log(`Total YouTube API requests made: ${youtubeApiRequestCount}`);

    return {
      channelData,
      videos,
      comments: allComments
    };
  } catch (error) {
    console.error('Error in fetchAndStoreChannelData:', error);
    throw error;
  }
}; 