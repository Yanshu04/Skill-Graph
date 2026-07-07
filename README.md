# SkillGraph 🚀

**SkillGraph** is an AI-powered career intelligence and skill mapping platform. It allows developers, engineers, and professionals to visualize their skill sets, analyze career targets, scan resumes for auto-extracting skill graphs, and leverage AI coaching to systematically bridge skill gaps.

---

## 🌟 Key Features

*   **Interactive Skill Graph**: Renders a dynamic, drag-and-drop workflow canvas using React Flow (`@xyflow/react`) displaying your skills and missing career target goal connections grouped into Foundations, Core Competencies, and Targets.
*   **Three-Stage Career Roadmap**: Visualizes a linear progression path (*Mastered* &rarr; *In Progress* &rarr; *Needs Work & Missing Goals*) to track what is nailed and what needs attention.
*   **AI Resume Scanner**: Paste resume text to extract skills (complete with proficiency estimations, confidence scores, and source evidence quotes), projects, and certificates using Gemini (primary) and Groq (fallback) LLM API pipelines.
*   **Vector Similarity Linking**: Automatically matches extracted skills to existing database skills using vector embeddings (cosine similarity) to prevent duplicates and maintain graph connections.
*   **Dynamic Category Filters & Synonyms**: A simplified category classification system (Language, Framework, Tool, Database, Cloud, DevOps, Domain, Soft Skill, Machine Learning, and Other) that splits composite categories (like `Backend/DevOps`) and groups synonyms (like `ML` and `Machine Learning`) seamlessly.
*   **Delightful UI/UX**: Crafted with dynamic hover animations (including a CSS-variable-based marquee scroll effect for long skill names), sleek dark mode glassmorphism, responsive dialogs, and skeleton loaders.
*   **Gap Analysis & AI Coach**: Compare your profile against target career roles (e.g. AI/ML Engineer, Solutions Architect) to identify exact skill gaps and receive interactive study roadmaps.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
*   **Styling & Components**: Tailwind CSS, Radix UI (Shadcn), Framer Motion, Lucide React
*   **State Management**: Zustand
*   **Graph Visuals**: React Flow (`@xyflow/react`)
*   **Database**: SQLite with [Prisma ORM](https://www.prisma.io/)
*   **AI Processing**: Google Gemini API & Groq Cloud API

---

## ⚙️ Prerequisites

*   [Node.js](https://nodejs.org/) (v18.x or higher)
*   npm or yarn
*   A Gemini API Key or Groq API Key

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Yanshu04/Skill-Graph.git
cd Skill-Graph
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
DATABASE_URL="file:./db/custom.db"
GEMINI_API_KEY="your_gemini_api_key"
GROQ_API_KEY="your_groq_api_key_optional"
```

### 3. Database Initialization
Deploy database tables and seed initial data:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
# Or run dev on a specific port
npx next dev -p 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser to explore your SkillGraph.

---

## 📁 Directory Structure

```
├── prisma/                 # Prisma DB schema and migrations
├── src/
│   ├── app/                # Next.js App Router (pages and API endpoints)
│   │   ├── api/            # Backend endpoints (skills, ai pipelines, auth)
│   │   ├── globals.css     # Global styles and custom keyframes
│   │   └── layout.tsx      # Core root layout configuration
│   ├── components/         # Frontend React Components
│   │   ├── ui/             # Reusable UI component kit (buttons, marquee, inputs)
│   │   ├── skills/         # Skill graph, roadmaps, and skills manager
│   │   ├── resume/         # Resume uploader and extraction parser
│   │   └── dashboard/      # Analytics charts and statistics
│   ├── lib/                # Database clients, auth helpers, and embeddings
│   └── store/              # Global Zustand state stores
```
