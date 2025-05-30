import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ChannelInputProps {
  onAnalysisStart: (channelUrl: string) => void;
  isAnalyzing: boolean;
}

export default function ChannelInput({ onAnalysisStart, isAnalyzing }: ChannelInputProps) {
  const [channelUrl, setChannelUrl] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

  const validateYouTubeUrl = (url: string): boolean => {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/@[\w-]+$/,
      /^https?:\/\/(www\.)?youtube\.com\/channel\/UC[\w-]{22}$/,
      /^UC[\w-]{22}$/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!channelUrl.trim()) {
      setError('Please enter a YouTube channel URL');
      return;
    }

    if (!validateYouTubeUrl(channelUrl)) {
      setError('Please enter a valid YouTube channel URL');
      return;
    }

    try {
      onAnalysisStart(channelUrl);
    } catch (err) {
      setError('Failed to start analysis. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto text-center space-y-8 relative">
      {/* Subtle background pattern - matching About page */}
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" className="opacity-10" style={{position:'absolute',top:0,left:0}}>
          <circle cx="50%" cy="50%" r="500" fill="none" stroke="url(#grad1)" strokeWidth="2" />
          <circle cx="20%" cy="20%" r="300" fill="none" stroke="url(#grad2)" strokeWidth="1" />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Header Section */}
      <div className="space-y-4">
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-center bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-lg">
          Analyze YouTube Toxicity
        </h1>
        <p className="text-lg sm:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
          Measure and visualize comment toxicity trends using advanced AI analysis
        </p>
      </div>

      {/* Feature Pills */}
      <div className="flex flex-wrap justify-center gap-6 py-3">
        <div className="px-5 py-2.5 bg-[#181a2a] border border-pink-400/20 rounded-full text-pink-300 text-sm font-medium hover:bg-pink-500/20 hover:text-pink-200 hover:border-pink-400/40 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-pink-400 rounded-full"></div>
            Real-time Analysis
          </div>
        </div>
        <div className="px-5 py-2.5 bg-[#181a2a] border border-purple-400/20 rounded-full text-purple-300 text-sm font-medium hover:bg-purple-500/20 hover:text-purple-200 hover:border-purple-400/40 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
            Visual Insights
          </div>
        </div>
        <div className="px-5 py-2.5 bg-[#181a2a] border border-blue-400/20 rounded-full text-blue-300 text-sm font-medium hover:bg-blue-500/20 hover:text-blue-200 hover:border-blue-400/40 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            Trend Tracking
          </div>
        </div>
      </div>

      {/* Main Input Section */}
      <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative max-w-2xl mx-auto">
            <div className={`relative rounded-2xl border transition-all duration-300 ${
              isFocused 
                ? 'border-purple-400/50 shadow-lg shadow-purple-400/20 bg-[#181a2a]' 
                : 'border-white/10 bg-[#181a2a]/80'
            }`}>
              <input
                type="text"
                value={channelUrl}
                onChange={(e) => setChannelUrl(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Enter YouTube channel URL"
                className="w-full px-6 py-4 bg-transparent text-white placeholder-white/50 focus:outline-none text-base pr-32"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={isAnalyzing || !channelUrl.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isAnalyzing || !channelUrl.trim()
                    ? 'bg-gray-600/50 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-pink-500 text-white hover:from-pink-500 hover:to-blue-500 shadow-md'
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Analyzing</span>
                  </div>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Supported Formats */}
        <div className="text-sm text-white/70 py-4">
          <p className="mb-2 font-medium text-white/80">Supported formats:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-3 py-1.5 bg-[#23243a] rounded-lg text-xs text-white/80">
              youtube.com/@username
            </span>
            <span className="px-3 py-1.5 bg-[#23243a] rounded-lg text-xs text-white/80">
              youtube.com/channel/ID
            </span>
            <span className="px-3 py-1.5 bg-[#23243a] rounded-lg text-xs text-white/80">
              Channel URLs
            </span>
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="max-w-md mx-auto pt-6">
        <div className="bg-[#181a2a] border border-white/10 rounded-2xl p-6 shadow-lg">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Try a Demo</h3>
              <p className="text-white/70 text-sm">
                See our AI-powered toxicity detection in action
              </p>
            </div>
            <button
              onClick={() => setChannelUrl('https://www.youtube.com/@NickRTFM')}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg py-3 px-4 text-sm font-medium transition-all duration-200 shadow-md"
            >
              Use @MrBeast as example
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 