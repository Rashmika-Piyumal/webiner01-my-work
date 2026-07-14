# Claude Code Prompts — Live Webinar Cheatsheet

> Copy-paste these prompts into Claude Code in order. Keep this file open during the live demo on a second monitor.

**Before starting:** Ensure `PROJECT_CONTEXT.md` is in the project root, MongoDB Atlas + Anthropic API key are set up, `server/.env` is configured.

---

## PROMPT 1 — Project Bootstrap

```
Read PROJECT_CONTEXT.md first and confirm you understand the structure.

Then bootstrap the entire project:

1. In server/, run `npm init -y` and install:
   express mongoose dotenv cors bcryptjs jsonwebtoken socket.io @anthropic-ai/sdk
   And dev dependency: nodemon

2. In client/, scaffold a Vite React app:
   `npm create vite@latest . -- --template react`
   Then install: react-router-dom tailwindcss postcss autoprefixer socket.io-client
   Initialize Tailwind. Configure tailwind.config.js content paths.

3. In widget/, no package.json needed yet. Just create the empty widget.js file.

4. In demo-site/, create a basic index.html stub.

5. Create root package.json with concurrently scripts:
   - "dev": runs server, client, widget server, demo-site server in parallel
   - Install concurrently as root dev dep
   Use npx serve for widget (port 5174) and demo-site (port 5175)

6. Update root .gitignore to exclude node_modules, .env, dist, build.

After done, show me the resulting file tree with `tree -L 3 -I node_modules`.

Do not write any application code yet. This is scaffolding only.
```

**Verify:** `npm run dev` from root starts all 4 services without error.

---

## PROMPT 2 — Mongoose Models + DB Connection

```
Reference PROJECT_CONTEXT.md → Data Models section.

Create the following files in server/src/:

1. config/db.js — exports connectDB() that connects to MONGODB_URI from .env. Logs success/failure.

2. models/User.js — Mongoose schema per spec. Add a method comparePassword(plain). Add a pre-save hook to hash passwordHash if it's modified and not already hashed (check if it starts with $2 — bcrypt prefix).

3. models/Bot.js — schema per spec. embedKey should auto-generate using crypto.randomBytes(16).toString('hex') if not provided. Index on embedKey (unique).

4. models/Conversation.js — schema per spec. Index on botId.

5. models/Message.js — schema per spec. Index on conversationId.

6. models/Lead.js — schema per spec. Index on botId.

7. src/index.js — express app skeleton. Loads dotenv, calls connectDB, sets up CORS (allow CLIENT_URL by default; allow * for paths starting with /api/chat or /api/bots/public), express.json(), starts on PORT.

After creation, run the server and confirm DB connects. Show me the connection log.
```

**Verify:** Server starts, "MongoDB connected" log appears.

---

## PROMPT 3 — Auth (Signup, Login, Middleware)

```
Reference PROJECT_CONTEXT.md → API Endpoints → Auth section.

Create:

1. server/src/middleware/auth.js — JWT middleware. Reads Authorization header (Bearer <token>), verifies with JWT_SECRET, attaches req.userId. On failure returns 401 with clear error.

2. server/src/routes/auth.js — Express router with:
   - POST /signup: validate email format / password (min 6 chars) / name (min 1 char). Check if email exists (return 409 if yes). Create User with passwordHash set to plain (let pre-save hook hash). Return JWT (24h expiry) + user object (omit passwordHash).
   - POST /login: find user by email, comparePassword (return 401 on fail), return JWT + user.
   - GET /me: uses auth middleware, returns user from req.userId.

3. Mount in src/index.js: app.use('/api/auth', authRoutes).

4. Test all 3 endpoints with curl commands, show me the output:
   - Signup: curl -X POST localhost:4000/api/auth/signup -H "Content-Type: application/json" -d '{"email":"demo@test.lk","password":"demo123","name":"Demo Owner"}'
   - Login: curl -X POST localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"demo@test.lk","password":"demo123"}'
   - Me: curl localhost:4000/api/auth/me -H "Authorization: Bearer <TOKEN>"
```

