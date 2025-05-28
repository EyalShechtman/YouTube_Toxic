import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { EngagementAnalysis } from './EngagementAnalysis';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ToxicityVisualizationsProps {
  channelId: string;
}

export const ToxicityVisualizations: React.FC<ToxicityVisualizationsProps> = ({ channelId }) => {
  const [activeTab, setActiveTab] = useState<'temporal' | 'engagement'>('temporal');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [temporalData, setTemporalData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (activeTab === 'temporal') {
          const response = await fetch(`/api/toxicity/temporal?channelId=${channelId}&timeRange=${timeRange}`);
          if (!response.ok) throw new Error('Failed to fetch temporal data');
          const data = await response.json();
          setTemporalData(data);
        } else {
          const response = await fetch(`/api/toxicity/analytics?channelId=${channelId}`);
          if (!response.ok) throw new Error('Failed to fetch analytics data');
          const data = await response.json();
          setAnalyticsData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [channelId, timeRange, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-400 text-red-300 px-6 py-4 rounded-xl shadow-lg" role="alert">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#232336] rounded-xl p-6 text-white">
      {/* Tab Navigation */}
      <div className="border-b border-[#35374a] mb-4">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('temporal')}
            className={`$ {
              activeTab === 'temporal'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
          >
            Temporal Analysis
          </button>
          <button
            onClick={() => setActiveTab('engagement')}
            className={`$ {
              activeTab === 'engagement'
                ? 'border-pink-400 text-pink-300'
                : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg transition-colors`}
          >
            Engagement Analysis
          </button>
        </nav>
      </div>

      {/* Time Range Selector (only for temporal analysis) */}
      {activeTab === 'temporal' && (
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
              timeRange === 'week'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'bg-[#35374a] text-gray-200 hover:bg-pink-500/20 hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
              timeRange === 'month'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'bg-[#35374a] text-gray-200 hover:bg-pink-500/20 hover:text-white'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all ${
              timeRange === 'year'
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                : 'bg-[#35374a] text-gray-200 hover:bg-pink-500/20 hover:text-white'
            }`}
          >
            Year
          </button>
        </div>
      )}

      {/* Content */}
      <div className="rounded-xl bg-[#181a2a] p-6">
        {activeTab === 'temporal' ? (
          temporalData && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold mb-6 text-white text-center">
                Toxicity Over Time
              </h2>
              <Line
                data={temporalData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        color: '#fff',
                      },
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      ticks: {
                        color: '#fff',
                      },
                      grid: {
                        color: '#35374a',
                      },
                    },
                    y: {
                      beginAtZero: true,
                      max: 1,
                      ticks: {
                        color: '#fff',
                      },
                      grid: {
                        color: '#35374a',
                      },
                    },
                  },
                }}
              />
            </div>
          )
        ) : (
          analyticsData && <EngagementAnalysis data={analyticsData} />
        )}
      </div>
    </div>
  );
}; 