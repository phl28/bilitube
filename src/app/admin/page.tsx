'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [bvid, setBvid] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState('');

  async function handleSubmit(action: 'add' | 'remove') {
    setLoading(true);
    setResult('');
    setError('');

    try {
      const youtubeId = extractYoutubeId(youtubeUrl);
      if (!youtubeId) {
        setError('Invalid YouTube URL');
        return;
      }

      const response = await fetch('/api/admin/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeId,
          bvid: bvid || null,
          action,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(action === 'add' ? 'Match added successfully' : 'Match removed successfully');
        setYoutubeUrl('');
        setBvid('');
      } else {
        setError(data.error || `Failed to ${action} match`);
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold mb-6">Admin Panel</h1>

      <div className="bg-surface rounded-xl p-5">
        <h2 className="text-base font-semibold mb-4">Video Match Correction</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1.5">
              YouTube URL
            </label>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none text-sm transition-colors focus:border-muted"
            />
          </div>

          <div>
            <label className="block text-sm text-muted mb-1.5">
              Bilibili BV ID (optional)
            </label>
            <input
              type="text"
              value={bvid}
              onChange={(e) => setBvid(e.target.value)}
              placeholder="BV1xx411c7mD"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted/50 outline-none text-sm transition-colors focus:border-muted"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleSubmit('add')}
              disabled={loading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Adding...' : 'Add Match'}
            </button>
            <button
              onClick={() => handleSubmit('remove')}
              disabled={loading || !youtubeUrl.trim()}
              className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Removing...' : 'Remove Match'}
            </button>
          </div>

          {result && (
            <p className="text-emerald-500 text-sm">{result}</p>
          )}
          {error && (
            <p className="text-accent text-sm">{error}</p>
          )}
        </div>
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