**Verify:** Three curl commands all return expected output. Save the JWT token for next prompts.

---

## PROMPT 4 — Bots CRUD + Public Bot Info Endpoint

```
Reference PROJECT_CONTEXT.md → API Endpoints → Bots section.

Create server/src/routes/bots.js with full CRUD scoped to req.userId:

- POST /api/bots — create. Body: { name, welcomeMessage, businessKnowledge, primaryColor }. Auto-generate embedKey. Default primaryColor "#4F46E5", welcomeMessage "Hi! How can I help?".
- GET /api/bots — list user's bots only (filter by userId).
- GET /api/bots/:id — get one. 404 if not found OR not owned by user.
- PATCH /api/bots/:id — partial update. ONLY allow editing name, welcomeMessage, businessKnowledge, primaryColor (NOT embedKey, userId).
- DELETE /api/bots/:id — delete + cascade delete all conversations, messages, leads for this bot.

ALSO create a PUBLIC endpoint (no auth) at the SAME router OR a separate public router:
- GET /api/bots/public/:embedKey — returns { name, welcomeMessage, primaryColor } only. Used by widget on load.

Mount appropriately in src/index.js. Test with curl using the JWT from previous step:

1. Create one bot named "Demo Coffee Shop" with welcomeMessage "Welcome to Demo Coffee Shop! How can I help you today?" and businessKnowledge containing fake info: opening hours (8am-9pm Mon-Sun), location (No 123, Galle Road, Colombo 03), top items (Latte Rs.450, Cappuccino Rs.500, Espresso Rs.350, Cold Brew Rs.550), wifi free, parking available, dine-in + takeaway, phone +94 11 234 5678.

2. Show the bot's embedKey in the response — we'll use it later.

3. Test the public endpoint with that embedKey.
```

**Verify:** Bot created. **Note the `embedKey` value — you'll use it for the widget test.**

---

## PROMPT 5 — Claude AI Service + Public Chat Endpoint

```
Reference PROJECT_CONTEXT.md → Claude API Service Spec + Lead Detection Spec.

1. Create server/src/services/claudeService.js:
   - Import Anthropic from '@anthropic-ai/sdk'
   - Initialize client with ANTHROPIC_API_KEY
   - Export async function generateReply({ bot, conversationHistory, userMessage })
   - Build system prompt per the template in PROJECT_CONTEXT.md
   - Build messages array: conversationHistory mapped to {role, content}, then {role: 'user', content: userMessage} appended
   - Call client.messages.create with model 'claude-haiku-4-5-20251001', max_tokens 500
   - Return response.content[0].text

2. Create server/src/services/leadDetector.js:
   - Export detectLead(text) → returns { email, phone } (each undefined if not found)
   - Use the regexes from PROJECT_CONTEXT.md

3. Create server/src/routes/chat.js:
   - POST /api/chat/:embedKey/message (PUBLIC — no auth middleware)
   - Body: { visitorId, conversationId, message }
   - Validate visitorId and message present.
   - Find bot by embedKey, 404 if not found
   - Find Conversation: if conversationId given AND exists AND its botId matches bot._id AND its visitorId matches given visitorId → use it. Else create new Conversation with botId, visitorId, startedAt = now.
   - Load last 10 Messages for this conversation, sorted by createdAt asc — this is the history (BEFORE saving the new user message).
   - Save user message (role: "user", content: message).
   - Call claudeService.generateReply({ bot, conversationHistory: history, userMessage: message })
   - Save assistant message (role: "assistant", content: reply).
   - Update conversation: lastMessageAt = now, messageCount += 2, save.
   - Run detectLead on the user message. If email or phone found:
     - Find existing Lead for this conversationId. If found, update fields (only overwrite if new value present). If not, create new Lead with botId, conversationId, detected fields, capturedAt = now.
   - Return { conversationId: conversation._id, reply: assistantText }

4. Mount in src/index.js: app.use('/api/chat', chatRoutes).

5. Test: 
   - curl -X POST localhost:4000/api/chat/<EMBED_KEY>/message -H "Content-Type: application/json" -d '{"visitorId":"test1","message":"What time do you open?"}'
   - Run again with a follow-up: '{"visitorId":"test1","conversationId":"<CONV_ID_FROM_PREV>","message":"My email is demo@test.lk and phone 0771234567, please follow up"}'
   - Verify a Lead document exists in MongoDB.

Show me both responses and confirm the Lead was saved.
```

