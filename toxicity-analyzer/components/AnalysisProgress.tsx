import { useEffect, useState } from 'react';

interface ProgressData {
  status: string;
  progress: number;
  message: string;
}

interface AnalysisProgressProps {
  analysisId: string;
  onComplete: () => void;
  isTransitioning?: boolean;
  isDataLoading?: boolean;
}

export default function AnalysisProgress({ analysisId, onComplete, isTransitioning = false, isDataLoading = false }: AnalysisProgressProps) {
  const [progress, setProgress] = useState<ProgressData>({
    status: 'in_progress',
    progress: 0,
    message: 'Starting analysis...'
  });
  const [dots, setDots] = useState('');

  useEffect(() => {
    // Show different messages based on state
    if (isDataLoading) {
      setProgress({
        status: 'success',
        progress: 1,
        message: 'Loading your dashboard data...'
      });
      return;
    }

    if (isTransitioning) {
      setProgress({
        status: 'success',
        progress: 1,
        message: 'Analysis complete! Preparing results...'
      });
      return;
    }

    const checkProgress = async () => {
      try {
        const response = await fetch(`/api/analysis-progress/${analysisId}`);
        const data = await response.json();

        setProgress({
          status: data.status,
          progress: data.progress,
          message: data.message
        });

        if (data.status === 'success' || data.status === 'error') {
          onComplete();
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    };

    const interval = setInterval(checkProgress, 2000);
    return () => clearInterval(interval);
  }, [analysisId, onComplete, isTransitioning, isDataLoading]);

  // Animate dots for loading effect
  useEffect(() => {
    if (progress.status === 'in_progress' || isTransitioning || isDataLoading) {
      const dotsInterval = setInterval(() => {
        setDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(dotsInterval);
    }
  }, [progress.status, isTransitioning, isDataLoading]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'error':
        return {
          color: 'bg-red-500/20 text-red-300 border-red-400/50',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      case 'warning':
        return {
          color: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          )
        };
      default:
        return {
          color: 'bg-blue-500/20 text-blue-300 border-blue-400/50',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
            </svg>
          )
        };
    }
  };

  const statusInfo = getStatusInfo(progress.status);

  const getHeaderText = () => {
    if (isDataLoading) return 'Loading Dashboard';
    if (isTransitioning) return 'Finalizing Analysis';
    return 'Analysis in Progress';
  };

  const getSubHeaderText = () => {
    if (isDataLoading) return 'Fetching and preparing your toxicity analysis data';
    if (isTransitioning) return 'Preparing your toxicity analysis dashboard';
    return 'Processing your YouTube channel data';
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-in slide-in-from-bottom-8 duration-700">
      <div className="bg-[#181a2a] rounded-2xl shadow-2xl border border-white/10 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              {getHeaderText()}
            </h3>
            <p className="text-white/70 text-sm mt-1">
              {getSubHeaderText()}
            </p>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full border font-medium ${statusInfo.color}`}>
            {statusInfo.icon}
            <span className="capitalize">{progress.status.replace('_', ' ')}</span>
          </div>
        </div>

        {/* Progress Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-white/80">
              Progress
            </span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {Math.round(progress.progress * 100)}%
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full bg-[#23243a] rounded-full h-4 shadow-inner overflow-hidden">
              <div
                style={{ width: `${progress.progress * 100}%` }}
                className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out relative overflow-hidden"
              >
                {/* Animated shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>
            </div>
            
            {/* Progress indicators */}
            <div className="flex justify-between mt-2 text-xs text-white/50">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="mt-8 p-6 bg-[#23243a] rounded-xl">
          <div className="flex items-center gap-3">
            {(progress.status === 'in_progress' || isTransitioning || isDataLoading) && (
              <div className="flex-shrink-0">
                <div className="w-6 h-6 border-3 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            )}
            <p className="text-lg font-medium text-white flex-1">
              {progress.message}{(progress.status === 'in_progress' || isTransitioning || isDataLoading) ? dots : ''}
            </p>
          </div>
        </div>

        {/* Analysis Steps */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl transition-all duration-300 ${
            progress.progress > 0.1 
              ? 'bg-blue-500/10 border border-blue-400/30 text-blue-300' 
              : 'bg-[#23243a] text-white/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${progress.progress > 0.1 ? 'bg-blue-400' : 'bg-white/30'}`}></div>
              <h4 className="font-semibold text-sm">Fetching Videos</h4>
            </div>
            <p className="text-xs opacity-80">Collecting channel content</p>
          </div>
          
          <div className={`p-4 rounded-xl transition-all duration-300 ${
            progress.progress > 0.5 
              ? 'bg-purple-500/10 border border-purple-400/30 text-purple-300' 
              : 'bg-[#23243a] text-white/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${progress.progress > 0.5 ? 'bg-purple-400' : 'bg-white/30'}`}></div>
              <h4 className="font-semibold text-sm">Analyzing Comments</h4>
            </div>
            <p className="text-xs opacity-80">Processing toxicity scores</p>
          </div>
          
          <div className={`p-4 rounded-xl transition-all duration-300 ${
            progress.progress > 0.9 || isTransitioning || isDataLoading
              ? 'bg-pink-500/10 border border-pink-400/30 text-pink-300' 
              : 'bg-[#23243a] text-white/50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${progress.progress > 0.9 || isTransitioning || isDataLoading ? 'bg-pink-400' : 'bg-white/30'}`}></div>
              <h4 className="font-semibold text-sm">
                {isDataLoading ? 'Loading Dashboard' : 'Generating Results'}
              </h4>
            </div>
            <p className="text-xs opacity-80">
              {isDataLoading ? 'Fetching data for visualization' : 'Creating visualizations'}
            </p>
          </div>
        </div>

        {/* Context-specific messages */}
        {progress.status === 'in_progress' && !isTransitioning && !isDataLoading && (
          <div className="mt-8 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-400/20">
            <h4 className="text-sm font-semibold text-purple-300 mb-2">💡 Did you know?</h4>
            <p className="text-xs text-white/70">
              Our AI analyzes thousands of comments using advanced natural language processing to detect toxicity patterns and trends across your channel's content.
            </p>
          </div>
        )}

        {isTransitioning && !isDataLoading && (
          <div className="mt-8 p-4 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl border border-emerald-400/20">
            <h4 className="text-sm font-semibold text-emerald-300 mb-2">🎉 Analysis Complete!</h4>
            <p className="text-xs text-white/70">
              Your toxicity analysis is ready. We're now preparing your interactive dashboard with insights and visualizations.
            </p>
          </div>
        )}

        {isDataLoading && (
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-400/20">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">📊 Preparing Dashboard</h4>
            <p className="text-xs text-white/70">
              Loading channel data, toxicity trends, user statistics, and video analysis. This will just take a moment...
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 