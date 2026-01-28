/**
 * FileUpload Component
 * Implements RF-09: File uploads with MinIO
 */
'use client';

import { useState, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';

// =============================================================================
// Types
// =============================================================================

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  url?: string;
  objectName?: string;
  error?: string;
}

interface FileUploadProps {
  bucket: 'proposals' | 'documents' | 'reports' | 'attachments';
  prefix?: string;
  maxFiles?: number;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
  onUploadComplete?: (files: UploadedFile[]) => void;
  className?: string;
}

// =============================================================================
// FileUpload Component
// =============================================================================

export default function FileUpload({
  bucket,
  prefix = '',
  maxFiles = 10,
  maxSize = 50,
  acceptedTypes,
  onUploadComplete,
  className = '',
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > maxSize * 1024 * 1024) {
      return `Arquivo muito grande. Máximo: ${maxSize}MB`;
    }
    if (acceptedTypes && !acceptedTypes.includes(file.type)) {
      return `Tipo de arquivo não aceito`;
    }
    return null;
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/v1/files/upload/${bucket}?prefix=${prefix}`,
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('prospecai_access_token')}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      return response.json();
    },
  });

  // Process files for upload
  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];

    for (const file of Array.from(fileList)) {
      if (files.length + newFiles.length >= maxFiles) break;

      const error = validateFile(file);
      newFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
        status: error ? 'error' : 'pending',
        progress: 0,
        error: error ?? undefined,
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file
    for (let i = 0; i < newFiles.length; i++) {
      const uploadFile = newFiles[i];
      if (uploadFile.status === 'error') continue;

      const fileIndex = files.length + i;
      const originalFile = Array.from(fileList)[i];

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === fileIndex ? { ...f, status: 'uploading', progress: 50 } : f
        )
      );

      try {
        const result = await uploadMutation.mutateAsync(originalFile);

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? {
                  ...f,
                  status: 'success',
                  progress: 100,
                  url: result.url,
                  objectName: result.object_name,
                }
              : f
          )
        );
      } catch (error: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex
              ? { ...f, status: 'error', error: error.message }
              : f
          )
        );
      }
    }

    // Notify parent
    if (onUploadComplete) {
      const updatedFiles = [...files, ...newFiles];
      onUploadComplete(updatedFiles.filter((f) => f.status === 'success'));
    }
  }, [files, maxFiles, uploadMutation, onUploadComplete]);

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Handle file input change
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
  };

  // Remove file from list
  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Get accept string for input
  const acceptString = acceptedTypes?.join(',');

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
        `}
      >
        <CloudArrowUpIcon className="h-12 w-12 mx-auto text-gray-400" />
        <p className="mt-2 text-gray-600">
          Arraste arquivos aqui ou <span className="text-blue-600">clique para selecionar</span>
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Máximo {maxFiles} arquivos, até {maxSize}MB cada
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptString}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              {/* Icon */}
              <div className="p-2 bg-white rounded-lg">
                <DocumentIcon className="h-5 w-5 text-gray-400" />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>

                {/* Progress bar */}
                {file.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Error message */}
                {file.error && (
                  <p className="text-xs text-red-500 mt-1">{file.error}</p>
                )}
              </div>

              {/* Status icon */}
              {file.status === 'success' && (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              )}
              {file.status === 'error' && (
                <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              )}
              {file.status === 'uploading' && (
                <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              )}

              {/* Remove button */}
              <button
                onClick={() => removeFile(index)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// File List Component (for displaying uploaded files)
// =============================================================================

interface FileListProps {
  files: { name: string; url: string; size?: number }[];
  onRemove?: (index: number) => void;
  showDownload?: boolean;
}

export function FileList({ files, onRemove, showDownload = true }: FileListProps) {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!files.length) return null;

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
        >
          <DocumentIcon className="h-5 w-5 text-gray-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
            {file.size && <p className="text-xs text-gray-400">{formatSize(file.size)}</p>}
          </div>
          {showDownload && file.url && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              Download
            </a>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(index)}
              className="p-1 text-gray-400 hover:text-red-500"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
