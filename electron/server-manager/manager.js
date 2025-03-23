const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);
const find = require('find-process');

const GitCloner = require('./clone');
const ProjectDetector = require('./detect');
const DependencyInstaller = require('./install');
const ProcessManager = require('./process');

class ServerManager extends EventEmitter {
  constructor(storage, options = {}) {
    super();
    this.storage = storage;
    this.serversDir = options.serversDir || path.join(process.cwd(), 'servers');
    
    // Initialize storage and load servers
    this.initializeStorage();
    
    this.gitCloner = new GitCloner();
    this.projectDetector = new ProjectDetector();
    this.dependencyInstaller = new DependencyInstaller();
    this.processManager = new ProcessManager();
    
    // Handle log events from process manager
    this.processManager.on('log', async (serverId, log) => {
      // Store log directly in the database
      if (this.servers[serverId]) {
        try {
          // Store log in database
          await this.storage.addLog(serverId, log);
          // Also output to console
          console.log(`[Server ${serverId}] [${log.type}] ${log.message}`);
        } catch (error) {
          console.error(`Error storing log for server ${serverId}:`, error);
        }
      }
      
      // Emit log event to main process
      this.emit('log', serverId, log);
    });
    
    // Handle status changes from process manager
    this.processManager.on('status-change', async (serverId, status) => {
      if (this.servers[serverId]) {
        this.servers[serverId].status = status;
        try {
          await this.storage.updateServer(serverId, this.servers[serverId]);
          // Log status changes
          console.log(`[Server ${serverId}] Status changed to: ${status}`);
          this.emit('status-change', serverId, status);
        } catch (error) {
          console.error(`Error updating server status for ${serverId}:`, error);
        }
      }
    });
    
    // Handle port detection from process manager
    this.processManager.on('port-detected', async (serverId, port) => {
      if (this.servers[serverId]) {
        this.servers[serverId].port = port;
        try {
          await this.storage.updateServer(serverId, this.servers[serverId]);
          console.log(`[Server ${serverId}] Port detected: ${port}`);
          this.emit('port-detected', serverId, port);
        } catch (error) {
          console.error(`Error updating server port for ${serverId}:`, error);
        }
      }
    });
    
    // Create servers directory if it doesn't exist
    if (!fs.existsSync(this.serversDir)) {
      fs.mkdirSync(this.serversDir, { recursive: true });
    }
  }
  
  async initializeStorage() {
    try {
      // Load servers from storage
      this.servers = await this.storage.getServers() || {};
    } catch (error) {
      console.error('Error loading servers from database:', error);
      this.servers = {};
    }
  }
  
  async addServer(gitUrl, customConfig = {}) {
    try {
      // Generate unique ID for server
      const serverId = uuidv4();
      
      // Extract the repository name from the URL
      const repoName = path.basename(gitUrl, '.git');
      
      // Create server directory using repo name plus UUID for uniqueness
      // This ensures the repo's internal name is preserved while still allowing multiple instances
      const serverDirName = `${repoName}-${serverId.substring(0, 8)}`;
      const serverDir = path.join(this.serversDir, serverDirName);
      
      // Ensure the parent directory exists
      fs.mkdirSync(this.serversDir, { recursive: true });
      
      console.log(`Adding new server with ID ${serverId} at path: ${serverDir}`);
      
      // Clone repository
      await this.gitCloner.clone(gitUrl, serverDir);
      
      // Detect project type
      const projectType = await this.projectDetector.detect(serverDir);
      
      // Install dependencies
      await this.dependencyInstaller.install(serverDir, projectType);
      
      // Create server object
      const server = {
        id: serverId,
        gitUrl,
        dir: serverDir,
        projectType,
        name: customConfig.name || repoName,
        config: customConfig.config || {},
        env: customConfig.env || {}, // Custom environment variables
        runCommand: customConfig.runCommand || null, // Optional custom command to run the server
        entryPoint: customConfig.entryPoint || null, // Optional custom entry point file
        isBuilt: false, // Track if the project has been built
        status: 'stopped'
      };
      
      // Save server to storage
      this.servers[serverId] = server;
      await this.storage.updateServer(serverId, server);
      
      return server;
    } catch (error) {
      console.error('Error adding server:', error);
      throw error;
    }
  }
  
