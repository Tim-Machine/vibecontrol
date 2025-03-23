import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ServerSettingsCard({ 
  initialSettings, 
  onChange,
  onSave,
  className 
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = (field, value) => {
    setIsDirty(true);
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    onChange(newSettings);
  };

  const handleSave = () => {
    onSave(settings);
    setIsDirty(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Server Settings</CardTitle>
            <CardDescription>Configure basic server settings</CardDescription>
          </div>
          {isDirty && (
            <Button 
              variant="default"
              size="sm"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Server Name</Label>
          <Input
            id="name"
            value={settings.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter server name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="runCommand">Run Command</Label>
          <Input
            id="runCommand"
            value={settings.runCommand}
            onChange={(e) => handleChange('runCommand', e.target.value)}
            placeholder="Leave blank to use auto-detected command"
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground">Custom command to run your server</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="entryPoint">Entry Point</Label>
          <Input
            id="entryPoint"
            value={settings.entryPoint}
            onChange={(e) => handleChange('entryPoint', e.target.value)}
            placeholder="Leave blank to use auto-detected entry point"
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground">Custom entry point for your server</p>
        </div>
      </CardContent>
    </Card>
  );
} 