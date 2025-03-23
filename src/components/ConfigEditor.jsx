import React, { useState, useEffect } from 'react';
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CommandArgEditor from './CommandArgEditor';
import EnvVarEditor from './EnvVarEditor';
import CommandArgCard from './CommandArgCard';
import ServerSettingsCard from './ServerSettingsCard';

export default function ConfigEditor({ serverId, config, onUpdateConfig, server, onDeleteServer }) {
  const [activeTab, setActiveTab] = useState('env'); // Changed default to 'env'
  const [configState, setConfigState] = useState({
    json: config || {},
    error: false
  });
  const [envState, setEnvState] = useState({
    json: server?.env || {},
    error: false
  });
  const [editableFields, setEditableFields] = useState({
    name: server?.name || '',
    runCommand: server?.runCommand || '',
    entryPoint: server?.entryPoint || ''
  });
  const [commandArgs, setCommandArgs] = useState(server?.commandArgs || []);
  
  // Initialize environment variables from server
  useEffect(() => {
    if (server?.env) {
      const vars = Object.entries(server.env).map(([key, value]) => ({ key, value }));
      setEnvState({
        json: vars.length ? vars : [{ key: '', value: '' }],
        error: false
      });
    } else {
      setEnvState({
        json: [{ key: '', value: '' }],
        error: false
      });
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
  
  const handleEnvVarsChange = (newEnvVars) => {
    setEnvState({
      json: newEnvVars,
      error: false
    });
  };
  
  const handleEnvVarsSave = (envVars) => {
    // Make sure we're passing all the current values
    const updatedConfig = {
      ...config, // Keep existing config
      env: envVars,
      name: editableFields.name,
      runCommand: editableFields.runCommand,
      entryPoint: editableFields.entryPoint,
      commandArgs: commandArgs
    };
    console.log('Saving env vars:', updatedConfig); // Debug log
    onUpdateConfig(updatedConfig);
  };
  
  const handleSettingsSave = (settings) => {
    const updatedConfig = {
      ...config, // Keep existing config
      env: envState.json,
      ...settings,
      commandArgs: commandArgs
    };
    console.log('Saving settings:', updatedConfig); // Debug log
    onUpdateConfig(updatedConfig);
  };
  
  const handleCommandArgsSave = (args) => {
    const updatedConfig = {
      ...config, // Keep existing config
      env: envState.json,
      name: editableFields.name,
      runCommand: editableFields.runCommand,
      entryPoint: editableFields.entryPoint,
      commandArgs: args
    };
    console.log('Saving command args:', updatedConfig); // Debug log
    onUpdateConfig(updatedConfig);
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
    <div className="space-y-6">

      <EnvVarEditor
        initialEnvVars={server?.env}
        onChange={handleEnvVarsChange}
        onSave={handleEnvVarsSave}
      />

      <ServerSettingsCard
        initialSettings={editableFields}
        onChange={setEditableFields}
        onSave={handleSettingsSave}
      />

      <CommandArgCard
        args={commandArgs}
        onChange={setCommandArgs}
        onSave={handleCommandArgsSave}
      />

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>Edit raw configuration JSON</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button 
          variant="destructive"
          onClick={() => onDeleteServer(serverId)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Server
        </Button>
      </div>
    </div>
  );
}