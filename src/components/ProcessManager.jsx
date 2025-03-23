import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { XCircle, RefreshCcw, Loader2, X, Terminal } from 'lucide-react';
import { Table, TableHeader, TableHead, TableBody, TableCell, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

const getProcessIcon = (name) => {
  if (name.includes('node')) return '⬢'; // Node.js hexagon
  if (name.includes('python')) return '🐍'; // Python snake
  return '•'; // Default dot
};

const getProcessColor = (name) => {
  if (name.includes('node')) return 'text-emerald-400';
  if (name.includes('python')) return 'text-blue-400';
  return 'text-primary';
};

export default function ProcessManager({ hasApi = true }) {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [killingProcess, setKillingProcess] = useState(null);

  const fetchProcesses = async () => {
    console.log('Fetching processes...');
    setLoading(true);
    try {
      if (hasApi) {
        console.log('Using electron API to fetch processes');
        const procs = await window.api.getSystemProcesses();
        console.log('Received processes from API:', procs);
        setProcesses(procs);
      } else {
        console.log('Using mock data (development mode)');
        // Mock data for development
        setProcesses([
          { pid: 1234, name: 'node', command: 'node server.js', port: 3000 },
          { pid: 1235, name: 'python', command: 'python app.py', port: 8000 }
        ]);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('ProcessManager mounted, initializing...');
    console.log('API available:', hasApi);
    
    // Initial fetch
    fetchProcesses();
    
    // Set up refresh interval after a delay to avoid immediate second fetch
    const interval = setTimeout(() => {
      // Start the regular interval
      const refreshInterval = setInterval(() => {
        console.log('Refresh interval triggered');
        fetchProcesses();
      }, REFRESH_INTERVAL);
      
      // Cleanup function
      return () => {
        console.log('Clearing refresh interval');
        clearInterval(refreshInterval);
      };
    }, 1000); // 1 second delay before starting the interval
    
    // Cleanup the initial delay timeout
    return () => {
      console.log('ProcessManager unmounting');
      clearTimeout(interval);
    };
  }, []);

  const handleKillProcess = async (pid) => {
    console.log('Attempting to kill process:', pid);
    setKillingProcess(pid);
    try {
      if (hasApi) {
        console.log('Using electron API to kill process');
        await window.api.killProcess(pid);
        console.log('Process killed successfully');
        
        // Find the server that owns this process and update its status
        const killedProcess = processes.find(p => p.pid === pid);
        if (killedProcess && killedProcess.serverId) {
          console.log('Updating server status after kill:', killedProcess.serverId);
          await window.api.updateServerStatus(killedProcess.serverId, 'stopped');
        }
        
        // Update the processes list by removing the killed process
        setProcesses(prevProcesses => prevProcesses.filter(p => p.pid !== pid));
      }
    } catch (error) {
      console.error(`Error killing process ${pid}:`, error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      setKillingProcess(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent glow">
          System Processes
        </h2>
        <p className="text-muted-foreground">
          View and manage running Node.js and Python processes on your system.
        </p>
      </div>

      <div className="rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">PID</TableHead>
              <TableHead className="w-[120px]">Process</TableHead>
              <TableHead>Command</TableHead>
              <TableHead className="w-[80px]">Port</TableHead>
              <TableHead className="w-[120px]">Server</TableHead>
              <TableHead className="w-[80px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {processes.map((process) => (
              <TableRow key={process.pid} className="group hover:bg-primary/5 transition-colors duration-300">
                <TableCell className="font-mono">{process.pid}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <span className={cn("text-lg", getProcessColor(process.name))}>
                        {getProcessIcon(process.name)}
                      </span>
                      <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="font-medium">{process.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2 font-mono text-xs">
                    <Terminal className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{process.command || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {process.port ? (
                    <Badge variant="outline" className="font-mono bg-muted/50">
                      :{process.port}
                    </Badge>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {process.serverId ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                      {process.serverId}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleKillProcess(process.pid)}
                    disabled={killingProcess !== null}
                    className={cn(
                      "h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-300 glow-border",
                      killingProcess === process.pid && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="relative">
                      {killingProcess === process.pid ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          <div className="absolute -inset-1 bg-red-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </>
                      )}
                    </div>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {processes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Activity className="h-8 w-8 mb-2 opacity-50" />
                    <p>No processes found</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={fetchProcesses}
          className="border-border/50 hover:bg-primary/20 transition-all duration-300 glow-border"
        >
          <div className="relative">
            <RefreshCcw className="h-4 w-4 mr-2" />
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          Refresh
        </Button>
      </div>
    </div>
  );
} 