import { useState, useEffect } from 'react';

interface UserStats {
  user_id: string | null;
  author_name: string;
  comment_count: number;
  average_toxicity: number;
  max_toxicity: number;
  most_toxic_comment: string;
  total_likes: number;
}

interface UserAnalysisData {
  most_active: UserStats[];
  most_toxic: UserStats[];
  most_liked: UserStats[];
  total_users: number;
}

interface UserAnalysisProps {
  channelId: string;
}

export default function UserAnalysis({ channelId }: UserAnalysisProps) {
  const [userData, setUserData] = useState<UserAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'toxic' | 'liked'>('active');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(`🔍 Fetching user data for channel: ${channelId}`);
        const response = await fetch(`/api/channel/${channelId}/users`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to fetch user data');
        }

        console.log('👥 User data:', result);
        setUserData(result.data);
      } catch (err) {
        console.error('❌ Error fetching user data:', err);
        setError('Failed to load user data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (channelId) {
      fetchUserData();
    }
  }, [channelId]);

  const getToxicityColor = (score: number) => {
    if (score < 0.3) return {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-200',
      border: 'border-emerald-400/50',
    };
    if (score < 0.6) return {
      bg: 'bg-amber-500/20',
      text: 'text-amber-200',
      border: 'border-amber-400/50',
    };
    return {
      bg: 'bg-red-500/20',
      text: 'text-red-200',
      border: 'border-red-400/50',
    };
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderUserCard = (user: UserStats, index: number, showToxicComment: boolean = false) => {
    const toxicityColors = getToxicityColor(user.average_toxicity);
    
    return (
      <div
        key={`${user.user_id || user.author_name}-${index}`}
        className="bg-gradient-to-r from-[#181a2a] to-[#1f2132] rounded-xl border border-[#35374a]/50 p-6 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">#{index + 1}</span>
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{user.author_name}</h3>
              <p className="text-gray-400 text-sm">{user.comment_count} comments</p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full border ${toxicityColors.bg} ${toxicityColors.text} ${toxicityColors.border}`}>
            <span className="text-sm font-medium">
              {(user.average_toxicity * 100).toFixed(1)}% avg
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{user.comment_count}</p>
            <p className="text-xs text-gray-400">Comments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-pink-400">{user.total_likes}</p>
            <p className="text-xs text-gray-400">Total Likes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{(user.max_toxicity * 100).toFixed(1)}%</p>
            <p className="text-xs text-gray-400">Max Toxic</p>
          </div>
        </div>

        {showToxicComment && user.most_toxic_comment && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-400/30 rounded-lg">
            <p className="text-red-200 text-sm mb-2">
              <strong>Most Toxic Comment:</strong>
            </p>
            <p className="text-gray-300 text-sm italic leading-relaxed">
              "{truncateText(user.most_toxic_comment, 150)}"
            </p>
            <p className="text-red-300 text-xs mt-2">
              Toxicity: {(user.max_toxicity * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-700/50 rounded w-1/3"></div>
          <div className="flex gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-700/30 rounded flex-1"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-700/30 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-lg text-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const getCurrentData = () => {
    switch (activeTab) {
      case 'active': return userData.most_active;
      case 'toxic': return userData.most_toxic;
      case 'liked': return userData.most_liked;
      default: return userData.most_active;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'active': return 'Most Active Users';
      case 'toxic': return 'Most Toxic Users';
      case 'liked': return 'Most Liked Users';
      default: return 'Most Active Users';
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-white">User Analysis</h2>
      </div>

      {/* Stats Overview */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
        <p className="text-blue-200 text-sm">
          <strong>Total Users Analyzed:</strong> {userData.total_users} users with 2+ comments
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'active', label: 'Most Active', icon: '🔥' },
          { key: 'toxic', label: 'Most Toxic', icon: '⚠️' },
          { key: 'liked', label: 'Most Liked', icon: '❤️' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg border transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                : 'bg-gray-700/20 border-gray-600/50 text-gray-300 hover:bg-gray-600/20'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* User Cards */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">{getTabTitle()}</h3>
        
        {getCurrentData().length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No user data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCurrentData().slice(0, 8).map((user, index) => 
              renderUserCard(user, index, activeTab === 'toxic')
            )}
          </div>
        )}
      </div>
    </div>
  );
} 