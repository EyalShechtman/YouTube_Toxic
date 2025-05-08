'use client';

import { useState } from 'react';
import Link from 'next/link';
import InputForm from '@/components/InputForm';
import ToxicityDashboard from '@/components/ToxicityDashboard';
import TestYouTubeFetcher from '@/components/TestYouTubeFetcher';

interface VideoResult {
  videoId: string;
  title: string;
  toxicity_avg: number;
  toxic_comment_pct: number;
  comments_analyzed: number;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<VideoResult[] | null>(null);

  const handleAnalyze = async (channelUrl: string) => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze channel');
      }

      const data = await response.json();
      setResults(data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#101223] text-white transition-colors duration-300">
      {/* Minimal Navigation */}
      <nav className="w-full flex justify-between items-center px-8 py-4 absolute top-0 left-0 z-10">
        <div className="flex items-center space-x-2">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent tracking-tight">Toxicity Analyzer</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/about"
            className="px-5 py-2 rounded-full font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-md transition"
          >
            About
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen pt-32 pb-16 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" className="opacity-10" style={{position:'absolute',top:0,left:0}}>
            <circle cx="50%" cy="40%" r="400" fill="none" stroke="url(#grad1)" strokeWidth="2" />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-center mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
          Analyze YouTube Toxicity
        </h1>
        <p className="text-lg sm:text-xl text-center max-w-xl mx-auto mb-10 text-white/80">
          Instantly measure and visualize comment toxicity trends for any YouTube channel. Just paste a channel URL to get started.
        </p>
        <div className="w-full max-w-xl mx-auto flex flex-col items-center">
          <div className="w-full bg-[#181a2a] rounded-full shadow-lg flex items-center px-4 py-2 border border-white/10">
            <div className="flex-1">
              <InputForm onSubmit={handleAnalyze} isLoading={isLoading} />
            </div>
          </div>
        </div>
        {error && (
          <div className="mt-6 bg-red-500/20 border border-red-400 text-red-200 px-4 py-3 rounded shadow">
            {error}
          </div>
        )}
        {results && (
          <div className="w-full max-w-4xl mt-12">
            <ToxicityDashboard results={results} />
          </div>
        )}
      </div>

      <div>
        <TestYouTubeFetcher />
      </div>
    </div>
  );
}
