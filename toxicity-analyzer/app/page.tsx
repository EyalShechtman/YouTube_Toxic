'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChannelInput from '../components/ChannelInput';
import AnalysisProgress from '../components/AnalysisProgress';
import ChannelResults from '../components/ChannelResults';

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysisStart = async (channelUrl: string) => {
    try {
      setIsAnalyzing(true);
      setAnalysisId(null);
      setChannelId(null);
      setError(null);

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
    setIsAnalyzing(false);
  };

  const handleStartNew = () => {
    setIsAnalyzing(false);
    setAnalysisId(null);
    setChannelId(null);
    setError(null);
  };

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
          {channelId && !isAnalyzing && (
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
        {!isAnalyzing && !channelId && (
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

        {/* Show progress when analyzing */}
        {isAnalyzing && analysisId && (
          <div className="flex flex-col items-center justify-center min-h-screen pt-32 pb-16 px-4">
            <AnalysisProgress
              analysisId={analysisId}
              onComplete={handleAnalysisComplete}
            />
          </div>
        )}

        {/* Show results when analysis is complete */}
        {channelId && !isAnalyzing && (
          <div className="pt-24 pb-16">
            <ChannelResults channelId={channelId} />
          </div>
        )}
      </div>
    </div>
  );
}
