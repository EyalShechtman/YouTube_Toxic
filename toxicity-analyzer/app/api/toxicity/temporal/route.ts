import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface CommentData {
  toxicity_score: number;
}

interface Video {
  id: string;
  timestamp: string;
  channel_id: string;
}

interface Comment {
  id: string;
  comments_data: CommentData[];
  videos: Video[];
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase URL and service role key must be defined in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get('channelId');
  const timeRange = searchParams.get('timeRange') || 'month';

  if (!channelId) {
    return NextResponse.json({ error: 'Channel ID is required' }, { status: 400 });
  }

  try {
    // Calculate the start date based on the time range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Fetch comments with toxicity scores for the specified time range
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(`
        id,
        comments_data!inner (
          toxicity_score
        ),
        videos!inner (
          id,
          timestamp,
          channel_id
        )
      `)
      .eq('videos.channel_id', channelId)
      .gte('videos.timestamp', startDate.toISOString())
      .order('videos.timestamp', { ascending: true });

    if (commentsError) {
      console.error('Supabase query error:', commentsError);
      throw commentsError;
    }

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        labels: [],
        datasets: [{
          label: 'Average Toxicity',
          data: [],
          borderColor: 'rgb(147, 51, 234)',
          backgroundColor: 'rgba(147, 51, 234, 0.5)',
          tension: 0.4,
        }]
      });
    }

    // Group comments by date and calculate average toxicity
    const groupedData = comments.reduce((acc: Record<string, { toxicity: number; count: number }>, comment: Comment) => {
      const date = new Date(comment.videos[0].timestamp).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { toxicity: 0, count: 0 };
      }
      acc[date].toxicity += comment.comments_data[0]?.toxicity_score || 0;
      acc[date].count += 1;
      return acc;
    }, {});

    // Calculate daily averages and prepare chart data
    const labels = Object.keys(groupedData).sort();
    const toxicityData = labels.map(date => ({
      x: date,
      y: groupedData[date].toxicity / groupedData[date].count
    }));

    // Prepare the chart data
    const chartData = {
      labels,
      datasets: [
        {
          label: 'Average Toxicity',
          data: toxicityData,
          borderColor: 'rgb(147, 51, 234)', // purple-600
          backgroundColor: 'rgba(147, 51, 234, 0.5)',
          tension: 0.4,
        },
      ],
    };

    return NextResponse.json(chartData);
  } catch (error) {
    console.error('Error in temporal route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch temporal data' },
      { status: 500 }
    );
  }
} 