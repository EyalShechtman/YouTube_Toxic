🧾 Full Spec Sheet: YouTube Toxicity Analyzer (Node.js + Vercel)
✅ Project Goal
Build a website where a user can submit a YouTube channel link and receive a toxicity analysis (based on recent comments across the latest 10 videos). The app will:

Fetch up to 300 recent comments

Analyze toxicity scores (no Python required)

Visualize toxicity per video

Be fast, clean, and deployable on Vercel

📦 Tech Stack Overview
Layer	Technology	Notes
Frontend	Next.js (React)	Best for SSR + Vercel hosting, supports API routes
Backend	Next.js API routes	Serverless functions for YouTube API + inference
ML	@xenova/transformers	ONNX/WASM-based inference in Node.js (runs Detoxify-like models)
Charts	react-chartjs-2, chart.js	Clean, embeddable data visualization
Hosting	Vercel	Fully compatible with Next.js, optimized deployment pipeline

⚙️ Core Features
1. Frontend
Pages & Components
Home Page:

Input for YouTube channel URL

Submit button triggers backend analysis

ToxicityDashboard:

Bar chart: Avg toxicity per video

Line chart or pie: % of toxic comments per video

Comment count, thresholds, etc.

Loading / Error Components:

Show when analyzing or when API limits hit

2. Backend API (Next.js API Routes)
/api/analyze
Input:
json
Copy
Edit
{
  "channelUrl": "https://www.youtube.com/channel/UC..."
}
Processing Pipeline:
Resolve Channel ID (handle both custom and regular URLs)

Fetch 10 latest videos via YouTube Data API (search.list)

Fetch up to 300 comments total using commentThreads.list

Run toxicity classification with:

Model: unitary/toxic-bert via @xenova/transformers

Inference: Score each comment for toxicity

Aggregate results:

Avg toxicity score per video

% of toxic comments (score > 0.5)

Top toxic examples (optional)

Output:
json
Copy
Edit
{
  "videos": [
    {
      "videoId": "abc123",
      "title": "Video Title",
      "toxicity_avg": 0.31,
      "toxic_comment_pct": 18,
      "comments_analyzed": 45
    },
    ...
  ]
}
🔍 ML Inference with transformers.js
Use unitary/toxic-bert or similar model:

ts
Copy
Edit
import { pipeline } from '@xenova/transformers';

const classifier = await pipeline('text-classification', 'unitary/toxic-bert');

const output = await classifier("You're a joke.");
// => [{ label: 'toxicity', score: 0.92 }]
✅ Runs in Node.js
✅ No CUDA, PyTorch, or Python required
✅ Can be bundled with Vercel API routes

🚀 Deployment (Vercel)
Vercel + Next.js = seamless deployment

pages/api/analyze.ts → auto-routed as a serverless API

Set environment variables in Vercel:

YOUTUBE_API_KEY (Google Cloud Console)

Cold starts might slightly delay inference due to WASM, but minimal

🗃 Folder Structure
txt
Copy
Edit
/ (root)
├── pages/
│   ├── index.tsx              # Main UI page
│   └── api/
│       └── analyze.ts         # Toxicity analysis backend
├── components/
│   ├── InputForm.tsx
│   ├── ToxicityDashboard.tsx
├── lib/
│   ├── youtube.ts             # YouTube API helpers
│   └── toxicity.ts            # transformers.js logic
├── public/
├── package.json
├── tsconfig.json