/**
 * VersionHistoryPanel Component
 * Displays Git-like version history for proposals with commit messages
 * Implements RF-08.05: Versionamento de propostas
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  ClockIcon,
  DocumentDuplicateIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

interface ProposalVersion {
  id: string;
  version_number: number;
  commit_message: string;
  content_snapshot?: Record<string, any>;
  created_at: string;
  created_by?: string;
  author_name?: string;
}

interface VersionHistoryPanelProps {
  proposalId: string;
  currentVersion: number;
  onVersionSelect?: (version: ProposalVersion) => void;
}

export default function VersionHistoryPanel({
  proposalId,
  currentVersion,
  onVersionSelect,
}: VersionHistoryPanelProps) {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [diffResult, setDiffResult] = useState<any>(null);

  // Fetch version history
  const { data: versions = [], isLoading, error } = useQuery({
    queryKey: ['proposal-versions', proposalId],
    queryFn: () => apiClient.listProposalVersions(proposalId),
    enabled: !!proposalId,
  });

  // Create new version mutation
  const createVersionMutation = useMutation({
    mutationFn: (data: { commit_message: string }) =>
      apiClient.createProposalVersion(proposalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposal-versions', proposalId] });
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      setShowCreateModal(false);
      setCommitMessage('');
    },
  });

  // Diff versions query
  const fetchDiff = async () => {
    if (selectedForCompare.length !== 2) return;
    const [vA, vB] = selectedForCompare.sort((a, b) => a - b);
    const diff = await apiClient.diffProposalVersions(proposalId, vA, vB);
    setDiffResult(diff);
    setShowDiff(true);
  };

  const handleCreateVersion = () => {
    if (!commitMessage.trim()) return;
    createVersionMutation.mutate({ commit_message: commitMessage });
  };

  const toggleCompareSelection = (versionNumber: number) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(versionNumber)) {
        return prev.filter((v) => v !== versionNumber);
      }
      if (prev.length >= 2) {
        return [prev[1], versionNumber];
      }
      return [...prev, versionNumber];
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {t('versionLoadError') || 'Erro ao carregar histórico de versões'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Create Version Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {t('versionHistory') || 'Histórico de Versões'}
          </h3>
          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-700 rounded-full">
            {versions.length} {versions.length === 1 ? 'versão' : 'versões'}
          </span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
        >
          <PlusIcon className="w-4 h-4" />
          {t('createVersion') || 'Nova Versão'}
        </button>
      </div>

      {/* Compare Actions */}
      {selectedForCompare.length === 2 && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <ArrowsRightLeftIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            {t('comparingVersions') || 'Comparando'} v{selectedForCompare[0]} ↔ v{selectedForCompare[1]}
          </span>
          <button
            onClick={fetchDiff}
            className="ml-auto px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70"
          >
            {t('viewDiff') || 'Ver Diferenças'}
          </button>
          <button
            onClick={() => setSelectedForCompare([])}
            className="p-1 text-blue-500 hover:text-blue-700"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Version List */}
      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <DocumentDuplicateIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{t('noVersions') || 'Nenhuma versão registrada ainda.'}</p>
            <p className="text-sm mt-1">
              {t('createFirstVersion') || 'Crie a primeira versão para rastrear alterações.'}
            </p>
          </div>
        ) : (
          versions.map((version: ProposalVersion, index: number) => (
            <div
              key={version.id}
              className={`relative p-4 rounded-lg border transition cursor-pointer ${
                version.version_number === currentVersion
                  ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-700'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              } ${selectedForCompare.includes(version.version_number) ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => onVersionSelect?.(version)}
            >
              {/* Version Timeline Indicator */}
              {index < versions.length - 1 && (
                <div className="absolute left-6 top-full w-0.5 h-2 bg-gray-200 dark:bg-gray-700"></div>
              )}

              <div className="flex items-start gap-3">
                {/* Compare Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCompareSelection(version.version_number);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                    selectedForCompare.includes(version.version_number)
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                  title={t('selectForCompare') || 'Selecionar para comparar'}
                >
                  {selectedForCompare.includes(version.version_number) && (
                    <CheckCircleIcon className="w-3 h-3" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                      v{version.version_number}
                    </span>
                    {version.version_number === currentVersion && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                        {t('current') || 'Atual'}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(version.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 dark:text-white font-medium truncate">
                    {version.commit_message || t('noCommitMessage') || 'Sem mensagem de commit'}
                  </p>
                  
                  {version.author_name && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('by') || 'Por'}: {version.author_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Version Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('createNewVersion') || 'Criar Nova Versão'}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('commitMessage') || 'Mensagem de Commit'} *
              </label>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={t('commitMessagePlaceholder') || 'Descreva as alterações realizadas...'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('commitMessageHint') || 'Uma boa mensagem descreve claramente o que foi alterado.'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCommitMessage('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                {tCommon('cancel') || 'Cancelar'}
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!commitMessage.trim() || createVersionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createVersionMutation.isPending
                  ? (tCommon('saving') || 'Salvando...')
                  : (t('saveVersion') || 'Salvar Versão')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diff Modal */}
      {showDiff && diffResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('versionDiff') || 'Diferenças entre Versões'}
              </h3>
              <button
                onClick={() => {
                  setShowDiff(false);
                  setDiffResult(null);
                }}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {diffResult.changes?.length > 0 ? (
                diffResult.changes.map((change: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      change.type === 'added'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : change.type === 'removed'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        change.type === 'added' ? 'text-green-700 dark:text-green-300'
                          : change.type === 'removed' ? 'text-red-700 dark:text-red-300'
                          : 'text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {change.type === 'added' ? '+ Adicionado' : change.type === 'removed' ? '- Removido' : '~ Modificado'}
                      </span>
                      <span className="text-xs text-gray-500">{change.field}</span>
                    </div>
                    {change.old_value && (
                      <p className="text-sm text-red-600 dark:text-red-400 line-through">
                        {String(change.old_value)}
                      </p>
                    )}
                    {change.new_value && (
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {String(change.new_value)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">
                  {t('noDifferences') || 'Nenhuma diferença encontrada.'}
                </p>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setShowDiff(false);
                  setDiffResult(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
              >
                {tCommon('close') || 'Fechar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
