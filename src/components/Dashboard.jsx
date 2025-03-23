import React, { useState } from 'react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import ServerList from './ServerList';
import AddServer from './AddServer';
import ConfigEditor from './ConfigEditor';
import LogViewer from './LogViewer';
import ConsolidatedLogViewer from './ConsolidatedLogViewer';
import ProcessManager from './ProcessManager';
import { Play, Square, Server, Layers, Settings, FileCode, Terminal, PlusCircle, Activity, Plus } from 'lucide-react';

export default function Dashboard({ servers, setServers, hasApi = true }) {
  const [selectedServer, setSelectedServer] = useState(null);
  const [activeView, setActiveView] = useState('servers'); // 'servers', 'logs', 'server-logs', 'config', 'add-server', 'processes'
  
  const handleAddServer = async (gitUrl, customConfig = {}) => {
    const toastId = toast.loading('Adding server...', {
      duration: Infinity,
      dismissible: true
    });
    
    try {
      if (hasApi) {
        const newServer = await window.api.addServer(gitUrl, customConfig);
        toast.success('Server added successfully', {
          id: toastId,
          duration: 3000,
          dismissible: true
        });
        setServers(prev => [...prev, newServer]);
      } else {
        // Mock implementation for development without Electron
        const mockServer = {
          id: Date.now().toString(),
          gitUrl,
          dir: `/mock/path/${Date.now()}`,
          projectType: 'nodejs',
          name: customConfig.name || gitUrl.split('/').pop().replace('.git', ''),
          runCommand: customConfig.runCommand || null,
          entryPoint: customConfig.entryPoint || null,
          config: {},
          env: customConfig.env || {},
          status: 'stopped',
          logs: []
        };
        
        setTimeout(() => {
          toast.success('Server added successfully (MOCK)', {
            id: toastId,
            duration: 3000,
            dismissible: true
          });
          setServers(prev => [...prev, mockServer]);
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to add server: ${error?.message || 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
        dismissible: true
      });
    }
  };
  
  const handleStartServer = async (serverId) => {
    const toastId = toast.loading('Starting server...', {
      duration: Infinity,
      dismissible: true
    });
    
    try {
      if (hasApi) {
        await window.api.startServer(serverId);
        toast.success('Server started', {
          id: toastId,
          duration: 3000,
          dismissible: true
        });
      } else {
        // Mock implementation
        setTimeout(() => {
          setServers(prev => prev.map(server => 
            server.id === serverId ? { ...server, status: 'running' } : server
          ));
          toast.success('Server started (MOCK)', {
            id: toastId,
            duration: 3000,
            dismissible: true
          });
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to start server: ${error?.message || 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
        dismissible: true
      });
    }
  };
  
  const handleStopServer = async (serverId) => {
    const toastId = toast.loading('Stopping server...', {
      duration: Infinity,
      dismissible: true
    });
    
    try {
      if (hasApi) {
        await window.api.stopServer(serverId);
        toast.success('Server stopped', {
          id: toastId,
          duration: 3000,
          dismissible: true
        });
      } else {
        // Mock implementation
        setTimeout(() => {
          setServers(prev => prev.map(server => 
            server.id === serverId ? { ...server, status: 'stopped' } : server
          ));
          toast.success('Server stopped (MOCK)', {
            id: toastId,
            duration: 3000,
            dismissible: true
          });
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to stop server: ${error?.message || 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
        dismissible: true
      });
    }
  };
  
  const handleDeleteServer = async (serverId) => {
    const toastId = toast.loading('Deleting server...', {
      duration: Infinity,
      dismissible: true
    });
    
    try {
      if (hasApi) {
        await window.api.deleteServer(serverId);
        toast.success('Server deleted', {
          id: toastId,
          duration: 3000,
          dismissible: true
        });
      } else {
        // Mock implementation
        setTimeout(() => {
          toast.success('Server deleted (MOCK)', {
            id: toastId,
            duration: 3000,
            dismissible: true
          });
        }, 1000);
      }
      
      setServers(prev => prev.filter(server => server.id !== serverId));
      
      if (selectedServer && selectedServer.id === serverId) {
        setSelectedServer(null);
        setActiveView('servers');
      }
    } catch (error) {
      toast.error(`Failed to delete server: ${error?.message || 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
        dismissible: true
      });
    }
  };
  
  const handleUpdateConfig = async (serverId, config) => {
    const toastId = toast.loading('Updating configuration...', {
      duration: Infinity,
      dismissible: true,
      className: 'bg-card/80 backdrop-blur-sm border border-white/10'
    });
    
    try {
      // Extract environment variables and server settings from config object
      const { env, name, runCommand, entryPoint, ...mpcConfig } = config;
      
      if (hasApi) {
        await window.api.updateConfig(serverId, config);
        toast.success('Configuration updated successfully', {
          id: toastId,
          duration: 3000,
          dismissible: true,
          className: 'bg-card/80 backdrop-blur-sm border border-white/10'
        });
      } else {
        // Mock implementation
        setTimeout(() => {
          toast.success('Configuration updated successfully (MOCK)', {
            id: toastId,
            duration: 3000,
            dismissible: true,
            className: 'bg-card/80 backdrop-blur-sm border border-white/10'
          });
        }, 1000);
      }
      
      // Update server with config, env, and server settings
      setServers(prev => prev.map(server => {
        if (server.id === serverId) {
          return { 
            ...server, 
            config: mpcConfig,
            env: env || {},
            name: name || server.name,
            runCommand: runCommand !== undefined ? runCommand : server.runCommand,
            entryPoint: entryPoint !== undefined ? entryPoint : server.entryPoint
          };
        }
        return server;
      }));
      
      // Update selected server if it's the one being modified
      if (selectedServer && selectedServer.id === serverId) {
        setSelectedServer(prev => ({
          ...prev,
          name: name || prev.name,
          runCommand: runCommand !== undefined ? runCommand : prev.runCommand,
          entryPoint: entryPoint !== undefined ? entryPoint : prev.entryPoint
        }));
      }
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast.error(`Failed to update configuration: ${error?.message || 'Unknown error'}`, {
        id: toastId,
        duration: 5000,
        dismissible: true,
        className: 'bg-card/80 backdrop-blur-sm border border-white/10'
      });
    }
  };
  
  const handleStartAllServers = async () => {
    try {
      toast.loading('Starting all servers...', {
        dismissible: true,
        duration: 0
      });
      
      if (hasApi) {
        const results = await window.api.startAllServers();
        
        // Check results
        const failures = Object.entries(results)
          .filter(([_, result]) => !result.success)
          .map(([serverId]) => serverId);
        
        if (failures.length === 0) {
          toast.success('All servers started successfully', {
            dismissible: true,
            duration: 3000
          });
        } else {
          toast.error(`Failed to start ${failures.length} servers`, {
            dismissible: true,
            duration: 5000
          });
        }
      } else {
        // Mock implementation
        setTimeout(() => {
          setServers(prev => prev.map(server => ({ ...server, status: 'running' })));
          toast.success('All servers started (MOCK)', {
            dismissible: true,
            duration: 3000
          });
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to start servers: ${error?.message || 'Unknown error'}`, {
        dismissible: true,
        duration: 5000
      });
    }
  };
  
  const handleStopAllServers = async () => {
    try {
      toast.loading('Stopping all servers...', {
        dismissible: true,
        duration: 0
      });
      
      if (hasApi) {
        const results = await window.api.stopAllServers();
        
        // Check results
        const failures = Object.entries(results)
          .filter(([_, result]) => !result.success)
          .map(([serverId]) => serverId);
        
        if (failures.length === 0) {
          toast.success('All servers stopped successfully', {
            dismissible: true,
            duration: 3000
          });
        } else {
          toast.error(`Failed to stop ${failures.length} servers`, {
            dismissible: true,
            duration: 5000
          });
        }
      } else {
        // Mock implementation
        setTimeout(() => {
          setServers(prev => prev.map(server => ({ ...server, status: 'stopped' })));
          toast.success('All servers stopped (MOCK)', {
            dismissible: true,
            duration: 3000
          });
        }, 1000);
      }
    } catch (error) {
      toast.error(`Failed to stop servers: ${error?.message || 'Unknown error'}`, {
        dismissible: true,
        duration: 5000
      });
    }
  };
  
  const handleRebuildServer = async (serverId) => {
    try {
      const server = servers.find(s => s.id === serverId);
      if (!server) return;
      
      toast.loading(`Building ${server.name}...`, {
        dismissible: true,
        duration: 0
      });
      
      if (hasApi) {
        await window.api.rebuildServer(serverId);
        toast.success(`${server.name} built successfully`, {
          dismissible: true,
          duration: 3000
        });
      } else {
        // Mock implementation
        setTimeout(() => {
          toast.success(`${server.name} built successfully (MOCK)`, {
            dismissible: true,
            duration: 3000
          });
        }, 2000);
      }
    } catch (error) {
      toast.error(`Build failed: ${error?.message || 'Unknown error'}`, {
        dismissible: true,
        duration: 5000
      });
    }
  };
  
  const selectServer = (server) => {
    setSelectedServer(server);
    setActiveView('server-logs');
  };
  
  const openAddServerDialog = () => {
    setActiveView('add-server');
  };
  
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-background via-background/95 to-accent/5">
      {/* Application Layout */}
      <div className="flex flex-1 overflow-hidden backdrop-blur-sm">
        {/* Sidebar */}
        <div className="w-96 border-r border-border/50 bg-card/80 flex flex-col backdrop-blur-md h-full">
          <div className="p-4 border-b border-border/50 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center">
              <div className="relative">
                <Server className="h-5 w-5 text-primary glow" />
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-md animate-pulse"></div>
              </div>
              <h2 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent glow">Servers</h2>
            </div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10 transition-all duration-300 glow-border"
                onClick={handleStartAllServers}
                title="Start All Servers"
              >
                <div className="relative">
                  <Play className="h-4 w-4" />
                  <div className="absolute -inset-1 bg-green-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300 glow-border"
                onClick={handleStopAllServers}
                title="Stop All Servers"
              >
                <div className="relative">
                  <Square className="h-4 w-4" />
                  <div className="absolute -inset-1 bg-red-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-3 py-3">
              <ServerList 
                servers={servers}
                onSelectServer={selectServer}
                onStartServer={handleStartServer}
                onStopServer={handleStopServer} 
                onDeleteServer={handleDeleteServer}
                onRebuildServer={handleRebuildServer}
              />
            </div>
          </div>
          
          <div className="border-t border-border/50 p-4 flex-shrink-0">
            <Button 
              onClick={openAddServerDialog} 
              size="sm" 
              className="w-full flex items-center justify-center bg-primary/80 hover:bg-primary transition-all duration-300 group glow-border"
            >
              <div className="relative">
                <Plus className="h-4 w-4 mr-2" />
                <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              Add Server
            </Button>
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background/50 backdrop-blur-sm">
          <div className="border-b border-border/50">
            <div className="px-6">
              <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
                <div className="flex justify-between items-center">
                  <TabsList className="bg-card/50 backdrop-blur-sm">
                    <TabsTrigger value="servers" className="flex items-center gap-2 data-[state=active]:bg-primary/20 transition-all duration-300">
                      <Layers className="h-4 w-4" />
                      Servers
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="flex items-center gap-2 data-[state=active]:bg-primary/20 transition-all duration-300">
                      <Terminal className="h-4 w-4" />
                      Unified Logs
                    </TabsTrigger>
                    <TabsTrigger value="processes" className="flex items-center gap-2 data-[state=active]:bg-primary/20 transition-all duration-300">
                      <Activity className="h-4 w-4" />
                      Processes
                    </TabsTrigger>
                    {selectedServer && (
                      <>
                        <TabsTrigger value="server-logs" className="flex items-center gap-2 data-[state=active]:bg-primary/20 transition-all duration-300">
                          <Terminal className="h-4 w-4" />
                          Server Logs
                        </TabsTrigger>
                        <TabsTrigger value="config" className="flex items-center gap-2 data-[state=active]:bg-primary/20 transition-all duration-300">
                          <Settings className="h-4 w-4" />
                          Configuration
                        </TabsTrigger>
                      </>
                    )}
                  </TabsList>
                </div>
              </Tabs>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeView} className="h-full">
              <TabsContent value="servers" className="mt-0 flex-1 p-0 ">
                <div className="p-6  overflow-auto">
                  {servers.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {servers.map(server => (
                        <Card 
                          key={server.id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm border-white/10 group hover:bg-card/80"
                        >
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center">
                                  <div className={`h-2.5 w-2.5 rounded-full mr-2 transition-all duration-300 ${
                                    server.status === 'running' ? 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50' :
                                    server.status === 'starting' ? 'bg-yellow-400 animate-pulse shadow-lg shadow-yellow-400/50' :
                                    server.status === 'error' ? 'bg-red-400 animate-pulse shadow-lg shadow-red-400/50' :
                                    'bg-red-400'
                                  }`}></div>
                                  <CardTitle className="text-base bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary-foreground transition-all duration-300">
                                    {server.name}
                                  </CardTitle>
                                </div>
                                <CardDescription className="text-xs mt-1 capitalize opacity-70 group-hover:opacity-100 transition-opacity">
                                  <span className="inline-flex items-center">
                                    {server.projectType}
                                    {server.runCommand && (
                                      <>
                                        <span className="mx-1.5 h-1 w-1 rounded-full bg-foreground/30"></span>
                                        <span className="text-primary-foreground/70">Custom Command</span>
                                      </>
                                    )}
                                    {server.status === 'running' && server.port && (
                                      <>
                                        <span className="mx-1.5 h-1 w-1 rounded-full bg-foreground/30"></span>
                                        <span className="text-green-400">Port {server.port}</span>
                                      </>
                                    )}
                                  </span>
                                </CardDescription>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="pb-0">
                            {server.dir && (
                              <p className="text-xs text-muted-foreground font-mono truncate opacity-50 group-hover:opacity-70 transition-opacity">
                                {server.dir}
                              </p>
                            )}
                          </CardContent>
                          
                          <CardFooter className="pb-3 pt-4 flex justify-between">
                            {server.status === 'running' ? (
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={() => handleStopServer(server.id)}
                                className="bg-red-500/80 hover:bg-red-500 transition-all duration-300"
                              >
                                <Square className="h-3.5 w-3.5 mr-1.5" />
                                Stop
                              </Button>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => handleStartServer(server.id)}
                                className="bg-green-500/80 hover:bg-green-500 transition-all duration-300"
                              >
                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                Start
                              </Button>
                            )}
                            
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => selectServer(server)}
                              className="border-white/10 hover:bg-white/5 transition-all duration-300"
                            >
                              Details
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className=" flex flex-col items-center justify-center">
                      <div className="max-w-md text-center">
                        <div className="relative mb-6">
                          <Server className="h-16 w-16 text-primary/30 mx-auto" />
                          <div className="absolute -inset-4 bg-primary/5 rounded-full blur-xl animate-pulse"></div>
                        </div>
                        <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                          No Servers
                        </h2>
                        <p className="text-muted-foreground mb-6 opacity-70">
                          Add your first server to start managing and monitoring it.
                        </p>
                        <Button 
                          onClick={openAddServerDialog} 
                          className="mx-auto bg-primary/80 hover:bg-primary transition-all duration-300 group"
                        >
                          <div className="relative">
                            <Server className="h-4 w-4 mr-2" />
                            <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </div>
                          Add Your First Server
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="add-server" className="mt-0 flex-1 p-0 h-full">
                <div className="p-6 overflow-auto">
                  <div className="max-w-2xl mx-auto">
                    <AddServer 
                      onAddServer={(gitUrl, config) => {
                        handleAddServer(gitUrl, config);
                        setActiveView('servers');
                      }} 
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="logs" className="mt-0 flex-1 p-0 h-full border-0">
                <div className="p-6 h-full">
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <CardTitle>Unified Logs</CardTitle>
                      <CardDescription>
                        View real-time logs from all running servers
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-[calc(100%-80px)]">
                      <ConsolidatedLogViewer servers={servers} hasApi={hasApi} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="processes" className="mt-0 flex-1 p-0 h-full border-0">
                <ProcessManager hasApi={hasApi} />
              </TabsContent>
              
              {selectedServer && (
                <>
                  <TabsContent value="server-logs" className="mt-0 flex-1 p-0 h-full border-0">
                    <div className="p-6 h-full">
                      <Card className="h-full">
                        <CardHeader className="pb-2">
                          <CardTitle>{selectedServer.name} Logs</CardTitle>
                          <CardDescription>
                            View real-time logs from the selected server
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 h-[calc(100%-80px)]">
                          <LogViewer serverId={selectedServer.id} />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="config" className="mt-0 flex-1 p-0 h-full border-0">
                    <div className="p-6 h-full overflow-auto">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle>{selectedServer.name} Configuration</CardTitle>
                          <CardDescription>
                            Configure server settings and environment variables
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ConfigEditor 
                            serverId={selectedServer.id}
                            config={selectedServer.config}
                            server={selectedServer}
                            onUpdateConfig={(config) => handleUpdateConfig(selectedServer.id, config)}
                            onDeleteServer={handleDeleteServer}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}