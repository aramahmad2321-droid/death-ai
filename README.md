# Zana AI ✦

> **زانا** — The Knowledgeable One. A premium, full-stack AI chat assistant with Kurdish Sorani, Arabic, and English support.

![Zana AI](public/assets/favicon.svg)

## 🚀 Quick Start

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas URI)
- An AI API key (OpenAI, Anthropic, or OpenRouter)

### 1. Clone & Install

```bash
cd "crab ai"
npm install
```

### 2. Configure `.env`

Open [`.env`](.env) and set your values:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Change to a strong random string |
| `OPENAI_API_KEY` | ✅ | Your AI provider API key |
| `OPENAI_MODEL` | ✅ | e.g. `gpt-4o-mini`, `claude-3-5-sonnet-20241022` |
| `AI_BASE_URL` | ✅ | e.g. `https://api.openai.com/v1` |
| `GOOGLE_CLIENT_ID` | ⚪ | For Google OAuth (optional) |
| `EMAIL_USER` | ⚪ | For verification emails (optional) |

#### Using OpenRouter (free models available)

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-or-v1-your-openrouter-key
AI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=anthropic/claude-3.5-sonnet
```

#### Using Anthropic directly

```env
AI_PROVIDER=anthropic
OPENAI_API_KEY=sk-ant-your-anthropic-key
AI_BASE_URL=https://api.anthropic.com/v1
OPENAI_MODEL=claude-3-5-sonnet-20241022
```

### 3. Start MongoDB

```bash
# Local MongoDB
mongod --dbpath /data/db

# Or use MongoDB Atlas — paste the URI in MONGODB_URI
```

### 4. Run the server

```bash
npm run dev      # Development (auto-restarts with nodemon)
npm start        # Production
```

Visit: **http://localhost:3000**

---

## 📁 Project Structure

```
zana-ai/
├── server/
│   ├── server.js              # Express app entry
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── passport.js        # Auth strategies (JWT + Google)
│   ├── controllers/           # Route handlers
│   ├── middleware/            # Auth, rate limit, validation
│   ├── models/                # Mongoose models (User, Chat, ApiLog)
│   ├── routes/                # API route definitions
│   └── services/             # AI, email, PDF export
│
├── public/
│   ├── index.html             # Landing page
│   ├── auth.html              # Login / Register
│   ├── chat.html              # Chat interface
│   ├── admin.html             # Admin dashboard
│   ├── css/
│   │   ├── main.css           # Design system & tokens
│   │   ├── chat.css           # Chat UI
│   │   ├── auth.css           # Auth pages
│   │   ├── landing.css        # Landing page
│   │   └── admin.css          # Admin panel
│   ├── js/
│   │   ├── app.js             # Core: API client, auth, i18n, themes
│   │   ├── chat.js            # Chat engine (streaming, markdown)
│   │   ├── sidebar.js         # Chat history sidebar
│   │   ├── auth.js            # Auth page logic
│   │   ├── settings.js        # Settings panel
│   │   ├── voice.js           # Speech-to-text / TTS
│   │   ├── export.js          # PDF/TXT export
│   │   ├── admin.js           # Admin dashboard
│   │   └── landing.js         # Landing page animations
│   ├── assets/                # Icons, images
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service worker
│
├── .env                       # Environment config (don't commit!)
├── .env.example               # Template
└── package.json
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🌐 **Languages** | Kurdish Sorani (RTL), Arabic (RTL), English |
| 🤖 **AI Streaming** | Server-Sent Events (SSE) with abort support |
| 💻 **Code Blocks** | Syntax highlighting (highlight.js) + copy button |
| 📝 **Markdown** | Full GFM markdown rendering (marked.js) |
| 🎙️ **Voice** | Web Speech API: mic input + TTS output |
| 📎 **File Upload** | PDF, Word, images, text analysis |
| 📥 **Export** | PDF (pdfkit) + plain TXT |
| 🔒 **Security** | Helmet, rate limiting, JWT, bcrypt, sanitization |
| 📱 **PWA** | Installable, service worker, offline shell |
| 🛡️ **Admin** | User management, API logs, usage charts |

---

## 🔧 API Endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password/:token`
- `GET  /api/auth/verify/:token`
- `GET  /api/auth/google` (OAuth)
- `GET  /api/auth/me`

### Chats
- `GET    /api/chats` — List all chats
- `POST   /api/chats` — Create chat
- `GET    /api/chats/:id` — Get chat with messages
- `PUT    /api/chats/:id` — Update title/pin/favorite
- `DELETE /api/chats/:id` — Delete chat
- `GET    /api/chats/:id/export?format=pdf|txt` — Export

### AI
- `POST /api/ai/generate` — Stream AI response (SSE)
- `POST /api/ai/stop` — Abort generation
- `POST /api/ai/upload` — Upload file for analysis

### Admin
- `GET /api/admin/stats` — Platform statistics
- `GET /api/admin/users` — User list with pagination
- `PUT /api/admin/users/:id` — Update user role/status
- `GET /api/admin/logs` — API request logs

---

## 🌍 Kurdish Support

Zana was built **Kurdish-first**:

- RTL layout support for Sorani and Arabic
- Noto Sans Arabic and Noto Kufi Arabic fonts
- Full i18n translation layer (Kurdish, Arabic, English)
- Language auto-detection from message content
- AI instructed to respond in the user's language

---

## 📄 License

MIT — built with ❤️ for Kurdistan and the world.
