const simpleGit = require('simple-git');
const fs = require('fs').promises;

class GitCloner {
  sanitizeGitUrl(url) {
    // Remove /tree/{branch} from GitHub URLs
    url = url.replace(/\/tree\/[^/]+\/?$/, '');
    
    // Ensure .git extension
    if (!url.endsWith('.git')) {
      url = url + '.git';
    }
    
    return url;
  }

  async clone(gitUrl, targetDir) {
    try {
      // Clean up target directory if it exists
      try {
        const stats = await fs.stat(targetDir);
        if (stats.isDirectory()) {
          console.log(`[GitCloner] Removing existing directory: ${targetDir}`);
          await fs.rm(targetDir, { recursive: true, force: true });
        }
      } catch (err) {
        // Directory doesn't exist, which is fine
      }

      // Create parent directory if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true });

      // Remove the directory again (to ensure it's empty)
      await fs.rm(targetDir, { recursive: true, force: true });

      const sanitizedUrl = this.sanitizeGitUrl(gitUrl);
      const git = simpleGit();
      await git.clone(sanitizedUrl, targetDir);
      return { success: true };
    } catch (error) {
      console.error(`Error cloning repository ${gitUrl}:`, error);
      throw error;
    }
  }
}

module.exports = GitCloner;