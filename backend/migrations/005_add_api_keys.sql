-- Add API keys table for AI/OpenWebUI integrations
-- API keys allow authentication without JWT, ideal for automated integrations

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'API Key',
    key VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast key lookups during authentication
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key) WHERE is_active = true;

-- Index for listing user's keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

COMMENT ON TABLE api_keys IS 'API keys for authenticating AI integrations (OpenWebUI, etc.) without JWT tokens';
