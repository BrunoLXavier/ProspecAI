// Opportunity Pipeline Kanban Component
// Implements RF-05: Pipeline de Oportunidades visualization
// Firjan SENAI Brand Identity with modern flat design
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Card, CardHeader } from '@/components/ui/Card';
import { ConfidenceBadge } from '@/components/ui/Badge';
import apiClient from '@/lib/api-client';

const STAGES = [
  { key: 'intelligence', color: 'from-blue-500 to-blue-600' },
  { key: 'validation', color: 'from-amber-500 to-amber-600' },
  { key: 'approach', color: 'from-purple-500 to-purple-600' },
  { key: 'registration', color: 'from-cyan-500 to-cyan-600' },
  { key: 'conversion', color: 'from-green-500 to-green-600' },
  { key: 'post_sale', color: 'from-gray-500 to-gray-600' },
];

interface Opportunity {
  id: string;
  title: string;
  stage: string;
  priorityScore: number;
  estimatedValue: number;
}

export default function OpportunityPipeline() {
  const t = useTranslations('pipeline');

  // Fetch real pipeline data + sample items per stage
  const { data: pipelineData = { stages: [], stageItems: [] }, isLoading } = useQuery<{ stages: any[]; stageItems: any[] }>({
    queryKey: ['pipeline-stats'],
    queryFn: async () => {
      // Get aggregated counts per stage
      const stages = await apiClient.getPipelineStats();

      // For each stage, fetch up to 3 opportunities to display
      const stageItemsPromises = (stages || []).map(async (s: any) => {
        const items = await apiClient.listOpportunities({ stage: s.stage, skip: 0, limit: 3 });
        return { stage: s.stage, items: Array.isArray(items) ? items : (items.data || []) };
      });

      const stageItems = await Promise.all(stageItemsPromises);

      return { stages, stageItems };
    }
  });

  const getStageOpportunities = (stage: string) =>
    (pipelineData.stageItems || []).find((s: any) => s.stage === stage)?.items || [];

  const [openStage, setOpenStage] = useState<string | null>(null);

  return (
    <Card padding="lg" hover="subtle">
      <CardHeader 
        title={t('title')}
        className="mb-6"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
        {STAGES.map((stage) => {
          const stageOpps = getStageOpportunities(stage.key);

          return (
            <div key={stage.key} className="w-full bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3">
              {/* Stage Header (clickable on small screens to toggle) */}
              <button
                type="button"
                onClick={() => setOpenStage(prev => (prev === stage.key ? null : stage.key))}
                aria-expanded={openStage === stage.key}
                className="w-full flex items-center gap-2 mb-4 focus:outline-none"
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stage.color}`} />
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex-1 text-left">
                  {t(`stages.${stage.key}`)}
                </h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm">
                  {stageOpps.length}
                </span>
                <ChevronDownIcon className={`w-4 h-4 ml-2 text-gray-400 transform transition-transform duration-200 ${openStage === stage.key ? 'rotate-180' : ''} md:hidden`} />
              </button>

              {/* Opportunities: hidden on small screens when collapsed, always visible on md+ */}
              <div className={`${openStage === stage.key ? 'block' : 'hidden'} md:block space-y-2`}>
                {stageOpps.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                    Nenhuma oportunidade
                  </div>
                ) : (
                  stageOpps.map((opp: any) => (
                    <Link
                      key={opp.id}
                      href={`/opportunities?id=${opp.id}`}
                      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group w-full"
                    >
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2 group-hover:text-primary-500 transition-colors">
                        {opp.title}
                      </h4>
                      <div className="flex items-center justify-between">
                        <ConfidenceBadge score={opp.priorityScore} size="xs" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            notation: 'compact',
                          }).format(opp.estimatedValue)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
