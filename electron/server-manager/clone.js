const simpleGit = require('simple-git');

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