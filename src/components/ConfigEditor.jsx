import React, { useState, useEffect } from 'react';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ConfigEditor({ serverId, config, onUpdateConfig, server, onDeleteServer }) {
  const [activeTab, setActiveTab] = useState('config'); // 'config' or 'env'
  const [configState, setConfigState] = useState({
    json: config || {},
    error: false
  });
  const [envState, setEnvState] = useState({
    json: server?.env || {},
    error: false
  });
  const [envVars, setEnvVars] = useState([]);
  const [editableFields, setEditableFields] = useState({
    name: server?.name || '',
    runCommand: server?.runCommand || '',
    entryPoint: server?.entryPoint || ''
  });
  
  // Initialize environment variables from server
  useEffect(() => {
    if (server?.env) {
      const vars = Object.entries(server.env).map(([key, value]) => ({ key, value }));
      setEnvVars(vars.length ? vars : [{ key: '', value: '' }]);
    } else {
      setEnvVars([{ key: '', value: '' }]);
    }
    
    // Update editable fields when server changes
    setEditableFields({
      name: server?.name || '',
      runCommand: server?.runCommand || '',
      entryPoint: server?.entryPoint || ''
    });
  }, [server]);
  
  const handleConfigChange = (content) => {
    setConfigState({
      json: content.jsObject || {},
      error: content.error
    });
  };
  
  const handleEnvJsonChange = (content) => {
    setEnvState({
      json: content.jsObject || {},
      error: content.error
    });
    
    // Sync with the form inputs
    if (!content.error && content.jsObject) {
      const vars = Object.entries(content.jsObject).map(([key, value]) => ({ key, value }));
      setEnvVars(vars.length ? vars : [{ key: '', value: '' }]);
    }
  };
  
  const handleEnvVarChange = (index, field, value) => {
    const updatedVars = [...envVars];
    updatedVars[index][field] = value;
    setEnvVars(updatedVars);
    
    // Update the JSON representation
    const envObj = {};
    updatedVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key] = value;
      }
    });
    
    setEnvState({
      json: envObj,
      error: false
    });
  };
  
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };
  
  const removeEnvVar = (index) => {
    const updatedVars = envVars.filter((_, i) => i !== index);
    setEnvVars(updatedVars.length ? updatedVars : [{ key: '', value: '' }]);
    
    // Update the JSON representation
    const envObj = {};
    updatedVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key] = value;
      }
    });
    
    setEnvState({
      json: envObj,
      error: false
    });
  };
  
  const handleSave = () => {
    // When saving, include both config and env vars, plus the editable fields
    if (!configState.error && !envState.error) {
      onUpdateConfig({
        ...configState.json,
        env: envState.json,
        name: editableFields.name || undefined,
        runCommand: editableFields.runCommand || undefined,
        entryPoint: editableFields.entryPoint || undefined
      });
    }
  };
  
  // Get server info for display in the configuration editor
  const serverInfo = {
    name: editableFields.name || server?.name || 'Unknown',
    type: server?.projectType || 'Unknown',
    runCommand: editableFields.runCommand || server?.runCommand || 'Auto-detected',
    entryPoint: editableFields.entryPoint || server?.entryPoint || 'Auto-detected',
    dir: server?.dir || 'Unknown',
    status: server?.status || 'Unknown',
    port: server?.port || 'Unknown'
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent glow">
          {server?.name || 'Server'} Configuration
        </h2>
        <p className="text-muted-foreground">
          Configure MCP-specific settings and environment variables
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Server Information</CardTitle>
              <CardDescription>Basic server settings and configuration</CardDescription>
            </div>
            <Button 
              variant="destructive"
              size="sm"
              onClick={() => onDeleteServer(serverId)}
              className="ml-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Server
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                value={editableFields.name}
                onChange={(e) => setEditableFields(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter server name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="runCommand">Run Command</Label>
              <Input
                id="runCommand"
                value={editableFields.runCommand}
                onChange={(e) => setEditableFields(prev => ({ ...prev, runCommand: e.target.value }))}
                placeholder="Leave blank to use auto-detected command"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">Custom command to run your server</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryPoint">Entry Point</Label>
              <Input
                id="entryPoint"
                value={editableFields.entryPoint}
                onChange={(e) => setEditableFields(prev => ({ ...prev, entryPoint: e.target.value }))}
                placeholder="Leave blank to use auto-detected entry point"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">Custom entry point for your server</p>
            </div>

            <div className="space-y-2">
              <Label>Directory</Label>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {serverInfo.dir}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>MCP Configuration</CardTitle>
          <CardDescription>Configure MCP-specific settings for your server</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="config" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="config" className="flex-1">Configuration</TabsTrigger>
              <TabsTrigger value="env" className="flex-1">Environment Variables</TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="mt-4">
              <div className="rounded-md border bg-muted/50">
                <JSONInput
                  id={`config-editor-${serverId}`}
                  placeholder={config || {}}
                  locale={locale}
                  height="300px"
                  width="100%"
                  onChange={handleConfigChange}
                  confirmGood={false}
                  style={{
                    warningBox: { display: 'none' },
                    body: { backgroundColor: 'transparent' },
                    outerBox: { width: '100%' },
                    container: { backgroundColor: 'transparent' }
                  }}
                  theme={{
                    background: 'transparent',
                    default: '#94a3b8',
                    string: '#10b981',
                    number: '#60a5fa',
                    colon: '#94a3b8',
                    keys: '#f472b6',
                    keys_whiteSpace: 'none',
                    primitive: '#f472b6',
                    error: '#ef4444',
                    background_warning: '#ef4444'
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="env" className="mt-4">
              <div className="rounded-md border bg-muted/50">
                <JSONInput
                  id={`env-editor-${serverId}`}
                  placeholder={envState.json || {}}
                  locale={locale}
                  height="300px"
                  width="100%"
                  onChange={handleEnvJsonChange}
                  confirmGood={false}
                  style={{
                    warningBox: { display: 'none' },
                    body: { backgroundColor: 'transparent' },
                    outerBox: { width: '100%' },
                    container: { backgroundColor: 'transparent' }
                  }}
                  theme={{
                    background: 'transparent',
                    default: '#94a3b8',
                    string: '#10b981',
                    number: '#60a5fa',
                    colon: '#94a3b8',
                    keys: '#f472b6',
                    keys_whiteSpace: 'none',
                    primitive: '#f472b6',
                    error: '#ef4444',
                    background_warning: '#ef4444'
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="w-32">
          Save Changes
        </Button>
      </div>
    </div>
  );
}