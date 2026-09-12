"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";

interface EditableTextProps {
  value: string;
  onChange?: (newValue: string) => void;
  className?: string;
  multiline?: boolean;
  editable?: boolean;
  style?: React.CSSProperties;
}

export function EditableText({ value, onChange, className, multiline = false, editable = false, style }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!editable) {
    return <div className={className} style={style}>{value}</div>;
  }

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value && onChange) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonClasses = cn(
      "w-full bg-primary/10 border-2 border-primary rounded-lg outline-none p-1 transition-all",
      className
    );

    return multiline ? (
      <textarea
        ref={inputRef as any}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
        style={style}
      />
    ) : (
      <input
        ref={inputRef as any}
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
        style={style}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "relative group/edit cursor-text hover:ring-2 hover:ring-primary/30 hover:bg-primary/5 rounded-lg transition-all",
        className
      )}
      style={style}
    >
      {value || <span className="opacity-30 italic">Clique para editar...</span>}
      <div className="absolute -top-2 -right-2 h-6 w-6 bg-primary text-white rounded-full items-center justify-center hidden group-hover/edit:flex shadow-lg z-50">
        <Pencil className="h-3 w-3" />
      </div>
    </div>
  );
}