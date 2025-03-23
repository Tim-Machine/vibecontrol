const fs = require('fs');
const path = require('path');

class ProjectDetector {
  async detect(projectDir) {
    // Check for Node.js project
    if (fs.existsSync(path.join(projectDir, 'package.json'))) {
      return 'nodejs';
    }
    
    // Check for Python project
    if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) {
      return 'python-poetry';
    }
    
    if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) {
      return 'python-pip';
    }
    
    // Default to unknown
    return 'unknown';
  }
}

module.exports = ProjectDetector;