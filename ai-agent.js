// ============================================
// AI AGENT MODULE
// Agentic AI for theme extraction, sentiment analysis, urgency classification
// Uses Workers AI (Llama 3)
// ============================================

/**
 * Main AI Agent - orchestrates all AI analysis
 */
export class FeedbackAnalysisAgent {
  constructor(aiBinding) {
    this.ai = aiBinding;
  }

  /**
   * Analyze feedback comprehensively
   * Returns: { themes, sentiment, urgency, summary, valueScore }
   */
  async analyzeFeedback(feedbackText, metadata = {}) {
    try {
      // Run analysis in parallel for speed
      const [themes, sentimentAnalysis] = await Promise.all([
        this.extractThemes(feedbackText),
        this.analyzeSentimentAndUrgency(feedbackText, metadata)
      ]);

      return {
        themes: themes.themes,
        sentiment: sentimentAnalysis.sentiment,
        urgency: sentimentAnalysis.urgency,
        summary: sentimentAnalysis.summary,
        valueScore: sentimentAnalysis.valueScore,
        confidence: (themes.confidence + sentimentAnalysis.confidence) / 2
      };
    } catch (error) {
      console.error('AI analysis error:', error);
      return this.getFallbackAnalysis(feedbackText);
    }
  }

  /**
   * Extract themes using Workers AI
   */
  async extractThemes(feedbackText) {
    const prompt = `Analyze this customer feedback and extract the main themes/topics.

Feedback: "${feedbackText}"

Identify 1-3 primary themes from this list:
- API Rate Limits
- Documentation Quality
- Performance Issues
- Billing Concerns
- Feature Request
- WebSocket Support
- Regional Issues
- Cold Start Latency
- TypeScript Support
- Mobile SDK
- Security/Compliance
- Data Loss
- Build/Deploy Issues
- Positive Feedback

Respond ONLY with a JSON object in this format:
{
  "themes": ["Theme1", "Theme2"],
  "confidence": 0.85
}`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a product feedback analysis expert. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const result = this.parseAIResponse(response);
      return {
        themes: result.themes || [this.inferThemeFromKeywords(feedbackText)],
        confidence: result.confidence || 0.7
      };
    } catch (error) {
      console.error('Theme extraction error:', error);
      return {
        themes: [this.inferThemeFromKeywords(feedbackText)],
        confidence: 0.5
      };
    }
  }

  /**
   * Analyze sentiment and urgency
   */
  async analyzeSentimentAndUrgency(feedbackText, metadata = {}) {
    const prompt = `Analyze this customer feedback for sentiment and urgency.

Feedback: "${feedbackText}"
${metadata.customerTier ? `Customer Tier: ${metadata.customerTier}` : ''}
${metadata.source ? `Source: ${metadata.source}` : ''}

Provide analysis in JSON format:
{
  "sentiment": "Positive|Neutral|Negative|Frustrated",
  "urgency": "Critical|High|Medium|Low",
  "summary": "Brief 1-sentence summary",
  "valueScore": 1-10,
  "confidence": 0.0-1.0
}

Urgency guidelines:
- Critical: Production outage, data loss, security issue, blocking enterprise customer
- High: Bug affecting multiple users, blocking development, performance degradation
- Medium: Feature requests, minor bugs, documentation issues
- Low: Nice-to-have features, positive feedback, questions

Value score (1-10):
- Consider business impact, customer tier, number of affected users
- Enterprise issues: 8-10
- Pro tier issues: 6-8
- Community requests: 3-6`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a product manager analyzing customer feedback. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 300
      });

      const result = this.parseAIResponse(response);
      
      return {
        sentiment: result.sentiment || this.inferSentiment(feedbackText),
        urgency: result.urgency || this.inferUrgency(feedbackText),
        summary: result.summary || feedbackText.slice(0, 100) + '...',
        valueScore: result.valueScore || 5,
        confidence: result.confidence || 0.7
      };
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return this.getFallbackSentimentAnalysis(feedbackText);
    }
  }

  /**
   * Generate executive summary for multiple feedback items
   */
  async generateExecutiveSummary(feedbackItems) {
    const summaries = feedbackItems.map(item => 
      `- ${item.product_name}: ${item.ai_summary} (${item.urgency}, ${item.customer_tier})`
    ).join('\n');

    const prompt = `Summarize these top customer feedback items for executive leadership.

Feedback Items:
${summaries}

Provide:
1. Top 3 critical themes requiring immediate attention
2. Customer sentiment overview
3. Recommended actions

Keep it concise (3-4 sentences).`;

    try {
      const response = await this.ai.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: 'You are a product manager creating executive briefings.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 400
      });

      return this.extractTextFromResponse(response);
    } catch (error) {
      console.error('Executive summary error:', error);
      return 'Unable to generate summary at this time.';
    }
  }

  /**
   * Parse AI response (handles various formats)
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

      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
      }

      return JSON.parse(text.trim());
    } catch (error) {
      console.error('Parse error:', error, 'Response:', response);
      return {};
    }
  }

  /**
   * Extract text from AI response
   */
  extractTextFromResponse(response) {
    if (typeof response === 'string') return response;
    if (response.response) return response.response;
    if (Array.isArray(response)) return response[0]?.response || '';
    return '';
  }

  /**
   * Fallback analysis when AI fails
   */
  getFallbackAnalysis(feedbackText) {
    return {
      themes: [this.inferThemeFromKeywords(feedbackText)],
      sentiment: this.inferSentiment(feedbackText),
      urgency: this.inferUrgency(feedbackText),
      summary: feedbackText.slice(0, 150) + '...',
      valueScore: 5,
      confidence: 0.5
    };
  }

  /**
   * Fallback sentiment analysis
   */
  getFallbackSentimentAnalysis(feedbackText) {
    return {
      sentiment: this.inferSentiment(feedbackText),
      urgency: this.inferUrgency(feedbackText),
      summary: feedbackText.slice(0, 150) + '...',
      valueScore: 5,
      confidence: 0.5
    };
  }

  /**
   * Keyword-based theme inference (fallback)
   */
  inferThemeFromKeywords(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('rate limit') || lowerText.includes('429')) {
      return 'API Rate Limits';
    }
    if (lowerText.includes('documentation') || lowerText.includes('docs') || lowerText.includes('unclear')) {
      return 'Documentation Quality';
    }
    if (lowerText.includes('slow') || lowerText.includes('latency') || lowerText.includes('performance')) {
      return 'Performance Issues';
    }
    if (lowerText.includes('billing') || lowerText.includes('cost') || lowerText.includes('price')) {
      return 'Billing Concerns';
    }
    if (lowerText.includes('websocket') || lowerText.includes('ws')) {
      return 'WebSocket Support';
    }
    if (lowerText.includes('cold start')) {
      return 'Cold Start Latency';
    }
    if (lowerText.includes('typescript') || lowerText.includes('types')) {
      return 'TypeScript Support';
    }
    if (lowerText.includes('mobile') || lowerText.includes('ios') || lowerText.includes('android')) {
      return 'Mobile SDK';
    }
    if (lowerText.includes('security') || lowerText.includes('compliance') || lowerText.includes('soc2')) {
      return 'Security/Compliance';
    }
    if (lowerText.includes('love') || lowerText.includes('great') || lowerText.includes('amazing')) {
      return 'Positive Feedback';
    }
    if (lowerText.includes('request') || lowerText.includes('feature') || lowerText.includes('please add')) {
      return 'Feature Request';
    }
    
    return 'General Feedback';
  }

  /**
   * Keyword-based sentiment inference (fallback)
   */
  inferSentiment(text) {
    const lowerText = text.toLowerCase();
    
    const negativeWords = ['hate', 'terrible', 'broken', 'frustrated', 'angry', 'awful', 'worst', 'unacceptable'];
    const positiveWords = ['love', 'great', 'amazing', 'excellent', 'fantastic', 'perfect', 'wonderful'];
    const frustratedWords = ['frustrated', 'annoying', 'confusing', 'difficult', 'struggling'];
    
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const frustratedCount = frustratedWords.filter(word => lowerText.includes(word)).length;
    
    if (frustratedCount > 0 || (negativeCount > 0 && lowerText.includes('but'))) {
      return 'Frustrated';
    }
    if (negativeCount > positiveCount) {
      return 'Negative';
    }
    if (positiveCount > negativeCount) {
      return 'Positive';
    }
    return 'Neutral';
  }

  /**
   * Keyword-based urgency inference (fallback)
   */
  inferUrgency(text) {
    const lowerText = text.toLowerCase();
    
    const criticalWords = ['urgent', 'critical', 'production', 'outage', 'down', 'broken', 'data loss'];
    const highWords = ['blocking', 'cant', 'failing', 'error', 'bug'];
    const lowWords = ['nice to have', 'suggestion', 'would love', 'future'];
    
    if (criticalWords.some(word => lowerText.includes(word)) || lowerText.includes('!!!')) {
      return 'Critical';
    }
    if (highWords.some(word => lowerText.includes(word))) {
      return 'High';
    }
    if (lowWords.some(word => lowerText.includes(word))) {
      return 'Low';
    }
    return 'Medium';
  }
}

/**
 * Batch process multiple feedback items
 */
export async function batchAnalyzeFeedback(feedbackItems, aiBinding, batchSize = 5) {
  const agent = new FeedbackAnalysisAgent(aiBinding);
  const results = [];
  
  // Process in batches to avoid rate limits
  for (let i = 0; i < feedbackItems.length; i += batchSize) {
    const batch = feedbackItems.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(item => 
        agent.analyzeFeedback(item.feedback_text, {
          customerTier: item.customer_tier,
          source: item.source
        })
      )
    );
    
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + batchSize < feedbackItems.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
