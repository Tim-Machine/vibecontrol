import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Toaster } from 'sonner';
import { toast } from 'sonner';

// Application version
const APP_VERSION = '1.0.0';

function App() {
  console.log('App component rendering');
  
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appInfo, setAppInfo] = useState({
    version: APP_VERSION,
    electronVersion: null,
    nodeVersion: null,
    platform: null
  });
  
  // Safely check if window.api exists
  const hasApi = typeof window !== 'undefined' && window.api;
  console.log('Has API:', hasApi);
  
  // Fetch servers and app info on mount
  useEffect(() => {
    console.log('App useEffect running');
    const loadServers = async () => {
      try {
        console.log('Loading servers...');
        if (hasApi) {
          const serverList = await window.api.getServers();
          console.log('Servers loaded:', serverList);
          setServers(serverList);
          
          // Try to get app info
          try {
            const info = await window.api.getAppInfo();
            console.log('App info loaded:', info);
            setAppInfo(prevInfo => ({
              ...prevInfo,
              ...info
            }));
          } catch (infoError) {
            console.warn('Could not load app info:', infoError);
          }
        } else {
          console.warn('API not available - running in development mode without Electron');
          // Provide mock data for development
          setServers([]);
          toast.warning('Running in browser mode without Electron API');
          setAppInfo(prevInfo => ({
            ...prevInfo,
            platform: 'browser',
            nodeVersion: process.versions?.node || 'unknown',
            electronVersion: 'N/A (browser mode)'
          }));
        }
      } catch (error) {
        console.error('Error loading servers:', error);
        setError('Failed to load servers. Please restart the application.');
        toast.error('Failed to load servers');
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };
    
    loadServers();
    
    // Set up event listeners for server status changes
    let unsubStatusChange = () => {};
    
    if (hasApi) {
      unsubStatusChange = window.api.onServerStatusChange(({ serverId, status }) => {
        console.log('Server status change:', serverId, status);
        setServers(prev => prev.map(server => 
          server.id === serverId ? { ...server, status } : server
        ));
      });
    }
    
    return () => {
      if (typeof unsubStatusChange === 'function') {
        unsubStatusChange();
      }
    };
  }, [hasApi]);
  
  if (loading) {
    console.log('Rendering loading state');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl flex items-center">
          <svg className="animate-spin h-5 w-5 mr-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading MCP Server Manager...
        </div>
      </div>
    );
  }
  
  if (error) {
    console.log('Rendering error state:', error);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="p-6 bg-card rounded-lg shadow-lg max-w-md border">
          <div className="flex items-center text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h2 className="text-xl font-bold">Application Error</h2>
          </div>
          <p className="text-foreground mb-4">{error}</p>
          <p className="text-sm text-muted-foreground">
            Please check the logs for more information or try restarting the application.
          </p>
        </div>
      </div>
    );
  }
  
  console.log('Rendering main app UI');
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col dark glow-bg">
      {/* Title bar */}
      <div className="bg-card/80 text-card-foreground border-b border-border/50 p-1.5 shadow-sm text-xs flex justify-between items-center backdrop-blur-md">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary glow" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <span className="font-medium glow">MCP Server Manager</span>
        </div>
        <div className="text-muted-foreground flex space-x-4">
          <div className="flex items-center">
            <span className="text-muted-foreground mr-1">Version:</span> {appInfo.version}
          </div>
          {appInfo.electronVersion && (
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">Electron:</span> {appInfo.electronVersion}
            </div>
          )}
          {appInfo.platform && (
            <div className="flex items-center">
              <span className="text-muted-foreground mr-1">Platform:</span> {appInfo.platform}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1">
        <Dashboard 
          servers={servers} 
          setServers={setServers} 
          hasApi={hasApi}
        />
        <Toaster 
          position="top-right"
          closeButton
          richColors
          expand
          duration={3000}
          className="dark"
        />
      </div>
    </div>
  );
}

export default App;