-- ============================================
-- CLOUDFLARE FEEDBACK PULSE - D1 DATABASE SCHEMA
-- ============================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS feedback_themes;
DROP TABLE IF EXISTS sentiment_analysis;
DROP TABLE IF EXISTS themes;
DROP TABLE IF EXISTS feedback_master;
DROP TABLE IF EXISTS product_areas;
DROP TABLE IF EXISTS sources;
DROP TABLE IF EXISTS users;

-- ============================================
-- DIMENSION TABLES
-- ============================================

-- Users dimension
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    username TEXT,
    customer_tier TEXT CHECK(customer_tier IN ('Enterprise', 'Pro', 'Free')),
    is_verified INTEGER DEFAULT 0,
    first_seen_date TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tier ON users(customer_tier);

-- Product areas dimension
CREATE TABLE product_areas (
    product_area_id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL UNIQUE,
    category TEXT,
    team_owner TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_product_name ON product_areas(product_name);

-- Sources dimension
CREATE TABLE sources (
    source_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_name TEXT NOT NULL UNIQUE CHECK(source_name IN ('Support', 'Discord', 'GitHub', 'Email', 'Twitter', 'Forum')),
    source_type TEXT CHECK(source_type IN ('Internal', 'External')),
    requires_response INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Themes dimension
CREATE TABLE themes (
    theme_id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_name TEXT NOT NULL UNIQUE,
    category TEXT,
    keywords TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_theme_name ON themes(theme_name);

-- ============================================
-- FACT TABLE
-- ============================================

-- Central feedback master table
CREATE TABLE feedback_master (
    feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Foreign keys
    user_id INTEGER,
    product_area_id INTEGER,
    source_id INTEGER NOT NULL,
    
    -- Core feedback data
    feedback_text TEXT NOT NULL,
    original_id TEXT,  -- Store original ID from source (TKT-001, msg_discord_001, etc.)
    
    -- Temporal
    created_date TEXT NOT NULL,
    resolved_date TEXT,
    
    -- Calculated scores (from AI)
    urgency_score INTEGER CHECK(urgency_score BETWEEN 1 AND 10),
    value_score INTEGER CHECK(value_score BETWEEN 1 AND 10),
    engagement_score REAL DEFAULT 0,
    
    -- Metadata
    metadata TEXT,  -- JSON field for source-specific data
    
    -- Audit
    inserted_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (product_area_id) REFERENCES product_areas(product_area_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX idx_feedback_source ON feedback_master(source_id);
CREATE INDEX idx_feedback_product ON feedback_master(product_area_id);
CREATE INDEX idx_feedback_created ON feedback_master(created_date);
CREATE INDEX idx_feedback_urgency ON feedback_master(urgency_score);
CREATE INDEX idx_feedback_original_id ON feedback_master(original_id);

-- ============================================
-- ANALYSIS TABLES
-- ============================================

-- Sentiment analysis results from Workers AI
CREATE TABLE sentiment_analysis (
    analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_id INTEGER NOT NULL,
    
    -- AI Analysis results
    sentiment TEXT CHECK(sentiment IN ('Positive', 'Neutral', 'Negative', 'Frustrated')),
    urgency TEXT CHECK(urgency IN ('Critical', 'High', 'Medium', 'Low')),
    value_score INTEGER CHECK(value_score BETWEEN 1 AND 10),
    
    -- AI generated content
    ai_summary TEXT,
    extracted_themes TEXT,  -- JSON array of themes
    
    -- Model info
    model_used TEXT,
    confidence_score REAL,
    
    analyzed_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (feedback_id) REFERENCES feedback_master(feedback_id)
);

CREATE INDEX idx_sentiment_feedback ON sentiment_analysis(feedback_id);
CREATE INDEX idx_sentiment_urgency ON sentiment_analysis(urgency);

-- ============================================
-- BRIDGE TABLES
-- ============================================

-- Many-to-many relationship between feedback and themes
CREATE TABLE feedback_themes (
    feedback_id INTEGER NOT NULL,
    theme_id INTEGER NOT NULL,
    confidence_score REAL CHECK(confidence_score BETWEEN 0 AND 1),
    extracted_at TEXT DEFAULT (datetime('now')),
    
    PRIMARY KEY (feedback_id, theme_id),
    FOREIGN KEY (feedback_id) REFERENCES feedback_master(feedback_id),
    FOREIGN KEY (theme_id) REFERENCES themes(theme_id)
);

CREATE INDEX idx_ft_feedback ON feedback_themes(feedback_id);
CREATE INDEX idx_ft_theme ON feedback_themes(theme_id);

-- ============================================
-- SEED DATA - COMMON LOOKUPS
-- ============================================

-- Insert common sources
INSERT INTO sources (source_name, source_type, requires_response) VALUES
    ('Support', 'Internal', 1),
    ('Discord', 'External', 0),
    ('GitHub', 'External', 1),
    ('Email', 'Internal', 1),
    ('Twitter', 'External', 0),
    ('Forum', 'External', 0);

-- Insert common product areas
INSERT INTO product_areas (product_name, category, team_owner) VALUES
    ('Workers', 'Compute', 'Platform Team'),
    ('Workers AI', 'AI/ML', 'AI Team'),
    ('D1 Database', 'Database', 'Storage Team'),
    ('Workflows', 'Automation', 'Platform Team'),
    ('R2 Storage', 'Storage', 'Storage Team'),
    ('KV Storage', 'Storage', 'Storage Team'),
    ('Pages', 'Deployment', 'Developer Experience'),
    ('Billing', 'Business', 'Finance'),
    ('Documentation', 'DevRel', 'Developer Experience'),
    ('API', 'Platform', 'Platform Team');

-- Insert common themes
INSERT INTO themes (theme_name, category, keywords) VALUES
    ('API Rate Limits', 'Technical', 'rate limit,429,too restrictive,quota'),
    ('Documentation Quality', 'Developer Experience', 'docs,documentation,unclear,confusing,tutorial'),
    ('Performance Issues', 'Technical', 'slow,latency,performance,degraded,timeout'),
    ('Billing Concerns', 'Business', 'billing,cost,pricing,expensive,surprise'),
    ('Feature Request', 'Product', 'request,need,please add,would love,suggestion'),
    ('WebSocket Support', 'Feature Request', 'websocket,ws,real-time,socket'),
    ('Regional Issues', 'Infrastructure', 'region,APAC,EU,latency,geographic'),
    ('Cold Start Latency', 'Performance', 'cold start,initialization,slow start'),
    ('TypeScript Support', 'Developer Experience', 'typescript,types,type definitions'),
    ('Mobile SDK', 'Developer Experience', 'mobile,iOS,Android,SDK'),
    ('Security/Compliance', 'Enterprise', 'SOC2,HIPAA,compliance,security,IP allowlist'),
    ('Data Loss', 'Critical', 'data loss,disappearing,missing,lost'),
    ('Build/Deploy Issues', 'CI/CD', 'build,deploy,deployment,stuck,failed'),
    ('Positive Feedback', 'Sentiment', 'love,great,amazing,excellent,thank you');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Feedback with all relationships
CREATE VIEW v_feedback_full AS
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
    pa.category as product_category,
    s.source_name,
    sa.sentiment,
    sa.urgency,
    sa.ai_summary
FROM feedback_master fm
LEFT JOIN users u ON fm.user_id = u.user_id
LEFT JOIN product_areas pa ON fm.product_area_id = pa.product_area_id
LEFT JOIN sources s ON fm.source_id = s.source_id
LEFT JOIN sentiment_analysis sa ON fm.feedback_id = sa.feedback_id;

-- View: High priority feedback
CREATE VIEW v_high_priority_feedback AS
SELECT 
    fm.feedback_id,
    fm.original_id,
    fm.feedback_text,
    fm.created_date,
    pa.product_name,
    u.customer_tier,
    s.source_name,
    sa.urgency,
    sa.sentiment,
    fm.urgency_score,
    fm.value_score
FROM feedback_master fm
LEFT JOIN users u ON fm.user_id = u.user_id
LEFT JOIN product_areas pa ON fm.product_area_id = pa.product_area_id
LEFT JOIN sources s ON fm.source_id = s.source_id
LEFT JOIN sentiment_analysis sa ON fm.feedback_id = sa.feedback_id
WHERE fm.urgency_score >= 7 OR sa.urgency IN ('Critical', 'High')
ORDER BY fm.urgency_score DESC, fm.created_date DESC;

-- View: Theme summary
CREATE VIEW v_theme_summary AS
SELECT 
    t.theme_name,
    t.category,
    COUNT(DISTINCT ft.feedback_id) as feedback_count,
    AVG(fm.urgency_score) as avg_urgency,
    AVG(fm.value_score) as avg_value,
    GROUP_CONCAT(DISTINCT s.source_name) as sources
FROM themes t
LEFT JOIN feedback_themes ft ON t.theme_id = ft.theme_id
LEFT JOIN feedback_master fm ON ft.feedback_id = fm.feedback_id
LEFT JOIN sources s ON fm.source_id = s.source_id
GROUP BY t.theme_id, t.theme_name, t.category
ORDER BY feedback_count DESC;

-- View: KPIs for Power BI Dashboard
CREATE VIEW v_kpi_dashboard AS
SELECT 
    COUNT(DISTINCT fm.feedback_id) as total_feedback,
    COUNT(DISTINCT CASE WHEN sa.urgency = 'Critical' THEN fm.feedback_id END) as critical_count,
    COUNT(DISTINCT CASE WHEN sa.urgency = 'High' THEN fm.feedback_id END) as high_count,
    COUNT(DISTINCT CASE WHEN sa.sentiment = 'Negative' THEN fm.feedback_id END) as negative_count,
    COUNT(DISTINCT CASE WHEN sa.sentiment = 'Positive' THEN fm.feedback_id END) as positive_count,
    COUNT(DISTINCT CASE WHEN u.customer_tier = 'Enterprise' THEN fm.feedback_id END) as enterprise_feedback,
    COUNT(DISTINCT u.user_id) as unique_users,
    AVG(fm.urgency_score) as avg_urgency_score,
    AVG(fm.value_score) as avg_value_score
FROM feedback_master fm
LEFT JOIN users u ON fm.user_id = u.user_id
LEFT JOIN sentiment_analysis sa ON fm.feedback_id = sa.feedback_id;

-- ============================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================

-- Query 1: Show all high priority issues
-- SELECT * FROM v_high_priority_feedback LIMIT 10;

-- Query 2: Theme breakdown
-- SELECT * FROM v_theme_summary;

-- Query 3: Dashboard KPIs
-- SELECT * FROM v_kpi_dashboard;

-- Query 4: Feedback by source
-- SELECT source_name, COUNT(*) as count 
-- FROM v_feedback_full 
-- GROUP BY source_name;

-- Query 5: Enterprise customer feedback
-- SELECT * FROM v_feedback_full 
-- WHERE customer_tier = 'Enterprise' 
-- ORDER BY urgency_score DESC;
