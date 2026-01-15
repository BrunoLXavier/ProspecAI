/**
 * Opportunities Widget
 * Displays a summary of recent opportunities
 * Implements RF-05: Pipeline de Oportunidades
 */
'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface Opportunity {
  id: string;
  title: string;
  client_name: string;
  stage: string;
  value: number;
  probability: number;
  created_at: string;
}

interface OpportunitiesData {
  opportunities: Opportunity[];
  total: number;
  total_value: number;
  avg_probability: number;
}

const stageColors: Record<string, string> = {
  intelligence: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  qualification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  proposal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const stageLabels: Record<string, string> = {
  intelligence: 'Inteligência',
  qualification: 'Qualificação',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

export default function OpportunitiesWidget() {
  const t = useTranslations('opportunities');
  const [data, setData] = useState<OpportunitiesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Use apiClient helper which already targets `/api/v1/opportunities`
        const response = await apiClient.listOpportunities({ skip: 0, limit: 5 });

        // `listOpportunities` may return either an array or an object { data, total }
        const opportunities = Array.isArray(response) ? response : (response.data || response.opportunities || []);
        const total = response.total || (Array.isArray(response) ? response.length : opportunities.length);
        const total_value = opportunities.reduce((sum: number, o: Opportunity) => sum + (o.value || 0), 0);
        const avg_probability = opportunities.length > 0 
          ? opportunities.reduce((sum: number, o: Opportunity) => sum + (o.probability || 0), 0) / opportunities.length 
          : 0;

        setData({
          opportunities,
          total,
          total_value,
          avg_probability,
        });
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
        setError('Erro ao carregar oportunidades');
        // Set mock data for demo
        setData({
          opportunities: [
            { id: '1', title: 'Projeto IoT Industrial', client_name: 'TechCorp', stage: 'proposal', value: 150000, probability: 75, created_at: new Date().toISOString() },
            { id: '2', title: 'Sistema de Automação', client_name: 'AutoMax', stage: 'qualification', value: 85000, probability: 50, created_at: new Date().toISOString() },
            { id: '3', title: 'Plataforma IA', client_name: 'DataSoft', stage: 'negotiation', value: 220000, probability: 80, created_at: new Date().toISOString() },
          ],
          total: 15,
          total_value: 455000,
          avg_probability: 68,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6 animate-pulse" data-testid="opportunities-widget">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6" data-testid="opportunities-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-firjan-red" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Oportunidades Recentes
          </h3>
        </div>
        <Link
          href="/opportunities"
          className="text-sm text-firjan-red hover:text-firjan-red/80 font-medium flex items-center gap-1"
        >
          <EyeIcon className="w-4 h-4" />
          Ver todas
        </Link>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.total || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(data?.total_value || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Valor Total</p>
        </div>
        <div className="flex items-center gap-1">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(data?.avg_probability || 0).toFixed(0)}%
          </p>
          {(data?.avg_probability || 0) >= 50 ? (
            <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
          ) : (
            <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 ml-1">Prob. Média</p>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-3">
        {data?.opportunities.map((opp) => (
          <Link
            key={opp.id}
            href={`/opportunities?id=${opp.id}`}
            className="block p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {opp.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {opp.client_name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${stageColors[opp.stage] || stageColors.intelligence}`}>
                  {stageLabels[opp.stage] || opp.stage}
                </span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatCurrency(opp.value)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
          ⚠️ Usando dados de demonstração
        </p>
      )}
    </div>
  );
}
