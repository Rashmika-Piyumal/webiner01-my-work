# PROJECT_CONTEXT.md

> Place this file in the root of your `chatbot-saas/` project before running any Claude Code prompts. Every prompt references this file as the source of truth.

## Mission
Multi-tenant AI chatbot SaaS. Owners create AI bots, embed on websites, view conversations + captured leads in a real-time CRM dashboard.

## Stack (LOCKED — do not substitute)
- Backend: Node.js + Express, MongoDB (Mongoose), Socket.IO, JWT auth
- AI: Anthropic Claude API (model: `claude-haiku-4-5-20251001`)
- Dashboard: React 18 + Vite + Tailwind CSS + React Router
- Widget: Vanilla JavaScript (no framework, no build tool — single file)
- HTTP client (dashboard): native fetch
- State management: React Context (no Redux)

## Project Structure
```
chatbot-saas/
├── server/               # Express + Mongoose + Socket.IO
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/       # User, Bot, Conversation, Message, Lead
│   │   ├── routes/       # auth, bots, chat (public), conversations, leads
│   │   ├── middleware/   # auth (JWT)
│   │   ├── services/     # claudeService.js, leadDetector.js
│   │   ├── socket/       # io setup
│   │   └── index.js      # entry
│   ├── .env
│   └── package.json
├── client/               # React dashboard (Vite)
│   ├── src/
│   │   ├── pages/        # Login, Signup, Dashboard, BotEditor
│   │   ├── components/   # Layout, ProtectedRoute, ConversationsTab, LeadsTab, EmbedCodeTab
│   │   ├── context/      # AuthContext
│   │   ├── lib/          # api.js, socket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── widget/               # Embeddable JS widget
│   ├── widget.js         # ENTIRE WIDGET in this single file
│   └── index.html
├── demo-site/            # Test website that embeds the widget
│   └── index.html
└── PROJECT_CONTEXT.md
```

## Data Models

### User
```js
{
  _id: ObjectId,
  email: String (unique, lowercase),
  passwordHash: String,
  name: String,
  createdAt: Date
}
```

### Bot
```js
{
  _id: ObjectId,
  userId: ObjectId (ref User),
  name: String,                  // "Acme Store Assistant"
  welcomeMessage: String,        // shown when widget opens
  businessKnowledge: String,     // free-text, max 8000 chars — injected into Claude system prompt
  primaryColor: String,          // hex, default "#4F46E5"
  embedKey: String (unique),     // public key used in embed snippet
  createdAt: Date
}
```

### Conversation
```js
{
  _id: ObjectId,
  botId: ObjectId (ref Bot),
  visitorId: String,             // generated client-side, persisted in localStorage
  startedAt: Date,
  lastMessageAt: Date,
  messageCount: Number (default 0)
}
```

### Message
```js
{
  _id: ObjectId,
  conversationId: ObjectId (ref Conversation),
  role: String (enum: "user", "assistant"),
  content: String,
  createdAt: Date
}
```

### Lead
```js
{
  _id: ObjectId,
  botId: ObjectId (ref Bot),
  conversationId: ObjectId (ref Conversation),
  email: String (optional),
  phone: String (optional),
  name: String (optional),
  capturedAt: Date
}
```

## API Endpoints

### Auth (no middleware)
- `POST /api/auth/signup` — body: `{ email, password, name }` → `{ token, user }`
- `POST /api/auth/login` — body: `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` — auth required → `{ user }`

### Bots (auth required)
- `GET /api/bots` — list user's bots
- `POST /api/bots` — create bot
- `GET /api/bots/:id` — get one
- `PATCH /api/bots/:id` — update
- `DELETE /api/bots/:id` — delete + cascade delete conversations/messages/leads

### Public Bot Info (no auth — for widget)
- `GET /api/bots/public/:embedKey` — returns `{ name, welcomeMessage, primaryColor }`

### Chat (PUBLIC — no auth, called by widget)
- `POST /api/chat/:embedKey/message`
  - body: `{ visitorId, conversationId?, message }`
  - returns: `{ conversationId, reply }`
  - Server: looks up bot by embedKey, finds/creates conversation, calls Claude with last 10 messages of history, saves messages, runs lead detection, emits Socket.IO events.

### Conversations (auth required)
- `GET /api/bots/:botId/conversations` — list (max 50, sorted by lastMessageAt desc)
- `GET /api/conversations/:id/messages` — full message history (asc)

### Leads (auth required)
- `GET /api/bots/:botId/leads` — list, sorted by capturedAt desc
- `GET /api/bots/:botId/leads/export` — CSV download

## Socket.IO Events

**Server emits:**
- `conversation:new` → when new conversation starts. Payload: `{ conversation, botId }`
- `message:new` → when message saved (user or assistant). Payload: `{ message, conversationId, botId }`
- `lead:new` → when lead captured/updated. Payload: `{ lead, botId }`

**Client subscribes:**
- After connect, emit `authenticate` with `{ token }`.
- Then emit `subscribe:bot` with `botId`. Server verifies ownership, joins room `bot:<botId>`.
- Server emits to `bot:<botId>` room only.

## Conventions

- **Errors:** API returns `{ error: "message" }` with HTTP status (400, 401, 404, 500).
- **Validation:** Reject empty/invalid inputs with 400 + clear message.
- **Async:** Use async/await everywhere. Wrap route handlers in try/catch.
- **CORS:** Allow `CLIENT_URL` for protected endpoints; allow `*` for `/api/chat/*` and `/api/bots/public/*`.
- **Auth header:** `Authorization: Bearer <token>`.
- **Naming:** camelCase for JS, kebab-case for files, PascalCase for React components.
- **No TypeScript** — keep build fast. ESLint disabled.
- **No tests** — visual verification only.
- **No console.logs** in final code (except errors).

