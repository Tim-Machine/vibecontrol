const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const os = require('os');

class ProcessManager extends EventEmitter {
  constructor() {
    super();
    this.processes = {};
    this.serverPorts = {}; // Track ports for each server
  }
  
  getServerPort(serverId) {
    return this.serverPorts[serverId];
  }

  // Helper to parse port from various server outputs
  parsePortFromOutput(output) {
    // Common patterns for port detection
    const patterns = [
      /(?:listening|running|started).+?:(\d+)/i,  // "Listening on port 3000" or "Server running on :3000"
      /(?:port|:).*?(\d+)/i,                      // "Port: 3000" or ":3000"
      /http:\/\/[^:]+:(\d+)/,                     // "http://localhost:3000"
      /0\.0\.0\.0:(\d+)/,                         // "0.0.0.0:3000"
      /127\.0\.0\.1:(\d+)/,                       // "127.0.0.1:3000"
      /localhost:(\d+)/                            // "localhost:3000"
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) {
        const port = parseInt(match[1], 10);
        if (port > 0 && port < 65536) { // Valid port range
          return port;
        }
      }
    }
    return null;
  }

  async startServer(server) {
    const { id, dir, projectType, config, runCommand, entryPoint } = server;
    
    // Stop any existing process
    if (this.processes[id]) {
      await this.stopServer(id);
    }
    
    return new Promise((resolve, reject) => {
      let command, args;
      
      try {
        // If a custom run command is provided, parse it for NX commands
        if (runCommand) {
          this.emit('log', id, { 
            type: 'info', 
            timestamp: new Date().toISOString(), 
            message: `Using custom run command: ${runCommand}` 
          });
          
          // Check if this is an NX command
          if (runCommand.includes('nx')) {
            command = 'npx';
            // Split the command but preserve the project name and flags
            const nxParts = runCommand.split('nx ')[1].trim();
            args = ['nx', ...nxParts.split(' ')];
            
            this.emit('log', id, { 
              type: 'info', 
              timestamp: new Date().toISOString(), 
              message: `Parsed NX command: npx ${args.join(' ')}` 
            });
          } else {
            // Split the command into command and args
            const parts = runCommand.split(' ');
            command = parts[0];
            args = parts.slice(1);
          }
        }
        // If a custom entry point file is provided, use it
        else if (entryPoint) {
          this.emit('log', id, { 
            type: 'info', 
            timestamp: new Date().toISOString(), 
            message: `Using custom entry point: ${entryPoint}` 
          });
          
          // Check if the entry point file exists
          const entryPointPath = path.join(dir, entryPoint);
          if (!fs.existsSync(entryPointPath)) {
            return reject(new Error(`Custom entry point file '${entryPoint}' not found.`));
          }
          
          // For NX projects, try to find the corresponding project
          if (fs.existsSync(path.join(dir, 'nx.json'))) {
            try {
              // Get the relative path to find the project
              const projectPath = path.relative(dir, path.dirname(entryPointPath));
              const projectName = projectPath.split(path.sep)[0];
              
              this.emit('log', id, { 
                type: 'info', 
                timestamp: new Date().toISOString(), 
                message: `Detected NX project: ${projectName}` 
              });
              
              command = 'npx';
              args = ['nx', 'serve', projectName];
            } catch (e) {
              this.emit('log', id, { 
                type: 'warning', 
                timestamp: new Date().toISOString(), 
                message: `Could not determine NX project from entry point: ${e.message}` 
              });
              
              // Fall back to direct file execution
              if (entryPoint.endsWith('.js')) {
                command = 'node';
                args = [entryPoint];
              } else if (entryPoint.endsWith('.py')) {
                command = 'python';
                args = [entryPoint];
              } else {
                return reject(new Error(`Unsupported entry point file type: ${entryPoint}`));
              }
            }
          }
        }
        // Otherwise determine command based on project type
        else {
          switch (projectType) {
            case 'nodejs':
              // Check if this is an NX monorepo
              if (fs.existsSync(path.join(dir, 'nx.json'))) {
                this.emit('log', id, { 
                  type: 'info', 
                  timestamp: new Date().toISOString(), 
                  message: 'Detected NX monorepo. Checking for projects...' 
                });
                
                try {
                  // List available NX projects
                  const nxOutput = require('child_process').execSync('npx nx show projects', {
                    cwd: dir,
                    stdio: ['pipe', 'pipe', 'pipe']
                  }).toString().trim();
                  
                  const nxProjects = nxOutput.split('\n').map(p => p.trim()).filter(Boolean);
                  
                  this.emit('log', id, { 
                    type: 'info', 
                    timestamp: new Date().toISOString(), 
                    message: `Found ${nxProjects.length} NX projects: ${nxProjects.join(', ')}` 
                  });
                  
                  // Try to find the MCP server project
                  let targetProject = null;
                  
                  // First, look for a project that matches the server name
                  if (server.name) {
                    const normalizedName = server.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
                    targetProject = nxProjects.find(p => 
                      p.toLowerCase() === normalizedName ||
                      p.toLowerCase().includes(normalizedName)
                    );
                  }
                  
                  // If no match by name, look for projects with common server names
                  if (!targetProject) {
                    const serverKeywords = ['server', 'api', 'backend', 'service'];
                    targetProject = nxProjects.find(p => 
                      serverKeywords.some(keyword => p.toLowerCase().includes(keyword))
                    );
                  }
                  
                  // If still no match, use the first project
                  if (!targetProject && nxProjects.length > 0) {
                    targetProject = nxProjects[0];
                  }
                  
                  if (targetProject) {
                    this.emit('log', id, { 
                      type: 'info', 
                      timestamp: new Date().toISOString(), 
                      message: `Using NX project: ${targetProject}` 
                    });
                    
                    command = 'npx';
                    args = ['nx', 'serve', targetProject];
                  } else {
                    throw new Error('No suitable NX project found');
                  }
                } catch (e) {
                  this.emit('log', id, { 
                    type: 'error', 
                    timestamp: new Date().toISOString(), 
                    message: `Error working with NX monorepo: ${e.message}` 
                  });
                  return reject(new Error(`Failed to start NX project: ${e.message}`));
                }
              }
              // If not an NX project, check for standard package.json
              else {
                const packageJsonPath = path.join(dir, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                  
                  // First priority: Use npm start if available
                  if (packageJson.scripts && packageJson.scripts.start) {
                    command = 'npm';
                    args = ['run', 'start'];
                  } 
                  // Second priority: Use main field from package.json
                  else if (packageJson.main) {
                    const mainPath = path.join(dir, packageJson.main);
                    if (fs.existsSync(mainPath)) {
                      command = 'node';
                      args = [packageJson.main];
                    } else {
                      // Look for common entry points
                      this.emit('log', id, { 
                        type: 'info', 
                        timestamp: new Date().toISOString(), 
                        message: `Main file ${packageJson.main} not found, searching for alternative entry points` 
                      });
                      const entryPoints = [
                        // Check build directories first (common for compiled projects)
                        'dist/index.js',
                        'build/index.js',
                        'out/index.js',
                        'lib/index.js',
                        // Then check root directory
                        'index.js',
                        'server.js',
                        'app.js',
                        'main.js',
                        // Then check source directories
                        'src/index.js',
                        'src/server.js',
                        'src/app.js',
                        'src/main.js'
                      ];
                      let foundEntryPoint = false;
                      
                      for (const entryPoint of entryPoints) {
                        const entryPath = path.join(dir, entryPoint);
                        if (fs.existsSync(entryPath)) {
                          command = 'node';
                          args = [entryPoint];
                          foundEntryPoint = true;
                          this.emit('log', id, { 
                            type: 'info', 
                            timestamp: new Date().toISOString(), 
                            message: `Using ${entryPoint} as entry point` 
                          });
                          break;
                        }
                      }
                      
                      if (!foundEntryPoint) {
                        // Log the list of files we searched for
                        this.emit('log', id, { 
                          type: 'error', 
                          timestamp: new Date().toISOString(), 
                          message: `Searched for entry points: ${entryPoints.join(', ')}` 
                        });
                        
                        // Try listing some directories to help with debugging
                        ['dist', 'build', 'out', 'lib', 'src'].forEach(subdir => {
                          const subdirPath = path.join(dir, subdir);
                          if (fs.existsSync(subdirPath)) {
                            try {
                              const files = fs.readdirSync(subdirPath);
                              this.emit('log', id, { 
                                type: 'info', 
                                timestamp: new Date().toISOString(), 
                                message: `${subdir}/ directory contents: ${files.join(', ')}` 
                              });
                            } catch (err) {
                              // Ignore errors
                            }
                          }
                        });
                        
                        return reject(new Error(`Could not find a valid entry point. Please ensure the MCP server has a start script or a valid main file.`));
                      }
                    }
                  } 
                  // Third priority: Look for common entry points
                  else {
                    const entryPoints = [
                      // Check build directories first (common for compiled projects)
                      'dist/index.js',
                      'build/index.js',
                      'out/index.js',
                      'lib/index.js',
                      // Then check root directory
                      'index.js',
                      'server.js',
                      'app.js',
                      'main.js',
                      // Then check source directories
                      'src/index.js',
                      'src/server.js',
                      'src/app.js',
                      'src/main.js'
                    ];
                    let foundEntryPoint = false;
                    
                    for (const entryPoint of entryPoints) {
                      const entryPath = path.join(dir, entryPoint);
                      if (fs.existsSync(entryPath)) {
                        command = 'node';
                        args = [entryPoint];
                        foundEntryPoint = true;
                        break;
                      }
                    }
                    
                    if (!foundEntryPoint) {
                      // Log the list of files we searched for
                      this.emit('log', id, { 
                        type: 'error', 
                        timestamp: new Date().toISOString(), 
                        message: `Searched for entry points: ${entryPoints.join(', ')}` 
                      });
                      
                      // Try listing some directories to help with debugging
                      ['dist', 'build', 'out', 'lib', 'src'].forEach(subdir => {
                        const subdirPath = path.join(dir, subdir);
                        if (fs.existsSync(subdirPath)) {
                          try {
                            const files = fs.readdirSync(subdirPath);
                            this.emit('log', id, { 
                              type: 'info', 
                              timestamp: new Date().toISOString(), 
                              message: `${subdir}/ directory contents: ${files.join(', ')}` 
                            });
                          } catch (err) {
                            // Ignore errors
                          }
                        }
                      });
                      
                      return reject(new Error(`Could not find a valid entry point. Please ensure the MCP server has a start script or a valid main file.`));
                    }
                  }
                } else {
                  return reject(new Error('Package.json not found'));
                }
              }
              break;
              
            case 'python-pip':
            case 'python-poetry':
              // First check if this is an installed package with a module name
              const pyprojectPath = path.join(dir, 'pyproject.toml');
              if (fs.existsSync(pyprojectPath)) {
                try {
                  const pyprojectContent = fs.readFileSync(pyprojectPath, 'utf8');
                  const moduleMatch = pyprojectContent.match(/name\s*=\s*["']([^"']+)["']/);
                  if (moduleMatch) {
                    const moduleName = moduleMatch[1];
                    this.emit('log', id, { 
                      type: 'info', 
                      timestamp: new Date().toISOString(), 
                      message: `Found Python module: ${moduleName}` 
                    });

                    // Check for virtual environment
                    const venvPython = path.join(dir, '.venv', 'Scripts', 'python.exe');
                    const venvPythonUnix = path.join(dir, '.venv', 'bin', 'python');
                    
                    if (fs.existsSync(venvPython) || fs.existsSync(venvPythonUnix)) {
                      command = os.platform() === 'win32' ? venvPython : venvPythonUnix;
                    } else {
                      command = os.platform() === 'win32' ? 'py' : 'python';
                    }
                    args = ['-m', moduleName];
                    break;
                  }
                } catch (err) {
                  this.emit('log', id, { 
                    type: 'warning', 
                    timestamp: new Date().toISOString(), 
                    message: `Could not read pyproject.toml: ${err.message}` 
                  });
                }
              }

              // If no module name found, check for files with __main__ block
              this.emit('log', id, { 
                type: 'info', 
                timestamp: new Date().toISOString(), 
                message: `No Python module found, searching for files with __main__ block` 
              });

              const pythonFiles = [];
              const searchDir = (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                  const filePath = path.join(dir, file);
                  const stat = fs.statSync(filePath);
                  if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                    searchDir(filePath);
                  } else if (file.endsWith('.py')) {
                    pythonFiles.push(filePath);
                  }
                }
              };
              searchDir(dir);

              let foundMainBlock = false;
              for (const pyFile of pythonFiles) {
                const content = fs.readFileSync(pyFile, 'utf8');
                if (content.includes('if __name__ == "__main__"') || content.includes("if __name__ == '__main__'")) {
                  const relativePath = path.relative(dir, pyFile);
                  this.emit('log', id, { 
                    type: 'info', 
                    timestamp: new Date().toISOString(), 
                    message: `Found __main__ block in ${relativePath}, using as entry point` 
                  });

                  // Check for virtual environment
                  const venvPython = path.join(dir, '.venv', 'Scripts', 'python.exe');
                  const venvPythonUnix = path.join(dir, '.venv', 'bin', 'python');
                  
                  if (fs.existsSync(venvPython) || fs.existsSync(venvPythonUnix)) {
                    command = os.platform() === 'win32' ? venvPython : venvPythonUnix;
                  } else {
                    command = os.platform() === 'win32' ? 'py' : 'python';
                  }
                  args = [relativePath];
                  foundMainBlock = true;
                  break;
                }
              }

              if (!foundMainBlock) {
                // Fall back to common entry points
                const pythonEntryPoints = ['main.py', 'app.py', 'server.py', 'api.py', 'src/main.py', 'src/app.py'];
                let foundPythonEntry = false;
                
                for (const entryPoint of pythonEntryPoints) {
                  const entryPath = path.join(dir, entryPoint);
                  if (fs.existsSync(entryPath)) {
                    // Check for virtual environment
                    const venvPython = path.join(dir, '.venv', 'Scripts', 'python.exe');
                    const venvPythonUnix = path.join(dir, '.venv', 'bin', 'python');
                    
                    if (fs.existsSync(venvPython) || fs.existsSync(venvPythonUnix)) {
                      command = os.platform() === 'win32' ? venvPython : venvPythonUnix;
                    } else {
                      command = os.platform() === 'win32' ? 'py' : 'python';
                    }
                    args = [entryPoint];
                    this.emit('log', id, { 
                      type: 'info', 
                      timestamp: new Date().toISOString(), 
                      message: `Using ${entryPoint} as entry point` 
                    });
                    foundPythonEntry = true;
                    break;
                  }
                }
                
                if (!foundPythonEntry) {
                  return reject(new Error('Could not find Python entry point'));
                }
              }
              break;
              
            default:
              return reject(new Error(`Unsupported project type: ${projectType}`));
          }
        }
        
        // Create environment variables for the server config
        const env = { ...process.env };
        
        // Add config as environment variables
        if (config) {
          const configPath = path.join(dir, 'config.json');
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
          env.MCP_CONFIG_PATH = configPath;
        }
        
        // Add custom environment variables
        if (server.env && Object.keys(server.env).length > 0) {
          this.emit('log', id, { 
            type: 'info', 
            timestamp: new Date().toISOString(), 
            message: `Adding custom environment variables: ${Object.keys(server.env).join(', ')}` 
          });
          
          // Merge custom env vars with the process env
          Object.assign(env, server.env);
        }
        
        // Log the command that's being executed
        const commandString = `${command} ${args.join(' ')}`;
        this.emit('log', id, { 
          type: 'info', 
          timestamp: new Date().toISOString(), 
          message: `Starting server with command: ${commandString}` 
        });
        
        // Log the working directory
        this.emit('log', id, { 
          type: 'info', 
          timestamp: new Date().toISOString(), 
          message: `Working directory: ${dir}` 
        });
        
        // Start the server process
        const serverProcess = spawn(command, args, {
          cwd: dir,
          env,
          shell: true
        });
        
        this.processes[id] = serverProcess;
        
        // Log process output
        serverProcess.stdout.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            console.log(`[Server ${id}] [stdout] ${message}`);
            
            // Try to detect port from the output
            if (!this.serverPorts[id]) {
              const port = this.parsePortFromOutput(message);
              if (port) {
                this.serverPorts[id] = port;
                this.emit('port-detected', id, port);
                this.emit('log', id, {
                  type: 'info',
                  timestamp: new Date().toISOString(),
                  message: `Detected server running on port ${port}`
                });
              }
            }
            
            this.emit('log', id, {
              type: 'stdout',
              timestamp: new Date().toISOString(),
              message
            });
          }
        });
        
        serverProcess.stderr.on('data', (data) => {
          const message = data.toString().trim();
          if (message) {
            console.log(`[Server ${id}] [stderr] ${message}`);
            this.emit('log', id, {
              type: 'stderr',
              timestamp: new Date().toISOString(),
              message
            });
          }
        });
        
        serverProcess.on('error', (err) => {
          const message = `Process error: ${err.message}`;
          console.log(`[Server ${id}] [error] ${message}`);
          this.emit('log', id, {
            type: 'error',
            timestamp: new Date().toISOString(),
            message
          });
          this.emit('status-change', id, 'error');
        });
        
        serverProcess.on('close', (code) => {
          const message = `Process exited with code ${code}`;
          console.log(`[Server ${id}] [info] ${message}`);
          this.emit('log', id, {
            type: 'info',
            timestamp: new Date().toISOString(),
            message
          });
          this.emit('status-change', id, 'stopped');
          delete this.processes[id];
          delete this.serverPorts[id]; // Clean up port tracking
        });
        
        // Wait a short time to catch immediate failures
        setTimeout(() => {
          if (this.processes[id]) {
            this.emit('status-change', id, 'running');
            resolve({ success: true });
          } else {
            reject(new Error('Server process failed to start'));
          }
        }, 500);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  async stopServer(serverId) {
    return new Promise((resolve) => {
      const serverProcess = this.processes[serverId];
      
      if (!serverProcess) {
        return resolve({ success: true, message: 'Server is not running' });
      }
      
      // Kill the process
      try {
        // Graceful shutdown on Unix-like systems
        if (os.platform() !== 'win32') {
          serverProcess.kill('SIGTERM');
          
          // Force kill after 5 seconds if not terminated
          setTimeout(() => {
            if (this.processes[serverId]) {
              serverProcess.kill('SIGKILL');
            }
          }, 5000);
        } else {
          // On Windows
          spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], { shell: true });
        }
        
        // Wait for process to exit
        serverProcess.on('close', () => {
          delete this.processes[serverId];
          resolve({ success: true });
        });
      } catch (error) {
        // Process might already be gone
        delete this.processes[serverId];
        resolve({ success: true });
      }
    });
  }
}

module.exports = ProcessManager;