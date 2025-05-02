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
    },
    scales: {
      x: {
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      y: {
        ticks: { color: '#fff' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };

  return (
    <div className="space-y-10">
      <div className="bg-[#181a2a] p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center">Toxicity Analysis Results</h2>
        <Bar data={barChartData} options={chartOptions} />
      </div>
      <div className="bg-[#181a2a] p-8 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent text-center">Toxic Comments Over Time</h2>
        <Line data={lineChartData} options={chartOptions} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result) => (
          <div
            key={result.videoId}
            className="bg-[#181a2a] p-6 rounded-2xl shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl border border-white/5"
          >
            <h3 className="font-semibold mb-2 text-lg bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              <a
                href={`https://www.youtube.com/watch?v=${result.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {result.title}
              </a>
            </h3>
            <div className="flex flex-col gap-1 text-white/90">
              <span>Average Toxicity: <span className="font-bold text-pink-400">{(result.toxicity_avg * 100).toFixed(1)}%</span></span>
              <span>Toxic Comments: <span className="font-bold text-blue-400">{result.toxic_comment_pct.toFixed(1)}%</span></span>
              <span>Comments Analyzed: <span className="font-bold text-purple-400">{result.comments_analyzed}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 