const path = require('path');
const url = require('url');

/**
 * Extracts the repository name from a git URL
 * @param {string} gitUrl - The Git repository URL
 * @returns {string} The repository name without .git extension
 */
function getRepoName(gitUrl) {
  // Remove /blob/{branch} or /tree/{branch} from GitHub URLs
  gitUrl = gitUrl.replace(/\/(blob|tree)\/[^/]+\/?.*$/, '');

  // Handle SSH URLs (git@github.com:user/repo.git)
  if (gitUrl.startsWith('git@')) {
    const parts = gitUrl.split(':')[1];
    return path.basename(parts, '.git');
  }

  // Handle HTTPS URLs (https://github.com/user/repo.git)
  try {
    const parsed = url.parse(gitUrl);
    const pathname = parsed.pathname || '';
    // Remove .git extension if present
    const repoName = path.basename(pathname, '.git');
    // Remove any remaining slashes
    return repoName.replace(/^\/+|\/+$/g, '');
  } catch (error) {
    // Fallback: just try to get the last part of the URL
    const parts = gitUrl.split('/').filter(Boolean);
    return parts[parts.length - 1].replace(/\.git$/, '');
  }
}

module.exports = {
  getRepoName
}; 