// ============================================
// DATA CLEANING MODULE
// Processes raw feedback data from Excel sheets
// ============================================

/**
 * Standardize date formats to ISO 8601
 */
export function standardizeDate(dateStr) {
  if (!dateStr || dateStr === 'NULL' || dateStr === null || dateStr === undefined) return null;
  
  try {
    // Convert to string if needed
    const str = String(dateStr).trim();
    if (!str || str === 'null' || str === 'undefined') return null;
    
    let date;
    
    // Format 1: ISO format "2024-01-15T10:30:00Z" or "2024-01-15 10:30:00"
    if (str.includes('T') || str.match(/^\d{4}-\d{2}-\d{2}/)) {
      date = new Date(str);
    }
    // Format 2: DD/MM/YYYY (European) or MM/DD/YYYY (US)
    else if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}/)) {
      const parts = str.split(/[\s\/]/);
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      const time = parts[3] || '00:00:00';
      
      // Determine if DD/MM/YYYY or MM/DD/YYYY
      // If day > 12, must be DD/MM/YYYY
      if (day > 12) {
        date = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${time}`);
      } 
      // If month > 12, must be MM/DD/YYYY (but this would be invalid)
      else if (month > 12) {
        date = new Date(`${year}-${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}T${time}`);
      }
      // Ambiguous - assume DD/MM/YYYY (European format from your data)
      else {
        date = new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T${time}`);
      }
    }
    // Format 3: "15-Jan-2024"
    else if (str.match(/\d{1,2}-[A-Za-z]{3}-\d{4}/)) {
      date = new Date(str);
    }
    // Format 4: Excel serial date (number)
    else if (!isNaN(str) && str.length < 6) {
      // Excel serial date to JavaScript date
      const excelEpoch = new Date(1899, 11, 30);
      date = new Date(excelEpoch.getTime() + parseFloat(str) * 86400000);
    }
    // Default: try parsing as-is
    else {
      date = new Date(str);
    }
    
    // Validate the date
    if (isNaN(date.getTime())) {
      console.error('Date parsing error:', dateStr);
      return null;
    }
    
    return date.toISOString();
  } catch (e) {
    console.error('Date parsing error:', dateStr, e);
    return null;
  }
}

/**
 * Standardize product names
 */
export function standardizeProductName(productStr) {
  if (!productStr) return null;
  
  const productMap = {
    'workers': 'Workers',
    'workers ai': 'Workers AI',
    'workers-ai': 'Workers AI',
    'workersai': 'Workers AI',
    'd1': 'D1 Database',
    'd1 database': 'D1 Database',
    'd1-database': 'D1 Database',
    'workflows': 'Workflows',
    'workflow': 'Workflows',
    'r2': 'R2 Storage',
    'r2 storage': 'R2 Storage',
    'kv': 'KV Storage',
    'kv storage': 'KV Storage',
    'pages': 'Pages',
    'cloudflare pages': 'Pages',
    'billing': 'Billing',
    'api': 'API',
    'documentation': 'Documentation',
    'docs': 'Documentation'
  };
  
  const normalized = productStr.toLowerCase().trim();
  return productMap[normalized] || productStr.trim();
}

/**
 * Standardize priority/urgency values
 */
export function standardizeUrgency(urgencyStr) {
  if (!urgencyStr) return 'Medium';
  
  const normalized = urgencyStr.toLowerCase().trim();
  
  if (normalized.includes('critical') || normalized.includes('urgent')) {
    return 'Critical';
  } else if (normalized === 'high' || normalized.includes('blocking')) {
    return 'High';
  } else if (normalized === 'low') {
    return 'Low';
  } else {
    return 'Medium';
  }
}

/**
 * Calculate urgency score (1-10)
 */
