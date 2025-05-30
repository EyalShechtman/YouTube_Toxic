import { useState, useEffect } from 'react';
import ToxicityChart from './ToxicityChart';
import UserAnalysis from './UserAnalysis';

interface ChannelData {
  id: string;
  name: string;
  video_count: number;
  comment_count: number;
  average_toxicity: number;
}

interface VideoData {
  id: string;
  title: string;
  view_count: number;
  comment_count: number;
  average_toxicity: number;
}

interface ChannelResultsProps {
  channelId: string;
}

export default function ChannelResults({ channelId }: ChannelResultsProps) {
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [toxicityData, setToxicityData] = useState<Array<{ timestamp: string; toxicity_score: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch channel data
        const channelResponse = await fetch(`/api/channel/${channelId}`);
        const channelResult = await channelResponse.json();
        setChannelData(channelResult.data);

        // Fetch toxicity data
        const toxicityResponse = await fetch(`/api/channel/${channelId}/toxicity`);
        const toxicityResult = await toxicityResponse.json();
        setToxicityData(toxicityResult.data);

        // Fetch video data
        const videosResponse = await fetch(`/api/channel/${channelId}/videos`);
        const videosResult = await videosResponse.json();
        setVideos(videosResult.data);

      } catch (err) {
        setError('Failed to load channel data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (channelId) {
      fetchData();
    }
  }, [channelId]);

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 mt-12">
        <div className="animate-pulse space-y-8">
          {/* Header skeleton */}
          <div className="text-center space-y-4">
            <div className="bg-gray-700/50 h-10 rounded-lg w-1/3 mx-auto"></div>
            <div className="bg-gray-700/30 h-6 rounded w-1/4 mx-auto"></div>
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-700/30 h-24 rounded-xl"></div>
            ))}
          </div>
          
          {/* Chart skeleton */}
          <div className="bg-gray-700/30 h-80 rounded-xl"></div>
          
          {/* Videos skeleton */}
          <div className="space-y-4">
            <div className="bg-gray-700/50 h-8 rounded w-1/4"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-gray-700/30 h-20 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 mt-12">
        <div className="bg-red-500/20 border border-red-400/50 rounded-2xl p-8 text-center backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
            <p className="text-red-200 font-medium text-lg">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded-lg text-red-200 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!channelData) {
    return null;
  }

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

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-8 mt-12 space-y-12 animate-in slide-in-from-bottom-8 duration-700">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white">{channelData.name}</h1>
        </div>
        <p className="text-gray-300 text-lg">Comprehensive Toxicity Analysis</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span>Analysis completed</span>
          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="group bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Videos Analyzed</p>
              <p className="text-3xl font-bold text-white leading-tight">{channelData.video_count}</p>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Comments Analyzed</p>
              <p className="text-3xl font-bold text-white leading-tight">{channelData.comment_count.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="group bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 hover:shadow-2xl hover:shadow-pink-500/10 transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center gap-4">
            <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 ${getToxicityColor(channelData.average_toxicity).bg} border ${getToxicityColor(channelData.average_toxicity).border}`}>
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium mb-1">Average Toxicity</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-white leading-tight">{(channelData.average_toxicity * 100).toFixed(1)}%</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getToxicityColor(channelData.average_toxicity).bg} ${getToxicityColor(channelData.average_toxicity).text}`}>
                  {getToxicityLabel(channelData.average_toxicity)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
        <ToxicityChart
          data={toxicityData}
          title={`Toxicity Trends - ${channelData.name}`}
        />
      </div>

      {/* User Analysis */}
      <UserAnalysis channelId={channelId} />

      {/* Top Videos */}
      <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Most Toxic Videos</h2>
        </div>
        
        <div className="space-y-4">
          {videos.slice(0, 5).map((video, index) => {
            const toxicityColors = getToxicityColor(video.average_toxicity);
            return (
              <div
                key={video.id}
                className="group relative overflow-hidden rounded-xl border border-[#35374a]/50 bg-gradient-to-r from-[#181a2a] to-[#1f2132] hover:from-[#232336] hover:to-[#252741] transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1"
              >
                <div className="flex items-center gap-6 p-6">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center border-2 border-gray-500/50">
                      <span className="text-2xl font-bold text-white">#{index + 1}</span>
                    </div>
                    <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${toxicityColors.dot} flex items-center justify-center`}>
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg md:text-xl font-semibold text-white leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors cursor-pointer" title={video.title}>
                        {video.title}
                      </h3>
                      <div className={`flex-shrink-0 px-4 py-2 rounded-full border ${toxicityColors.bg} ${toxicityColors.text} ${toxicityColors.border}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{(video.average_toxicity * 100).toFixed(1)}%</span>
                          <span className="text-sm opacity-80">{getToxicityLabel(video.average_toxicity)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span className="font-medium">{video.view_count.toLocaleString()} views</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="font-medium">{video.comment_count.toLocaleString()} comments</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Hover Effect Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            );
          })}
        </div>
        
        {videos.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-400 text-lg">No videos found for this channel</p>
          </div>
        )}
      </div>
    </div>
  );
} 