import { useState, useEffect } from 'react';

interface VideoData {
  id: string;
  title: string;
  view_count: number;
  comment_count: number;
  upload_date: string | null;
  duration: string;
}

interface CommentData {
  id: string;
  text: string;
  author_name: string;
  like_count: number;
  toxicity_score: number;
  timestamp: string;
}

interface UserStats {
  author_name: string;
  comment_count: number;
  total_likes?: number;
  average_toxicity?: number;
}

interface VideoInsightsData {
  video: VideoData;
  stats: {
    total_comments: number;
    average_toxicity: number;
    max_toxicity: number;
    min_toxicity: number;
    high_toxicity_count: number;
    medium_toxicity_count: number;
    low_toxicity_count: number;
  };
  most_toxic_comments: CommentData[];
  most_liked_comments: CommentData[];
  user_stats: {
    total_unique_users: number;
    most_active_user: UserStats | null;
    most_toxic_user: UserStats | null;
  };
}

interface VideoInsightsProps {
  videoId: string;
  channelAverageToxicity: number;
  onClose: () => void;
}

export default function VideoInsights({ videoId, channelAverageToxicity, onClose }: VideoInsightsProps) {
  const [data, setData] = useState<VideoInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideoInsights = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/video/${videoId}/insights`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch video insights');
        }

        setData(result.data);
      } catch (err) {
        console.error('Error fetching video insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load video insights');
      } finally {
        setLoading(false);
      }
    };

    fetchVideoInsights();
  }, [videoId]);

  const getToxicityColor = (score: number) => {
    if (score < 0.3) return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-200',
      border: 'border-emerald-400/50',
      dot: 'bg-emerald-400'
    };
    if (score < 0.6) return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-200',
      border: 'border-amber-400/50',
      dot: 'bg-amber-400'
    };
    return {
      bg: 'bg-red-500/20',
      text: 'text-red-200',
      border: 'border-red-400/50',
      dot: 'bg-red-400'
    };
  };

  const getToxicityLabel = (score: number) => {
    if (score < 0.3) return 'Low';
    if (score < 0.6) return 'Medium';
    return 'High';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') {
      return 'Date unavailable';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date unavailable';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Date unavailable';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
          <p className="text-white text-center mt-4">Loading video insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 p-8 max-w-2xl w-full">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
            <p className="text-red-300 text-lg mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const toxicityColors = getToxicityColor(data.stats.average_toxicity);
  const comparisonToChannel = data.stats.average_toxicity - channelAverageToxicity;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#181a2a] border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 line-clamp-2">
              {data.video.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <span>{data.video.view_count.toLocaleString()} views</span>
              <span>•</span>
              <span>{formatDate(data.video.upload_date)}</span>
              {data.video.duration && (
                <>
                  <span>•</span>
                  <span>{data.video.duration}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Toxicity Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${toxicityColors.bg} ${toxicityColors.border}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${toxicityColors.dot}`}></div>
                <div>
                  <p className="text-sm text-gray-400">Average Toxicity</p>
                  <p className={`text-2xl font-bold ${toxicityColors.text}`}>
                    {(data.stats.average_toxicity * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">{getToxicityLabel(data.stats.average_toxicity)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-purple-500/10 border-purple-400/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                <div>
                  <p className="text-sm text-gray-400">Comments Analyzed</p>
                  <p className="text-2xl font-bold text-purple-200">{data.stats.total_comments.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total processed</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-400/30">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <div>
                  <p className="text-sm text-gray-400">Unique Users</p>
                  <p className="text-2xl font-bold text-blue-200">{data.user_stats.total_unique_users}</p>
                  <p className="text-xs text-gray-500">Commenters</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border bg-gray-500/10 border-gray-400/30">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${comparisonToChannel > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}></div>
                <div>
                  <p className="text-sm text-gray-400">vs Channel Avg</p>
                  <p className={`text-2xl font-bold ${comparisonToChannel > 0 ? 'text-red-200' : 'text-emerald-200'}`}>
                    {comparisonToChannel > 0 ? '+' : ''}{(comparisonToChannel * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {comparisonToChannel > 0 ? 'More toxic' : 'Less toxic'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Toxicity Distribution */}
          <div className="bg-[#232336] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Toxicity Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-emerald-500/10 rounded-lg border border-emerald-400/30">
                <p className="text-3xl font-bold text-emerald-200">{data.stats.low_toxicity_count}</p>
                <p className="text-sm text-emerald-300">Low Toxicity</p>
                <p className="text-xs text-gray-400">(&lt; 30%)</p>
              </div>
              <div className="text-center p-4 bg-amber-500/10 rounded-lg border border-amber-400/30">
                <p className="text-3xl font-bold text-amber-200">{data.stats.medium_toxicity_count}</p>
                <p className="text-sm text-amber-300">Medium Toxicity</p>
                <p className="text-xs text-gray-400">(30% - 60%)</p>
              </div>
              <div className="text-center p-4 bg-red-500/10 rounded-lg border border-red-400/30">
                <p className="text-3xl font-bold text-red-200">{data.stats.high_toxicity_count}</p>
                <p className="text-sm text-red-300">High Toxicity</p>
                <p className="text-xs text-gray-400">(&gt; 60%)</p>
              </div>
            </div>
          </div>

          {/* User Statistics */}
          {(data.user_stats.most_active_user || data.user_stats.most_toxic_user) && (
            <div className="bg-[#232336] rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Top Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.user_stats.most_active_user && (
                  <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-400/30">
                    <h4 className="font-semibold text-blue-200 mb-2">Most Active</h4>
                    <p className="text-white font-medium">{data.user_stats.most_active_user.author_name}</p>
                    <p className="text-sm text-gray-400">
                      {data.user_stats.most_active_user.comment_count} comments
                      {data.user_stats.most_active_user.total_likes && (
                        <span> • {data.user_stats.most_active_user.total_likes} likes</span>
                      )}
                    </p>
                  </div>
                )}
                {data.user_stats.most_toxic_user && (
                  <div className="p-4 bg-red-500/10 rounded-lg border border-red-400/30">
                    <h4 className="font-semibold text-red-200 mb-2">Most Toxic</h4>
                    <p className="text-white font-medium">{data.user_stats.most_toxic_user.author_name}</p>
                    <p className="text-sm text-gray-400">
                      {data.user_stats.most_toxic_user.comment_count} comments
                      {data.user_stats.most_toxic_user.average_toxicity && (
                        <span> • {(data.user_stats.most_toxic_user.average_toxicity * 100).toFixed(1)}% avg toxicity</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comments Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Toxic Comments */}
            {data.most_toxic_comments.length > 0 && (
              <div className="bg-[#232336] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  Most Toxic Comments
                </h3>
                <div className="space-y-3">
                  {data.most_toxic_comments.map((comment, index) => (
                    <div key={comment.id} className="p-3 bg-red-500/10 rounded-lg border border-red-400/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-red-200">#{index + 1}</p>
                        <span className="text-xs px-2 py-1 bg-red-400/20 text-red-300 rounded">
                          {(comment.toxicity_score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{truncateText(comment.text)}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{comment.author_name}</span>
                        <span>{comment.like_count} likes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Liked Comments */}
            {data.most_liked_comments.length > 0 && (
              <div className="bg-[#232336] rounded-xl p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                  Most Liked Comments
                </h3>
                <div className="space-y-3">
                  {data.most_liked_comments.map((comment, index) => (
                    <div key={comment.id} className="p-3 bg-pink-500/10 rounded-lg border border-pink-400/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-pink-200">#{index + 1}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-pink-400/20 text-pink-300 rounded">
                            {comment.like_count} likes
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getToxicityColor(comment.toxicity_score).bg} ${getToxicityColor(comment.toxicity_score).text}`}>
                            {(comment.toxicity_score * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{truncateText(comment.text)}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{comment.author_name}</span>
                        <span>{formatDate(comment.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 