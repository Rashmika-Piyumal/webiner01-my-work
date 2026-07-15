import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getSocket, subscribeToBot } from '../lib/socket';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString();
}

export default function LeadsTab({ botId, onViewConversation }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadLeads() {
      try {
        const data = await api.get(`/bots/${botId}/leads`);
        if (!cancelled) setLeads(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadLeads();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => {
    subscribeToBot(botId);
    const socket = getSocket();

    function handleLeadNew({ lead, botId: eventBotId }) {
      if (String(eventBotId) !== String(botId)) return;
      setLeads((prev) => {
        const exists = prev.some((l) => l._id === lead._id);
        return exists ? prev.map((l) => (l._id === lead._id ? lead : l)) : [lead, ...prev];
      });
      setFlashId(lead._id);
      setTimeout(() => {
        setFlashId((current) => (current === lead._id ? null : current));
      }, 2000);
    }

    socket.on('lead:new', handleLeadNew);
    return () => {
      socket.off('lead:new', handleLeadNew);
    };
  }, [botId]);

  async function handleExport() {
    try {
      const blob = await api.blob(`/bots/${botId}/leads/export`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${botId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Leads</h2>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
        >
          Export CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-slate-500">No leads captured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Captured</th>
                <th className="py-2 pr-4 font-medium">Conversation</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead._id}
                  className={`border-b border-slate-100 transition-colors duration-1000 ${
                    flashId === lead._id ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="py-2 pr-4 text-slate-900">{lead.name || '—'}</td>
                  <td className="py-2 pr-4 text-slate-900">{lead.email || '—'}</td>
                  <td className="py-2 pr-4 text-slate-900">{lead.phone || '—'}</td>
                  <td className="py-2 pr-4 text-slate-500">{formatDate(lead.capturedAt)}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {lead.conversationId ? lead.conversationId.slice(-6) : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => onViewConversation?.(lead.conversationId)}
                      className="font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
