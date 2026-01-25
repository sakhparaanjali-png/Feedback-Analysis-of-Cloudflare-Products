# Feedback Pulse 🎯

> A production-ready feedback aggregation and analysis system built on Cloudflare's Developer Platform

[![Deployed on Cloudflare Workers](https://img.shields.io/badge/Deployed%20on-Cloudflare%20Workers-F38020?style=flat-square&logo=cloudflare)](https://feedback-pulse.sakhparaanjali.workers.dev/dashboard)
[![Cloudflare D1](https://img.shields.io/badge/Database-D1-F38020?style=flat-square)](https://developers.cloudflare.com/d1/)
[![Workers AI](https://img.shields.io/badge/AI-Workers%20AI-F38020?style=flat-square)](https://developers.cloudflare.com/workers-ai/)

**Live Demo:** [https://feedback-pulse.sakhparaanjali.workers.dev/dashboard](https://feedback-pulse.sakhparaanjali.workers.dev/dashboard)

## 📋 Overview

Feedback Pulse is an intelligent feedback aggregation tool designed for Product Managers to centralize and analyze user feedback from multiple touchpoints. Built as part of the Cloudflare Product Manager Internship assignment, this system demonstrates practical application of Cloudflare's serverless platform for real-world product management workflows.

### The Problem

Product teams receive feedback from countless sources:
- 📧 Customer Support Tickets
- 💬 Discord & Community Forums
- 🐛 GitHub Issues
- 📱 Twitter/X
- ✉️ Direct Email

This scattered feedback makes it difficult to:
- Extract meaningful themes and patterns
- Assess urgency and business value
- Understand sentiment across channels
- Make data-driven product decisions

### The Solution

Feedback Pulse provides:
- **Centralized Dashboard**: Single view of all feedback with KPIs and metrics
- **AI-Powered Analysis**: Sentiment analysis and automatic categorization using Workers AI
- **Natural Language Search**: Semantic search to find similar issues and themes
- **Structured Database**: Normalized schema for efficient querying and analysis
- **Real-time Processing**: Serverless architecture that scales automatically

## 🏗️ Architecture

Built entirely on Cloudflare's Developer Platform:

```
┌──────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                    │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │   index.js   │  │  ai-agent.js │  │search-agent.js│   │
│  │ (Main Entry) │  │ (AI Analysis)│  │  (NL Search)  │   │
│  └──────────────┘  └──────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────┘
           │                 │                │
           ▼                 ▼                ▼
     ┌──────────┐      ┌──────────┐      ┌──────────┐
     │  D1 DB   │      │Workers AI│      |AI Search │
     │(Storage) │      │(Llama 3) │      │ (Search) │
     └──────────┘      └──────────┘      └──────────┘
```

### Cloudflare Products Used

1. **Cloudflare Workers** - Serverless compute platform hosting the entire application
2. **D1 Database** - Serverless SQL database for structured feedback storage
3. **Workers AI** - AI inference for sentiment analysis and text processing (Llama 3 model)
4. **Vectorize** (via Bindings) - Vector database for semantic search capabilities

## ✨ Features

### 📊 Executive Dashboard
- Real-time KPIs (total feedback, average sentiment, critical issues)
- Sentiment distribution visualization
- Recent feedback timeline
- Channel-based filtering

### 🤖 AI-Powered Insights
- Automatic sentiment analysis (Positive, Neutral, Negative)
- Smart categorization (Bug, Feature Request, Question, Complaint, Praise)
- Priority assignment based on content analysis

### 🔍 Natural Language Search
- Semantic search to find related feedback
- Cross-channel theme detection
- Similar issue identification

### 💾 Structured Data Model
- Normalized database schema
- Efficient querying and aggregation
- Support for multiple feedback sources
- Timestamped entries for trend analysis

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Cloudflare account ([sign up free](https://dash.cloudflare.com/sign-up))
- Wrangler CLI installed globally: `npm install -g wrangler`

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/sakhparaanjali-png/Feedback-Analysis-of-Cloudflare-Products.git
cd Feedback-Analysis-of-Cloudflare-Products
```

2. **Install dependencies**
```bash
npm install
```

3. **Authenticate with Cloudflare**
```bash
wrangler login
```

4. **Create D1 Database**
```bash
wrangler d1 create feedback-db
```
Copy the database ID from the output and update `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "YOUR_DATABASE_ID"
```

5. **Initialize database schema**
```bash
wrangler d1 execute feedback-db --file=./schema.sql
```

6. **Deploy to Cloudflare Workers**
```bash
npx wrangler deploy
```

Your application will be live at `https://feedback-pulse.YOUR_ACCOUNT.workers.dev`

## 📁 Project Structure

```
.
├── index.js                        # Main Worker entry point & dashboard
├── ai-agent.js                     # AI analysis module (sentiment, categorization)
├── search-agent.js                 # Natural language search functionality
├── data-cleaning.js                # Data preprocessing utilities
├── schema.sql                      # D1 database schema definition
├── wrangler.toml                   # Cloudflare Worker configuration
├── cloudflare_feedback_datasets.xlsx # Sample mock data
├── package.json                    # Node.js dependencies
└── README.md                       # This file
```

## 🛠️ API Endpoints

### Dashboard
```
GET /dashboard
```
Returns HTML dashboard with aggregated feedback metrics and visualizations

### Add Feedback
```
POST /api/feedback
Content-Type: application/json

{
  "source": "discord|github|twitter|email|support|forum",
  "author": "username",
  "content": "Feedback text content",
  "timestamp": "ISO 8601 timestamp"
}
```

### Search Feedback
```
POST /api/search
Content-Type: application/json

{
  "query": "natural language search query"
}
```

### Get Analytics
```
GET /api/analytics
```
Returns aggregated metrics and insights

## 📊 Database Schema

```sql
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    author TEXT,
    content TEXT NOT NULL,
    sentiment TEXT,
    category TEXT,
    priority TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuration

The `wrangler.toml` file contains all Worker bindings:

```toml
name = "feedback-pulse"
main = "index.js"
compatibility_date = "2024-01-01"

[ai]
binding = "AI"

[[d1_databases]]
binding = "DB"
database_name = "feedback-db"
database_id = "YOUR_DATABASE_ID"

[[vectorize]]
binding = "VECTORIZE"
index_name = "feedback-index"
```

## 💡 Development Notes

### Using with AI Coding Tools

This project was built using vibe-coding tools (Claude Code, Cursor, Windsurf). To get started:

1. Initialize the Cloudflare project:
```bash
npm create cloudflare@latest
```

2. Connect to Cloudflare Docs via MCP server for context-aware development

3. Use prompts like:
   - "Create a feedback aggregation API using D1 and Workers AI"
   - "Add sentiment analysis to incoming feedback"
   - "Build a dashboard to visualize feedback metrics"

### Local Development

```bash
npm run dev
```

This starts a local development server at `http://localhost:8787`

## 🎯 Key Insights & Learnings

### What Worked Well
- **D1 Database**: Seamless SQL experience with excellent performance
- **Workers AI**: Easy integration for sentiment analysis
- **Serverless Architecture**: Zero infrastructure management, instant scaling

### Challenges Encountered
- **Rate Limits**: Workers AI has rate limits that required fallback logic
- **Configuration Complexity**: Initial setup of bindings required careful attention
- **Documentation Gaps**: Some newer features had limited examples
---

Built with ☁️ on Cloudflare Workers
