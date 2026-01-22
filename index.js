// ============================================
// FEEDBACK PULSE - MAIN WORKER
// Aggregates and analyzes feedback from multiple sources
// ============================================

import { FeedbackAnalysisAgent, batchAnalyzeFeedback } from './ai-agent.js';
import { SearchAgent, QUERY_TEMPLATES } from './search-agent.js';
import * as DataCleaning from './data-cleaning.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      if (url.pathname === '/' || url.pathname === '') {
        return handleHome(env);
      }
      
      if (url.pathname === '/api/upload' && request.method === 'POST') {
        return handleUpload(request, env);
      }
      
      if (url.pathname === '/api/analyze' && request.method === 'POST') {
        return handleAnalyze(request, env);
      }
      
      if (url.pathname === '/api/search' && request.method === 'POST') {
        return handleSearch(request, env);
      }
      
      if (url.pathname === '/api/kpis' && request.method === 'GET') {
        return handleKPIs(env);
      }
      
      if (url.pathname === '/api/themes' && request.method === 'GET') {
        return handleThemes(env);
      }
      
      if (url.pathname === '/api/feedback' && request.method === 'GET') {
        return handleGetFeedback(url, env);
      }

      if (url.pathname === '/dashboard') {
        return handleDashboard(env);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ 
        error: error.message,
        stack: error.stack 
      }, 500, corsHeaders);
    }
  }
};

/**
 * Home page with API documentation
 */
