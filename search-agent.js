// ============================================
// SEARCH AGENT MODULE
// Natural language query understanding and response generation
// ============================================

/**
 * Search Agent - understands user queries and fetches relevant feedback
 */
export class SearchAgent {
  constructor(aiBinding, db) {
    this.ai = aiBinding;
    this.db = db;
  }

  /**
   * Main entry point - process natural language query
   */
  async processQuery(userQuery) {
    try {
      console.log('Processing query:', userQuery);
      
      // Step 1: Understand the query intent
      const intent = await this.parseQueryIntent(userQuery);
      console.log('Parsed intent:', JSON.stringify(intent));
      
      // Step 2: Generate SQL query based on intent
      const sqlQuery = this.generateSQL(intent);
      console.log('Generated SQL:', sqlQuery.sql);
      console.log('With params:', sqlQuery.params);
      
      // Step 3: Execute query
      const results = await this.executeQuery(sqlQuery);
      console.log('Query returned', results.length, 'results');
      
      // Step 4: Format results with AI
      const response = await this.formatResponse(userQuery, results, intent);
      
      return {
        success: true,
        query: userQuery,
        intent: intent,
        results: results,
        response: response,
        count: results.length
      };
    } catch (error) {
      console.error('Query processing error:', error);
      return {
        success: false,
        error: error.message,
        response: 'I encountered an error processing your query. Please try rephrasing.'
      };
    }
  }

  /**
   * Parse user query to understand intent
   */
  async parseQueryIntent(userQuery) {
    // Skip AI parsing - use keyword matching for reliability
    console.log('Using keyword-based parsing only');
    return this.parseIntentWithKeywords(userQuery);
  }

  /**
   * Generate SQL query from intent
   */
  generateSQL(intent) {
    let sql = `
      SELECT 
        fm.feedback_id,
        fm.original_id,
        fm.feedback_text,
        fm.created_date,
        fm.urgency_score,
        fm.value_score,
        u.email,
        u.username,
        u.customer_tier,
        pa.product_name,
        s.source_name,
        sa.sentiment,
        sa.urgency,
        sa.ai_summary,
        GROUP_CONCAT(t.theme_name) as themes
      FROM feedback_master fm
      LEFT JOIN users u ON fm.user_id = u.user_id
      LEFT JOIN product_areas pa ON fm.product_area_id = pa.product_area_id
      LEFT JOIN sources s ON fm.source_id = s.source_id
      LEFT JOIN sentiment_analysis sa ON fm.feedback_id = sa.feedback_id
      LEFT JOIN feedback_themes ft ON fm.feedback_id = ft.feedback_id
      LEFT JOIN themes t ON ft.theme_id = t.theme_id
      WHERE 1=1
    `;

    const conditions = [];
    const params = [];

    // Add filters based on intent
    if (intent.urgency && intent.urgency.length > 0) {
      const placeholders = intent.urgency.map(() => '?').join(',');
      conditions.push(`sa.urgency IN (${placeholders})`);
      params.push(...intent.urgency);
    }

    if (intent.sentiment && intent.sentiment.length > 0) {
      const placeholders = intent.sentiment.map(() => '?').join(',');
      conditions.push(`sa.sentiment IN (${placeholders})`);
      params.push(...intent.sentiment);
    }

    if (intent.product) {
      conditions.push(`pa.product_name = ?`);
      params.push(intent.product);
    }

    if (intent.customerTier) {
      conditions.push(`u.customer_tier = ?`);
      params.push(intent.customerTier);
    }

    if (intent.theme) {
      conditions.push(`t.theme_name LIKE ?`);
      params.push(`%${intent.theme}%`);
    }

    // Add conditions to query
    if (conditions.length > 0) {
      sql += ' AND ' + conditions.join(' AND ');
    }

    // Group by
    sql += ` GROUP BY fm.feedback_id`;

    // Sort
    const sortBy = intent.sortBy || 'urgency_score';
    sql += ` ORDER BY ${sortBy} DESC, fm.created_date DESC`;

    // Limit
    const limit = intent.limit || 20;
    sql += ` LIMIT ${limit}`;

    return { sql, params };
  }

