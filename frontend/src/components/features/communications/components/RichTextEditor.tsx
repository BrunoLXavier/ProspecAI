/**
 * RichTextEditor Component
 * 
 * Simple rich text editor using contentEditable with:
 * - Bold, Italic, Underline formatting
 * - Strikethrough
 * - Ordered/Unordered lists
 * - Links
 * - Code blocks
 * - Keyboard shortcuts
 * 
 * Implements RF-08: Communications with rich text support
 */
'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  value: string;
  onChange: (html: string, plainText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  editorRef?: React.RefObject<HTMLDivElement>;
}

// Custom icons for rich text toolbar
export function BoldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/>
    </svg>
  );
}

export function ItalicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/>
    </svg>
  );
}

export function UnderlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
    </svg>
  );
}

export function StrikethroughIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/>
    </svg>
  );
}

export function ListBulletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
    </svg>
  );
}

export function QueueListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
    </svg>
  );
}

export function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
    </svg>
  );
}

export function CodeBracketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
    </svg>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  minHeight = '80px',
  onKeyDown,
  editorRef: externalEditorRef,
}: Props) {
  const t = useTranslations('communications');
  const tRt = useTranslations('richText');
  const internalEditorRef = useRef<HTMLDivElement>(null);
  const editorRef = externalEditorRef || internalEditorRef;
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Update active formats based on cursor position
  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('underline')) formats.add('underline');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    setActiveFormats(formats);
  }, []);

  // Sync editor content with value prop (including clearing on reset)
  useEffect(() => {
    if (editorRef.current) {
      // Clear editor when value is empty (after send)
      if (!value && editorRef.current.innerHTML !== '') {
        editorRef.current.innerHTML = '';
      } else if (value && value !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value;
      }
    }
  }, [value]);

  // Handle content change
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const plainText = editorRef.current.innerText || '';
      onChange(html, plainText);
      updateActiveFormats();
    }
  }, [onChange, updateActiveFormats]);

  // Execute formatting command
  const execCommand = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  }, [handleInput]);

  // Format button component
  const FormatButton = ({ 
    command, 
    icon: Icon, 
    title,
    formatKey,
  }: { 
    command: string; 
    icon: React.FC<{ className?: string }>; 
    title: string;
    formatKey?: string;
  }) => {
    const isActive = activeFormats.has(formatKey || command);
    return (
      <button
        type="button"
        onClick={() => execCommand(command)}
        disabled={disabled}
        className={`p-1.5 rounded transition-colors ${
          isActive 
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300' 
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300'
        } disabled:opacity-50`}
        title={title}
      >
        <Icon className="w-4 h-4" />
      </button>
    );
  };

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'k':
          e.preventDefault();
          setShowLinkInput(true);
          break;
      }
    }
    
    // Update formats on any key
    setTimeout(updateActiveFormats, 0);
    
    // Pass through to parent handler
    onKeyDown?.(e);
  }, [execCommand, updateActiveFormats, onKeyDown]);

  // Insert link
  const handleInsertLink = useCallback(() => {
    if (linkUrl) {
      const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
      execCommand('createLink', url);
    }
    setShowLinkInput(false);
    setLinkUrl('');
  }, [linkUrl, execCommand]);

  // Insert code block
  const handleInsertCode = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText) {
        const code = document.createElement('code');
        code.className = 'bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono';
        code.textContent = selectedText;
        range.deleteContents();
        range.insertNode(code);
      }
      handleInput();
    }
  }, [handleInput]);

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-gray-600">
        <FormatButton command="bold" icon={BoldIcon} title={tRt('bold')} formatKey="bold" />
        <FormatButton command="italic" icon={ItalicIcon} title={tRt('italic')} formatKey="italic" />
        <FormatButton command="underline" icon={UnderlineIcon} title={tRt('underline')} formatKey="underline" />
        <FormatButton command="strikeThrough" icon={StrikethroughIcon} title={tRt('strikethrough')} formatKey="strikethrough" />
        
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <FormatButton command="insertUnorderedList" icon={ListBulletIcon} title={tRt('bulletList')} formatKey="ul" />
        <FormatButton command="insertOrderedList" icon={QueueListIcon} title={tRt('numberedList')} formatKey="ol" />
        
        <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />
        
        <button
          type="button"
          onClick={() => setShowLinkInput(true)}
          disabled={disabled}
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          title={tRt('insertLink')}
        >
          <LinkIcon className="w-4 h-4" />
        </button>
        
        <button
          type="button"
          onClick={handleInsertCode}
          disabled={disabled}
          className="p-1.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
          title={tRt('code')}
        >
          <CodeBracketIcon className="w-4 h-4" />
        </button>
        
        {/* Link input popup */}
        {showLinkInput && (
          <div className="absolute mt-10 ml-32 z-10 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-2 flex gap-2">
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-slate-700 dark:text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
              autoFocus
            />
            <button
              onClick={handleInsertLink}
              className="px-2 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              OK
            </button>
            <button
              onClick={() => { setShowLinkInput(false); setLinkUrl(''); }}
              className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}
      </div>
      
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onSelect={updateActiveFormats}
        onClick={updateActiveFormats}
        data-placeholder={placeholder}
        className={`
          px-4 py-3 outline-none overflow-y-auto
          prose prose-sm dark:prose-invert max-w-none
          prose-p:my-1 prose-ul:my-1 prose-ol:my-1
          prose-li:my-0.5
          prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline
          prose-code:bg-gray-100 dark:prose-code:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ minHeight }}
      />
    </div>
  );
}
