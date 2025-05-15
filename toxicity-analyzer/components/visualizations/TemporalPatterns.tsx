import React from 'react';
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
  TimeScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TemporalPatternsProps {
  data: {
    timestamps: string[];
    toxicityScores: number[];
    commentCounts: number[];
  };
  timeRange: string;
}

const TemporalPatterns: React.FC<TemporalPatternsProps> = ({ data, timeRange }) => {
  const chartData = {
    labels: data.timestamps,
    datasets: [
      {
        label: 'Average Toxicity',
        data: data.toxicityScores,
        borderColor: 'rgba(236, 72, 153, 0.7)', // pink-500
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        tension: 0.3,
        yAxisID: 'y',
      },
      {
        label: 'Comment Volume',
        data: data.commentCounts,
        borderColor: 'rgba(56, 189, 248, 0.7)', // sky-400
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        tension: 0.3,
        yAxisID: 'y1',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#fff',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(24, 26, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.datasetIndex === 0) {
              label += (context.parsed.y * 100).toFixed(1) + '% toxicity';
            } else {
              label += context.parsed.y + ' comments';
            }
            return label;
          }
        }
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeRange === '24h' ? 'hour' as const : 'day' as const,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
        },
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Toxicity Score',
          color: '#fff',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#fff',
          callback: function(value: any) {
            return (value * 100).toFixed(0) + '%';
          }
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Comment Count',
          color: '#fff',
        },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: '#fff',
        },
      },
    },
  };

  return (
    <div className="relative">
      <Line data={chartData} options={options} />
      
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[#181a2a] p-4 rounded-xl border border-white/5">
          <h4 className="text-sm text-white/70 mb-1">Peak Toxicity</h4>
          <p className="text-2xl font-bold text-pink-500">
            {(Math.max(...data.toxicityScores) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-[#181a2a] p-4 rounded-xl border border-white/5">
          <h4 className="text-sm text-white/70 mb-1">Average Toxicity</h4>
          <p className="text-2xl font-bold text-purple-500">
            {(data.toxicityScores.reduce((a, b) => a + b, 0) / data.toxicityScores.length * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-[#181a2a] p-4 rounded-xl border border-white/5">
          <h4 className="text-sm text-white/70 mb-1">Total Comments</h4>
          <p className="text-2xl font-bold text-blue-500">
            {data.commentCounts.reduce((a, b) => a + b, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemporalPatterns; 