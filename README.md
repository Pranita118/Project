# Paper Analyzer
Paper Mentor a Basic Paper Analyzer
# PaperMentor 📚
### AI-Powered Past Paper Analyzer & Mock Test Engine
**Powered by Groq · llama-3.3-70b · Works 100% in your browser**

---

## What is PaperMentor?

PaperMentor is a free, browser-based tool that reads your past exam papers and turns them into a complete study system — automatically. Upload papers from any subject, and the AI extracts every topic, ranks them by importance, maps your syllabus coverage, predicts what's likely to appear next, builds a study schedule, generates practice questions, and lets you take a full timed mock test — all without installing anything.

It works for every domain: Engineering, Medicine, Law, Commerce, Arts, Sciences, Competitive Exams (JEE, NEET, UPSC, GATE, CAT), and school or university papers of any kind.

---

## Quick Start

**Step 1 — Run the local server** (required for AI to work)

```bash
python3 start.py
```

Your browser opens automatically at `http://localhost:8080`

> **Why a local server?** Browsers block API calls when you open HTML directly via `file://` due to CORS policy. The server takes 5 seconds to start and fixes this permanently.

**Step 2 — Upload your papers**

Go to **📤 Data Upload** in the sidebar. Drop in your PDF, image, or text files. You can upload papers from multiple years at once. Assign a year to each file using the dropdown next to it.

> Don't have papers yet? Click **"Load Sample Dataset"** to try with a built-in demo.

**Step 3 — Configure**

Fill in your subject name, academic level, and exam date. Paste your syllabus topics (one per line) for gap analysis. You can also load a ready-made sample syllabus for CS, Math, Physics, Biology, Law, Medicine, Economics, or History.

**Step 4 — Click "Analyze with AI"**

The AI reads all your papers, extracts topics, scores them, maps your syllabus, and generates your full study system. This takes 20–60 seconds depending on how many papers you uploaded.

**Step 5 — Explore your results**

Navigate the sidebar to use each feature.

---

## Features

### 📊 Overview Dashboard
A full visual summary of your exam data — top high-yield topics as a bar chart, question type distribution as a donut chart, year-wise trend lines, a topic frequency heatmap, and key AI-generated insights about your papers.

### 🏆 Topic Importance Ranking
Every topic extracted from your papers is ranked by a priority score based on how frequently it appears, how recently it showed up, and how much weight it carries in marks. Topics are classified as High, Medium, or Low priority. You can filter and search the full table.

### 📋 Syllabus Coverage Map
Cross-references your extracted topics against the syllabus you provided. Shows you exactly which topics are well-covered, which are rarely tested, and which have never appeared — the "gap topics" that could surprise you in the exam. Includes a visual donut chart and a full topic-by-topic status list.

### 🔮 Exam Predictions
AI predicts which topics are most likely to appear in your next exam based on trend analysis across all uploaded years. Each prediction comes with a probability estimate and the reasoning behind it. Lower-probability topics are flagged so you can safely deprioritize them.

### 📅 Smart Study Planner
Generates a prioritized, week-by-week study schedule based on topic importance, difficulty, and your exam date. You can set how many weeks you have and regenerate the plan. High-priority topics are front-loaded; revision and past-paper practice are built into the later weeks.

### ✏️ Practice Questions
AI generates exam-style questions for your highest-priority topics, matching the question types, difficulty levels, and marks distribution found in your actual papers. Each question comes with a difficulty rating, marks, a topic tag, and a hint. You can filter by priority level and generate more questions on demand — by topic, type, difficulty, and count.

### 🎯 Mock Test
Take a full timed mock exam built from your uploaded papers. Configure the number of questions (5, 10, 15, or 20), question types (mixed, MCQ only, short answer, long answer), difficulty, and time limit. The AI generates a fresh paper each time. During the test, a live countdown timer tracks your time with color-coded urgency (green → gold → red). A progress bar shows how many questions you've answered. After you submit, the AI evaluates every answer individually — assigns marks, writes feedback, and shows you the model answer side by side. You get a final grade with a full question-by-question breakdown.

### 📄 Analysis Report
Generates a complete downloadable HTML report of your full analysis — papers analyzed, topic rankings, syllabus coverage, predictions, and the study plan. You can also print it as a PDF directly from your browser.

### ✨ AI Assistant
A chat interface powered by Groq AI. Ask anything about your papers, topics, study strategies, or concepts. The assistant has full context of your analysis. Quick-action chips let you instantly ask for your top topics, coverage gaps, a crash study plan, or practice questions.

---

## Running the App — Three Methods

