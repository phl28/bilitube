'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/video/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to find video');
        return;
      }

      const youtubeId = data.data.youtubeVideo.id;
      router.push(`/video/${youtubeId}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Connect YouTube & Bilibili
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
          Paste a YouTube video URL to find its Bilibili reuploads and see comments from both platforms in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xl">
        <div className="flex gap-2">
          <input
            type="text"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Paste YouTube URL here..."
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !youtubeUrl.trim()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Searching...' : 'Find'}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-4 text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <FeatureCard
          title="Cross-Platform Comments"
          description="See comments from YouTube and Bilibili side by side in a unified interface."
        />
        <FeatureCard
          title="Find Reuploads"
          description="Automatically discover Bilibili reuploads of any YouTube video."
        />
        <FeatureCard
          title="Real-time Updates"
          description="Comments are refreshed regularly so you never miss the conversation."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
