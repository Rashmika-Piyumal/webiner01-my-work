import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBots() {
      try {
        const data = await api.get('/bots');
        setBots(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBots();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Bots</h1>
        <button
          type="button"
          onClick={() => navigate('/bots/new')}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          + New Bot
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : bots.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-white p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No bots yet</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Create your first AI chatbot and start capturing conversations and leads from your
            website in minutes.
          </p>
          <button
            type="button"
            onClick={() => navigate('/bots/new')}
            className="mt-6 rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-700"
          >
            + Create Your First Bot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {bots.map((bot) => (
            <div key={bot._id} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">{bot.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Embed key: {bot.embedKey.slice(0, 8)}...
              </p>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                  {bot.messageCount} {bot.messageCount === 1 ? 'message' : 'messages'}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  {bot.leadCount} {bot.leadCount === 1 ? 'lead' : 'leads'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/bots/${bot._id}`)}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
