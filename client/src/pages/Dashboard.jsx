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
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-600">
          No bots yet. Create your first one!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {bots.map((bot) => (
            <div key={bot._id} className="rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">{bot.name}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Embed key: {bot.embedKey.slice(0, 8)}...
              </p>
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
