'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChannelInput from '../components/ChannelInput';
import AnalysisProgress from '../components/AnalysisProgress';
import ChannelResults from '../components/ChannelResults';

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

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  
  // Data states
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [toxicityData, setToxicityData] = useState<ToxicityData[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  // Selected video state for detailed insights
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const handleAnalysisStart = async (channelUrl: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisId(null);
      setChannelId(null);
      setError(null);
      setIsTransitioning(false);
      setIsDataLoading(false);
      setChannelData(null);
      setVideos([]);
      setToxicityData([]);
      setUserData(null);
      setSelectedVideoId(null);

      const response = await fetch('/api/analyze-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel_url: channelUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysisId(data.analysis_id);
        setChannelId(data.channel_id);
      } else {
        throw new Error(data.message || 'Failed to start analysis');
      }
    } catch (error) {
      console.error('Error starting analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to start analysis');
      setIsAnalyzing(false);
    }
  };

  const handleAnalysisComplete = () => {
    // Start transition state and begin data loading
    setIsTransitioning(true);
    setIsAnalyzing(false);
    setIsDataLoading(true);
  };

  // Fetch data when transitioning and we have a channelId
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!channelId || !isTransitioning) return;

      try {
        console.log(`🔄 Starting initial data fetch for channel: ${channelId}`);
        console.log(`📡 Making 3 parallel API calls for fast loading...`);
        
        // Fetch core data first (channel, toxicity, videos) - these are faster
        const startTime = Date.now();
        const [channelResult, toxicityResult, videosResult] = await Promise.allSettled([
          fetch(`/api/channel/${channelId}`).then(res => res.json()),
          fetch(`/api/channel/${channelId}/toxicity`).then(res => res.json()),
          fetch(`/api/channel/${channelId}/videos`).then(res => res.json())
        ]);
        
        console.log(`📊 Core API calls completed in ${Date.now() - startTime}ms`);

        // Process core results
        if (channelResult.status === 'fulfilled' && channelResult.value.success) {
          setChannelData(channelResult.value.data);
          console.log(`✅ Channel data loaded: ${channelResult.value.data.name}`);
        } else {
          console.error('❌ Channel API failed:', channelResult);
        }

        if (toxicityResult.status === 'fulfilled' && toxicityResult.value.success) {
          setToxicityData(toxicityResult.value.data || []);
          console.log(`✅ Toxicity data loaded: ${toxicityResult.value.data?.length || 0} data points`);
        } else {
          console.error('❌ Toxicity API failed:', toxicityResult);
        }

        if (videosResult.status === 'fulfilled' && videosResult.value.success) {
          setVideos(videosResult.value.data || []);
          console.log(`✅ Videos data loaded: ${videosResult.value.data?.length || 0} videos`);
        } else {
          console.error('❌ Videos API failed:', videosResult);
        }

        // Show results immediately with core data
        setTimeout(() => {
          setIsTransitioning(false);
          setIsDataLoading(false);
        }, 500);

        // Fetch user data separately (slower, can show loading state)
        console.log(`🔄 Starting user data fetch...`);
        const userStartTime = Date.now();
        try {
          const userResponse = await fetch(`/api/channel/${channelId}/users?min_comments=1&get_all=true`);
          const userResult = await userResponse.json();
          
          console.log(`📊 User API call completed in ${Date.now() - userStartTime}ms`);

          if (userResponse.ok && userResult.success) {
            setUserData(userResult.data);
            console.log(`✅ User data loaded: ${userResult.data?.most_active?.length || 0} total users`);
          } else {
            console.error('❌ User API failed:', userResult);
            setUserData(null);
          }
        } catch (userErr) {
          console.error('❌ Error fetching user data:', userErr);
          setUserData(null);
        }

        console.log(`✅ All data fetch completed for channel: ${channelId}`);

      } catch (err) {
        console.error('❌ Error fetching initial data:', err);
        setError('Failed to load channel data. Please try again.');
        setIsTransitioning(false);
        setIsDataLoading(false);
      }
    };

    fetchInitialData();
  }, [channelId, isTransitioning]);

  const handleStartNew = () => {
    setIsAnalyzing(false);
    setAnalysisId(null);
    setChannelId(null);
    setError(null);
    setIsTransitioning(false);
    setIsDataLoading(false);
    setChannelData(null);
    setVideos([]);
    setToxicityData([]);
    setUserData(null);
    setSelectedVideoId(null);
  };

  const handleVideoSelect = (videoId: string) => {
    setSelectedVideoId(videoId);
  };

  // Determine what to show based on current state
  const shouldShowInput = !isAnalyzing && !channelId && !isTransitioning && !channelData;
  const shouldShowProgress = (isAnalyzing || isTransitioning) && analysisId;
  const shouldShowResults = channelData && !isAnalyzing && !isTransitioning && !isDataLoading;

  return (
    <div className="min-h-screen w-full bg-[#101223] text-white transition-colors duration-300">
      {/* Navigation - matching About page exactly */}
      <nav className="w-full flex justify-between items-center px-8 py-4 absolute top-0 left-0 z-10">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">
            Toxicity Analyzer
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {shouldShowResults && (
            <button
              onClick={handleStartNew}
              className="px-5 py-2 rounded-full font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md transition"
            >
              New Analysis
            </button>
          )}
          <Link
            href="/about"
            className="px-5 py-2 rounded-full font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md transition"
          >
            About
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative min-h-screen">
        {/* Show input form when no analysis is running and no results */}
        {shouldShowInput && (
          <div className="flex flex-col items-center justify-center min-h-screen pt-32 pb-16 px-4">
            <ChannelInput
              onAnalysisStart={handleAnalysisStart}
              isAnalyzing={isAnalyzing}
            />

            {error && (
              <div className="mt-8 max-w-2xl w-full animate-in slide-in-from-top-4 duration-300">
                <div className="bg-red-500/20 border border-red-400/50 text-red-300 px-6 py-4 rounded-xl shadow-lg">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                    </svg>
                    <span className="font-medium">{error}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show progress when analyzing or transitioning */}
        {shouldShowProgress && (
          <div className="flex flex-col items-center justify-center min-h-screen pt-32 pb-16 px-4">
            <AnalysisProgress
              analysisId={analysisId!}
              onComplete={handleAnalysisComplete}
              isTransitioning={isTransitioning}
              isDataLoading={isDataLoading}
            />
          </div>
        )}

        {/* Show results when analysis is complete AND data has loaded */}
        {shouldShowResults && (
          <div className="pt-24 pb-16">
            <ChannelResults 
              channelId={channelId!}
              channelData={channelData}
              videos={videos}
              toxicityData={toxicityData}
              userData={userData}
              selectedVideoId={selectedVideoId}
              onVideoSelect={handleVideoSelect}
            />
          </div>
        )}
      </div>
    </div>
  );
}
