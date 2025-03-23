const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class DatabaseStorage {
  constructor(userDataPath) {
    this.dbPath = path.join(userDataPath, 'vibecontrol.db');
    
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Initialize database
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeDatabase();
  }
  
  async initializeDatabase() {
    // Read schema from file
    const schema = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
    
    // Only initialize if database doesn't exist
    if (!fs.existsSync(this.dbPath)) {
      // Execute schema
      this.db.exec(schema, (err) => {
        if (err) {
          console.error('Error initializing database:', err);
          return;
        }
        console.log('Database initialized successfully');
      });
    }
  }
  
  // Get all servers
  async getServers() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM servers`;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('Error getting servers:', err);
          reject(err);
          return;
        }
        
        // Convert rows to server objects
        const servers = {};
        rows.forEach(row => {
          servers[row.id] = {
            id: row.id,
            name: row.name,
            gitUrl: row.git_url,
            dir: row.directory_path,
            dataDir: row.data_path,
            logsDir: row.logs_path,
            projectType: row.project_type,
            config: JSON.parse(row.config || '{}'),
            env: JSON.parse(row.env_vars || '{}'),
            runCommand: row.run_command,
            entryPoint: row.entry_point,
            isBuilt: row.is_built === 1,
            status: row.status
          };
        });
        
        resolve(servers);
      });
    });
  }
  
  // Add a new server
  async addServer(serverData) {
    return new Promise((resolve, reject) => {
      const serverId = uuidv4();
      const insertSql = `
        INSERT INTO servers (
          id, name, git_url, directory_path, data_path, logs_path,
          project_type, config, env_vars, run_command, entry_point,
          is_built, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(insertSql, [
        serverId,
        serverData.name,
        serverData.gitUrl,
        serverData.dir,
        serverData.dataDir,
        serverData.logsDir,
        serverData.projectType || null,
        JSON.stringify(serverData.config || {}),
        JSON.stringify(serverData.env || {}),
        serverData.runCommand || null,
        serverData.entryPoint || null,
        serverData.isBuilt ? 1 : 0,
        serverData.status || 'stopped'
      ], function(err) {
        if (err) {
          console.error('Error creating server:', err);
          reject(err);
          return;
        }
        resolve({ ...serverData, id: serverId });
      });
    });
  }
  
  // Update server
  async updateServer(serverId, serverData) {
    return new Promise((resolve, reject) => {
      const updateSql = `
        UPDATE servers SET
          name = ?,
          git_url = ?,
          directory_path = ?,
          data_path = ?,
          logs_path = ?,
          project_type = ?,
          config = ?,
          env_vars = ?,
          run_command = ?,
          entry_point = ?,
          is_built = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      this.db.run(updateSql, [
        serverData.name,
        serverData.gitUrl,
        serverData.dir,
        serverData.dataDir,
        serverData.logsDir,
        serverData.projectType,
        JSON.stringify(serverData.config || {}),
        JSON.stringify(serverData.env || {}),
        serverData.runCommand,
        serverData.entryPoint,
        serverData.isBuilt ? 1 : 0,
        serverData.status,
        serverId
      ], function(err) {
        if (err) {
          console.error('Error updating server:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  
  // Add a batch of logs
  addLogs(serverId, logs) {
    return new Promise((resolve, reject) => {
      if (!logs || logs.length === 0) {
        resolve();
        return;
      }
      
      // Start a transaction
      this.db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          console.error('Error starting transaction:', err);
          reject(err);
          return;
        }
        
        const stmt = this.db.prepare(`
          INSERT INTO server_logs (server_id, type, timestamp, message)
          VALUES (?, ?, ?, ?)
        `);
        
        let hasError = false;
        
        // Insert each log
        logs.forEach(log => {
          stmt.run(
            serverId,
            log.type,
            log.timestamp,
            log.message,
            (err) => {
              if (err && !hasError) {
                hasError = true;
                console.error('Error inserting log:', err);
                this.db.run('ROLLBACK', () => reject(err));
              }
            }
          );
        });
        
        // Finalize the statement
        stmt.finalize(err => {
          if (err && !hasError) {
            console.error('Error finalizing statement:', err);
            this.db.run('ROLLBACK', () => reject(err));
            return;
          }
          
          if (!hasError) {
            // Commit the transaction
            this.db.run('COMMIT', (err) => {
              if (err) {
                console.error('Error committing transaction:', err);
                reject(err);
                return;
              }
              
              resolve();
            });
          }
        });
      });
    });
  }
  
  // Add a single log
  addLog(serverId, log) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO server_logs (server_id, type, timestamp, message)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        serverId,
        log.type,
        log.timestamp,
        log.message
      ], function(err) {
        if (err) {
          console.error('Error adding log:', err);
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }
  
  // Get logs for a server
  getLogs(serverId, limit = 1000) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM server_logs
        WHERE server_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
      `;
      
      this.db.all(sql, [serverId, limit], (err, rows) => {
        if (err) {
          console.error('Error getting logs:', err);
          reject(err);
          return;
        }
        
        // Map rows to log objects
        const logs = rows.map(row => ({
          type: row.type,
          timestamp: row.timestamp,
          message: row.message
        }));
        
        resolve(logs.reverse()); // Reverse to get chronological order
      });
    });
  }
  
  // Delete a server and its logs
  deleteServer(serverId) {
    return new Promise((resolve, reject) => {
      // SQLite will cascade the deletion to logs due to foreign key constraint
      const sql = `DELETE FROM servers WHERE id = ?`;
      
      this.db.run(sql, [serverId], function(err) {
        if (err) {
          console.error('Error deleting server:', err);
          reject(err);
          return;
        }
        
        resolve();
      });
    });
  }
  
  // Close the database connection
  close() {
    this.db.close(err => {
      if (err) {
        console.error('Error closing database:', err);
      }
    });
  }
}

module.exports = DatabaseStorage;