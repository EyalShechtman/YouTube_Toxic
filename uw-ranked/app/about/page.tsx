'use client';

import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="min-h-screen w-full bg-[#101223] text-white transition-colors duration-300">
      {/* Navigation */}
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

      <main className="flex flex-col items-center justify-center min-h-screen pt-32 pb-16 relative overflow-hidden">
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
          About YouTube Toxicity Analyzer
        </h1>
        <p className="text-lg sm:text-xl text-center max-w-xl mx-auto mb-10 text-white/80">
          Understanding and analyzing the evolution of community behavior through comment toxicity.
        </p>
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-[#181a2a] p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">Why We Built This</h2>
            <p className="text-white/80">
              Toxic discourse has become normalized on social platforms, often amplified by algorithms and echo chambers. While content creators face increasing harassment, there's been little analysis of how audience behavior evolves over time.
            </p>
          </div>
          <div className="bg-[#181a2a] p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-semibold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">Our Research</h2>
            <p className="text-white/80">
              We analyze toxicity patterns across a creator's timeline to understand:
            </p>
            <ul className="mt-4 space-y-2 text-white/70">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                How toxicity evolves with channel growth
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Topic-specific toxicity patterns
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Community behavior shifts over time
              </li>
            </ul>
          </div>
        </div>
        <div className="w-full max-w-4xl mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#23243a] rounded-xl shadow">
            <h3 className="font-semibold text-white mb-2">Data Collection</h3>
            <p className="text-white/70">Analyzing up to 300 comments per video, sampled by relevance or recency</p>
          </div>
          <div className="p-6 bg-[#23243a] rounded-xl shadow">
            <h3 className="font-semibold text-white mb-2">Toxicity Analysis</h3>
            <p className="text-white/70">Advanced sentiment analysis to detect and measure toxic content</p>
          </div>
          <div className="p-6 bg-[#23243a] rounded-xl shadow">
            <h3 className="font-semibold text-white mb-2">Visualization</h3>
            <p className="text-white/70">Interactive timeline showing toxicity trends and patterns</p>
          </div>
        </div>
        <div className="mt-16 text-center">
          <Link 
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-gradient-to-r from-blue-500 to-pink-500 hover:from-pink-500 hover:to-blue-500 shadow-lg transition"
          >
            Try the Analyzer
          </Link>
        </div>
      </main>
    </div>
  );
} 