export function calculateUrgencyScore(urgency, feedbackText, customerTier) {
  let score = 5; // Default medium
  
  // Base score from urgency
  const urgencyScores = {
    'Critical': 10,
    'High': 8,
    'Medium': 5,
    'Low': 3
  };
  score = urgencyScores[urgency] || 5;
  
  // Adjust based on keywords in feedback
  const text = feedbackText.toLowerCase();
  
  if (text.includes('urgent') || text.includes('critical')) score += 2;
  if (text.includes('blocking') || text.includes('can\'t')) score += 1;
  if (text.includes('production') || text.includes('outage')) score += 2;
  if (text.includes('data loss') || text.includes('security')) score += 2;
  
  // Boost for enterprise customers
  if (customerTier === 'Enterprise') score += 1;
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Calculate value score (1-10) based on business impact
 */
export function calculateValueScore(customerTier, feedbackText, engagementMetrics = {}) {
  let score = 5;
  
  // Customer tier weight
  const tierScores = {
    'Enterprise': 9,
    'Pro': 7,
    'Free': 4
  };
  score = tierScores[customerTier] || 5;
  
  // Engagement boost (likes, upvotes, comments)
  const { likes = 0, upvotes = 0, comments = 0, views = 0 } = engagementMetrics;
  const totalEngagement = likes + upvotes * 2 + comments;
  
  if (totalEngagement > 50) score += 2;
  else if (totalEngagement > 20) score += 1;
  
  // Business impact keywords
  const text = feedbackText.toLowerCase();
  if (text.includes('revenue') || text.includes('customer')) score += 1;
  if (text.includes('compliance') || text.includes('security')) score += 1;
  
  return Math.min(10, Math.max(1, score));
}

/**
 * Calculate engagement score
 */
export function calculateEngagementScore(metrics) {
  const { likes = 0, retweets = 0, upvotes = 0, comments = 0, replies = 0, views = 0 } = metrics;
  
  // Weighted formula
  const score = (likes * 1) + (retweets * 2) + (upvotes * 2) + (comments * 3) + (replies * 3) + (views * 0.01);
  
  return Math.round(score * 100) / 100;
}

/**
 * Standardize customer tier
 */
export function standardizeTier(tierStr) {
  if (!tierStr) return 'Free';
  
  const normalized = tierStr.toLowerCase().trim();
  
  if (normalized === 'enterprise') return 'Enterprise';
  if (normalized === 'pro') return 'Pro';
  return 'Free';
}

/**
 * Extract email from text if missing
 */
export function extractEmail(text) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = text.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Parse delimited strings (tags, labels, etc.)
 */
export function parseDelimitedString(str, delimiter = ',') {
  if (!str) return [];
  return str.split(delimiter).map(s => s.trim()).filter(Boolean);
}

/**
 * Clean text - remove excessive whitespace, normalize
 */
export function cleanText(text) {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
    .slice(0, 5000);  // Limit length
}

/**
 * Process Support Ticket Row
 */
export function processSupportTicket(row) {
  const createdDate = standardizeDate(row['Created Date']);
  
  return {
    original_id: row['Ticket ID'],
    feedback_text: cleanText(row['Issue Description'] || 'No description'),
    email: row['Customer Email'] || null,
    username: row['customer_name'] || null,
    product_area: standardizeProductName(row['Product Area']),
    source: 'Support',
    created_date: createdDate || new Date().toISOString(),
    resolved_date: standardizeDate(row['resolved_date']),
    customer_tier: standardizeTier(row['Customer Tier']),
    urgency: standardizeUrgency(row['Priority']),
    metadata: {
      agent_name: row['Agent Name'],
      status: row['Status'],
      rating: row['rating'] || null
    }
  };
}

/**
 * Process Discord Message Row
 */
export function processDiscordMessage(row) {
  // Parse reactions: "👍:3;😢:1" -> total count
  const reactions = row['reactions'] || '';
  const reactionCounts = reactions.split(';')
    .map(r => {
      const match = r.match(/:(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
    .reduce((sum, count) => sum + count, 0);
  
  const createdDate = standardizeDate(row['timestamp']);
  
  return {
    original_id: row['message_id'],
    feedback_text: cleanText(row['message_content'] || 'No content'),
    username: row['username'] || row['user_id'] || 'anonymous',
    email: null,
    product_area: inferProductFromText(row['message_content'] || ''),
    source: 'Discord',
    created_date: createdDate || new Date().toISOString(), // Fallback to current time
    customer_tier: 'Free',  // Most Discord users are free tier
    urgency: inferUrgencyFromText(row['message_content'] || ''),
    metadata: {
      channel: row['channel_name'],
      reactions: reactionCounts,
      thread_id: row['thread_id'],
      edited: row['edited'] === 'TRUE'
    }
  };
}

/**
 * Process GitHub Issue Row
 */
export function processGitHubIssue(row) {
  const issueNumber = row['Issue Number']?.replace('#', '') || row['Issue Number'];
  const labels = parseDelimitedString(row['Labels']);
  const createdDate = standardizeDate(row['Created']);
  
  return {
    original_id: `#${issueNumber}`,
    feedback_text: cleanText((row['Title'] || 'No title') + '\n\n' + (row['Description'] || 'No description')),
    username: row['Author'] || 'anonymous',
    email: null,
    product_area: inferProductFromLabels(labels) || inferProductFromText(row['Title'] || ''),
    source: 'GitHub',
    created_date: createdDate || new Date().toISOString(),
    resolved_date: standardizeDate(row['Closed']),
    customer_tier: inferTierFromAuthor(row['Author']),
    urgency: inferUrgencyFromLabels(labels),
    metadata: {
      repository: row['Repository'],
      state: row['State']?.toLowerCase(),
      labels: labels,
      comments: parseInt(row['Comments']) || 0,
      assignee: row['Assignee']
    }
  };
}

/**
 * Process Email Row
 */
export function processEmail(row) {
  const createdDate = standardizeDate(row['Date Received']);
  
  return {
    original_id: row['Email ID'],
    feedback_text: cleanText((row['Subject'] || 'No subject') + '\n\n' + (row['Body'] || 'No body')),
    email: row['From'] || null,
    username: null,
    product_area: inferProductFromText((row['Subject'] || '') + ' ' + (row['Body'] || '')),
    source: 'Email',
    created_date: createdDate || new Date().toISOString(),
    customer_tier: inferTierFromEmail(row['From']),
    urgency: standardizeUrgency(row['Category']) || inferUrgencyFromText(row['Subject'] || ''),
    metadata: {
      subject: row['Subject'],
      to: row['To'],
      category: row['Category'],
      has_attachment: !!row['Attachments']
    }
  };
}

/**
 * Process Twitter/X Row
 */
export function processTweet(row) {
  const engagement = {
    likes: parseInt(row['Likes']) || 0,
    retweets: parseInt(row['Retweets']) || 0,
    replies: parseInt(row['Replies']) || 0
  };
  const createdDate = standardizeDate(row['Timestamp']);
  
  return {
    original_id: row['Tweet ID'],
    feedback_text: cleanText(row['Tweet Text'] || 'No content'),
    username: row['Handle'] || row['Username'] || 'anonymous',
    email: null,
    product_area: inferProductFromText(row['Tweet Text'] || ''),
    source: 'Twitter',
    created_date: createdDate || new Date().toISOString(),
    customer_tier: row['Verified'] === 'TRUE' ? 'Pro' : 'Free',
    urgency: inferUrgencyFromText(row['Tweet Text'] || ''),
    engagement_metrics: engagement,
    metadata: {
      verified: row['Verified'] === 'TRUE',
      hashtags: parseDelimitedString(row['Hashtags'], ' '),
      mentions: row['Mentions'],
      is_reply: !!row['Is Reply To'],
      ...engagement
    }
  };
}

/**
 * Process Forum Post Row
 */
export function processForumPost(row) {
  const engagement = {
    views: parseInt(row['Views']) || 0,
    upvotes: parseInt(row['Upvotes']) || 0,
    replies: parseInt(row['Replies']) || 0
  };
  const createdDate = standardizeDate(row['Posted Date']);
  
  return {
    original_id: row['Post ID'],
    feedback_text: cleanText((row['Thread Title'] || 'No title') + '\n\n' + (row['Post Content'] || 'No content')),
    username: row['Author'] || 'anonymous',
    email: null,
    product_area: inferProductFromTags(parseDelimitedString(row['Tags'], ';')),
    source: 'Forum',
    created_date: createdDate || new Date().toISOString(),
    customer_tier: 'Free',
    urgency: inferUrgencyFromCategory(row['Forum Category']),
    engagement_metrics: engagement,
    metadata: {
      category: row['Forum Category'],
      tags: parseDelimitedString(row['Tags'], ';'),
      status: row['Status'],
      ...engagement
    }
  };
}

/**
 * Helper: Infer product from text
 */
function inferProductFromText(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('worker') && lowerText.includes('ai')) return 'Workers AI';
  if (lowerText.includes('worker')) return 'Workers';
  if (lowerText.includes('d1')) return 'D1 Database';
  if (lowerText.includes('workflow')) return 'Workflows';
  if (lowerText.includes('r2')) return 'R2 Storage';
  if (lowerText.includes('kv')) return 'KV Storage';
  if (lowerText.includes('pages')) return 'Pages';
  if (lowerText.includes('billing') || lowerText.includes('cost')) return 'Billing';
  if (lowerText.includes('document') || lowerText.includes('docs')) return 'Documentation';
  if (lowerText.includes('api')) return 'API';
  
  return null;
}

/**
 * Helper: Infer urgency from text
 */
function inferUrgencyFromText(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('urgent') || lowerText.includes('critical') || 
      lowerText.includes('!!!') || lowerText.includes('outage') ||
      lowerText.includes('production down')) {
    return 'Critical';
  }
  if (lowerText.includes('blocking') || lowerText.includes('can\'t') ||
      lowerText.includes('broken') || lowerText.includes('failing')) {
    return 'High';
  }
  if (lowerText.includes('nice to have') || lowerText.includes('suggestion')) {
    return 'Low';
  }
  return 'Medium';
}

/**
 * Helper: Infer product from labels
 */
function inferProductFromLabels(labels) {
  for (const label of labels) {
    const product = standardizeProductName(label);
    if (product) return product;
  }
  return null;
}

/**
 * Helper: Infer urgency from labels
 */
function inferUrgencyFromLabels(labels) {
  const lowerLabels = labels.map(l => l.toLowerCase());
  
  if (lowerLabels.includes('critical') || lowerLabels.includes('urgent')) return 'Critical';
  if (lowerLabels.includes('high') || lowerLabels.includes('bug')) return 'High';
  if (lowerLabels.includes('enhancement') || lowerLabels.includes('feature-request')) return 'Low';
  return 'Medium';
}

/**
 * Helper: Infer product from tags
 */
function inferProductFromTags(tags) {
  for (const tag of tags) {
    const product = standardizeProductName(tag);
    if (product) return product;
  }
  return null;
}

/**
 * Helper: Infer urgency from forum category
 */
function inferUrgencyFromCategory(category) {
  if (category === 'Bug Reports') return 'High';
  if (category === 'Help & Support') return 'Medium';
  if (category === 'Feature Requests') return 'Low';
  return 'Medium';
}

/**
 * Helper: Infer tier from email domain
 */
function inferTierFromEmail(email) {
  if (!email) return 'Free';
  
  const domain = email.split('@')[1]?.toLowerCase();
  
  // Enterprise indicators
  const enterpriseDomains = ['enterprise', 'bigco', 'corp', 'finance', 'techcorp'];
  if (enterpriseDomains.some(d => domain?.includes(d))) return 'Enterprise';
  
  // Pro indicators
  const proDomains = ['startup', 'io', 'tech', 'dev'];
  if (proDomains.some(d => domain?.includes(d))) return 'Pro';
  
  return 'Free';
}

/**
 * Helper: Infer tier from GitHub author
 */
function inferTierFromAuthor(author) {
  if (!author) return 'Free';
  
  if (author.includes('enterprise') || author.includes('corp')) return 'Enterprise';
  if (author.includes('pro') || author.includes('team')) return 'Pro';
  return 'Free';
}
