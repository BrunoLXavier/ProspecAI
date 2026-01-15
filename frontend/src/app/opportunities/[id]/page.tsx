// Opportunities Detail Page
// Implements RF-05: Visualização detalhada de oportunidades
'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import {
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import ConfidenceBadge from '@/components/common/ConfidenceBadge';

const PIPELINE_STAGES = [
  'intelligence',
  'validation',
  'approach',
  'registration',
  'conversion',
  'post_sale',
];

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const t = useTranslations('opportunities');
  const queryClient = useQueryClient();
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState('');

  const { data: opportunity, isLoading } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => apiClient.getOpportunity(id as string),
    enabled: !!id
  });

  const transitionMutation = useMutation({
    mutationFn: (data: { new_stage: string; notes?: string }) =>
      apiClient.transitionStage(id as string, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] });
      setShowTransitionModal(false);
    },
  });

  const handleTransition = () => {
    if (selectedStage) {
      transitionMutation.mutate({
        new_stage: selectedStage,
        notes: 'Transição manual via interface',
      });
    }
  };

  const getCurrentStageIndex = () => {
    return PIPELINE_STAGES.indexOf(opportunity?.current_stage || '');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">{t('notFound')}</div>
      </div>
    );
  }

  const currentIndex = getCurrentStageIndex();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {opportunity.title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{opportunity.description}</p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            <PencilIcon className="w-5 h-5 mr-2" />
            {t('edit')}
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50">
            <TrashIcon className="w-5 h-5 mr-2" />
            {t('delete')}
          </button>
        </div>
      </div>

      {/* Pipeline Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          {t('pipelineProgress')}
        </h2>
        <div className="relative">
          <div className="flex items-center justify-between">
            {PIPELINE_STAGES.map((stage, index) => (
              <div key={stage} className="flex flex-col items-center flex-1">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold
                    ${
                      index <= currentIndex
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {index + 1}
                </div>
                <p
                  className={`
                    mt-2 text-sm text-center
                    ${index <= currentIndex ? 'text-gray-900 font-medium' : 'text-gray-500'}
                  `}
                >
                  {t(`stages.${stage}`)}
                </p>
                {index < PIPELINE_STAGES.length - 1 && (
                  <div
                    className={`
                      absolute top-6 h-1 bg-gray-300
                      ${index < currentIndex ? 'bg-primary-600' : ''}
                    `}
                    style={{
                      left: `${((index + 1) / PIPELINE_STAGES.length) * 100}%`,
                      width: `${(1 / PIPELINE_STAGES.length) * 100}%`,
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setShowTransitionModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ArrowRightIcon className="w-5 h-5 mr-2" />
            {t('transitionStage')}
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('basicInfo')}
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">{t('estimatedValue')}</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(opportunity.estimated_value)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t('probability')}</dt>
              <dd className="text-lg font-semibold text-gray-900">
                {(opportunity.probability * 100).toFixed(0)}%
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">{t('priorityScore')}</dt>
              <dd className="flex items-center space-x-2">
                <span className="text-lg font-semibold text-gray-900">
                  {opportunity.priority_score.toFixed(1)}
                </span>
                <ConfidenceBadge score={opportunity.priority_score / 100} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Priority Factors */}
        {opportunity.priority_factors && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('priorityFactors')}
            </h3>
            <div className="space-y-3">
              {Object.entries(opportunity.priority_factors).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{t(`factors.${key}`)}</span>
                    <span className="font-semibold">{(value as number).toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transition Modal */}
      {showTransitionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('selectNewStage')}
            </h3>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 mb-4"
            >
              <option value="">{t('selectStage')}</option>
              {PIPELINE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {t(`stages.${stage}`)}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleTransition}
                disabled={!selectedStage || transitionMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
