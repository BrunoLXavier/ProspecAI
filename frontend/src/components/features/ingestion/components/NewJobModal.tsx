// New ingestion job creation modal
// Implements RF-01: Ingestão de dados multiorigem
'use client';

import React, { useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  CloudArrowUpIcon,
  TableCellsIcon,
  ArrowPathIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { UploadingFile, formatBytes } from './types';

interface NewJobModalProps {
  jobName: string;
  onJobNameChange: (value: string) => void;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  uploadingFiles: UploadingFile[];
  isDragging: boolean;
  isCreatingJob: boolean;
  error: string | null;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onCreateJob: () => Promise<void>;
  onClose: () => void;
}

export default function NewJobModal({
  jobName,
  onJobNameChange,
  jobDescription,
  onJobDescriptionChange,
  uploadingFiles,
  isDragging,
  isCreatingJob,
  error,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  onRemoveFile,
  onCreateJob,
  onClose,
}: NewJobModalProps) {
  const t = useTranslations('ingestion');
  const tCommon = useTranslations('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Novo Job de Ingestão
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Job Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nome do Job *
            </label>
            <input
              type="text"
              value={jobName}
              onChange={(e) => onJobNameChange(e.target.value)}
              placeholder=""
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => onJobDescriptionChange(e.target.value)}
              placeholder=""
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <CloudArrowUpIcon className={`w-12 h-12 mx-auto mb-4 ${
              isDragging ? 'text-primary-500' : 'text-gray-400'
            }`} />
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Arraste arquivos aqui ou
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              selecione do computador
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.json"
              onChange={onFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              CSV, XLSX, JSON (máx. 50MB cada)
            </p>
          </div>

          {/* Selected Files */}
          {uploadingFiles.length > 0 && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Arquivos Selecionados ({uploadingFiles.length})
              </label>
              {uploadingFiles.map((uf, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <TableCellsIcon className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {uf.file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatBytes(uf.file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveFile(index)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <XCircleIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            {tCommon('cancel') || 'Cancelar'}
          </button>
          <button
            onClick={async () => {
              await onCreateJob();
            }}
            disabled={!jobName || uploadingFiles.length === 0 || isCreatingJob}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreatingJob ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                {t('creating') || 'Criando...'}
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-5 h-5" />
                {t('createJob') || 'Criar Job'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