**Verify:** AI replies coherently in both calls. Check MongoDB → leads collection — entry exists with email and phone.

---

## PROMPT 6 — Conversations + Leads Endpoints + CSV Export

```
Reference PROJECT_CONTEXT.md → API Endpoints.

1. Create server/src/routes/conversations.js (auth required):
   - GET /api/bots/:botId/conversations — verify the bot is owned by req.userId, return conversations sorted by lastMessageAt DESC, limit 50.
   - GET /api/conversations/:id/messages — find conversation, verify its bot is owned by req.userId, return all messages sorted by createdAt ASC.

2. Create server/src/routes/leads.js (auth required):
   - GET /api/bots/:botId/leads — verify ownership, return leads sorted by capturedAt DESC.
   - GET /api/bots/:botId/leads/export — return CSV. Headers: "Name,Email,Phone,Captured At,Conversation ID". Set Content-Type: text/csv and Content-Disposition: attachment; filename="leads-<botId>.csv".

3. Mount both in src/index.js.

4. Test all endpoints with curl using your JWT and the bot id from earlier:
   - GET conversations
   - GET messages for the first conversation
   - GET leads
   - GET leads/export — should return CSV text
```

**Verify:** All 4 endpoints return expected data.

---

## PROMPT 7 — Socket.IO Real-Time Layer

```
Reference PROJECT_CONTEXT.md → Socket.IO Events.

1. In server/src/index.js, refactor:
   - Replace app.listen with createServer from 'http', create io with new Server(httpServer, { cors: { origin: CLIENT_URL } })
   - Pass io to setupSocket from new file
   - httpServer.listen on PORT

2. Create server/src/socket/index.js:
   - Export setupSocket(io) and getIo()
   - On 'connection': listen for 'authenticate' event with { token }. Verify JWT. If valid, save socket.userId. If invalid, emit 'auth:error' and disconnect.
   - Listen for 'subscribe:bot' with botId. Verify Bot exists AND botId.userId === socket.userId. socket.join(`bot:${botId}`). Emit 'subscribed' confirmation.
   - getIo() returns the singleton io instance for use in routes.

3. Update server/src/routes/chat.js:
   - Import getIo
   - When a NEW conversation is created (not reused), after saving emit `conversation:new` to room `bot:${bot._id}` with { conversation, botId: bot._id }
   - After saving the user message, emit `message:new` to `bot:${bot._id}` with { message, conversationId, botId }
   - After saving the assistant message, emit another `message:new` similarly
   - If a lead is created OR updated, emit `lead:new` with { lead, botId }

4. Test by creating a small test script `server/test-socket.js` that:
   - Connects via socket.io-client to http://localhost:4000
   - Emits 'authenticate' with the JWT
   - On confirmation, emits 'subscribe:bot' with the botId
   - Logs all incoming events: conversation:new, message:new, lead:new

5. Run the test script in one terminal. In another terminal, curl POST a chat message. Show me the events received by the test client.
```

**Verify:** Test client logs the conversation/message events as the curl chat happens.

---

## PROMPT 8 — React Dashboard: Auth + Bot Management

