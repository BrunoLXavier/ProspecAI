/**
 * MeetingMinutesCard Component
 * 
 * Displays meeting minutes inline in the message flow
 * with status badge and formatted content
 * 
 * Implements RF-08: Communications and collaboration
 */
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface MeetingMinutes {
  id: string;
  title?: string;
  content?: string;
  status: string;
  generated_at?: string;
  created_at: string;
}

interface Props {
  minutes: MeetingMinutes;
}

export default function MeetingMinutesCard({ minutes }: Props) {
  const t = useTranslations('communications');

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return {
          icon: CheckCircleIcon,
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
          iconColor: 'text-green-500',
        };
      case 'processing':
      case 'pending':
        return {
          icon: ClockIcon,
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
          iconColor: 'text-blue-500',
        };
      case 'failed':
      case 'rejected':
        return {
          icon: ExclamationCircleIcon,
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
          iconColor: 'text-red-500',
        };
      default:
        return {
          icon: DocumentTextIcon,
          bg: 'bg-purple-50 dark:bg-purple-900/20',
          border: 'border-purple-200 dark:border-purple-800',
          badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400',
          iconColor: 'text-purple-500',
        };
    }
  };

  const config = getStatusConfig(minutes.status);
  const StatusIcon = config.icon;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`mb-4 mx-auto max-w-[90%] rounded-xl border ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <DocumentTextIcon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">
              {t('meetingMinutes') || 'Ata de Reunião'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {minutes.title || t('untitled')}
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${config.badge}`}>
          {minutes.status}
        </span>
      </div>

      {/* Content */}
      {minutes.content && (
        <div className="px-4 py-3">
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {minutes.content}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-white/50 dark:bg-slate-800/50 border-t border-inherit">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {formatDate(minutes.created_at)}
        </p>
      </div>
    </div>
  );
}
