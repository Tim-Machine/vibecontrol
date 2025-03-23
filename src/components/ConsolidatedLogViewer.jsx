import React, { useState, useEffect, useRef } from 'react';
import ansiToHtml from 'ansi-to-html';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Download, X, Search, Filter } from 'lucide-react';

// ANSI color code converter
const converter = new ansiToHtml({
  fg: '#FFF',
  bg: '#000',
  newline: false,
  escapeXML: true,
  stream: false
});

// Function to convert ANSI color codes to HTML
const formatAnsiMessage = (message) => {
  try {
    return converter.toHtml(message);
  } catch (error) {
    console.error('Error converting ANSI to HTML:', error);
    return message;
  }
};

export default function ConsolidatedLogViewer({ servers, hasApi = true }) {
  const [allLogs, setAllLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const [serverFilter, setServerFilter] = useState('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);
  
  // Effect to consolidate logs from all servers
  useEffect(() => {
    // Combine all server logs with server name added to each log
    const combinedLogs = servers.flatMap(server => 
      (server.logs || []).map(log => ({
        ...log,
        serverId: server.id,
        serverName: server.name
      }))
    );
    
    // Sort logs by timestamp
    const sortedLogs = combinedLogs.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    setAllLogs(sortedLogs);
  }, [servers]);
  
  // Effect to subscribe to log updates
  useEffect(() => {
    if (!hasApi) return;
    
    const handleNewLog = ({ serverId, log }) => {
      const server = servers.find(s => s.id === serverId);
      if (!server) return;
      
      setAllLogs(prev => [
        ...prev,
        {
          ...log,
          serverId,
          serverName: server.name
        }
      ]);
    };
    
    // Subscribe to log updates
    const unsubscribe = window.api.onServerLog(handleNewLog);
    
    return () => {
      unsubscribe();
    };
  }, [servers, hasApi]);
  
  // Effect to scroll to bottom when new logs come in (if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allLogs, autoScroll]);
  
  // Filter logs based on text search and selected server
  const filteredLogs = allLogs.filter(log => {
    const textMatch = filter === '' || 
      log.message.toLowerCase().includes(filter.toLowerCase());
    
    const serverMatch = serverFilter === 'all' || 
      log.serverId === serverFilter;
    
    return textMatch && serverMatch;
  });
  
  // Generate server options
  const serverOptions = [
    { id: 'all', name: 'All Servers' },
    ...servers.map(server => ({
      id: server.id,
      name: server.name
    }))
  ];
  
  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.serverName}] [${log.type}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-servers-logs-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-card border-b">
        <div className="relative flex-1 max-w-md flex items-center">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter logs..."
            className="pl-8 h-9"
          />
          {filter && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 absolute right-1 top-1"
              onClick={() => setFilter('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center border bg-background rounded-md px-3 h-9">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="bg-transparent text-sm h-full outline-none w-40"
            >
              {serverOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`h-9 px-3 ${autoScroll ? 'bg-primary/10' : ''}`}
          >
            {autoScroll ? 'Auto-scroll: On' : 'Auto-scroll: Off'}
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={exportLogs}
            className="h-9 w-9"
            title="Export logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <ScrollArea 
        className="flex-1 h-full"
        ref={logContainerRef}
      >
        <div className="bg-black text-white p-4 min-h-full font-mono text-sm relative">
          {filteredLogs.length === 0 ? (
            <div className="text-gray-500 text-center py-20">
              <div className="text-muted-foreground mb-1">No logs available</div>
              <div className="text-xs text-muted-foreground/60">
                Logs will appear here when servers start running
              </div>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className={`mb-1 ${
                  log.type === 'stderr' || log.type === 'error'
                    ? 'text-red-400'
                    : log.type === 'info'
                      ? 'text-blue-300'
                      : 'text-green-400'
                } break-words`}
              >
                <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <Badge variant="outline" className="text-amber-300 border-amber-300/30 bg-transparent font-normal h-4 px-1 py-0">
                  {log.serverName}
                </Badge>{' '}
                <span className={`mr-1 ${
                  log.type === 'stderr' || log.type === 'error'
                    ? 'text-red-300'
                    : log.type === 'info'
                      ? 'text-blue-200'
                      : 'text-green-300'
                }`}>
                  [{log.type.toUpperCase()}]
                </span>
                <span 
                  dangerouslySetInnerHTML={{ 
                    __html: formatAnsiMessage(log.message) 
                  }} 
                />
              </div>
            ))
          )}
          <div ref={logEndRef} className="h-1" />
        </div>
      </ScrollArea>
    </div>
  );
}