'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [bvid, setBvid] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setError('');

    try {
      const apiKey = prompt('Enter admin API key:');
      if (!apiKey) {
        setError('API key required');
        return;
      }

      const youtubeId = extractYoutubeId(youtubeUrl);
      if (!youtubeId) {
        setError('Invalid YouTube URL');
        return;
      }

      const response = await fetch('/api/admin/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey,
        },
        body: JSON.stringify({
          youtubeId,
          bvid: bvid || null,
          action: 'add',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult('Match added successfully');
        setYoutubeUrl('');
        setBvid('');
      } else {
        setError(data.error || 'Failed to add match');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMatch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult('');
    setError('');

    try {
      const apiKey = prompt('Enter admin API key:');
      if (!apiKey) {
        setError('API key required');
        return;
      }

      const youtubeId = extractYoutubeId(youtubeUrl);
      if (!youtubeId) {
        setError('Invalid YouTube URL');
        return;
      }

      const response = await fetch('/api/admin/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': apiKey,
        },
        body: JSON.stringify({
          youtubeId,
          bvid: bvid || null,
          action: 'remove',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult('Match removed successfully');
        setYoutubeUrl('');
        setBvid('');
      } else {
        setError(data.error || 'Failed to remove match');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Admin Panel
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Video Match Correction
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              YouTube URL or ID
            </label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bilibili BV ID (optional)
            </label>
            <input
              type="text"
              value={bvid}
              onChange={(e) => setBvid(e.target.value)}
              placeholder="BV1xx411c7mD"
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleAddMatch}
              disabled={loading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded"
            >
              {loading ? 'Adding...' : 'Add Match'}
            </button>
            <button
              onClick={handleRemoveMatch}
              disabled={loading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded"
            >
              {loading ? 'Removing...' : 'Remove Match'}
            </button>
          </div>

          {result && (
            <p className="text-green-600 dark:text-green-400">{result}</p>
          )}
          {error && (
            <p className="text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          API Key
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The admin API key is stored in the <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">ADMIN_API_KEY</code> environment variable.
          You will be prompted to enter it when making changes.
        </p>
      </div>
    </div>
  );
}

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}