```
Reference PROJECT_CONTEXT.md → Dashboard UI Spec.

In client/src/, build:

1. lib/api.js — wrapper around fetch with auto-attached "Authorization: Bearer <token>" header (token from localStorage). Methods: get(path), post(path, body), patch(path, body), del(path). Throws on non-2xx with error message from response. Base URL: import.meta.env.VITE_API_URL || 'http://localhost:4000', appends /api.

2. context/AuthContext.jsx — provides { user, token, login, signup, logout, loading }. On mount, if token in localStorage, call /auth/me. login(email, password) and signup(email, password, name) call respective endpoints, save token, set user. logout clears.

3. components/ProtectedRoute.jsx — if loading, show spinner. If !user, redirect to /login. Else render children (Outlet).

4. components/Layout.jsx — sidebar (logo top "ChatBot SaaS", nav: "My Bots" → /, "Logout" button bottom) + main content area (Outlet).

5. pages/Login.jsx + pages/Signup.jsx — Tailwind centered card forms. Title, email, password (and name for signup), submit button, link to other page. Show error message inline.

6. pages/Dashboard.jsx — fetch /bots on mount. Grid of bot cards (3 cols on desktop, 1 mobile). Card: name (bold), small text "Embed key: <truncated>", "Open" button → navigate(/bots/:id). Top-right "+ New Bot" button → /bots/new. Empty state if no bots: "No bots yet. Create your first one!"

7. pages/BotEditor.jsx — handles BOTH /bots/new and /bots/:id (use useParams).
   - If new: empty form. On save: POST. Then navigate to /bots/:newId.
   - If existing: fetch bot, populate form.
   - Form fields (in a Settings tab): name (text), welcomeMessage (text), businessKnowledge (textarea, 8 rows, max 8000 chars + counter), primaryColor (input type="color").
   - Above form: bot name as page title + back button to /.
   - For existing bots: tab bar with [Settings | Conversations | Leads | Embed Code]. Settings shows the form. Other tabs render placeholder text for now: "Coming in next prompt".

8. App.jsx — React Router:
   - /login, /signup public
   - / wrapped in ProtectedRoute → Layout → Dashboard
   - /bots/new and /bots/:id wrapped same way → Layout → BotEditor

9. main.jsx — wrap App with BrowserRouter and AuthProvider.

10. Apply Tailwind throughout. Slate/indigo palette. Clean: rounded-lg, shadow-sm, text-slate-700 / text-slate-900, bg-white. Buttons: bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg.

Run `npm run dev` from client/. Test signup → login → create bot → edit bot. Show me a description of what each page looks like.
```

**Verify:** Browser flow works. Login, create a bot, edit it.

---

## PROMPT 9 — Dashboard: Conversations Tab + Live Socket.IO + Leads Tab + Embed Code Tab

