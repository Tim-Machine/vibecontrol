import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Play, Square, RotateCw, Trash2, MoreVertical, Eye, Settings, FileCode, RefreshCw } from 'lucide-react';

export default function ServerList({ 
  servers, 
  onSelectServer,
  onStartServer,
  onStopServer,
  onDeleteServer,
  onRebuildServer
}) {
  if (servers.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center text-center h-full border-2 border-dashed border-muted-foreground/20 rounded-lg">
        <div className="w-20 h-20 mb-5 bg-muted rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No servers added yet</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-sm">
          Start by adding an MCP server from a Git repository to manage, monitor, and control your servers.
        </p>
      </div>
    );
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'text-green-400 glow';
      case 'stopped':
        return 'text-red-400';
      case 'starting':
        return 'text-yellow-400 animate-pulse';
      case 'stopping':
        return 'text-orange-400 animate-pulse';
      default:
        return 'text-gray-400';
    }
  };
  
  const getStatusVariant = (status) => {
    switch(status) {
      case 'running': return 'green';
      case 'error': return 'red';
      case 'stopped': return 'gray';
      default: return 'secondary';
    }
  };
  
  return (
    <ScrollArea className="h-[calc(100%-500px)]">
      <div className="space-y-3 pr-4">
        {servers.map(server => (
          <div
            key={server.id}
            className="group relative p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-all duration-300 backdrop-blur-sm"
            onClick={() => onSelectServer(server)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className={`h-2.5 w-2.5 rounded-full ${getStatusColor(server.status)}`}></div>
                  <div className="absolute -inset-1 bg-current rounded-full blur-sm opacity-20"></div>
                </div>
                <div>
                  <h3 className="font-medium text-sm bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent group-hover:from-primary group-hover:to-accent transition-all duration-300">
                    {server.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {server.type} • Port {server.port}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1">
                {server.status === 'stopped' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-400/10 transition-all duration-300 glow-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartServer(server.id);
                    }}
                  >
                    <div className="relative">
                      <Play className="h-4 w-4" />
                      <div className="absolute -inset-1 bg-green-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </Button>
                )}
                
                {server.status === 'running' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300 glow-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStopServer(server.id);
                    }}
                  >
                    <div className="relative">
                      <Square className="h-4 w-4" />
                      <div className="absolute -inset-1 bg-red-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-md border-border/50">
                    <DropdownMenuItem
                      className="flex items-center cursor-pointer hover:bg-primary/20 transition-colors duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRebuildServer(server.id);
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      <span>Rebuild Server</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/50" />
                    <DropdownMenuItem
                      className="flex items-center cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteServer(server.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span>Delete Server</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}