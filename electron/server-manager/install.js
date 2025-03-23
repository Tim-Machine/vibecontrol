const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class DependencyInstaller {
  async checkUvAvailable() {
    return new Promise((resolve) => {
      const command = os.platform() === 'win32' ? 'where' : 'which';
      const proc = spawn(command, ['uv'], { shell: true });
      
      proc.on('close', (code) => {
        resolve(code === 0);
      });
      
      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  async createVenv(projectDir, useUv = false) {
    return new Promise((resolve, reject) => {
      const command = useUv ? 'uv' : (os.platform() === 'win32' ? 'py' : 'python');
      const args = useUv ? ['venv'] : ['-m', 'venv', '.venv'];
      
      const proc = spawn(command, args, { cwd: projectDir, shell: true });
      
      proc.on('close', (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          reject(new Error(`Failed to create virtual environment (code ${code})`));
        }
      });
      
      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  async install(projectDir, projectType) {
    return new Promise(async (resolve, reject) => {
      let command, args;
      
      switch (projectType) {
        case 'nodejs':
          // Check for package manager
          if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
            command = 'yarn';
            args = ['install'];
          } else {
            command = 'npm';
            args = ['install'];
          }
          break;
          
        case 'python-pip':
        case 'python-poetry':
          try {
            // Check if uv is available
            const hasUv = await this.checkUvAvailable();
            console.log(`[Install] UV available: ${hasUv}`);

            if (hasUv) {
              // Create venv using uv
              await this.createVenv(projectDir, true);
              console.log('[Install] Created virtual environment using uv');

              // Install dependencies using uv pip
              if (projectType === 'python-poetry' && fs.existsSync(path.join(projectDir, 'pyproject.toml'))) {
                command = 'uv';
                args = ['pip', 'install', '-e', '.'];
              } else if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) {
                command = 'uv';
                args = ['pip', 'install', '-r', 'requirements.txt'];
                
                // Also install the current package in development mode if pyproject.toml exists
                if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) {
                  await new Promise((resolve, reject) => {
                    const proc = spawn('uv', ['pip', 'install', '-e', '.'], { cwd: projectDir, shell: true });
                    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to install package in development mode (code ${code})`)));
                    proc.on('error', reject);
                  });
                }
              } else {
                // Try to extract dependencies from pyproject.toml
                try {
                  const pyprojectContent = fs.readFileSync(path.join(projectDir, 'pyproject.toml'), 'utf8');
                  const dependencies = this.extractDependenciesFromPyproject(pyprojectContent);
                  if (dependencies.length > 0) {
                    command = 'uv';
                    args = ['pip', 'install', ...dependencies];
                    
                    // Also install the current package in development mode
                    await new Promise((resolve, reject) => {
                      const proc = spawn('uv', ['pip', 'install', '-e', '.'], { cwd: projectDir, shell: true });
                      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to install package in development mode (code ${code})`)));
                      proc.on('error', reject);
                    });
                  } else {
                    throw new Error('No dependencies found in pyproject.toml');
                  }
                } catch (err) {
                  throw new Error(`Could not process Python dependencies: ${err.message}`);
                }
              }
            } else {
              // Fall back to traditional methods
              if (projectType === 'python-poetry') {
                try {
                  // Check if poetry is installed
                  await new Promise((resolve, reject) => {
                    const proc = spawn('poetry', ['--version'], { shell: true });
                    proc.on('close', (code) => resolve(code === 0));
                    proc.on('error', reject);
                  });

                  command = 'poetry';
                  args = ['install'];
                } catch (e) {
                  console.warn('Poetry not found, falling back to pip');
                  if (os.platform() === 'win32') {
                    command = 'py';
                    args = ['-m', 'pip', 'install', '-r', 'requirements.txt'];
                  } else {
                    command = 'pip';
                    args = ['install', '-r', 'requirements.txt'];
                  }
                }
              } else {
                // python-pip
                if (os.platform() === 'win32') {
                  command = 'py';
                  args = ['-m', 'pip', 'install', '-r', 'requirements.txt'];
                } else {
                  command = 'pip';
                  args = ['install', '-r', 'requirements.txt'];
                }
              }
            }
          } catch (error) {
            return reject(new Error(`Failed to set up Python environment: ${error.message}`));
          }
          break;
          
        case 'unknown':
        default:
          return resolve({ success: true, message: 'Unknown project type, skipping dependency installation' });
      }
      
      // Install dependencies
      console.log(`[Install] Starting installation in ${projectDir}`);
      console.log(`[Install] Project type: ${projectType}`);
      console.log(`[Install] Command: ${command} ${args.join(' ')}`);

      const childProcess = spawn(command, args, { cwd: projectDir, shell: true });
      
      let stdout = '';
      let stderr = '';
      
      childProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        const message = data.toString().trim();
        if (message) {
          console.log(`[Install] ${message}`);
        }
      });
      
      childProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        const message = data.toString().trim();
        if (message) {
          console.error(`[Install Error] ${message}`);
        }
      });
      
      childProcess.on('close', (code) => {
        console.log(`[Install] Process completed with code ${code}`);
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Dependency installation failed with code ${code}: ${stderr}`));
        }
      });
      
      childProcess.on('error', (err) => {
        console.error(`[Install] Process failed to start: ${err.message}`);
        reject(new Error(`Failed to start dependency installation: ${err.message}`));
      });
    });
  }

  extractDependenciesFromPyproject(content) {
    const dependencies = [];
    const lines = content.split('\n');
    let inDependencies = false;
    
    for (const line of lines) {
      if (line.includes('[tool.poetry.dependencies]') || line.includes('[project.dependencies]')) {
        inDependencies = true;
        continue;
      }
      
      if (inDependencies) {
        if (line.trim().startsWith('[')) {
          break;
        }
        
        if (line.includes('=')) {
          const [name, version] = line.split('=').map(s => s.trim());
          if (name === 'python') continue;
          
          // Remove quotes and extra characters
          const cleanVersion = version.replace(/['"]/g, '').replace(/^\^/, '');
          dependencies.push(`${name}${cleanVersion}`);
        }
      }
    }
    
    return dependencies;
  }

  isNxMonorepo(projectDir) {
    try {
      // Strict NX workspace detection - must have nx.json AND workspace configuration
      const hasNxJson = fs.existsSync(path.join(projectDir, 'nx.json'));
      if (!hasNxJson) {
        return false;
      }

      // Must have either workspace.json or project.json
      const hasWorkspaceJson = fs.existsSync(path.join(projectDir, 'workspace.json'));
      const hasProjectJson = fs.existsSync(path.join(projectDir, 'project.json'));
      if (!hasWorkspaceJson && !hasProjectJson) {
        return false;
      }
      
      // Must have NX dependencies in package.json
      const packageJsonPath = path.join(projectDir, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return false;
      }

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const hasNxDeps = !!(
        (packageJson.dependencies && (
          packageJson.dependencies['@nrwl/workspace'] ||
          packageJson.dependencies['nx']
        )) ||
        (packageJson.devDependencies && (
          packageJson.devDependencies['@nrwl/workspace'] ||
          packageJson.devDependencies['nx']
        ))
      );

      return hasNxDeps;
    } catch (error) {
      console.warn('Error checking for NX project:', error);
      return false;
    }
  }
  
  async buildNxProjects(projectDir) {
    return new Promise((resolve, reject) => {
      // Verify NX installation first
      try {
        require('child_process').execSync('npx nx --version', {
          cwd: projectDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
      } catch (e) {
        console.warn('NX is not installed or not accessible:', e.message);
        return resolve({ 
          success: false, 
          error: 'NX is not installed or not accessible'
        });
      }

      // Then try to list available projects
      try {
        const nxProjects = require('child_process').execSync('npx nx show projects', {
          cwd: projectDir,
          stdio: ['pipe', 'pipe', 'pipe']
        }).toString().trim();
        
        if (!nxProjects) {
          console.warn('No NX projects found in workspace');
          return resolve({ 
            success: false, 
            error: 'No NX projects found in workspace'
          });
        }
        
        console.log('Available NX projects:', nxProjects);
      } catch (e) {
        console.warn('Could not list NX projects:', e.message);
        return resolve({ 
          success: false, 
          error: 'Could not list NX projects'
        });
      }
      
      // Try to run the build
      const buildProcess = spawn('npx', ['nx', 'run-many', '--target=build', '--all'], {
        cwd: projectDir,
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.log('[NX Build]', output.trim());
      });
      
      buildProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error('[NX Build Error]', output.trim());
      });
      
      buildProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          resolve({ 
            success: false, 
            error: `Build failed with code ${code}`,
            stdout,
            stderr
          });
        }
      });
      
      buildProcess.on('error', (err) => {
        resolve({ 
          success: false, 
          error: `Failed to start build: ${err.message}`,
          stdout,
          stderr
        });
      });
    });
  }
}

module.exports = DependencyInstaller;