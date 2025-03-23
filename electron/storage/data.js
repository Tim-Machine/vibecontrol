const { default: Store } = require('electron-store');
const path = require('path');

class Storage {
  constructor(userDataPath) {
    this.store = new Store({
      name: 'mcp-server-manager',
      cwd: userDataPath
    });
    
    // Initialize servers if not exists
    if (!this.store.has('servers')) {
      this.store.set('servers', {});
    }
  }
  
  getServers() {
    return this.store.get('servers');
  }
  
  updateServer(serverId, serverData) {
    const servers = this.store.get('servers');
    servers[serverId] = serverData;
    this.store.set('servers', servers);
  }
  
  deleteServer(serverId) {
    const servers = this.store.get('servers');
    delete servers[serverId];
    this.store.set('servers', servers);
  }
}

module.exports = Storage;