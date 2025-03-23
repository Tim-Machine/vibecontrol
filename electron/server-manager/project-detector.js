const fs = require('fs');
const path = require('path');

class ProjectDetector {
  async detect(projectDir) {
    try {
      // First check for NX project
      if (fs.existsSync(path.join(projectDir, 'nx.json'))) {
        console.log('Detected NX project');
        return 'nodejs';
      }

      // Check for package.json (Node.js)
      if (fs.existsSync(path.join(projectDir, 'package.json'))) {
        return 'nodejs';
      }
      
      // Check for requirements.txt (Python pip)
      if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) {
        return 'python-pip';
      }
      
      // Check for pyproject.toml (Python poetry)
      if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) {
        return 'python-poetry';
      }
      
      // If no clear indicators are found, try to guess based on file types
      const files = fs.readdirSync(projectDir);
      
      // Count file types
      const fileTypes = {
        js: 0,
        py: 0
      };
      
      files.forEach(file => {
        if (file.endsWith('.js') || file.endsWith('.ts')) fileTypes.js++;
        if (file.endsWith('.py')) fileTypes.py++;
      });
      
      // If there are more JS/TS files, assume Node.js
      if (fileTypes.js > fileTypes.py) {
        return 'nodejs';
      }
      
      // If there are more Python files, assume Python pip
      if (fileTypes.py > fileTypes.js) {
        return 'python-pip';
      }
      
      // Default to unknown if we can't determine
      return 'unknown';
    } catch (error) {
      console.error('Error detecting project type:', error);
      return 'unknown';
    }
  }
}

module.exports = ProjectDetector; 