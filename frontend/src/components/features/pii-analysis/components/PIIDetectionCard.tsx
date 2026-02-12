// PII Detection Card - List view item
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import { useTranslations } from 'next-intl';
import {
  ShieldExclamationIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  PIIDetection,
  RISK_COLORS,
  STATUS_CONFIG,
  PII_TYPE_LABELS,
  formatDate,
} from './types';

interface PIIDetectionCardProps {
  detection: PIIDetection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onClick: (detection: PIIDetection) => void;
}

export default function PIIDetectionCard({
  detection,
  isSelected,
  onSelect,
  onClick,
}: PIIDetectionCardProps) {
  const t = useTranslations('pii');
  const riskColor = RISK_COLORS[detection.risk_level];
  const statusConfig = STATUS_CONFIG[detection.anonymization_status];

  return (
    <div
      onClick={() => onClick(detection)}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-4 cursor-pointer hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
    >
      {/* Header with risk badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${riskColor.bg}`}>
            <ShieldExclamationIcon className={`w-5 h-5 ${riskColor.text}`} />
          </div>
          <div>
            <span className={`px-2 py-0.5 text-xs rounded-full ${riskColor.bg} ${riskColor.text}`}>
              {detection.risk_level.toUpperCase()}
            </span>
          </div>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Entity badges */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('entitiesDetected', { count: detection.entities.length })}
        </p>
        <div className="flex flex-wrap gap-1">
          {detection.entities.slice(0, 4).map((entity, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            >
              {PII_TYPE_LABELS[entity.type] || entity.type}
            </span>
          ))}
          {detection.entities.length > 4 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{detection.entities.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Footer with source and date */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <DocumentTextIcon className="w-3.5 h-3.5" />
          <span>{detection.source_type}</span>
        </div>
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>{formatDate(detection.created_at)}</span>
        </div>
      </div>

      {/* Selection checkbox */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <label className="flex items-center gap-2 text-sm" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(detection.id)}
            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-gray-500 dark:text-gray-400">{t('select')}</span>
        </label>
      </div>
    </div>
  );
}
