import { useState, useEffect } from 'react';

interface CommentData {
  id: string;
  text: string;
  like_count: number;
  toxicity_score: number;
  timestamp: string;
  video_title: string;
  video_id: string;
}

interface UserInsightsData {
  user: {
    user_id: string | null;
    author_name: string;
    total_comments: number;
    total_likes: number;
    average_toxicity: number;
    max_toxicity: number;
    min_toxicity: number;
  };
  comments: CommentData[];
  stats: {
    high_toxicity_count: number;
    medium_toxicity_count: number;
    low_toxicity_count: number;
  };
}

interface UserInsightsProps {
  channelId: string;
  userId: string;
  authorName: string;
  onClose: () => void;
}

export default function UserInsights({ channelId, userId, authorName, onClose }: UserInsightsProps) {
  const [data, setData] = useState<UserInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'toxicity' | 'likes' | 'recent'>('toxicity');

  useEffect(() => {
    const fetchUserInsights = async () => {
      try {
        setLoading(true);
        setError(null);

        const userParam = userId || encodeURIComponent(authorName);
        const response = await fetch(`/api/channel/${channelId}/user/${userParam}/insights`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch user insights');
        }

        setData(result.data);
      } catch (err) {
        console.error('Error fetching user insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user insights');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInsights();
  }, [channelId, userId, authorName]);

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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getSortedComments = () => {
    if (!data) return [];
    
    const comments = [...data.comments];
    switch (sortBy) {
      case 'toxicity':
        return comments.sort((a, b) => b.toxicity_score - a.toxicity_score);
      case 'likes':
        return comments.sort((a, b) => b.like_count - a.like_count);
      case 'recent':
        return comments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      default:
        return comments;
    }
  };

  const truncateText = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 p-8 max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700/50 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-700/30 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-700/30 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 p-8 max-w-md w-full">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={onClose}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-lg text-red-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{data.user.author_name}</h2>
                <p className="text-gray-400">User Comment Analysis</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-[#23243a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{data.user.total_comments}</p>
              <p className="text-xs text-gray-400">Total Comments</p>
            </div>
            <div className="bg-[#23243a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-pink-400">{data.user.total_likes}</p>
              <p className="text-xs text-gray-400">Total Likes</p>
            </div>
            <div className="bg-[#23243a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{(data.user.average_toxicity * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400">Avg Toxicity</p>
            </div>
            <div className="bg-[#23243a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{(data.user.max_toxicity * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400">Max Toxicity</p>
            </div>
            <div className="bg-[#23243a] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{(data.user.min_toxicity * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-400">Min Toxicity</p>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Comments ({data.comments.length})</h3>
            <div className="flex gap-2">
              {[
                { key: 'toxicity', label: 'Most Toxic', icon: '⚠️' },
                { key: 'likes', label: 'Most Liked', icon: '❤️' },
                { key: 'recent', label: 'Most Recent', icon: '🕐' }
              ].map((sort) => (
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key as any)}
                  className={`px-3 py-2 rounded-lg border text-sm transition-all duration-200 ${
                    sortBy === sort.key
                      ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                      : 'bg-gray-700/20 border-gray-600/50 text-gray-300 hover:bg-gray-600/20'
                  }`}
                >
                  <span className="mr-1">{sort.icon}</span>
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {getSortedComments().map((comment, index) => {
              const toxicityColors = getToxicityColor(comment.toxicity_score);
              return (
                <div
                  key={comment.id}
                  className="bg-[#23243a] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-400">#{index + 1}</span>
                      <div className={`px-2 py-1 rounded-full border text-xs ${toxicityColors.bg} ${toxicityColors.text} ${toxicityColors.border}`}>
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${toxicityColors.dot}`}></div>
                          {getToxicityLabel(comment.toxicity_score)} ({(comment.toxicity_score * 100).toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {comment.like_count}
                      </div>
                      <span>{formatDate(comment.timestamp)}</span>
                    </div>
                  </div>
                  
                  <p className="text-white leading-relaxed mb-3">
                    {truncateText(comment.text)}
                  </p>
                  
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Video:</span> {truncateText(comment.video_title, 60)}
                  </div>
                </div>
              );
            })}
          </div>
          
          {data.comments.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No comments found for this user</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 