```
Continue the dashboard. Reference PROJECT_CONTEXT.md.

1. lib/socket.js:
   - Export getSocket() — singleton socket.io-client instance connected to VITE_SOCKET_URL || 'http://localhost:4000'
   - On first call, connect, then emit 'authenticate' with stored token, await 'authenticated' confirmation.
   - Provide subscribeToBot(botId) helper that emits 'subscribe:bot' with botId.

2. components/ConversationsTab.jsx (props: botId):
   - Fetch /bots/:botId/conversations on mount.
   - State: conversations (array), selectedId (string), messages (array).
   - Layout: flex h-[600px]. Left: w-72 border-r, scrollable list. Each item: clickable, shows visitor short id (last 6 chars) + relative time + message count badge. Selected item bg-indigo-50.
   - Right: flex-1 flex flex-col. Top: conversation header. Middle: messages scroll area (px-4 py-3, space-y-2). Bottom: empty (this is read-only viewer).
   - When selectedId changes, fetch /conversations/:id/messages.
   - Message bubbles: user role → ml-auto bg-indigo-600 text-white, assistant → mr-auto bg-slate-100. max-w-[70%] px-3 py-2 rounded-lg.
   - On mount, also call subscribeToBot(botId). Listen for:
     - 'conversation:new' → if matches botId, prepend to conversations list.
     - 'message:new' → if matches selected conversationId, append to messages + autoscroll. Also update list item lastMessageAt.
   - Auto-scroll messages to bottom when messages change (useEffect + ref).
   - Empty states: "No conversations yet" if list empty; "Select a conversation" if none selected.

3. components/LeadsTab.jsx (props: botId):
   - Fetch /bots/:botId/leads on mount.
   - Table: thead [Name, Email, Phone, Captured, Conversation, Actions]. tbody rows. Empty cells show "—".
   - Top: "Export CSV" button. On click: fetch /bots/:botId/leads/export with auth (use api.js but get blob). Create blob URL, anchor download trigger.
   - Listen for 'lead:new' → if matches botId, prepend to list. Briefly add bg-yellow-50 class for 2 seconds (animate flash).
   - Empty state: "No leads captured yet."

4. components/EmbedCodeTab.jsx (props: bot):
   - Show <pre><code> block with the embed snippet, with bot.embedKey filled in.
   - "Copy Embed Code" button — uses navigator.clipboard.writeText. Show "Copied!" tooltip for 2 sec.
   - Below: muted text instructions: "Paste this snippet inside the <head> tag of your website. The chat widget will appear on every page."
   - "Test in widget" link → opens http://localhost:5175 in new tab.

5. Wire BotEditor.jsx tabs:
   - Manage activeTab state.
   - On tab click, render the corresponding component.
   - Pass botId or bot prop as needed.

Test end to end:
- Login, open the demo bot, click Conversations tab.
- In another browser/incognito, OR via curl, send a chat message.
- See the conversation appear live in the dashboard.
- Send a message with email — see lead flash in Leads tab.
- Copy embed code from Embed Code tab.

Confirm everything works.
```

**Verify:** Live updates work. Lead flash works. Copy button works.

---

## PROMPT 10 — Vanilla JS Widget + Demo Site

