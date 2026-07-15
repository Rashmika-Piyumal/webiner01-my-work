(function () {
  const config = window.ChatBotConfig || {};
  const embedKey = config.embedKey;

  if (!embedKey) {
    console.error('ChatBot widget: window.ChatBotConfig.embedKey is required');
    return;
  }

  const API_URL = 'http://localhost:4000';
  const VISITOR_KEY = 'chatbot_visitor_id';
  const CONV_KEY = 'chatbot_conv_' + embedKey;

  const state = {
    open: false,
    messages: [],
    botInfo: null,
    sending: false,
    conversationId: localStorage.getItem(CONV_KEY) || null,
  };

  function getVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  }

  const visitorId = getVisitorId();

  // ---------- CSS ----------

  const style = document.createElement('style');
  style.textContent = `
    .cbsaas-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 9999px;
      background: #4F46E5;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      z-index: 999998;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      padding: 0;
    }
    .cbsaas-button svg {
      width: 28px;
      height: 28px;
      fill: #ffffff;
    }
    .cbsaas-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 600px;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
      z-index: 999999;
      display: none;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .cbsaas-panel.cbsaas-open {
      display: flex;
    }
    .cbsaas-header {
      padding: 12px 16px;
      background: #4F46E5;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
    }
    .cbsaas-header-title {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .cbsaas-header-status {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 400;
      opacity: 0.85;
    }
    .cbsaas-header-dot {
      width: 7px;
      height: 7px;
      border-radius: 9999px;
      background: #4ade80;
      box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.35);
      flex-shrink: 0;
    }
    .cbsaas-header-close {
      background: none;
      border: none;
      color: #ffffff;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      padding: 0;
    }
    .cbsaas-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      background: #ffffff;
    }
    .cbsaas-msg {
      max-width: 75%;
      padding: 9px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .cbsaas-msg-user {
      background: linear-gradient(135deg, #6366f1, #4338ca);
      color: #ffffff;
      margin-left: auto;
      box-shadow: 0 2px 6px rgba(67, 56, 202, 0.25);
    }
    .cbsaas-msg-bot {
      background: #f1f5f9;
      color: #1e293b;
      margin-right: auto;
    }
    .cbsaas-msg-error {
      background: #fef2f2;
      color: #b91c1c;
      margin-right: auto;
    }
    .cbsaas-typing {
      background: #f1f5f9;
      margin-right: auto;
      padding: 12px 14px;
      border-radius: 12px;
      display: flex;
      gap: 4px;
      width: fit-content;
    }
    .cbsaas-typing span {
      width: 6px;
      height: 6px;
      border-radius: 9999px;
      background: #94a3b8;
      animation: cbsaas-bounce 1.2s infinite ease-in-out;
    }
    .cbsaas-typing span:nth-child(2) {
      animation-delay: 0.15s;
    }
    .cbsaas-typing span:nth-child(3) {
      animation-delay: 0.3s;
    }
    @keyframes cbsaas-bounce {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
      30% { transform: translateY(-4px); opacity: 1; }
    }
    .cbsaas-input-row {
      border-top: 1px solid #e2e8f0;
      padding: 12px;
      display: flex;
      gap: 8px;
    }
    .cbsaas-input {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 14px;
      outline: none;
    }
    .cbsaas-input:focus {
      border-color: #4F46E5;
    }
    .cbsaas-send {
      background: #4F46E5;
      color: #ffffff;
      width: 40px;
      height: 40px;
      border-radius: 9999px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cbsaas-send:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .cbsaas-send svg {
      width: 16px;
      height: 16px;
      fill: #ffffff;
    }
    @media (max-width: 480px) {
      .cbsaas-panel {
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        border-radius: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // ---------- DOM ----------

  const button = document.createElement('button');
  button.className = 'cbsaas-button';
  button.setAttribute('aria-label', 'Open chat');
  button.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';

  const panel = document.createElement('div');
  panel.className = 'cbsaas-panel';

  const header = document.createElement('div');
  header.className = 'cbsaas-header';
  const headerTitleGroup = document.createElement('div');
  headerTitleGroup.className = 'cbsaas-header-title';
  const headerTitle = document.createElement('span');
  headerTitle.textContent = 'Chat';
  const headerStatus = document.createElement('span');
  headerStatus.className = 'cbsaas-header-status';
  headerStatus.innerHTML = '<span class="cbsaas-header-dot"></span>Bot is online';
  headerTitleGroup.appendChild(headerTitle);
  headerTitleGroup.appendChild(headerStatus);
  const closeBtn = document.createElement('button');
  closeBtn.className = 'cbsaas-header-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.setAttribute('aria-label', 'Close chat');
  header.appendChild(headerTitleGroup);
  header.appendChild(closeBtn);

  const messagesEl = document.createElement('div');
  messagesEl.className = 'cbsaas-messages';

  const inputRow = document.createElement('div');
  inputRow.className = 'cbsaas-input-row';
  const input = document.createElement('input');
  input.className = 'cbsaas-input';
  input.type = 'text';
  input.placeholder = 'Type a message...';
  const sendBtn = document.createElement('button');
  sendBtn.className = 'cbsaas-send';
  sendBtn.setAttribute('aria-label', 'Send message');
  sendBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>';
  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  panel.appendChild(header);
  panel.appendChild(messagesEl);
  panel.appendChild(inputRow);

  document.body.appendChild(button);
  document.body.appendChild(panel);

  // ---------- rendering ----------

  function appendMessage(role, content) {
    const bubble = document.createElement('div');
    bubble.className =
      'cbsaas-msg ' +
      (role === 'user' ? 'cbsaas-msg-user' : role === 'error' ? 'cbsaas-msg-error' : 'cbsaas-msg-bot');
    bubble.textContent = content;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function showTyping() {
    const typing = document.createElement('div');
    typing.className = 'cbsaas-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(typing);
    scrollToBottom();
    return typing;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function applyPrimaryColor(color) {
    button.style.background = color;
    header.style.background = color;
    sendBtn.style.background = color;
  }

  // ---------- behavior ----------

  let loadedBotInfo = false;

  async function ensureBotInfo() {
    if (loadedBotInfo) return;
    loadedBotInfo = true;
    try {
      const res = await fetch(`${API_URL}/api/bots/public/${embedKey}`);
      if (!res.ok) throw new Error('Failed to load bot info');
      const data = await res.json();
      state.botInfo = data;
      headerTitle.textContent = data.name;
      applyPrimaryColor(data.primaryColor);
      appendMessage('bot', data.welcomeMessage);
    } catch (err) {
      headerTitle.textContent = 'Chat';
      appendMessage('error', 'Sorry, something went wrong.');
    }
  }

  function togglePanel() {
    state.open = !state.open;
    panel.classList.toggle('cbsaas-open', state.open);
    if (state.open) {
      ensureBotInfo();
      input.focus();
    }
  }

  button.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', togglePanel);

  async function sendMessage() {
    const text = input.value.trim();
    if (!text || state.sending) return;

    appendMessage('user', text);
    state.messages.push({ role: 'user', content: text });
    input.value = '';
    const typing = showTyping();

    state.sending = true;
    input.disabled = true;
    sendBtn.disabled = true;

    try {
      const res = await fetch(`${API_URL}/api/chat/${embedKey}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          conversationId: state.conversationId,
          message: text,
        }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      typing.remove();
      appendMessage('bot', data.reply);
      state.messages.push({ role: 'assistant', content: data.reply });
      state.conversationId = data.conversationId;
      localStorage.setItem(CONV_KEY, data.conversationId);
    } catch (err) {
      typing.remove();
      appendMessage('error', 'Sorry, something went wrong.');
    } finally {
      state.sending = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
})();