### Method 1 — Python (recommended, zero install)
```bash
python3 start.py
```
Works on Windows, Mac, and Linux. Python comes pre-installed on most systems.

### Method 2 — VS Code Live Server
1. Open this folder in VS Code
2. Install the "Live Server" extension
3. Right-click `index.html` → **Open with Live Server**

### Method 3 — Node.js
```bash
npx serve . -l 8080
```

---

## File Structure

```
PaperMentor/
├── index.html      ← App structure and all page layouts
├── style.css       ← All styles, themes, and component CSS
├── app.js          ← All logic — AI calls, analysis, rendering
├── start.py        ← One-click local server launcher
└── README.md       ← This file
```

All logic lives in `app.js`. All styles live in `style.css`. There is no build step, no framework, no dependencies to install. It runs entirely in your browser.

---

## Supported File Types

| Format | Notes |
|--------|-------|
| PDF | Text-based PDFs are extracted automatically using PDF.js. Scanned PDFs have reduced accuracy — use text-based where possible. |
| JPG / PNG | Image files are described to the AI by filename and subject context. |
| TXT | Plain text question papers work perfectly and are the fastest to process. |

---

## API Key

PaperMentor uses the Groq API for all AI features. A key is hardcoded in `app.js`:

```js
const GROQ_API_KEY = 'gsk_...';
```

If the key expires or hits its limit, get a free replacement at [console.groq.com](https://console.groq.com) and paste it in place of the existing value in `app.js`. Groq's free tier is generous and typically handles hundreds of analyses per day.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + U` | Go to Data Upload |
| `Alt + D` | Go to Dashboard |
| `Alt + A` | Go to AI Assistant |
| `Alt + R` | Reset all data |
| `Enter` | Send chat message |
| `Shift + Enter` | New line in chat |

---

## Tips for Best Results

**Upload more years.** The more years of papers you provide, the more accurate the topic rankings and predictions become. Minimum 1 paper works, but 5+ years gives meaningful trends and 10+ gives high prediction confidence.

**Include your full syllabus.** Paste all official syllabus topics before analyzing. Even topics that have never appeared in past papers are valuable — they show up in the gap analysis as potential surprise questions.

**Use text-based PDFs.** If your papers are scanned images inside a PDF, the AI gets less usable content. Digital PDFs (where you can select text) extract cleanly and give far better results.

**Use the AI Assistant actively.** After analysis, the assistant knows your full results. Ask it for a crash course plan, ask it to explain a hard topic, or ask it to generate 10 practice questions on a specific subject.

**Re-analyze when you add papers.** If you get a new past paper mid-study, add it to the upload list and click Analyze again. All rankings, predictions, and the study plan update automatically.

---

## Privacy

All file processing happens in your browser. Your uploaded papers are read locally on your device and are never stored on any server. Paper content is sent to Groq's API for AI analysis, but only during the analysis call and subject to Groq's standard privacy policy. No data is retained by PaperMentor itself.

---

## Deploy Online (Share with Anyone)

### Netlify Drop (instant, free)
1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire PaperMentor folder onto the page
3. Get a public URL instantly — share it with anyone

### GitHub Pages (free, permanent)
1. Push this folder to a GitHub repository
2. Go to repo **Settings → Pages → Deploy from main branch**
3. Your app goes live at `https://username.github.io/repo-name`

---

## Frequently Asked Questions

**Why can't I just open index.html directly?**
Browsers block API calls from `file://` URLs for security reasons. Running any of the three server methods above fixes this in under 10 seconds.

**How many papers should I upload?**
1 paper gives basic analysis. 3–5 years gives good trend detection. 7–10+ years gives highly accurate predictions.

**What subjects does it support?**
Any written exam in any subject — Engineering, Medicine, Law, Commerce, Arts, Sciences, Languages, Competitive exams (UPSC, JEE, NEET, GATE, CAT, BAR), school exams, university exams. If it's a written paper, PaperMentor can analyze it.

**Why is analysis taking a long time?**
The AI reads all uploaded papers and generates a comprehensive JSON analysis in one pass. For 5+ large papers, this typically takes 30–90 seconds. It's normal — wait for the loading screen to complete.

**The mock test failed to generate. What do I do?**
Make sure you've analyzed your papers first. If the error persists, try reducing the question count to 5 or 10, or check that your Groq API key is valid at [console.groq.com](https://console.groq.com).

**Is there a mobile version?**
PaperMentor works in mobile browsers. For best experience, use it on a tablet or desktop where you have a full keyboard for writing mock test answers.

---

*PaperMentor · Powered by Groq AI (llama-3.3-70b) · All Domains · 2026*