```
Reference PROJECT_CONTEXT.md → Widget Behavior Spec.

1. Create widget/widget.js as a single self-contained file. Vanilla JS, no dependencies, no build step.

   Structure:
   - IIFE wrapper around everything
   - Read window.ChatBotConfig.embedKey — if missing, console.error and return
   - Backend URL hardcoded: const API_URL = 'http://localhost:4000'
   - State object: { open: false, messages: [], botInfo: null, sending: false, conversationId: null }
   - Generate visitorId: localStorage.getItem('chatbot_visitor_id') || (newUUID and store)
   - Read conversationId from localStorage.getItem('chatbot_conv_' + embedKey)

   - Inject CSS via createElement('style'):
     - .cbsaas-button — fixed bottom-right 20px, 60×60 round, primary color (set via inline style after fetch), shadow, cursor pointer, z-index 999998, flex center, white svg icon.
     - .cbsaas-panel — fixed bottom 90px right 20px, w-380 h-600, white bg, rounded-xl, shadow-2xl, z-index 999999, flex column, overflow hidden, hidden when state.open false.
     - .cbsaas-header — px-4 py-3 bg-primary text-white flex justify-between, font-semibold.
     - .cbsaas-messages — flex-1 overflow-y-auto p-4 space (gap between).
     - .cbsaas-msg — max-width 75%, padding 8px 12px, border-radius 12px, font-size 14px, line-height 1.4.
     - .cbsaas-msg-user — primary color bg, white text, margin-left auto.
     - .cbsaas-msg-bot — bg #f1f5f9, text-#1e293b, margin-right auto.
     - .cbsaas-typing — same as bot bubble but shows 3 animated dots (CSS keyframes).
     - .cbsaas-input-row — border-top, padding 12px, flex gap-8.
     - .cbsaas-input — flex 1, border 1px solid #cbd5e1, rounded full, px-4 py-2, outline none on focus accent border.
     - .cbsaas-send — primary color bg, white text, w-40 h-40 rounded full, no border, cursor pointer.
     - @media (max-width: 480px) — .cbsaas-panel takes full screen (top 0 left 0 right 0 bottom 0, w-100% h-100%, rounded none).

   - Build DOM:
     - Floating button with chat-bubble SVG icon
     - Chat panel hidden initially
     - Append both to document.body

   - On button click → toggle state.open. If first open → fetch /api/bots/public/<embedKey>:
     - Set primary color CSS variable / button bg
     - Set header text to bot name
     - Append welcome message as bot message
   
   - On send (button click or Enter):
     - If empty or sending, ignore
     - Append user message bubble
     - Append typing indicator
     - state.sending = true, disable input
     - POST /api/chat/<embedKey>/message with body { visitorId, conversationId, message }
     - On success: remove typing, append bot reply, state.conversationId = response.conversationId, store in localStorage
     - On error: remove typing, show error bubble "Sorry, something went wrong."
     - Re-enable input, refocus
     - Auto-scroll messages container to bottom

2. Create widget/index.html — minimal page (just an <h1>Widget Server</h1>) so npx serve has something at root.

3. Create demo-site/index.html:
   - DOCTYPE, html, head with Tailwind CDN script
   - At end of <head>, embed snippet pointing to http://localhost:5174/widget.js with the EMBED_KEY of the demo bot
   - Body: hero section "Demo Coffee Shop" with tagline. Menu section with 3 fake items + prices. "Visit Us" section with fake address. All Tailwind, look reasonable.

4. Manually verify:
   - http://localhost:5175 loads the demo site
   - Chat bubble appears bottom right with primary color
   - Click → panel opens with welcome message
   - Type "What are your opening hours?" → AI replies correctly
   - Type "I want to order, my email is demo.user@test.lk and phone 0771234567" → AI acknowledges
   - In dashboard browser tab (Conversations tab open), the conversation appears live
   - In Leads tab, the lead appears with flash
   - Refresh demo site — chat history persists (conversationId from localStorage)

Show me the widget.js file. Walk through the key sections.
```

**Verify:** Full end-to-end demo works. THIS IS THE WEBINAR FINALE — make sure it works.

---

## PROMPT 11 — POLISH (only if time remains)

```
Polish pass — only if we have 20+ minutes remaining:

1. Make conversation bubbles prettier — slight gradient on user messages, better spacing.

2. Add empty states:
   - Dashboard with no bots → friendly illustration text + big CTA
   - Conversations tab with no convs → "Share your embed code to start receiving conversations" with copy button

3. Add a "Bot is online" green dot to widget header to make it feel alive.

4. Show messageCount and leadCount on bot cards in Dashboard (compute on backend GET /bots — add aggregations).

5. Clean up all console.logs except errors.

Skip if running short — the product works as-is.
```

---

## EMERGENCY PROMPTS (use if something breaks)

### Fix CORS issue
```
The widget is throwing CORS errors. The browser console shows: <PASTE ERROR>.
Update server/src/index.js CORS configuration to:
- Allow CLIENT_URL with credentials for /api/auth, /api/bots (not public), /api/conversations, /api/leads
- Allow * (no credentials) for /api/chat/* and /api/bots/public/*
Show me the updated CORS setup.
```

### Fix Socket.IO not connecting
```
The Socket.IO connection is failing with: <PASTE ERROR>.
Check both server/src/index.js (Socket.IO server setup with CORS) and client/src/lib/socket.js. Fix the issue and show me both files.
```

### Claude API error
```
The chat endpoint is returning an error from Claude API: <PASTE ERROR>.
Check server/src/services/claudeService.js. Likely issues: model name, API key, message format. Fix and test with one curl call.
```

### Generic fallback
```
[PASTE ERROR / WRONG OUTPUT].
Don't redo the whole feature — just fix this specific issue. Show me only the changed lines.
```
