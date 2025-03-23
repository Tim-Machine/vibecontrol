import React, { useState, useEffect, useRef } from 'react';
import ansiToHtml from 'ansi-to-html';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Download, X, Search } from 'lucide-react';

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

// Mock log data for development without Electron
const generateMockLogs = (serverId, count = 10) => {
  const types = ['stdout', 'stderr', 'info'];
  const logs = [];
  
  const ansiColors = [
    '\x1b[31mRed text\x1b[0m',
    '\x1b[32mGreen text\x1b[0m',
    '\x1b[33mYellow text\x1b[0m',
    '\x1b[34mBlue text\x1b[0m',
    '\x1b[1mBold text\x1b[0m',
    '\x1b[1;31mBold red text\x1b[0m'
  ];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const useAnsi = Math.random() > 0.5;
    const message = useAnsi 
      ? ansiColors[Math.floor(Math.random() * ansiColors.length)]
      : `Regular log message ${i + 1}`;
      
    logs.push({
      type,
      timestamp: new Date(Date.now() - (count - i) * 1000).toISOString(),
      message: `[MOCK] ${type === 'stderr' ? 'Error:' : 'Log:'} ${message} for server ${serverId}`
    });
  }
  
  return logs;
};

export default function LogViewer({ serverId }) {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('');
  const logContainerRef = useRef(null);
  const logEndRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Safely check if window.api exists
  const hasApi = typeof window !== 'undefined' && window.api;
  
  // Fetch initial logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (hasApi) {
          const serverLogs = await window.api.getLogs(serverId);
          setLogs(serverLogs || []);
        } else {
          // Use mock logs for development
          setLogs(generateMockLogs(serverId));
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    
    fetchLogs();
    
    // Subscribe to log updates
    let unsubscribe = () => {};
    
    if (hasApi) {
      unsubscribe = window.api.onServerLog(({ serverId: id, log }) => {
        if (id === serverId) {
          setLogs(prev => [...prev, log]);
        }
      });
    } else {
      // For development, add a new mock log every 5 seconds
      const interval = setInterval(() => {
        const mockLog = {
          type: Math.random() > 0.8 ? 'stderr' : 'stdout',
          timestamp: new Date().toISOString(),
          message: `[MOCK] ${Math.random() > 0.8 ? 'Error:' : 'Log:'} Real-time update at ${new Date().toLocaleTimeString()}`
        };
        setLogs(prev => [...prev, mockLog]);
      }, 5000);
      
      unsubscribe = () => clearInterval(interval);
    }
    
    return () => {
      unsubscribe();
    };
  }, [serverId, hasApi]);
  
  // Auto-scroll to bottom when new logs come in (if autoScroll is enabled)
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);
  
  // Filter logs based on search term
  const filteredLogs = logs.filter(log => 
    filter === '' || log.message.toLowerCase().includes(filter.toLowerCase())
  );
  
  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] [${log.type}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `server-${serverId}-logs.txt`;
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
        
        <div className="flex items-center gap-2">
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
                Logs will appear here when the server starts running
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