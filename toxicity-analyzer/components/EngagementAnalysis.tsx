import React from 'react';
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
import { Scatter } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  channel: {
    name: string;
    totalVideos: number;
    totalComments: number;
    averageLikesPerVideo: number;
    averageViewsPerVideo: number;
  };
  comments: {
    totalToxic: number;
    averageToxicity: number;
    mostLikedComment: {
      text: string;
      like_count: number;
      toxicity_score: number;
    };
    mostToxicComment: {
      text: string;
      like_count: number;
      toxicity_score: number;
    };
  };
  userStats: {
    mostActiveUser: {
      id: string;
      count: number;
    };
    mostLikedUser: {
      id: string;
      likes: number;
    };
  };
  correlation: {
    coefficient: number;
  };
}

interface EngagementAnalysisProps {
  data: AnalyticsData;
}

export const EngagementAnalysis: React.FC<EngagementAnalysisProps> = ({ data }) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatPercentage = (num: number) => {
    return `${(num * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-8">
      {/* Channel Overview */}
      <div className="bg-[#181a2a] rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
          Channel Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Videos</h3>
            <p className="text-3xl font-bold text-blue-400">{formatNumber(data.channel.totalVideos)}</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Comments</h3>
            <p className="text-3xl font-bold text-purple-400">{formatNumber(data.channel.totalComments)}</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Avg. Likes/Video</h3>
            <p className="text-3xl font-bold text-pink-400">{formatNumber(data.channel.averageLikesPerVideo)}</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Avg. Views/Video</h3>
            <p className="text-3xl font-bold text-green-400">{formatNumber(data.channel.averageViewsPerVideo)}</p>
          </div>
        </div>
      </div>

      {/* Toxicity Analysis */}
      <div className="bg-[#181a2a] rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
          Toxicity Analysis
        </h2>
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Toxic Comments</h3>
            <p className="text-3xl font-bold text-red-400">{formatNumber(data.comments.totalToxic)}</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Average Toxicity</h3>
            <p className="text-3xl font-bold text-orange-400">{formatPercentage(data.comments.averageToxicity)}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-4 text-green-400">Most Liked Comment</h3>
            <div className="bg-white/10 p-6 rounded-xl">
              <p className="text-gray-200 mb-4 leading-relaxed">{data.comments.mostLikedComment.text}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                  {formatNumber(data.comments.mostLikedComment.like_count)} Likes
                </span>
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300">
                  {formatPercentage(data.comments.mostLikedComment.toxicity_score)} Toxicity
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-red-400">Most Toxic Comment</h3>
            <div className="bg-white/10 p-6 rounded-xl">
              <p className="text-gray-200 mb-4 leading-relaxed">{data.comments.mostToxicComment.text}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300">
                  {formatNumber(data.comments.mostToxicComment.like_count)} Likes
                </span>
                <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300">
                  {formatPercentage(data.comments.mostToxicComment.toxicity_score)} Toxicity
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Statistics */}
      <div className="bg-[#181a2a] rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
          User Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Most Active User</h3>
            <p className="text-xl font-semibold text-white mb-2">{data.userStats.mostActiveUser.id}</p>
            <p className="text-sm text-blue-300">{formatNumber(data.userStats.mostActiveUser.count)} comments</p>
          </div>
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Most Liked User</h3>
            <p className="text-xl font-semibold text-white mb-2">{data.userStats.mostLikedUser.id}</p>
            <p className="text-sm text-purple-300">{formatNumber(data.userStats.mostLikedUser.likes)} total likes</p>
          </div>
        </div>
      </div>

      {/* Correlation Analysis */}
      <div className="bg-[#181a2a] rounded-2xl shadow-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 text-center">
          Toxicity vs. Engagement Correlation
        </h2>
        <div className="bg-white/10 p-8 rounded-xl text-center">
          <p className="text-2xl mb-4 text-white">
            Correlation Coefficient: <span className="font-bold text-yellow-400">{data.correlation.coefficient.toFixed(2)}</span>
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            {data.correlation.coefficient > 0.3
              ? 'There is a positive correlation between toxicity and engagement'
              : data.correlation.coefficient < -0.3
              ? 'There is a negative correlation between toxicity and engagement'
              : 'There is no significant correlation between toxicity and engagement'}
          </p>
        </div>
      </div>
    </div>
  );
}; 