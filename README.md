# CogniAssess — Game-Based Aptitude Assessment

A lightweight, browser-based, game-based cognitive and aptitude assessment platform built with HTML, CSS, and vanilla JavaScript. No frameworks, no build tools, no dependencies.

---

## Features

- 8 interactive mini-games (pattern, memory, reaction, logic, spatial, calculation)
- 25-minute timed assessment with per-game timers
- Auto-submit when time expires
- Resume after accidental refresh
- Tab-switch tracking
- Duplicate submission prevention
- Google Sheets backend via Apps Script
- Mobile responsive with touch drag-and-drop
- CSV export from admin panel
- Skill-wise and game-wise scoring breakdown

---

## File Structure

```
game-aptitude-assessment/
├── index.html            # Learner login / registration
├── instructions.html     # Assessment instructions + start
├── assessment.html       # Main game assessment page
├── result.html           # Results + submission status
├── admin.html            # Admin result viewer
├── style.css             # All styles (responsive)
├── script.js             # Assessment flow, timer, scoring
├── games.js              # 8 mini-game implementations
├── storage.js            # localStorage, submission, retry
├── apps-script-code.gs   # Google Apps Script backend
└── README.md             # This file
```

---

## Quick Start (Local Testing)

1. Download or clone this folder
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)
3. Fill in learner details → read instructions → start assessment
4. Complete 8 mini-games → view results
5. In dev mode (no Apps Script URL configured), results log to the browser console and are stored locally

> No local server required. All files work directly from the filesystem.

---

## Google Sheets + Apps Script Setup

### Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it **CogniAssess Results**
3. Rename the default sheet tab to **Results**

### Step 2 — Deploy the Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete all default code in the editor
3. Paste the entire contents of `apps-script-code.gs`
4. Click **Save** (Ctrl+S)
5. Click **Run → testDoPost** once to authorize permissions (accept all prompts)
6. Click **Deploy → New Deployment**
7. Set:
   - Type: **Web App**
   - Description: `CogniAssess v1`
   - Execute as: **Me**
   - Who has access: **Anyone**
8. Click **Deploy** and copy the Web App URL

### Step 3 — Connect the URL to the frontend

1. Open `storage.js`
2. Find this line near the top:
   ```javascript
   const WEB_APP_URL = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
   ```
3. Replace the placeholder with your copied Web App URL:
   ```javascript
   const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
   ```
4. Save the file

---

## GitHub Pages Deployment

### Step 1 — Create GitHub Repository