  /**
   * Execute SQL query
   */
  async executeQuery({ sql, params }) {
    try {
      console.log('Executing SQL:', sql);
      console.log('With params:', params);
      
      // Prepare statement and bind all parameters at once
      let stmt = this.db.prepare(sql);
      
      if (params && params.length > 0) {
        // D1 requires .bind() to be called with all params at once
        stmt = stmt.bind(...params);
      }
      
      const result = await stmt.all();
      return result.results || [];
    } catch (error) {
      console.error('SQL execution error:', error);
      console.error('SQL was:', sql);
      console.error('Params were:', params);
      throw new Error('Database query failed');
    }
  }

  /**
   * Format results into natural language response
   */
  async formatResponse(userQuery, results, intent) {
    if (results.length === 0) {
      return 'No feedback items match your query. Try broadening your search criteria.';
    }

    // Create a summary of results
    const summary = this.createResultsSummary(results);

    const prompt = `The user asked: "${userQuery}"

We found ${results.length} matching feedback items:

${summary}

Create a concise, helpful response that:
1. Directly answers their question
2. Highlights key findings (top themes, urgency levels)
3. Mentions any critical issues
4. Suggests next actions if appropriate

Keep it under 150 words.`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a helpful product management assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 300
      });

      return this.extractTextFromResponse(response);
    } catch (error) {
      console.error('Response formatting error:', error);
      return this.createFallbackResponse(results, userQuery);
    }
  }

  /**
   * Create summary of results for AI
   */
  createResultsSummary(results) {
    const top10 = results.slice(0, 10);
    return top10.map((r, i) => 
      `${i+1}. [${r.urgency}] ${r.product_name}: ${r.ai_summary || r.feedback_text.slice(0, 80)} (${r.customer_tier})`
    ).join('\n');
  }

  /**
   * Create fallback response without AI
   */
  createFallbackResponse(results, userQuery) {
    const criticalCount = results.filter(r => r.urgency === 'Critical').length;
    const highCount = results.filter(r => r.urgency === 'High').length;
    
    let response = `Found ${results.length} feedback items matching your query.\n\n`;
    
    if (criticalCount > 0) {
      response += `⚠️ ${criticalCount} Critical issues require immediate attention.\n`;
    }
    if (highCount > 0) {
      response += `${highCount} High priority items.\n`;
    }

    // Top themes
    const themes = {};
    results.forEach(r => {
      if (r.themes) {
        r.themes.split(',').forEach(theme => {
          themes[theme] = (themes[theme] || 0) + 1;
        });
      }
    });

    const topThemes = Object.entries(themes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme, count]) => `${theme} (${count})`)
      .join(', ');

    if (topThemes) {
      response += `\nTop themes: ${topThemes}`;
    }

    return response;
  }

  /**
   * Parse AI response
   */
  parseAIResponse(response) {
    try {
      let text = '';
      
      if (response.response) {
        text = response.response;
      } else if (Array.isArray(response)) {
        text = response[0]?.response || '';
      } else if (typeof response === 'string') {
        text = response;
      }

      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
      }

      const parsed = JSON.parse(text.trim());
      
      // Filter out analytical phrases that aren't actual themes
      const analyticalPhrases = [
        'root cause', 'root causes', 'understand', 'review', 'analyze',
        'investigation', 'analysis', 'summary', 'overview', 'insights'
      ];
      
      if (parsed.theme) {
        const themeLower = parsed.theme.toLowerCase();
        const isAnalytical = analyticalPhrases.some(phrase => themeLower.includes(phrase));
        if (isAnalytical) {
          console.log('Ignoring analytical theme:', parsed.theme);
          parsed.theme = null;
        }
      }
      
      return parsed;
    } catch (error) {
      console.error('Parse error:', error);
      return {};
    }
  }

  /**
   * Extract text from response
   */
  extractTextFromResponse(response) {
    if (typeof response === 'string') return response;
    if (response.response) return response.response;
    if (Array.isArray(response)) return response[0]?.response || '';
    return '';
  }

  /**
   * Fallback: Parse intent with keywords
   */
  parseIntentWithKeywords(userQuery) {
    const lowerQuery = userQuery.toLowerCase();
    const intent = {
      urgency: null,
      sentiment: null,
      product: null,
      theme: null,
      customerTier: null,
      sortBy: 'urgency_score',
      limit: 20
    };
    
    // Check if this is a simple "review" or "show me" query
    const isSimpleReviewQuery = (
      (lowerQuery.includes('review') || lowerQuery.includes('show me') || lowerQuery.includes('list')) &&
      !lowerQuery.includes('urgent') && 
      !lowerQuery.includes('critical') &&
      !lowerQuery.includes('negative') &&
      !lowerQuery.includes('positive')
    );

    // For simple review queries, only apply basic filters
    if (!isSimpleReviewQuery) {
      // Urgency
      if (lowerQuery.includes('critical') || lowerQuery.includes('urgent')) {
        intent.urgency = ['Critical'];
      } else if (lowerQuery.includes('high priority') || lowerQuery.includes('high') || lowerQuery.includes('important')) {
        intent.urgency = ['Critical', 'High'];
      }

      // Sentiment
      if (lowerQuery.includes('negative') || lowerQuery.includes('complaints') || lowerQuery.includes('complaining')) {
        intent.sentiment = ['Negative', 'Frustrated'];
      } else if (lowerQuery.includes('positive') || lowerQuery.includes('happy')) {
        intent.sentiment = ['Positive'];
      }
    }

    // Customer tier (always apply)
    if (lowerQuery.includes('enterprise')) {
      intent.customerTier = 'Enterprise';
    } else if (lowerQuery.includes('pro')) {
      intent.customerTier = 'Pro';
    } else if (lowerQuery.includes('free')) {
      intent.customerTier = 'Free';
    }

    // Product (always apply if mentioned)
    if (lowerQuery.includes('workers ai')) intent.product = 'Workers AI';
    else if (lowerQuery.includes('workers')) intent.product = 'Workers';
    else if (lowerQuery.includes('d1')) intent.product = 'D1 Database';
    else if (lowerQuery.includes('workflow')) intent.product = 'Workflows';
    else if (lowerQuery.includes('r2')) intent.product = 'R2 Storage';
    else if (lowerQuery.includes('kv')) intent.product = 'KV Storage';

    // Limit - check for explicit numbers
    const numberMatch = lowerQuery.match(/(\d+)/);
    if (numberMatch) {
      const num = parseInt(numberMatch[1]);
      if (num > 0 && num <= 100) {
        intent.limit = num;
      }
    }
    
    // Special handling for "list" or "show me" queries
    if (lowerQuery.includes('list') || lowerQuery.includes('show me') || lowerQuery.includes('review')) {
      intent.limit = 50; // Show more for explicit list requests
    }

    return intent;
  }
}

/**
 * Predefined query templates
 */
export const QUERY_TEMPLATES = {
  'high_priority': {
    name: 'High Priority Issues',
    intent: { urgency: ['Critical', 'High'], sortBy: 'urgency_score', limit: 20 }
  },
  'enterprise_feedback': {
    name: 'Enterprise Customer Feedback',
    intent: { customerTier: 'Enterprise', sortBy: 'created_date', limit: 20 }
  },
  'negative_sentiment': {
    name: 'Negative Feedback',
    intent: { sentiment: ['Negative', 'Frustrated'], sortBy: 'urgency_score', limit: 20 }
  },
  'recent': {
    name: 'Recent Feedback',
    intent: { sortBy: 'created_date', limit: 20 }
  },
  'by_product': (productName) => ({
    name: `${productName} Feedback`,
    intent: { product: productName, sortBy: 'urgency_score', limit: 20 }
  })
};
