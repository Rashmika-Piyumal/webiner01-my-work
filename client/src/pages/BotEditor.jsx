import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import ConversationsTab from '../components/ConversationsTab';
import LeadsTab from '../components/LeadsTab';
import EmbedCodeTab from '../components/EmbedCodeTab';

const TABS = ['Settings', 'Conversations', 'Leads', 'Embed Code'];

const EMPTY_FORM = {
  name: '',
  welcomeMessage: '',
  businessKnowledge: '',
  primaryColor: '#4F46E5',
};

export default function BotEditor() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();

  const [bot, setBot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Settings');
  const [focusConversationId, setFocusConversationId] = useState(null);

  useEffect(() => {
    if (isNew) return;
    async function loadBot() {
      try {
        const data = await api.get(`/bots/${id}`);
        setBot(data);
        setForm({
          name: data.name,
          welcomeMessage: data.welcomeMessage,
          businessKnowledge: data.businessKnowledge,
          primaryColor: data.primaryColor,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBot();
  }, [id, isNew]);

  function handleViewConversation(conversationId) {
    setFocusConversationId(conversationId);
    setTab('Conversations');
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.post('/bots', form);
        navigate(`/bots/${created._id}`);
      } else {
        const updated = await api.patch(`/bots/${id}`, form);
        setBot(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-sm text-slate-600">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {isNew ? 'New Bot' : form.name || 'Bot'}
        </h1>
      </div>

      {!isNew && (
        <div className="mb-6 flex gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${
                tab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      {isNew || tab === 'Settings' ? (
        <form onSubmit={handleSave} className="max-w-xl space-y-5 rounded-lg bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Welcome Message</label>
            <input
              type="text"
              value={form.welcomeMessage}
              onChange={(e) => updateField('welcomeMessage', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700">Business Knowledge</label>
              <span className="text-xs text-slate-400">{form.businessKnowledge.length}/8000</span>
            </div>
            <textarea
              rows={8}
              maxLength={8000}
              value={form.businessKnowledge}
              onChange={(e) => updateField('businessKnowledge', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary Color</label>
            <input
              type="color"
              value={form.primaryColor}
              onChange={(e) => updateField('primaryColor', e.target.value)}
              className="h-10 w-16 rounded-lg border border-slate-300"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </form>
      ) : tab === 'Conversations' ? (
        <ConversationsTab
          botId={id}
          embedKey={bot?.embedKey}
          focusConversationId={focusConversationId}
        />
      ) : tab === 'Leads' ? (
        <LeadsTab botId={id} onViewConversation={handleViewConversation} />
      ) : (
        <EmbedCodeTab bot={bot} />
      )}
    </div>
  );
}