1. Go to [github.com](https://github.com) → **New repository**
2. Name it `cogniassess` (or any name)
3. Set to **Public**
4. Click **Create repository**

### Step 2 — Upload Files

**Option A — GitHub web interface:**
1. Click **uploading an existing file**
2. Drag all project files into the upload area
3. Click **Commit changes**

**Option B — Git CLI:**
```bash
git init
git add .
git commit -m "Initial CogniAssess deployment"
git remote add origin https://github.com/YOUR_USERNAME/cogniassess.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. Go to your repository → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** | Folder: **/ (root)**
4. Click **Save**
5. Wait 1–2 minutes, then visit: `https://YOUR_USERNAME.github.io/cogniassess/`

---

## Netlify / Vercel Deployment (Alternative)

### Netlify

1. Go to [netlify.com](https://netlify.com) → **Add new site → Deploy manually**
2. Drag the entire `game-aptitude-assessment` folder onto the Netlify drop zone
3. Your site is live instantly at a `*.netlify.app` URL

### Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Inside the project folder, run: `vercel`
3. Follow prompts — no configuration needed for static sites

---

## Concurrency & Scaling

### Google Apps Script (Current — Free)

| Concurrent Users | Reliability |
|-----------------|-------------|
| 1–30            | ✅ Excellent |
| 30–50           | ✅ Good (LockService handles queuing) |
| 50–100          | ⚠️ Occasional delays (15s lock timeout) |
| 100+            | ❌ Not recommended |

**How concurrency is handled:**
- Each submission uses `LockService.getScriptLock()` with a 15-second timeout
- Simultaneous requests queue up and process one at a time
- Duplicate attempts are blocked by AttemptID check before writing
- Each learner's data is a new appended row — no overwrites possible

**For 100+ concurrent users, migrate to:**

| Option     | Free Tier        | Concurrent Writes | Setup Difficulty |
|------------|-----------------|-------------------|-----------------|
| Firebase   | 1GB + 50k reads/day | Very high     | Medium          |
| Supabase   | 500MB DB + 2GB bandwidth | Very high | Easy         |

---

## Testing Checklist

### Login
- [ ] Empty name → shows validation error
- [ ] Invalid email (no @) → shows validation error  
- [ ] Mobile < 10 digits → shows validation error
- [ ] Empty batch → shows validation error
- [ ] Valid form → navigates to instructions.html
- [ ] Unique attempt ID generated each time

### Assessment
- [ ] Timer starts at 25:00 and counts down
- [ ] Timer turns orange below 5 minutes
- [ ] Timer turns red and pulses below 2 minutes
- [ ] Auto-submit triggers at 00:00
- [ ] Refreshing page shows resume prompt
- [ ] Browser back/close shows warning dialog
- [ ] Tab switching increments tab switch counter

### Games
- [ ] Pattern Match — sequence displays, clicking correct answer awards points
- [ ] Block Arrangement — drag works on desktop; touch drag works on mobile
- [ ] Memory Sequence — tiles flash, user must repeat order
- [ ] Quick Reaction — objects appear, only target clicks score positive
- [ ] Rule Switching — rule banner updates, wrong answers after rule change tracked
- [ ] Puzzle Grid — 3×3 matrix shows, correct tile selection works
- [ ] Direction Quest — grid renders, cell click registers answer
- [ ] Calculation Sprint — math card shows, streak bonus applies

### Scoring
- [ ] Each game score caps at 100
- [ ] Total score = sum of all game scores
- [ ] Percentage = (total / max) × 100
- [ ] Performance level matches percentage band
- [ ] Skill scores calculated from correct game mappings

### Submission
- [ ] Result submits to Google Sheets after assessment ends
- [ ] Duplicate AttemptID blocked on backend
- [ ] Failed submission shows retry button
- [ ] Retry successfully resends stored payload
- [ ] Same attempt cannot be submitted twice (client-side guard)
- [ ] Admin Google Sheet receives all 41 columns

### Admin
- [ ] admin.html loads without errors
- [ ] Locally stored result appears in table
- [ ] CSV export downloads with all columns
- [ ] Filters work (name search, min score, level)

### Multi-user Testing (50 users)
- Use browser automation tools or ask 5–10 friends to take it simultaneously
- Check Google Sheet for all rows arriving without overwrites
- Look for any duplicate AttemptIDs in the sheet

---

## Version 2 Roadmap

| Feature                        | Recommended Tech              |
|-------------------------------|-------------------------------|
| Firebase / Supabase backend    | Firebase Firestore            |
| Secure admin login             | Firebase Auth (Google Sign-In)|
| Game & question randomization  | Shuffled question bank        |
| Candidate ranking dashboard    | Supabase + Chart.js           |
| CSV + Excel export             | SheetJS (xlsx)                |
| Batch-wise analytics           | Google Looker Studio (free)   |
| Adaptive difficulty            | Performance-based branching   |
| More mini-games                | Focus filter, Stroop, N-back  |
| Anti-cheating (proctoring)     | FaceIO or Proctortrack API    |
| Resume link by candidate       | Unique URL with attemptId param|
| LMS integration                | xAPI / SCORM wrapper          |
| CRM integration                | Zapier or Make (Integromat)   |

---

## Google Sheet Column Reference

The Apps Script creates these 41 columns automatically:

`Timestamp | AttemptID | Name | Email | Mobile | Batch | StartTime | EndTime | TotalTimeSec | TotalTimeMin | AutoSubmitted | TotalScore | MaxScore | Percentage | PerformanceLevel | CompletionPct | ScorePattern | ScoreBlock | ScoreMemory | ScoreReaction | ScoreRules | ScoreGrid | ScoreDirection | ScoreCalc | SkillPattern | SkillMemory | SkillAttention | SkillLogical | SkillSpatial | SkillReaction | SkillNumerical | SkillDecision | TotalCorrect | TotalWrong | TotalMissed | AvgResponseMs | FastestMs | SlowestMs | TabSwitches | RefreshCount | DuplicateFlag`

---

## Performance Levels

| Range    | Level              |
|----------|--------------------|
| 81–100%  | Strong             |
| 61–80%   | Good               |
| 41–60%   | Basic              |
| 0–40%    | Needs Improvement  |

---

## Browser Support

| Browser        | Supported |
|----------------|-----------|
| Chrome 80+     | ✅        |
| Firefox 75+    | ✅        |
| Safari 13+     | ✅        |
| Edge 80+       | ✅        |
| Mobile Chrome  | ✅        |
| Mobile Safari  | ✅        |
| IE 11          | ❌        |

---

## License

MIT License — free for educational and institutional use.
