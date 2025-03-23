import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import CommandArgEditor from './CommandArgEditor';

export default function CommandArgCard({
  args = [],
  onChange,
  onSave,
  className
}) {
  const [isDirty, setIsDirty] = useState(false);
  const [currentArgs, setCurrentArgs] = useState(args);

  // Update currentArgs only when args changes AND we're not in a dirty state
  useEffect(() => {
    if (!isDirty) {
      setCurrentArgs(args);
    }
  }, [args, isDirty]);

  const handleChange = (newArgs) => {
    console.log('handleChange called with:', newArgs);
    setCurrentArgs(newArgs);
    onChange?.(newArgs);
    setIsDirty(true);
  };

  const handleSave = () => {
    onSave?.(currentArgs);
    setIsDirty(false);
  };

  // Handle keyboard shortcuts
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
  }, [isDirty]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Command Arguments</CardTitle>
            <CardDescription>Add flags and key-value arguments for the run command</CardDescription>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        <CommandArgEditor 
          args={currentArgs}
          onChange={handleChange}
        />
      </CardContent>
    </Card>
  );
} 