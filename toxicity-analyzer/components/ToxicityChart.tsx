import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface ToxicityData {
  timestamp: string;
  toxicity_score: number;
  video_title?: string;
  video_id?: string;
}

interface ToxicityChartProps {
  data: ToxicityData[];
  title?: string;
  onVideoSelect?: (videoId: string) => void;
  selectedVideoId?: string | null;
}

export default function ToxicityChart({ 
  data, 
  title = 'Toxicity Over Time', 
  onVideoSelect,
  selectedVideoId 
}: ToxicityChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Sort data by timestamp
    const sortedData = [...data].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Calculate cumulative average (overall average up to that point)
    const calculateCumulativeAverage = (data: ToxicityData[]) => {
      const cumulativeAverage: number[] = [];
      let runningSum = 0;
      
      for (let i = 0; i < data.length; i++) {
        runningSum += data[i].toxicity_score;
        const average = runningSum / (i + 1);
        cumulativeAverage.push(average);
      }
      
      return cumulativeAverage;
    };

    const cumulativeAverageData = calculateCumulativeAverage(sortedData);

    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sortedData.map(d => new Date(d.timestamp).toLocaleDateString()),
        datasets: [
          {
            label: 'Toxicity Score',
            data: sortedData.map(d => d.toxicity_score),
            borderColor: '#a78bfa',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: sortedData.map(d => 
              d.video_id === selectedVideoId ? '#f59e0b' : '#f472b6'
            ),
            pointBorderColor: sortedData.map(d => 
              d.video_id === selectedVideoId ? '#f59e0b' : '#a78bfa'
            ),
            pointBorderWidth: sortedData.map(d => 
              d.video_id === selectedVideoId ? 3 : 2
            ),
            pointRadius: sortedData.map(d => 
              d.video_id === selectedVideoId ? 6 : 4
            ),
            pointHoverRadius: 8,
            borderWidth: 3,
          },
          {
            label: 'Overall Average',
            data: cumulativeAverageData,
            borderColor: '#38bdf8',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 4,
            borderWidth: 3,
            borderDash: [8, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0 && onVideoSelect) {
            const elementIndex = elements[0].index;
            const videoId = sortedData[elementIndex]?.video_id;
            if (videoId) {
              onVideoSelect(videoId);
            }
          }
        },
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#e0e7ef',
              font: {
                size: 12,
                weight: 'normal',
              },
              padding: 15,
              boxWidth: 15,
              boxHeight: 2,
              usePointStyle: false,
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#232336',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#a78bfa',
            borderWidth: 1,
            cornerRadius: 8,
            padding: 16,
            displayColors: true,
            usePointStyle: true,
            callbacks: {
              title: function(context) {
                const dataIndex = context[0].dataIndex;
                const videoTitle = sortedData[dataIndex]?.video_title;
                return videoTitle ? `Video: ${videoTitle}` : `Date: ${context[0].label}`;
              },
              label: function(context) {
                const datasetLabel = context.dataset.label;
                const value = (context.parsed.y * 100).toFixed(1);
                
                // Return different order: toxicity score first, then overall average, then date will be added separately
                if (datasetLabel === 'Toxicity Score') {
                  return `${datasetLabel}: ${value}%`;
                } else if (datasetLabel === 'Overall Average') {
                  return `${datasetLabel}: ${value}%`;
                }
                return `${datasetLabel}: ${value}%`;
              },
              afterLabel: function(context) {
                // Add date after the Overall Average line
                if (context.dataset.label === 'Overall Average') {
                  return `Date: ${context.label}`;
                }
                return '';
              },
              labelColor: function(context) {
                // Make toxicity score use purple/magenta to match the line color
                if (context.dataset.label === 'Toxicity Score') {
                  return { borderColor: '#a78bfa', backgroundColor: '#a78bfa' }; // Purple to match the line
                }
                return { borderColor: '#38bdf8', backgroundColor: '#38bdf8' }; // Blue for average line
              },
              afterBody: function(context) {
                // Only show click hint for toxicity score data points
                const dataIndex = context[0].dataIndex;
                const videoId = sortedData[dataIndex]?.video_id;
                if (videoId && context[0].dataset.label === 'Toxicity Score') {
                  return '\n🖱️ Click to view video details';
                }
                return '';
              }
            },
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12,
              weight: 'normal'
            },
            footerFont: {
              size: 11,
              style: 'italic'
            },
            footerColor: '#a78bfa'
          },
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Timeline',
              color: '#e0e7ef',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
            ticks: {
              color: '#e0e7ef',
              font: {
                size: 11,
              },
            },
            grid: {
              color: '#35374a',
            },
          },
          y: {
            title: {
              display: true,
              text: 'Toxicity Level',
              color: '#e0e7ef',
              font: {
                size: 12,
                weight: 'bold',
              },
            },
            min: 0,
            max: 1,
            ticks: {
              stepSize: 0.2,
              color: '#e0e7ef',
              font: {
                size: 11,
              },
              callback: function(value) {
                return `${(Number(value) * 100).toFixed(0)}%`;
              }
            },
            grid: {
              color: '#35374a',
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, title, selectedVideoId, onVideoSelect]);

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
        <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-lg font-medium">No toxicity data available</p>
        <p className="text-sm text-gray-500 mt-1">Data will appear here once comments are analyzed</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#232336] rounded-xl p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-300">
          Track how toxicity levels change over time • Click on data points to view video details
        </p>
      </div>
      <div className="h-[400px]">
        <canvas ref={chartRef} />
      </div>
    </div>
  );
} 