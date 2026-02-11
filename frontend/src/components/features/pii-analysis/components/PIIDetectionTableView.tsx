// PII Detection Table View
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import {
  EyeIcon,
} from '@heroicons/react/24/outline';
import {
  PIIDetection,
  RISK_COLORS,
  STATUS_CONFIG,
  PII_TYPE_LABELS,
  formatDate,
} from './types';

interface PIIDetectionTableViewProps {
  detections: PIIDetection[];
  allDetections: PIIDetection[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: () => void;
  onReview: (detection: PIIDetection) => void;
}

export default function PIIDetectionTableView({
  detections,
  allDetections,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  onReview,
}: PIIDetectionTableViewProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-slate-700">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedIds.size === allDetections.length && allDetections.length > 0}
                onChange={onToggleSelectAll}
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Entidades
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Risco
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Origem
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Data
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {detections.map((detection) => {
            const riskColor = RISK_COLORS[detection.risk_level];
            const statusConfig = STATUS_CONFIG[detection.anonymization_status];
            
            return (
              <tr key={detection.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(detection.id)}
                    onChange={() => onToggleSelection(detection.id)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {detection.entities.slice(0, 3).map((entity, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {PII_TYPE_LABELS[entity.type] || entity.type}
                      </span>
                    ))}
                    {detection.entities.length > 3 && (
                      <span className="px-2 py-0.5 text-xs text-gray-500">
                        +{detection.entities.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${riskColor.bg} ${riskColor.text}`}>
                    {detection.risk_level.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {detection.source_type}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded-full bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300`}>
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(detection.created_at)}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onReview(detection)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
