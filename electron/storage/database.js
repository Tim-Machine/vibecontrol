const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseStorage {
  constructor(userDataPath) {
    // Ensure database directory exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    
    // Set up database file path
    this.dbPath = path.join(userDataPath, 'mcp-server-manager.db');
    
    // Initialize the database connection
    this.db = new sqlite3.Database(this.dbPath);
    
    // Initialize the database schema
    this.initializeDatabase();
  }
  
  initializeDatabase() {
    // Read the schema from the SQL file
    const schemaPath = path.join(process.cwd(), 'database.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema to create tables
    this.db.exec(schema, (err) => {
      if (err) {
        console.error('Error initializing database:', err);
      } else {
        console.log('Database initialized successfully');
      }
    });
  }
  
  // Get all servers
  getServers() {
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
            gitUrl: row.git_url,
            dir: row.directory_path,
            projectType: row.project_type,
            name: row.name,
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
  
  // Update or create a server
  updateServer(serverId, serverData) {
    return new Promise((resolve, reject) => {
      // Check if server already exists
      const checkSql = 'SELECT COUNT(*) as count FROM servers WHERE id = ?';
      
      this.db.get(checkSql, [serverId], (err, result) => {
        if (err) {
          console.error('Error checking server existence:', err);
          reject(err);
          return;
        }
        
        const exists = result.count > 0;
        
        if (exists) {
          // Update existing server
          const updateSql = `
            UPDATE servers SET
              git_url = ?,
              directory_path = ?,
              project_type = ?,
              name = ?,
              config = ?,
              env_vars = ?,
              run_command = ?,
              entry_point = ?,
              is_built = ?,
              status = ?
            WHERE id = ?
          `;
          
          this.db.run(updateSql, [
            serverData.gitUrl,
            serverData.dir,
            serverData.projectType,
            serverData.name,
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
            
            // Update logs if provided
            if (serverData.logs && serverData.logs.length > 0) {
              // Insert new logs
              DatabaseStorage.prototype.addLogs(serverId, serverData.logs)
                .then(() => resolve())
                .catch(reject);
            } else {
              resolve();
            }
          });
        } else {
          // Insert new server
          const insertSql = `
            INSERT INTO servers (
              id, git_url, directory_path, project_type, name, 
              config, env_vars, run_command, entry_point, is_built, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          this.db.run(insertSql, [
            serverId,
            serverData.gitUrl,
            serverData.dir,
            serverData.projectType,
            serverData.name,
            JSON.stringify(serverData.config || {}),
            JSON.stringify(serverData.env || {}),
            serverData.runCommand,
            serverData.entryPoint,
            serverData.isBuilt ? 1 : 0,
            serverData.status
          ], function(err) {
            if (err) {
              console.error('Error creating server:', err);
              reject(err);
              return;
            }
            
            // Insert logs if provided
            if (serverData.logs && serverData.logs.length > 0) {
              DatabaseStorage.prototype.addLogs(serverId, serverData.logs)
                .then(() => resolve())
                .catch(reject);
            } else {
              resolve();
            }
          });
        }
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