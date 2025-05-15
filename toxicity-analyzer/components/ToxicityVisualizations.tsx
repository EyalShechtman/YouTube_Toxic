import React, { useState, useEffect } from 'react';
import TemporalPatterns from './visualizations/TemporalPatterns';

interface ToxicityVisualizationsProps {
  channelId: string;
}

const ToxicityVisualizations: React.FC<ToxicityVisualizationsProps> = ({ channelId }) => {
  const [activeTab, setActiveTab] = useState('temporal');
  const [timeRange, setTimeRange] = useState('24h');
  const [temporalData, setTemporalData] = useState<{
    timestamps: string[];
    toxicityScores: number[];
    commentCounts: number[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemporalData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/toxicity/temporal?channelId=${channelId}&timeRange=${timeRange}`
        );
        if (!response.ok) throw new Error('Failed to fetch temporal data');
        const data = await response.json();
        setTemporalData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTemporalData();
  }, [channelId, timeRange]);

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-[#181a2a] p-6 rounded-2xl shadow-lg border border-white/5">
        <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
          Advanced Toxicity Analysis
        </h2>
        <p className="text-white/70">
          Explore detailed patterns and insights about comment toxicity across your channel
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4 bg-[#181a2a] p-2 rounded-xl">
        <button
          onClick={() => setActiveTab('temporal')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'temporal'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Temporal Patterns
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'engagement'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Engagement Analysis
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === 'topics'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'text-white/70 hover:text-white'
          }`}
        >
          Topic Insights
        </button>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center space-x-4 bg-[#181a2a] p-4 rounded-xl">
        <span className="text-white/70">Time Range:</span>
        <div className="flex space-x-2">
          {['24h', '7d', '30d', '90d', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-lg transition-all ${
                timeRange === range
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Visualization Container */}
      <div className="bg-[#181a2a] p-6 rounded-2xl shadow-lg border border-white/5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'temporal' && temporalData && (
              <TemporalPatterns data={temporalData} timeRange={timeRange} />
            )}
            {activeTab === 'engagement' && (
              <div className="text-white/70 text-center">Engagement Analysis Coming Soon</div>
            )}
            {activeTab === 'topics' && (
              <div className="text-white/70 text-center">Topic Insights Coming Soon</div>
            )}
          </>
        )}
      </div>

      {/* Insights Panel */}
      <div className="bg-[#181a2a] p-6 rounded-2xl shadow-lg border border-white/5">
        <h3 className="text-xl font-semibold text-white mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* We'll add dynamic insights here */}
        </div>
      </div>
    </div>
  );
};

export default ToxicityVisualizations; 