// PII Review Modal
// Human-in-the-loop review for PII detection and anonymization
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import {
  ShieldExclamationIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  PIIDetection,
  RISK_COLORS,
  PII_TYPE_LABELS,
  ANONYMIZATION_STRATEGIES,
} from './types';

interface PIIReviewModalProps {
  detection: PIIDetection;
  reviewNotes: string;
  selectedStrategy: string;
  isProcessing: boolean;
  onClose: () => void;
  onNotesChange: (notes: string) => void;
  onStrategyChange: (strategy: string) => void;
  onApprove: (detection: PIIDetection) => void;
  onReject: (detection: PIIDetection) => void;
  onAnonymize: (detection: PIIDetection) => void;
}

export default function PIIReviewModal({
  detection,
  reviewNotes,
  selectedStrategy,
  isProcessing,
  onClose,
  onNotesChange,
  onStrategyChange,
  onApprove,
  onReject,
  onAnonymize,
}: PIIReviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <ShieldExclamationIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Revisar Detecção PII
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {detection.id}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Risk Level */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Nível de Risco:</span>
            <span className={`px-3 py-1 text-sm rounded-full ${RISK_COLORS[detection.risk_level].bg} ${RISK_COLORS[detection.risk_level].text}`}>
              {detection.risk_level.toUpperCase()}
            </span>
          </div>
          
          {/* Entities */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Entidades Detectadas ({detection.entities.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {detection.entities.map((entity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <div>
                    <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded mr-2">
                      {PII_TYPE_LABELS[entity.type] || entity.type}
                    </span>
                    <span className="text-gray-900 dark:text-white font-mono text-sm">
                      {entity.value.slice(0, 30)}{entity.value.length > 30 ? '...' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.round(entity.confidence * 100)}% conf.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Anonymization Strategy */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Estratégia de Anonimização
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {ANONYMIZATION_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.id}
                  className="p-3 border rounded-lg text-left"
                  onClick={() => onStrategyChange(strategy.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{strategy.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{strategy.description}</div>
                    </div>
                    <div className="text-primary-600">{selectedStrategy === strategy.id ? '✓' : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
