import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Eye, EyeOff, Keyboard } from 'lucide-react';

export default function EnvVarEditor({ 
  initialEnvVars = {}, 
  onChange,
  onSave,
  className
}) {
  const [envVars, setEnvVars] = useState([]);
  const [showValues, setShowValues] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [currentEnvVars, setCurrentEnvVars] = useState(initialEnvVars);

  useEffect(() => {
    if (initialEnvVars) {
      const vars = Object.entries(initialEnvVars).map(([key, value]) => ({ key, value }));
      setEnvVars(vars.length ? vars : [{ key: '', value: '' }]);
      
      const initialVisibility = {};
      vars.forEach(({ key }) => {
        initialVisibility[key] = false;
      });
      setShowValues(initialVisibility);
      setCurrentEnvVars(initialEnvVars);
    }
  }, [initialEnvVars]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, currentEnvVars]);

  const handleEnvVarChange = (index, field, value) => {
    setIsDirty(true);
    const updatedVars = [...envVars];
    const oldKey = updatedVars[index].key;
    updatedVars[index][field] = value;
    setEnvVars(updatedVars);
    
    if (field === 'key' && oldKey !== value) {
      setShowValues(prev => {
        const newState = { ...prev };
        delete newState[oldKey];
        newState[value] = false;
        return newState;
      });
    }

    const envObj = {};
    updatedVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key] = value;
      }
    });
    
    setCurrentEnvVars(envObj);
    onChange(envObj);
  };

  const toggleValueVisibility = (key) => {
    setShowValues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
    setIsDirty(true);
  };

  const removeEnvVar = (index) => {
    const varToRemove = envVars[index];
    const updatedVars = envVars.filter((_, i) => i !== index);
    setEnvVars(updatedVars.length ? updatedVars : [{ key: '', value: '' }]);
    setIsDirty(true);

    if (varToRemove.key) {
      setShowValues(prev => {
        const newState = { ...prev };
        delete newState[varToRemove.key];
        return newState;
      });
    }

    const envObj = {};
    updatedVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key] = value;
      }
    });
    
    setCurrentEnvVars(envObj);
    onChange(envObj);
  };

  const handleSave = () => {
    onSave(currentEnvVars);
    setIsDirty(false);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Environment Variables</CardTitle>
            <CardDescription>Configure environment variables for your server</CardDescription>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <Button 
                variant="default"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2"
              >
                <span>Save Changes</span>
                <div className="flex items-center text-xs text-muted-foreground gap-1 border-l pl-2">
                  <Keyboard className="h-3 w-3" />
                  <span>Ctrl+S</span>
                </div>
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              onClick={addEnvVar}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Variable
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {envVars.map((envVar, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Label>Key</Label>
                <Input
                  placeholder="VARIABLE_NAME"
                  value={envVar.key}
                  onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Value</Label>
                <div className="relative">
                  <Input
                    type={showValues[envVar.key] ? "text" : "password"}
                    placeholder="value"
                    value={envVar.value}
                    onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                    className="font-mono text-sm pr-10"
                  />
                  {envVar.key && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => toggleValueVisibility(envVar.key)}
                    >
                      {showValues[envVar.key] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              <div className="pt-8">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEnvVar(index)}
                  className="h-10 w-10 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 