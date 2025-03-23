-- MCP Server Manager Database Schema

-- Servers table to store server information
CREATE TABLE IF NOT EXISTS servers (
    id VARCHAR(36) PRIMARY KEY,            -- UUID server identifier
    git_url TEXT NOT NULL,                 -- Git repository URL
    directory_path TEXT NOT NULL,          -- Local filesystem path
    project_type VARCHAR(50) NOT NULL,     -- Type of project (nodejs, etc)
    name VARCHAR(255) NOT NULL,            -- Display name
    config JSON DEFAULT '{}',              -- Server configuration as JSON
    env_vars JSON DEFAULT '{}',            -- Environment variables as JSON
    run_command TEXT,                      -- Custom run command (optional)
    entry_point TEXT,                      -- Custom entry point (optional)
    is_built BOOLEAN DEFAULT FALSE,        -- Whether the project has been built
    status VARCHAR(20) DEFAULT 'stopped',  -- Current status (running, stopped, error)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Server logs table to store logs separately (instead of keeping in the server object)
CREATE TABLE IF NOT EXISTS server_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id VARCHAR(36) NOT NULL,        -- Reference to servers.id
    type VARCHAR(20) NOT NULL,             -- Log type (info, stdout, stderr, error)
    timestamp TIMESTAMP NOT NULL,          -- When the log was created
    message TEXT NOT NULL,                 -- Log message content
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);

-- Index for faster log queries
CREATE INDEX IF NOT EXISTS idx_server_logs_server_id ON server_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_server_logs_timestamp ON server_logs(timestamp);

-- Triggers to automatically update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_servers_timestamp
AFTER UPDATE ON servers
FOR EACH ROW
BEGIN
    UPDATE servers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;