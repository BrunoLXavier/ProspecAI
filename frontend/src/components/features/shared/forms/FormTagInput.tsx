/**
 * FormTagInput Component
 * Tag input for arrays (keywords, focus areas, etc.)
 */
'use client';

import { useState, KeyboardEvent } from 'react';
import { FieldError } from 'react-hook-form';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

interface FormTagInputProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  error?: FieldError;
  helperText?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxTags?: number;
}

export default function FormTagInput({
  label,
  value = [],
  onChange,
  error,
  helperText,
  placeholder = 'Digite e pressione Enter',
  disabled,
  required,
  maxTags = 10,
}: FormTagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div
        className={`
          flex flex-wrap gap-2 p-2 rounded-md border min-h-[42px]
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100' : 'bg-white'}
        `}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-blue-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </span>
        ))}
        
        {!disabled && value.length < maxTags && (
          <div className="flex items-center gap-1 flex-1 min-w-[120px]">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 border-0 p-0 text-sm focus:ring-0 focus:outline-none bg-transparent"
            />
            <button
              type="button"
              onClick={addTag}
              className="text-gray-400 hover:text-blue-600"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
