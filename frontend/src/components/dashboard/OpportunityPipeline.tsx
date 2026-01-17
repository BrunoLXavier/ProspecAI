// Opportunity Pipeline Kanban Component
// Implements RF-05: Pipeline de Oportunidades visualization
// Firjan SENAI Brand Identity with modern flat design
'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
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

  return (
    <Card padding="lg" hover="subtle">
      <CardHeader 
        title={t('title')}
        className="mb-6"
      />

      <div className="flex space-x-4 overflow-x-auto pb-4 -mx-2 px-2">
        {STAGES.map((stage) => {
          const stageOpps = getStageOpportunities(stage.key);

          return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-56 bg-gray-50 dark:bg-slate-900/50 rounded-xl p-3"
            >
              {/* Stage Header */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stage.color}`} />
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {t(`stages.${stage.key}`)}
                </h3>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full shadow-sm">
                  {stageOpps.length}
                </span>
              </div>

              {/* Opportunities */}
              <div className="space-y-2">
                {stageOpps.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500">
                    Nenhuma oportunidade
                  </div>
                ) : (
                  stageOpps.map((opp: any) => (
                    <Link
                      key={opp.id}
                      href={`/opportunities?id=${opp.id}`}
                      className="block p-3 bg-white dark:bg-slate-800 rounded-lg shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer group"
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