## Claude API Service Spec

`server/src/services/claudeService.js` exports:
```js
async function generateReply({ bot, conversationHistory, userMessage }) {
  // builds system prompt with bot.businessKnowledge
  // calls Claude API with full message history
  // returns assistant text reply
}
```

**System prompt template:**
```
You are {bot.name}, a helpful AI assistant for a business. Use the following business information to answer customer questions accurately and concisely:

---BUSINESS INFO---
{bot.businessKnowledge}
---END BUSINESS INFO---

Rules:
- Answer in the same language the customer uses (English, Sinhala, or mixed).
- Keep replies concise — 2-4 sentences typical.
- If you don't know something, say so honestly and offer to take their contact info so the team can follow up.
- If the customer asks something unrelated to the business, politely steer back.
- Never make up information not in the business info above.
```

**Model:** `claude-haiku-4-5-20251001`
**Max tokens:** 500
**History:** last 10 messages from the conversation, before adding the current user message.

## Lead Detection Spec

`server/src/services/leadDetector.js` exports:
```js
function detectLead(text) {
  // returns { email?: string, phone?: string }
}
```

- Email regex: `/[\w.-]+@[\w.-]+\.\w{2,}/i`
- Phone regex (handles SL local + international): `/(?:\+?\d{1,3}[\s-]?)?(?:0)?\d{9,11}/`

When called inside chat handler on the user's message:
- If email or phone found, find existing Lead for the conversation.
  - If found: update its email/phone fields (keep existing values if new value is empty).
  - If not found: create new Lead with botId, conversationId, and detected fields.
- Emit `lead:new` event after save.

## Widget Behavior Spec

**File:** `widget/widget.js` — single file, vanilla JS, ~300 lines max.

**Loading snippet (what owners paste on their site):**
```html
<script>
  (function(w,d){
    w.ChatBotConfig = { embedKey: 'EMBED_KEY_HERE' };
    var s = d.createElement('script');
    s.src = 'http://localhost:5174/widget.js';
    s.async = 1;
    d.head.appendChild(s);
  })(window, document);
</script>
```

**Behavior:**
1. On load, read `window.ChatBotConfig.embedKey`.
2. Generate `visitorId` if not in `localStorage.chatbot_visitor_id` (use `crypto.randomUUID()`).
3. Read `conversationId` from `localStorage.chatbot_conv_<embedKey>` if exists.
4. Inject floating button (bottom-right, 60×60px, primary color circle with chat-bubble SVG icon).
5. On click → toggle chat panel (380px × 600px, white card, shadow-xl, rounded).
6. Chat panel structure:
   - Header: bot name + close (×) button
   - Messages area (scrollable, flex 1)
   - Input row: text input + send button
7. On first open, fetch `GET /api/bots/public/:embedKey` to get `{ name, welcomeMessage, primaryColor }`. Render welcome message as the first assistant message.
8. On send:
   - Disable input
   - Render user message immediately (right-aligned)
   - Render typing indicator (3 animated dots, left-aligned)
   - `POST /api/chat/:embedKey/message`
   - On response: remove typing, render assistant message (left-aligned), save returned `conversationId` to localStorage
   - Re-enable input, focus
9. Mobile responsive: full-screen panel at viewport width < 480px.
10. All CSS injected via `<style>` tag at runtime. Namespace ALL classes `.cbsaas-*` to avoid conflicts with host site.

**Backend URL:** hardcode `http://localhost:4000` for the demo build.

## Dashboard UI Spec

**Routes:**
- `/login`, `/signup` — public
- `/` — dashboard (bot list)
- `/bots/new` — create bot form
- `/bots/:id` — bot editor (Settings + tabs: Conversations, Leads, Embed Code)

**Bot detail page tabs:**

**Settings tab:** form to edit name, welcomeMessage, businessKnowledge (textarea), primaryColor (color picker). Save button → PATCH.

**Conversations tab:**
- Two-pane: left = scrollable conversation list (visitor short id, last message time, message count badge). Right = selected conversation's messages.
- User messages right-aligned (primary color), assistant messages left-aligned (slate-100 bg).
- Live updates via Socket.IO:
  - `conversation:new` → prepend to list
  - `message:new` → if matches selected conversation, append to thread + autoscroll. Update list item.
- Auto-scroll messages on new message.

**Leads tab:**
- Table: Name, Email, Phone, Captured At, Conversation (button "View" → switch to Conversations tab with that conv selected).
- "Export CSV" button — fetch /export endpoint with auth, blob → download.
- `lead:new` event → prepend with brief flash highlight.

**Embed Code tab:**
- Code block showing the embed snippet with the bot's actual `embedKey`.
- "Copy" button (use `navigator.clipboard.writeText`).
- Below: instructions: "Paste this snippet inside the `<head>` tag of your website."
- "Test in widget" link → opens `http://localhost:5175` in new tab.

**Styling:** Tailwind. Clean minimal. Slate/indigo palette. `rounded-lg`, `shadow-sm`, `text-slate-700`. No fancy animations.

## Demo Site Spec

`demo-site/index.html` — fake business website. Single page. Title "Demo Coffee Shop":
- Hero with shop name and tagline
- "Our Menu" section with 3-4 fake items
- "Visit Us" section with fake address
- Tailwind via CDN
- Embed widget snippet in `<head>` with the demo bot's `embedKey`

Serve with `npx serve demo-site -p 5175`.

## Environment Variables

`server/.env`:
```
MONGODB_URI=mongodb+srv://...
ANTHROPIC_API_KEY=sk-ant-api03-...
JWT_SECRET=any-random-string-min-32-chars
PORT=4000
CLIENT_URL=http://localhost:5173
WIDGET_URL=http://localhost:5174
```

`client/.env`:
```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```
