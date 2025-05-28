import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface VideoResult {
  videoId: string;
  title: string;
  toxicity_avg: number;
  toxic_comment_pct: number;
  comments_analyzed: number;
}

interface ToxicityDashboardProps {
  results: VideoResult[];
}

export default function ToxicityDashboard({ results }: ToxicityDashboardProps) {
  const videoTitles = results.map((r) => r.title);
  const toxicityAverages = results.map((r) => r.toxicity_avg);
  const toxicCommentPercents = results.map((r) => r.toxic_comment_pct);

  const barChartData = {
    labels: videoTitles,
    datasets: [
      {
        label: 'Average Toxicity Score',
        data: toxicityAverages,
        backgroundColor: 'rgba(236, 72, 153, 0.7)', // pink-500
        borderColor: 'rgba(168, 139, 250, 1)', // purple-400
        borderWidth: 2,
      },
    ],
  };

  const lineChartData = {
    labels: videoTitles,
    datasets: [
      {
        label: 'Percentage of Toxic Comments',
        data: toxicCommentPercents,
        borderColor: 'rgba(56, 189, 248, 1)', // sky-400
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        tension: 0.3,
        pointBackgroundColor: 'rgba(236, 72, 153, 1)',
        pointBorderColor: 'rgba(236, 72, 153, 1)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#fff',
        },
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(236, 72, 153, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
      y: {
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.1)' },
      },
    },
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 mt-12">
      <div className="bg-[#181a2a] p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center">
          Toxicity Analysis Results
        </h2>
        <Bar data={barChartData} options={chartOptions} />
      </div>
      <div className="bg-[#181a2a] p-8 rounded-3xl shadow-2xl">
        <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent text-center">
          Toxic Comments Over Time
        </h2>
        <Line data={lineChartData} options={chartOptions} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.map((result) => (
          <div
            key={result.videoId}
            className="bg-[#181a2a] p-8 rounded-3xl shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-3xl border border-white/10 group"
          >
            <h3 className="font-bold mb-4 text-xl bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent leading-tight">
              <a
                href={`https://www.youtube.com/watch?v=${result.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline group-hover:from-blue-400 group-hover:to-pink-400 transition-all"
              >
                {result.title}
              </a>
            </h3>
            <div className="flex flex-col gap-3 text-white/90">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Average Toxicity:</span>
                <span className="font-bold text-pink-400 text-lg">{(result.toxicity_avg * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Toxic Comments:</span>
                <span className="font-bold text-blue-400 text-lg">{result.toxic_comment_pct.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Comments Analyzed:</span>
                <span className="font-bold text-purple-400 text-lg">{result.comments_analyzed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 