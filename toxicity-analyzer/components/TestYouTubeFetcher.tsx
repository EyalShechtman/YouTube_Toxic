import React, { useState } from 'react';

const TestYouTubeFetcher: React.FC = () => {
  const [channelUrl, setChannelUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/test-youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch channel data');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Test YouTube Data Fetcher</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="channelUrl" className="block text-sm font-medium mb-1">
            YouTube Channel URL
          </label>
          <input
            type="text"
            id="channelUrl"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            placeholder="https://www.youtube.com/c/channelname"
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
        >
          {isLoading ? 'Fetching Data...' : 'Fetch Channel Data'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
          Data fetched and stored successfully!
        </div>
      )}
    </div>
  );
};

export default TestYouTubeFetcher; 