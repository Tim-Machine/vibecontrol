import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Plus, Trash2 } from 'lucide-react';

export default function CommandArgEditor({ args = [], onChange }) {
  const [newArg, setNewArg] = useState({ type: 'flag', key: '', value: '' });

  const handleKeyChange = (value) => {
    setNewArg(prev => ({
      ...prev,
      key: value
    }));
  };

  const handleTypeChange = (type) => {
    setNewArg(prev => ({ ...prev, type }));
  };

  const addArg = () => {
    if (newArg.key) {
      const arg = {
        type: newArg.type,
        key: newArg.key.startsWith('--') ? newArg.key : `--${newArg.key}`,
        value: newArg.type === 'keyValue' ? newArg.value : undefined
      };
      onChange([...args, arg]);
      setNewArg({ type: 'flag', key: '', value: '' }); // Reset form
    }
  };

  const removeArg = (index) => {
    const newArgs = [...args];
    newArgs.splice(index, 1);
    onChange(newArgs);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="w-32">
          <Label>Type</Label>
          <Select
            value={newArg.type}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flag">Flag</SelectItem>
              <SelectItem value="keyValue">Key Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Label>Key</Label>
          <Input
            placeholder="argument-name"
            value={newArg.key.replace(/^--/, '')}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="font-mono"
          />
        </div>
        {newArg.type === 'keyValue' && (
          <div className="flex-1">
            <Label>Value</Label>
            <Input
              placeholder="value"
              value={newArg.value}
              onChange={(e) => setNewArg(prev => ({ ...prev, value: e.target.value }))}
              className="font-mono"
            />
          </div>
        )}
        <Button onClick={addArg} size="icon" className="mb-0.5">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {args.map((arg, index) => (
          <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
            <code className="flex-1 font-mono text-sm">
              {arg.key}{arg.type === 'keyValue' ? ` "${arg.value}"` : ''}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeArg(index)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
} 