/**
 * Matching Score Widget
 * Displays top matching scores between opportunities and funding sources
 * Implements RF-06: Algoritmo de Matching
 */
'use client';

import { useState, useEffect } from 'react';
// translations for this widget are not used; avoid requiring a missing namespace
import { useRouter } from 'next/navigation';
import {
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api-client';

interface MatchResult {
  id: string;
  opportunity_title: string;
  funding_source_title: string;
  score: number;
  viability_technical: number;
  viability_financial: number;
  viability_strategic: number;
  created_at: string;
}

interface MatchingData {
  matches: MatchResult[];
  total: number;
  avg_score: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreBadge(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300' };
  if (score >= 60) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300' };
  return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300' };
}

export default function MatchingScoreWidget() {
  const router = useRouter();
  const [data, setData] = useState<MatchingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Use the executeMatching endpoint (POST) which is implemented by the backend
        const resp = await apiClient.executeMatching({ max_results: 5 });

        // Normalize multiple possible response shapes
        let suggestions: any[] = [];
        let total = 0;

        if (Array.isArray(resp)) {
          suggestions = resp;
          total = resp.length;
        } else if (resp && Array.isArray(resp.data)) {
          suggestions = resp.data;
          total = resp.total || resp.data.length;
        } else if (resp && Array.isArray(resp.matches)) {
          suggestions = resp.matches;
          total = resp.total || resp.matches.length;
        }

        // Map external suggestion shape to internal MatchResult shape
        const matches: MatchResult[] = suggestions.map((s: any, idx: number) => ({
          id: s.projectId || s.id || String(idx + 1),
          opportunity_title: s.projectName || s.opportunity_title || s.title || '',
          funding_source_title: s.fundingSourceName || s.funding_source_title || '',
          score: typeof s.overallScore === 'number' ? Math.round(s.overallScore * 100) : (s.score || 0),
          viability_technical: s.technicalViabilityScore ? Math.round(s.technicalViabilityScore * 100) : (s.viability_technical || 0),
          viability_financial: s.financialViabilityScore ? Math.round(s.financialViabilityScore * 100) : (s.viability_financial || 0),
          viability_strategic: s.strategicAlignmentScore ? Math.round(s.strategicAlignmentScore * 100) : (s.viability_strategic || 0),
          created_at: s.created_at || new Date().toISOString(),
        }));

        const avg_score = matches.length > 0 ? Math.round(matches.reduce((sum, m) => sum + m.score, 0) / matches.length) : 0;

        setData({ matches, total, avg_score });
      } catch (err) {
        console.error('Failed to fetch matching results:', err);
        setError('Erro ao carregar resultados de matching');
        // No demo fallback: show empty results on error
        setData({ matches: [], total: 0, avg_score: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse" data-testid="matching-widget">
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
    <div className="card p-6" data-testid="matching-widget">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-gray-900 dark:text-white" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Top Matchings
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xl font-bold ${getScoreColor(data?.avg_score || 0)}`}>
            {(data?.avg_score || 0).toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">média</span>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {data?.matches.map((match) => {
          const badge = getScoreBadge(match.score);
          return (
            <button
              key={match.id}
              onClick={() => router.push(`/opportunities?id=${match.id}`, { scroll: false })}
              className="w-full text-left block p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${getScoreColor(match.score)}`}>
                  {match.score}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                  {match.score >= 80 ? 'Alta Aderência' : match.score >= 60 ? 'Média Aderência' : 'Baixa Aderência'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                  {match.opportunity_title}
                </span>
                <ArrowRightIcon className="w-4 h-4 text-gray-400 dark:text-gray-300 flex-shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 truncate flex-1">
                  {match.funding_source_title}
                </span>
              </div>

              {/* Viability Bars */}
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Técnica</span>
                    <span>{match.viability_technical}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 dark:bg-blue-400 rounded-full" 
                      style={{ width: `${match.viability_technical}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Financeira</span>
                    <span>{match.viability_financial}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 dark:bg-green-400 rounded-full" 
                      style={{ width: `${match.viability_financial}%` }} 
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Estratégica</span>
                    <span>{match.viability_strategic}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 dark:bg-purple-400 rounded-full" 
                      style={{ width: `${match.viability_strategic}%` }} 
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {data?.total || 0} matchings encontrados
        </span>
        {error && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
