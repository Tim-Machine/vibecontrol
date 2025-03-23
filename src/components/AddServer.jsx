import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { GitBranch, Trash2, Plus, X, Check, ChevronRight } from 'lucide-react';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { PlusCircle } from 'lucide-react';

export default function AddServer({ onAddServer }) {
  const [gitUrl, setGitUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [runCommand, setRunCommand] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Process environment variables
    const env = {};
    envVars.forEach(({ key, value }) => {
      if (key.trim()) {
        env[key] = value;
      }
    });
    
    const config = {
      name: customName || undefined,
      runCommand: runCommand || undefined,
      entryPoint: entryPoint || undefined,
      buildCommand: buildCommand || undefined,
      env: Object.keys(env).length > 0 ? env : undefined
    };
    
    onAddServer(gitUrl, config);
    
    // Reset form
    setGitUrl('');
    setCustomName('');
    setRunCommand('');
    setBuildCommand('');
    setEntryPoint('');
    setEnvVars([{ key: '', value: '' }]);
    setActiveTab('basic');
  };
  
  const handleEnvVarChange = (index, field, value) => {
    const updatedVars = [...envVars];
    updatedVars[index][field] = value;
    setEnvVars(updatedVars);
  };
  
  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };
  
  const removeEnvVar = (index) => {
    const updatedVars = envVars.filter((_, i) => i !== index);
    setEnvVars(updatedVars.length ? updatedVars : [{ key: '', value: '' }]);
  };
  
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent glow">
            Add Server
          </h2>
          <p className="text-muted-foreground">
            Configure a new server for your project. Fill in the details below to get started.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Server Name</Label>
                <Input
                  id="name"
                  placeholder="Enter server name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gitUrl">Git Repository URL</Label>
                <Input
                  id="gitUrl"
                  placeholder="e.g., https://github.com/user/repo.git"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select value="nodejs" onValueChange={(value) => {}}>
                  <SelectTrigger className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-md border-border/50">
                    <SelectItem value="nodejs" className="hover:bg-primary/20 transition-colors duration-300">Node.js</SelectItem>
                    <SelectItem value="python" className="hover:bg-primary/20 transition-colors duration-300">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="advanced">Advanced Configuration</Label>
                  <Switch
                    id="advanced"
                    checked={showAdvanced}
                    onCheckedChange={setShowAdvanced}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              {showAdvanced && (
                <div className="space-y-4 rounded-lg border border-border/50 p-4 bg-card/30 backdrop-blur-sm">
                  <div className="space-y-2">
                    <Label htmlFor="entryPoint">Entry Point</Label>
                    <Input
                      id="entryPoint"
                      placeholder="e.g., index.js, main.py"
                      value={entryPoint}
                      onChange={(e) => setEntryPoint(e.target.value)}
                      className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="runCommand">Run Command</Label>
                    <Input
                      id="runCommand"
                      placeholder="e.g., npm start, python app.py"
                      value={runCommand}
                      onChange={(e) => setRunCommand(e.target.value)}
                      className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buildCommand">Build Command</Label>
                    <Input
                      id="buildCommand"
                      placeholder="e.g., npm install, pip install -r requirements.txt"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      className="bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">Environment Variables</h3>
            <div className="space-y-3">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="KEY"
                    value={envVar.key}
                    onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                    className="font-mono text-sm bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                  />
                  <Input
                    placeholder="value"
                    value={envVar.value}
                    onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                    className="font-mono text-sm bg-card/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 backdrop-blur-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEnvVar(index)}
                    className="shrink-0 bg-card/50 border-border/50 hover:bg-primary/20 transition-all duration-300 glow-border"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEnvVar}
                className="w-full bg-card/50 border-border/50 hover:bg-primary/20 transition-all duration-300 glow-border"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Environment Variable
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => {}}
            className="border-border/50 hover:bg-primary/20 transition-all duration-300 glow-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary/80 hover:bg-primary transition-all duration-300 group glow-border"
          >
            <div className="relative">
              <PlusCircle className="h-4 w-4 mr-2" />
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            Add Server
          </Button>
        </div>
      </div>
    </div>
  );
}