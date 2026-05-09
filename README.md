# PaperMentor 📚
### AI Past Paper Analyzer

---

## ⚡ Quickest Start (Double-click)

**Windows:** Double-click `start.py` (needs Python installed)  
**Mac/Linux:** Open Terminal in this folder → `python3 start.py`

Your browser will open automatically at `http://localhost:8080`

---

## 📁 Project Structure

```
PaperMentor/
├── index.html      ← Main app (HTML structure)
├── style.css       ← All styles & themes
├── app.js          ← All logic, AI calls, analysis
├── start.py        ← One-click local server launcher
└── README.md       ← This file
```

---

## 🚀 Three Ways to Run

### Option 1 — Python (recommended, zero install)
```bash
python3 start.py
```

### Option 2 — VS Code Live Server
1. Open this folder in VS Code
2. Install "Live Server" extension
3. Right-click `index.html` → **Open with Live Server**

### Option 3 — Node.js
```bash
npx serve . -l 8080
```

---

## ❓ Why can't I just open index.html directly?

Browsers block API calls when you open HTML via `file://` for security reasons (CORS policy). Running a local server (any option above) takes 5 seconds and fixes this permanently.

---

## 🔑 API Key

The Groq API key is hardcoded in `app.js`:
```js
const GROQ_API_KEY = 'gsk_...';
```
Get a free key at [console.groq.com](https://console.groq.com) if the current one expires.

---

## 🌐 Deploy Online (share with anyone, no server needed)

**Netlify Drop** (free, instant):
1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag this entire folder onto the page
3. Get a public URL instantly — share it with anyone!

**GitHub Pages** (free):
1. Push this folder to a GitHub repo
2. Go to repo Settings → Pages → Deploy from main branch
3. Done — live at `https://username.github.io/repo-name`

