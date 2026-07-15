import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { getSocket, subscribeToBot } from '../lib/socket';

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function ConversationsTab({ botId, focusConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const selectedIdRef = useRef(selectedId);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (focusConversationId) {
      setSelectedId(focusConversationId);
    }
  }, [focusConversationId]);

  useEffect(() => {
    let cancelled = false;
    async function loadConversations() {
      setLoadingList(true);
      try {
        const data = await api.get(`/bots/${botId}/conversations`);
        if (!cancelled) setConversations(data);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    }
    loadConversations();
    return () => {
      cancelled = true;
    };
  }, [botId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const data = await api.get(`/conversations/${selectedId}/messages`);
        if (!cancelled) setMessages(data);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    subscribeToBot(botId);
    const socket = getSocket();

    function handleConversationNew({ conversation, botId: eventBotId }) {
      if (String(eventBotId) !== String(botId)) return;
      setConversations((prev) => [conversation, ...prev]);
    }

    function handleMessageNew({ message, conversationId, botId: eventBotId }) {
      if (String(eventBotId) !== String(botId)) return;
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, lastMessageAt: message.createdAt } : c))
      );
      if (String(selectedIdRef.current) === String(conversationId)) {
        setMessages((prev) => [...prev, message]);
      }
    }

    socket.on('conversation:new', handleConversationNew);
    socket.on('message:new', handleMessageNew);

    return () => {
      socket.off('conversation:new', handleConversationNew);
      socket.off('message:new', handleMessageNew);
    };
  }, [botId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations.find((c) => c._id === selectedId);

  return (
    <div className="flex h-[600px] rounded-lg bg-white shadow-sm">
      <div className="w-72 shrink-0 overflow-y-auto border-r border-slate-200">
        {loadingList ? (
          <p className="p-4 text-sm text-slate-500">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No conversations yet</p>
        ) : (
          conversations.map((c) => (
            <button
              type="button"
              key={c._id}
              onClick={() => setSelectedId(c._id)}
              className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm hover:bg-slate-50 ${
                selectedId === c._id ? 'bg-indigo-50' : ''
              }`}
            >
              <div>
                <div className="font-medium text-slate-900">
                  Visitor {c.visitorId.slice(-6)}
                </div>
                <div className="text-xs text-slate-500">{timeAgo(c.lastMessageAt)}</div>
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                {c.messageCount}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {!selectedConversation ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            Select a conversation
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="font-medium text-slate-900">
                Visitor {selectedConversation.visitorId.slice(-6)}
              </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
              {loadingMessages ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m._id}
                    className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'ml-auto bg-indigo-600 text-white'
                        : 'mr-auto bg-slate-100 text-slate-900'
                    }`}
                  >
                    {m.content}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
