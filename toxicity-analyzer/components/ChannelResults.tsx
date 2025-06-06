import { useState, useEffect } from 'react';
import ToxicityChart from './ToxicityChart';
import UserAnalysis from './UserAnalysis';
import VideoInsights from './VideoInsights';

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

interface ToxicityData {
  timestamp: string;
  toxicity_score: number;
  video_title?: string;
  video_id?: string;
}

interface UserData {
  most_active: any[];
  most_toxic: any[];
  most_liked: any[];
  total_users: number;
  min_comments_threshold: number;
}

interface ChannelResultsProps {
  channelId: string;
  channelData: ChannelData;
  videos: VideoData[];
  toxicityData: ToxicityData[];
  userData?: UserData | null;
  isUserDataLoading?: boolean;
  selectedVideoId?: string | null;
  onVideoSelect?: (videoId: string) => void;
}

export default function ChannelResults({ 
  channelId, 
  channelData, 
  videos, 
  toxicityData,
  userData,
  isUserDataLoading = false,
  selectedVideoId,
  onVideoSelect 
}: ChannelResultsProps) {
  const [showVideoInsights, setShowVideoInsights] = useState(false);

  // Show insights when a video is selected
  useEffect(() => {
    if (selectedVideoId) {
      setShowVideoInsights(true);
    }
  }, [selectedVideoId]);

  const handleVideoClick = (videoId: string) => {
    if (onVideoSelect) {
      onVideoSelect(videoId);
    }
  };

  const handleCloseInsights = () => {
    setShowVideoInsights(false);
    if (onVideoSelect) {
      onVideoSelect('');
    }
  };

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
    <>
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
            onVideoSelect={handleVideoClick}
            selectedVideoId={selectedVideoId}
          />
        </div>

        {/* User Analysis - show loading state while data loads */}
        {userData ? (
          <UserAnalysis channelId={channelId} userData={userData} />
        ) : isUserDataLoading ? (
          <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">User Analysis</h2>
              <div className="ml-auto flex items-center gap-2 text-amber-400">
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin"></div>
                <span className="text-sm">Loading user data...</span>
              </div>
            </div>
            <div className="animate-pulse space-y-6">
              <div className="h-16 bg-gray-700/20 rounded-lg border border-gray-600/30"></div>
              <div className="h-12 bg-gray-700/20 rounded-lg border border-gray-600/30"></div>
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-gray-700/20 rounded-lg flex-1 border border-gray-600/30"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-gray-700/20 rounded-xl border border-gray-600/30"></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white">User Analysis</h2>
            </div>
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">User Analysis Unavailable</p>
              <p className="text-gray-500 text-sm">Unable to load user data for this channel</p>
            </div>
          </div>
        )}

        {/* Top Videos */}
        <div className="bg-gradient-to-br from-[#232336] to-[#1a1b2e] rounded-2xl shadow-xl border border-[#35374a]/50 p-6 md:p-8 hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">Most Toxic Videos</h2>
            <p className="text-sm text-gray-400 ml-auto">Click any video for detailed insights</p>
          </div>
          
          <div className="space-y-4">
            {videos.slice(0, 5).map((video, index) => {
              const toxicityColors = getToxicityColor(video.average_toxicity);
              const isSelected = video.id === selectedVideoId;
              return (
                <div
                  key={video.id}
                  onClick={() => handleVideoClick(video.id)}
                  className={`group relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 ${
                    isSelected 
                      ? 'border-amber-400/50 bg-gradient-to-r from-amber-500/10 to-amber-600/10' 
                      : 'border-[#35374a]/50 bg-gradient-to-r from-[#181a2a] to-[#1f2132] hover:from-[#232336] hover:to-[#252741]'
                  }`}
                >
                  <div className="flex items-center gap-6 p-6">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0 relative">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                        isSelected 
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-400/50' 
                          : 'bg-gradient-to-br from-gray-600 to-gray-700 border-gray-500/50'
                      }`}>
                        <span className="text-2xl font-bold text-white">#{index + 1}</span>
                      </div>
                      <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${toxicityColors.dot} flex items-center justify-center`}>
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    </div>

                    {/* Video Info */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className={`text-lg md:text-xl font-semibold leading-tight line-clamp-2 transition-colors ${
                          isSelected ? 'text-amber-200' : 'text-white group-hover:text-blue-300'
                        }`} title={video.title}>
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
                        <div className="flex items-center gap-2 text-xs">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                          </svg>
                          <span>Click for insights</span>
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

      {/* Video Insights Modal */}
      {showVideoInsights && selectedVideoId && (
        <VideoInsights
          videoId={selectedVideoId}
          channelAverageToxicity={channelData.average_toxicity}
          onClose={handleCloseInsights}
        />
      )}
    </>
  );
} 