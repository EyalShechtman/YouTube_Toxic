import { useState } from 'react';

interface InputFormProps {
  onSubmit: (channelUrl: string) => void;
  isLoading: boolean;
}

export default function InputForm({ onSubmit, isLoading }: InputFormProps) {
  const [channelUrl, setChannelUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(channelUrl);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
        <input
          type="text"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
          placeholder="Enter YouTube channel URL"
          className="flex-1 px-4 py-2 border-none rounded-full bg-[#23243a] text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 w-full sm:w-auto rounded-full font-semibold bg-gradient-to-r from-blue-500 to-pink-500 text-white shadow-lg hover:from-pink-500 hover:to-blue-500 transition focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
    </form>
  );
} 