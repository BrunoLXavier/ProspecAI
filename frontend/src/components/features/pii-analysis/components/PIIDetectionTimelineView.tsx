// PII Detection Timeline View
// Implements RF-01: LGPD Agent with manual approval workflow
'use client';

import {
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import {
  PIIDetection,
  RISK_COLORS,
  STATUS_CONFIG,
  PII_TYPE_LABELS,
} from './types';

interface PIIDetectionTimelineViewProps {
  detections: PIIDetection[];
  onReview: (detection: PIIDetection) => void;
}

export default function PIIDetectionTimelineView({
  detections,
  onReview,
}: PIIDetectionTimelineViewProps) {
  const statusToTimelineStatus: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'pending'> = {
    pending_review: 'pending',
    approved: 'info',
    rejected: 'error',
    anonymized: 'success',
    anonymization_failed: 'error',
  };

  const items: TimelineItem[] = detections.map((detection) => {
    const riskColor = RISK_COLORS[detection.risk_level];
    const statusConfig = STATUS_CONFIG[detection.anonymization_status];

    return {
      id: detection.id,
      title: `${detection.entities.length} entidades PII detectadas`,
      description: (
        <div className="space-y-2">
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
          <p className="text-xs">Origem: {detection.source_type}</p>
        </div>
      ),
      date: detection.created_at,
      status: statusToTimelineStatus[detection.anonymization_status] || 'default',
      icon: <ShieldExclamationIcon className="w-4 h-4" />,
      tags: [
        { label: detection.risk_level.toUpperCase(), color: `${riskColor.bg} ${riskColor.text}` },
        { label: statusConfig.label, color: `bg-${statusConfig.color}-100 dark:bg-${statusConfig.color}-900/30 text-${statusConfig.color}-700 dark:text-${statusConfig.color}-300` },
      ],
      onClick: () => onReview(detection),
    };
  });

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
      <TimelineView
        items={items}
        size="md"
        showConnectors={true}
        animated={true}
        emptyMessage="Nenhuma detecção encontrada"
      />
    </div>
  );
}