  async startServer(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    try {
      // Set status to starting immediately
      server.status = 'starting';
      await this.storage.updateServer(serverId, server);
      this.emit('status-change', serverId, 'starting');
      
      // Add startup header to logs
      this.emit('log', serverId, { 
        type: 'info', 
        timestamp: new Date().toISOString(), 
        message: `========== SERVER STARTING ==========` 
      });
      
      // Check if the project needs to be built first (for Node.js projects)
      if (server.projectType === 'nodejs' && !server.isBuilt) {
        try {
          // Check if there's a build script in package.json
          const packageJsonPath = path.join(server.dir, 'package.json');
          if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // If there's a build script, run it
            if (packageJson.scripts && packageJson.scripts.build) {
              this.emit('log', serverId, { 
                type: 'info', 
                timestamp: new Date().toISOString(), 
                message: 'Building project with "npm run build"...' 
              });
              
              // Use spawn to run npm build
              await new Promise((resolve, reject) => {
                const buildProcess = require('child_process').spawn('npm', ['run', 'build'], {
                  cwd: server.dir,
                  shell: true
                });
                
                buildProcess.stdout.on('data', (data) => {
                  const log = data.toString().trim();
                  if (log) {
                    this.emit('log', serverId, { 
                      type: 'stdout', 
                      timestamp: new Date().toISOString(), 
                      message: `[BUILD] ${log}` 
                    });
                  }
                });
                
                buildProcess.stderr.on('data', (data) => {
                  const log = data.toString().trim();
                  if (log) {
                    this.emit('log', serverId, { 
                      type: 'stderr', 
                      timestamp: new Date().toISOString(), 
                      message: `[BUILD] ${log}` 
                    });
                  }
                });
                
                buildProcess.on('close', (code) => {
                  if (code === 0) {
                    this.emit('log', serverId, { 
                      type: 'info', 
                      timestamp: new Date().toISOString(), 
                      message: 'Build completed successfully' 
                    });
                    
                    // Mark as built so we don't rebuild unless needed
                    server.isBuilt = true;
                    this.storage.updateServer(serverId, server);
                    
                    resolve();
                  } else {
                    this.emit('log', serverId, { 
                      type: 'error', 
                      timestamp: new Date().toISOString(), 
                      message: `Build failed with exit code ${code}` 
                    });
                    reject(new Error(`Build failed with exit code ${code}`));
                  }
                });
                
                buildProcess.on('error', (error) => {
                  this.emit('log', serverId, { 
                    type: 'error', 
                    timestamp: new Date().toISOString(), 
                    message: `Build error: ${error.message}` 
                  });
                  reject(error);
                });
              });
            }
          }
        } catch (buildError) {
          this.emit('log', serverId, { 
            type: 'error', 
            timestamp: new Date().toISOString(), 
            message: `Error during build: ${buildError.message}` 
          });
          // Continue despite build errors - the server might still start
        }
      }
      
      // Start server process
      await this.processManager.startServer(server);
      
      // Update server status
      server.status = 'running';
      await this.storage.updateServer(serverId, server);
      
      return { success: true };
    } catch (error) {
      console.error(`Error starting server ${serverId}:`, error);
      server.status = 'error';
      await this.storage.updateServer(serverId, server);
      
      // Log the error
      this.emit('log', serverId, { 
        type: 'error', 
        timestamp: new Date().toISOString(), 
        message: `Failed to start server: ${error.message}` 
      });
      
      throw error;
    }
  }
  
  async stopServer(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    try {
      // Add stop message to logs
      this.emit('log', serverId, { 
        type: 'info', 
        timestamp: new Date().toISOString(), 
        message: `========== SERVER STOPPING ==========` 
      });
      
      // Stop server process
      await this.processManager.stopServer(serverId);
      
      // Update server status
      server.status = 'stopped';
      await this.storage.updateServer(serverId, server);
      
      // Add final log entry
      this.emit('log', serverId, { 
        type: 'info', 
        timestamp: new Date().toISOString(), 
        message: `Server process has been terminated` 
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error stopping server ${serverId}:`, error);
      
      // Log the error
      this.emit('log', serverId, { 
        type: 'error', 
        timestamp: new Date().toISOString(), 
        message: `Failed to stop server: ${error.message}` 
      });
      
      throw error;
    }
  }
  
  async deleteServer(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    try {
      // Ensure server is stopped
      if (server.status === 'running') {
        await this.stopServer(serverId);
      }
      
      // Delete server directory
      fs.rmSync(server.dir, { recursive: true, force: true });
      
      // Remove server from storage
      delete this.servers[serverId];
      await this.storage.deleteServer(serverId);
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting server ${serverId}:`, error);
      throw error;
    }
  }
  
  async updateServerConfig(serverId, config) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    try {
      // Extract server settings and environment variables
      const { env, name, runCommand, entryPoint, ...mpcConfig } = config;
      
      // Update server object with all fields
      server.config = mpcConfig;
      if (env !== undefined) server.env = env;
      if (name !== undefined) server.name = name;
      if (runCommand !== undefined) server.runCommand = runCommand;
      if (entryPoint !== undefined) server.entryPoint = entryPoint;
      
      // Save to storage
      await this.storage.updateServer(serverId, server);
      
      // Log the update
      console.log(`Updated server ${serverId} configuration:`, {
        name: server.name,
        runCommand: server.runCommand,
        entryPoint: server.entryPoint,
        configKeys: Object.keys(server.config),
        envKeys: Object.keys(server.env || {})
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error updating config for server ${serverId}:`, error);
      throw error;
    }
  }
  
  getServers() {
    return Object.values(this.servers);
  }
  
  async getLogs(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    // Get logs from database
    try {
      return await this.storage.getLogs(serverId);
    } catch (error) {
      console.error(`Error fetching logs for server ${serverId}:`, error);
      return [];
    }
  }
  
  async startAllServers() {
    const results = {};
    
    for (const serverId of Object.keys(this.servers)) {
      try {
        await this.startServer(serverId);
        results[serverId] = { success: true };
      } catch (error) {
        results[serverId] = { success: false, error: error.message };
      }
    }
    
    return results;
  }
  
  async stopAllServers() {
    const results = {};
    
    for (const serverId of Object.keys(this.servers)) {
      const server = this.servers[serverId];
      if (server.status === 'running') {
        try {
          await this.stopServer(serverId);
          results[serverId] = { success: true };
        } catch (error) {
          results[serverId] = { success: false, error: error.message };
        }
      }
    }
    
    return results;
  }
  
  async restartRunningServers() {
    // Ensure servers object exists before trying to iterate
    if (!this.servers || typeof this.servers !== 'object') {
      console.log('No servers to restart - servers object is empty or not initialized');
      return;
    }
    
    for (const serverId of Object.keys(this.servers)) {
      const server = this.servers[serverId];
      if (server && server.status === 'running') {
        try {
          await this.startServer(serverId);
        } catch (error) {
          console.error(`Error restarting server ${serverId}:`, error);
        }
      }
    }
  }
  
  async rebuildServer(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    // Check if server is Node.js type
    if (server.projectType !== 'nodejs') {
      throw new Error('Rebuild is only supported for Node.js projects');
    }
    
    try {
      // Stop server if running
      if (server.status === 'running') {
        await this.stopServer(serverId);
      }
      
      // Mark as not built
      server.isBuilt = false;
      await this.storage.updateServer(serverId, server);
      
      // Check if there's a build script
      const packageJsonPath = path.join(server.dir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        throw new Error('package.json not found');
      }
      
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (!packageJson.scripts || !packageJson.scripts.build) {
        throw new Error('No build script found in package.json');
      }
      
      // Run build script
      this.emit('log', serverId, { 
        type: 'info', 
        timestamp: new Date().toISOString(), 
        message: 'Rebuilding project with "npm run build"...' 
      });
      
      // Use spawn to run npm build
      await new Promise((resolve, reject) => {
        const buildProcess = require('child_process').spawn('npm', ['run', 'build'], {
          cwd: server.dir,
          shell: true
        });
        
        buildProcess.stdout.on('data', (data) => {
          const log = data.toString().trim();
          if (log) {
            this.emit('log', serverId, { 
              type: 'stdout', 
              timestamp: new Date().toISOString(), 
              message: `[BUILD] ${log}` 
            });
          }
        });
        
        buildProcess.stderr.on('data', (data) => {
          const log = data.toString().trim();
          if (log) {
            this.emit('log', serverId, { 
              type: 'stderr', 
              timestamp: new Date().toISOString(), 
              message: `[BUILD] ${log}` 
            });
          }
        });
        
        buildProcess.on('close', (code) => {
          if (code === 0) {
            this.emit('log', serverId, { 
              type: 'info', 
              timestamp: new Date().toISOString(), 
              message: 'Build completed successfully' 
            });
            
            // Mark as built
            server.isBuilt = true;
            this.storage.updateServer(serverId, server);
            
            resolve();
          } else {
            this.emit('log', serverId, { 
              type: 'error', 
              timestamp: new Date().toISOString(), 
              message: `Build failed with exit code ${code}` 
            });
            reject(new Error(`Build failed with exit code ${code}`));
          }
        });
        
        buildProcess.on('error', (error) => {
          this.emit('log', serverId, { 
            type: 'error', 
            timestamp: new Date().toISOString(), 
            message: `Build error: ${error.message}` 
          });
          reject(error);
        });
      });
      
      return { success: true };
    } catch (error) {
      console.error(`Error rebuilding server ${serverId}:`, error);
      throw error;
    }
  }
  
  // Add a method to get the current port for a server
  getServerPort(serverId) {
    const server = this.servers[serverId];
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    return this.processManager.getServerPort(serverId) || server.port;
  }

  async getSystemProcesses() {
    try {
      // Get all processes
      const allProcesses = await find('name', /node|python|pythonw|py/i);
      console.log('Found processes:', allProcesses);

      // Get list of running servers and their ports
      const runningServers = Object.entries(this.servers)
        .filter(([_, server]) => server.status === 'running')
        .map(([id, server]) => ({
          id,
          port: server.port,
          dir: server.dir
        }));

      // Get detailed information for each process
      const detailedProcesses = await Promise.all(
        allProcesses.map(async (proc) => {
          try {
            // Get detailed process info
            const [details] = await find('pid', proc.pid);
            
            // Get port information using netstat
            let port = null;
            try {
              const { stdout } = await execAsync(
                process.platform === 'win32'
                  ? `netstat -ano | findstr "${proc.pid}"`
                  : `netstat -tlpn 2>/dev/null | grep "${proc.pid}"`
              );
              
              // Parse port from netstat output
              const matches = stdout.match(/:(\d+)/);
              if (matches && matches[1]) {
                port = parseInt(matches[1], 10);
              }
            } catch (netstatError) {
              console.log(`No port found for PID ${proc.pid}`);
            }

            // Try to match process with a server
            let serverId = null;
            if (port) {
              const matchingServer = runningServers.find(s => s.port === port);
              if (matchingServer) {
                serverId = matchingServer.id;
              }
            }

            // If no port match, try matching by directory
            if (!serverId && details?.cwd) {
              const matchingServer = runningServers.find(s => 
                details.cwd.includes(s.dir) || s.dir.includes(details.cwd)
              );
              if (matchingServer) {
                serverId = matchingServer.id;
              }
            }
            
            return {
              pid: proc.pid,
              name: proc.name.toLowerCase(),
              command: details?.cmd || proc.cmd || '',
              port: port,
              path: details?.path || proc.path || '',
              serverId: serverId
            };
          } catch (error) {
            console.error(`Error getting details for process ${proc.pid}:`, error);
            return null;
          }
        })
      );
      
      // Filter out null entries and processes without ports
      const validProcesses = detailedProcesses
        .filter(Boolean)
        .filter(proc => proc.port !== null);
      
      console.log('Final process list:', validProcesses);
      return validProcesses;
      
    } catch (error) {
      console.error('Error getting system processes:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      return [];
    }
  }

  async killProcess(pid) {
    try {
      // Find the server associated with this process
      const processes = await this.getSystemProcesses();
      const targetProcess = processes.find(p => p.pid === pid);
      
      // Kill the process
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /PID ${pid}`);
      } else {
        await execAsync(`kill -9 ${pid}`);
      }

      // If this process was associated with a server, update its status
      if (targetProcess && targetProcess.serverId) {
        const serverId = targetProcess.serverId;
        if (this.servers[serverId]) {
          this.servers[serverId].status = 'stopped';
          await this.storage.updateServer(serverId, this.servers[serverId]);
          this.emit('status-change', serverId, 'stopped');
        }
      }

      return { success: true };
    } catch (error) {
      console.error(`Error killing process ${pid}:`, error);
      throw error;
    }
  }

  async updateServerStatus(serverId, status) {
    try {
      if (!this.servers[serverId]) {
        throw new Error(`Server with ID ${serverId} not found`);
      }

      // Update server status
      this.servers[serverId].status = status;
      await this.storage.updateServer(serverId, this.servers[serverId]);
      
      // Emit status change event
      this.emit('status-change', serverId, status);
      
      // Log the status change
      this.emit('log', serverId, {
        type: 'info',
        timestamp: new Date().toISOString(),
        message: `Server status updated to: ${status}`
      });

      return { success: true };
    } catch (error) {
      console.error(`Error updating server status for ${serverId}:`, error);
      throw error;
    }
  }
}

module.exports = ServerManager;