function handleHome(env) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Pulse - Cloudflare Assignment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      padding: 40px 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .card {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    h1 { color: #667eea; margin-bottom: 10px; font-size: 2.5em; }
    h2 { color: #764ba2; margin-top: 30px; margin-bottom: 15px; }
    h3 { color: #555; margin-top: 20px; margin-bottom: 10px; }
    .endpoint {
      background: #f7fafc;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .method { 
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-weight: bold;
      margin-right: 10px;
      font-size: 0.85em;
    }
    .get { background: #48bb78; color: white; }
    .post { background: #4299e1; color: white; }
    code {
      background: #2d3748;
      color: #68d391;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'Monaco', monospace;
      font-size: 0.9em;
    }
    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 15px 0;
    }
    .architecture {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .arch-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .feature {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #48bb78;
    }
    .badge {
      display: inline-block;
      background: #48bb78;
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      margin: 5px 5px 5px 0;
    }
    a { color: #4299e1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: bold;
      margin: 10px 10px 10px 0;
      transition: transform 0.2s;
    }
    .btn:hover { transform: translateY(-2px); background: #764ba2; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🎯 Feedback Pulse</h1>
      <p style="font-size: 1.2em; color: #666; margin-bottom: 20px;">
        Cloudflare Product Manager Intern Assignment - Feedback Analysis System
      </p>
      
      <div class="features">
        <div class="feature">
          <h3>📊 Multi-Source Aggregation</h3>
          <p>Collects feedback from Support, Discord, GitHub, Email, Twitter, and Forums</p>
        </div>
        <div class="feature">
          <h3>🤖 AI-Powered Analysis</h3>
          <p>Extracts themes, sentiment, urgency using Workers AI (Llama 3)</p>
        </div>
        <div class="feature">
          <h3>🔍 Natural Language Search</h3>
          <p>Ask questions like "Show me high priority issues from enterprise customers"</p>
        </div>
        <div class="feature">
          <h3>📈 Executive Dashboard</h3>
          <p>KPIs and insights for leadership decision-making</p>
        </div>
      </div>

      <a href="/dashboard" class="btn">📊 View Dashboard</a>
      <a href="https://github.com/yourusername/feedback-pulse" class="btn">💻 View Code</a>
    </div>

    <div class="card">
      <h2>🏗️ Architecture</h2>
      <p>Built entirely on Cloudflare Developer Platform:</p>
      
      <div class="architecture">
        <div class="arch-box">
          <h3>Workers</h3>
          <p>Serverless API & Dashboard</p>
        </div>
        <div class="arch-box">
          <h3>D1 Database</h3>
          <p>Normalized data storage</p>
        </div>
        <div class="arch-box">
          <h3>Workers AI</h3>
          <p>Theme extraction & sentiment analysis</p>
        </div>
        <div class="arch-box">
          <h3>AI Search</h3>
          <p>Natural language queries</p>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>📡 API Endpoints</h2>

      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/upload</code>
        <p><strong>Upload and process feedback data</strong></p>
        <pre>{
  "source": "Support|Discord|GitHub|Email|Twitter|Forum",
  "data": [ /* array of feedback objects */ ]
}</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/analyze</code>
        <p><strong>Analyze specific feedback with AI</strong></p>
        <pre>{
  "feedback_text": "Workers AI rate limits are too low...",
  "metadata": { "customerTier": "Enterprise", "source": "Support" }
}</pre>
      </div>

      <div class="endpoint">
        <span class="method post">POST</span>
        <code>/api/search</code>
        <p><strong>Natural language search</strong></p>
        <pre>{
  "query": "Show me high priority issues from enterprise customers"
}</pre>
        <p><strong>Example queries:</strong></p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>"Show me critical issues"</li>
          <li>"What are enterprise customers complaining about?"</li>
          <li>"Recent Workers AI feedback"</li>
          <li>"Top 10 negative feedback items"</li>
        </ul>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/kpis</code>
        <p><strong>Get dashboard KPIs (for Power BI)</strong></p>
        <p>Returns: total feedback, critical/high counts, sentiment breakdown, customer tier stats</p>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/themes</code>
        <p><strong>Get theme summary</strong></p>
        <p>Returns: All themes with counts, avg urgency, avg value, sources</p>
      </div>

      <div class="endpoint">
        <span class="method get">GET</span>
        <code>/api/feedback?limit=20&source=Support&urgency=Critical</code>
        <p><strong>Get filtered feedback</strong></p>
        <p>Query params: limit, source, urgency, sentiment, product, tier</p>
      </div>
    </div>

    <div class="card">
      <h2>🚀 Quick Start</h2>
      <h3>1. Setup</h3>
      <pre>npm create cloudflare@latest feedback-pulse
cd feedback-pulse
npm install</pre>

      <h3>2. Initialize D1 Database</h3>
      <pre>npx wrangler d1 create feedback-pulse-db
npx wrangler d1 execute feedback-pulse-db --file=./src/schema.sql</pre>

      <h3>3. Deploy</h3>
      <pre>npx wrangler deploy</pre>

      <h3>4. Test</h3>
      <pre>curl https://your-worker.workers.dev/api/kpis</pre>
    </div>

    <div class="card">
      <h2>🎓 Assignment Deliverables</h2>
      <div style="background: #f7fafc; padding: 20px; border-radius: 8px; margin-top: 15px;">
        <h3>✅ Part 1: Build Challenge</h3>
        <ul style="margin-left: 20px; line-height: 1.8;">
          <li>✅ Aggregates feedback from 6 sources</li>
          <li>✅ AI-powered theme extraction & sentiment analysis</li>
          <li>✅ Natural language search interface</li>
          <li>✅ Deployed on Cloudflare Workers</li>
          <li>✅ Uses: Workers, D1, Workers AI, AI Search (4 products)</li>
        </ul>

        <h3 style="margin-top: 20px;">✅ Part 2: Product Insights</h3>
        <p>Friction log documented during development (see README)</p>
      </div>
    </div>

    <div class="card">
      <h2>📊 Sample Data</h2>
      <p>The system includes 175 mock feedback items across all 6 sources with realistic data quality issues:</p>
      
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0;">
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #667eea;">30</div>
          <div>Support Tickets</div>
        </div>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #764ba2;">30</div>
          <div>Discord Messages</div>
        </div>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #48bb78;">25</div>
          <div>GitHub Issues</div>
        </div>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #ed8936;">25</div>
          <div>Emails</div>
        </div>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #4299e1;">30</div>
          <div>Tweets</div>
        </div>
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 2em; color: #f56565;">25</div>
          <div>Forum Posts</div>
        </div>
      </div>
    </div>

    <div class="card">
      <p style="text-align: center; color: #666; margin-top: 20px;">
        Built with ❤️ for Cloudflare PM Internship Assignment<br>
        Powered by Cloudflare Workers, D1, Workers AI, and AI Search
      </p>
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

/**
 * Handle feedback upload and processing
 */
async function handleUpload(request, env) {
  const { source, data } = await request.json();
  
  if (!source || !data || !Array.isArray(data)) {
    return jsonResponse({ error: 'Invalid request. Need source and data array.' }, 400);
  }

  const processedData = [];
  const agent = new FeedbackAnalysisAgent(env.AI);

  // Process each feedback item
  for (const row of data) {
    let processed;
    
    // Route to appropriate processor based on source
    switch (source) {
      case 'Support':
        processed = DataCleaning.processSupportTicket(row);
        break;
      case 'Discord':
        processed = DataCleaning.processDiscordMessage(row);
        break;
      case 'GitHub':
        processed = DataCleaning.processGitHubIssue(row);
        break;
      case 'Email':
        processed = DataCleaning.processEmail(row);
        break;
      case 'Twitter':
        processed = DataCleaning.processTweet(row);
        break;
      case 'Forum':
        processed = DataCleaning.processForumPost(row);
        break;
      default:
        continue;
    }

    // Calculate scores
    processed.urgency_score = DataCleaning.calculateUrgencyScore(
      processed.urgency,
      processed.feedback_text,
      processed.customer_tier
    );
    
    processed.value_score = DataCleaning.calculateValueScore(
      processed.customer_tier,
      processed.feedback_text,
      processed.engagement_metrics
    );

    if (processed.engagement_metrics) {
      processed.engagement_score = DataCleaning.calculateEngagementScore(
        processed.engagement_metrics
      );
    }

    // Insert into database
    const feedbackId = await insertFeedback(env.DB, processed);
    
    // SKIP AI ANALYSIS DURING BULK UPLOAD (to avoid rate limits)
    // AI analysis can be run later via /api/analyze endpoint
    
    // Insert placeholder analysis
    await env.DB.prepare(`
      INSERT INTO sentiment_analysis (
        feedback_id, sentiment, urgency, value_score, 
        ai_summary, extracted_themes, model_used, confidence_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      feedbackId,
      'Neutral',
      processed.urgency || 'Medium',
      processed.value_score || 5,
      'Bulk upload - AI analysis pending',
      JSON.stringify([]),
      'pending',
      0.5
    ).run();
    
    const analysis = {
      sentiment: 'Neutral',
      urgency: processed.urgency || 'Medium',
      value_score: processed.value_score || 5,
      summary: 'Bulk upload - AI analysis pending',
      themes: []
    };

    processedData.push({ ...processed, feedback_id: feedbackId, analysis });
  }

  return jsonResponse({
    success: true,
    processed: processedData.length,
    message: `Successfully processed ${processedData.length} ${source} feedback items`
  });
}

/**
 * Handle AI analysis request
 */
async function handleAnalyze(request, env) {
  const { feedback_text, metadata } = await request.json();
  
  if (!feedback_text) {
    return jsonResponse({ error: 'feedback_text is required' }, 400);
  }

  const agent = new FeedbackAnalysisAgent(env.AI);
  const analysis = await agent.analyzeFeedback(feedback_text, metadata || {});

  return jsonResponse({ success: true, analysis });
}

/**
 * Handle natural language search
 */
async function handleSearch(request, env) {
  const { query } = await request.json();
  
  if (!query) {
    return jsonResponse({ error: 'query is required' }, 400);
  }

  const searchAgent = new SearchAgent(env.AI, env.DB);
  const result = await searchAgent.processQuery(query);

  return jsonResponse(result);
}

/**
 * Get KPIs for dashboard
 */
async function handleKPIs(env) {
  const result = await env.DB.prepare(`
    SELECT * FROM v_kpi_dashboard
  `).first();

  return jsonResponse({ success: true, kpis: result });
}

/**
 * Get theme summary
 */
async function handleThemes(env) {
  const result = await env.DB.prepare(`
    SELECT * FROM v_theme_summary
    ORDER BY feedback_count DESC
  `).all();

  return jsonResponse({ success: true, themes: result.results });
}

/**
 * Get filtered feedback
 */
async function handleGetFeedback(url, env) {
  const params = url.searchParams;
  const limit = params.get('limit') || 20;
  
  let query = 'SELECT * FROM v_feedback_full WHERE 1=1';
  const conditions = [];
  const bindings = [];

  if (params.get('source')) {
    conditions.push('source_name = ?');
    bindings.push(params.get('source'));
  }

  if (params.get('urgency')) {
    conditions.push('urgency = ?');
    bindings.push(params.get('urgency'));
  }

  if (params.get('sentiment')) {
    conditions.push('sentiment = ?');
    bindings.push(params.get('sentiment'));
  }

  if (params.get('product')) {
    conditions.push('product_name = ?');
    bindings.push(params.get('product'));
  }

  if (params.get('tier')) {
    conditions.push('customer_tier = ?');
    bindings.push(params.get('tier'));
  }

  if (conditions.length > 0) {
    query += ' AND ' + conditions.join(' AND ');
  }

  query += ` ORDER BY urgency_score DESC, created_date DESC LIMIT ${limit}`;

  const stmt = env.DB.prepare(query);
  const boundStmt = bindings.reduce((s, binding) => s.bind(binding), stmt);
  const result = await boundStmt.all();

  return jsonResponse({ success: true, feedback: result.results, count: result.results.length });
}

/**
 * Simple dashboard page
 */
function handleDashboard(env) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Pulse Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body class="bg-gray-100">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-4xl font-bold mb-8 text-purple-600">📊 Feedback Pulse Dashboard</h1>
    
    <!-- KPI Cards -->
    <div id="kpis" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="text-gray-500 text-sm">Total Feedback</div>
        <div id="kpi-total" class="text-3xl font-bold text-purple-600">-</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="text-gray-500 text-sm">Critical Issues</div>
        <div id="kpi-critical" class="text-3xl font-bold text-red-600">-</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="text-gray-500 text-sm">High Priority</div>
        <div id="kpi-high" class="text-3xl font-bold text-orange-600">-</div>
      </div>
      <div class="bg-white p-6 rounded-lg shadow">
        <div class="text-gray-500 text-sm">Enterprise</div>
        <div id="kpi-enterprise" class="text-3xl font-bold text-blue-600">-</div>
      </div>
    </div>

    <!-- Search -->
    <div class="bg-white p-6 rounded-lg shadow mb-8">
      <h2 class="text-2xl font-bold mb-4">🔍 Natural Language Search</h2>
      <div class="flex gap-2">
        <input 
          id="search-input" 
          type="text" 
          placeholder="e.g., Show me high priority issues from enterprise customers"
          class="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
        />
        <button onclick="search()" class="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
          Search
        </button>
      </div>
      <div id="search-results" class="mt-4"></div>
    </div>

    <!-- Themes -->
    <div class="bg-white p-6 rounded-lg shadow mb-8">
      <h2 class="text-2xl font-bold mb-4">🎯 Top Themes</h2>
      <div id="themes"></div>
    </div>
  </div>

  <script>
    async function loadKPIs() {
      const res = await fetch('/api/kpis');
      const data = await res.json();
      const kpis = data.kpis;
      
      document.getElementById('kpi-total').textContent = kpis.total_feedback || 0;
      document.getElementById('kpi-critical').textContent = kpis.critical_count || 0;
      document.getElementById('kpi-high').textContent = kpis.high_count || 0;
      document.getElementById('kpi-enterprise').textContent = kpis.enterprise_feedback || 0;
    }

    async function loadThemes() {
      const res = await fetch('/api/themes');
      const data = await res.json();
      const themesHtml = data.themes.slice(0, 10).map(t => \`
        <div class="flex justify-between items-center py-2 border-b">
          <div>
            <div class="font-semibold">\${t.theme_name}</div>
            <div class="text-sm text-gray-500">\${t.category}</div>
          </div>
          <div class="text-right">
            <div class="font-bold text-purple-600">\${t.feedback_count || 0}</div>
            <div class="text-sm text-gray-500">items</div>
          </div>
        </div>
      \`).join('');
      document.getElementById('themes').innerHTML = themesHtml;
    }

    async function search() {
      const query = document.getElementById('search-input').value;
      if (!query) return;

      const resultsDiv = document.getElementById('search-results');
      resultsDiv.innerHTML = '<div class="text-gray-500">Searching...</div>';

      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await res.json();

        if (data.success) {
          resultsDiv.innerHTML = \`
            <div class="bg-purple-50 p-4 rounded-lg mt-4">
              <div class="font-semibold mb-2">Found \${data.count} results</div>
              <div>\${data.response}</div>
            </div>
            <div class="mt-4 space-y-2">
              \${data.results.slice(0, 5).map(r => \`
                <div class="border-l-4 border-purple-600 pl-4 py-2">
                  <div class="font-semibold">[\${r.urgency}] \${r.product_name}</div>
                  <div class="text-sm text-gray-600">\${r.ai_summary || r.feedback_text.slice(0, 100) + '...'}</div>
                  <div class="text-xs text-gray-500 mt-1">\${r.customer_tier} · \${r.source_name}</div>
                </div>
              \`).join('')}
            </div>
          \`;
        } else {
          resultsDiv.innerHTML = \`<div class="text-red-600">Error: \${data.error}</div>\`;
        }
      } catch (error) {
        resultsDiv.innerHTML = \`<div class="text-red-600">Error: \${error.message}</div>\`;
      }
    }

    // Allow Enter key to search
    document.getElementById('search-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') search();
    });

    // Load data on page load
    loadKPIs();
    loadThemes();
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
}

/**
 * Helper: Insert feedback into database
 */
async function insertFeedback(db, data) {
  // Validate required fields
  if (!data.feedback_text) {
    throw new Error('feedback_text is required');
  }
  if (!data.source) {
    throw new Error('source is required');
  }
  if (!data.created_date) {
    console.error('Missing created_date, using current time', data);
    data.created_date = new Date().toISOString();
  }
  
  // Insert or get user
  let userId = null;
  if (data.email || data.username) {
    const userResult = await db.prepare(`
      INSERT INTO users (email, username, customer_tier)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET customer_tier = excluded.customer_tier
      RETURNING user_id
    `).bind(
      data.email || null, 
      data.username || null, 
      data.customer_tier || 'Free'
    ).first();
    userId = userResult?.user_id;
  }

  // Get product area ID
  let productAreaId = null;
  if (data.product_area) {
    const paResult = await db.prepare(`
      SELECT product_area_id FROM product_areas WHERE product_name = ?
    `).bind(data.product_area).first();
    productAreaId = paResult?.product_area_id;
  }

  // Get source ID
  const sourceResult = await db.prepare(`
    SELECT source_id FROM sources WHERE source_name = ?
  `).bind(data.source).first();
  
  if (!sourceResult) {
    throw new Error(`Invalid source: ${data.source}`);
  }
  
  const sourceId = sourceResult.source_id;

  // Insert feedback with safe defaults
  const result = await db.prepare(`
    INSERT INTO feedback_master (
      user_id, product_area_id, source_id, feedback_text, original_id,
      created_date, resolved_date, urgency_score, value_score, engagement_score, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING feedback_id
  `).bind(
    userId,
    productAreaId,
    sourceId,
    data.feedback_text,
    data.original_id || null,
    data.created_date,
    data.resolved_date || null,
    data.urgency_score || 5,
    data.value_score || 5,
    data.engagement_score || 0,
    JSON.stringify(data.metadata || {})
  ).first();

  return result.feedback_id;
}

/**
 * Helper: Insert AI analysis results
 */
async function insertAnalysis(db, feedbackId, analysis) {
  await db.prepare(`
    INSERT INTO sentiment_analysis (
      feedback_id, sentiment, urgency, value_score, ai_summary, 
      extracted_themes, model_used, confidence_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    feedbackId,
    analysis.sentiment,
    analysis.urgency,
    analysis.valueScore,
    analysis.summary,
    JSON.stringify(analysis.themes),
    '@cf/meta/llama-3-8b-instruct',
    analysis.confidence
  ).run();

  // Link themes
  for (const themeName of analysis.themes) {
    const themeResult = await db.prepare(`
      SELECT theme_id FROM themes WHERE theme_name = ?
    `).bind(themeName).first();

    if (themeResult) {
      await db.prepare(`
        INSERT OR IGNORE INTO feedback_themes (feedback_id, theme_id, confidence_score)
        VALUES (?, ?, ?)
      `).bind(feedbackId, themeResult.theme_id, analysis.confidence).run();
    }
  }
}

/**
 * Helper: JSON response
 */
function jsonResponse(data, status = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    }
  });
}
