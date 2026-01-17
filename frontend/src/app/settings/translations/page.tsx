// Translations Management Page
// Admin interface for managing i18n translations
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import FilterPanel, { FilterField } from '@/components/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/ui/ConfigurableStatisticsBar';
import TranslationDetailModal from '@/components/translations/TranslationDetailModal';
import { apiClient } from '@/lib/api-client';

interface TranslationKey {
  key: string;
  path: string;
  values: Record<string, string>;
}

interface TranslationsResponse {
  translations: TranslationKey[];
  total: number;
  namespaces: string[];
  locales: string[];
}

const LOCALE_FLAGS: Record<string, string> = {
  'pt-BR': '🇧🇷',
  'en-US': '🇺🇸',
  'es-ES': '🇪🇸',
};

const LOCALE_NAMES: Record<string, string> = {
  'pt-BR': 'Português',
  'en-US': 'English',
  'es-ES': 'Español',
};

// No inline mock translations; real API is used for translations management.

export default function TranslationsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  
  const [translations, setTranslations] = useState<TranslationKey[]>([]);
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [locales, setLocales] = useState<string[]>(['pt-BR', 'en-US', 'es-ES']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { config } = useLayout();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNamespace, setSelectedNamespace] = useState<string>('');
  
  // Edit state handled in detail modal; inline editing removed
  // Toasts / feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // New key modal
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyPath, setNewKeyPath] = useState('');
  const [newKeyValues, setNewKeyValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // Import preview modal state
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [previewLocale, setPreviewLocale] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'import' | 'export' | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(config?.default_page_size || 20);
  const [total, setTotal] = useState<number>(0);

  // Detail modal
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationKey | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  // Unified import/export menu visibility
  const [showImportExportMenu, setShowImportExportMenu] = useState(false);

  // Load translations
  const loadTranslations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (selectedNamespace) params.append('namespace', selectedNamespace);
      if (searchQuery) params.append('search', searchQuery);
      // Pagination params
      const skip = (page - 1) * pageSize;
      params.append('skip', String(skip));
      params.append('limit', String(pageSize));
      
      const response = await apiClient.get<TranslationsResponse>(
        `/api/v1/translations?${params.toString()}`
      );
      
      const respTranslations = response.translations ?? [];
      const respNamespaces = response.namespaces ?? [];
      const respLocales = response.locales ?? [];

      // If backend provides `total`, trust that the returned `translations` are already paged.
      // Some environments may return the full list ignoring `skip/limit`; handle that gracefully
      if (response.total != null) {
        setTotal(response.total);
        setTranslations(respTranslations);
      } else {
        // Backend didn't provide a total — server might have returned all items.
        if (respTranslations.length > pageSize) {
          setTotal(respTranslations.length);
          const start = (page - 1) * pageSize;
          setTranslations(respTranslations.slice(start, start + pageSize));
        } else {
          setTotal(respTranslations.length);
          setTranslations(respTranslations);
        }
      }

      setNamespaces(respNamespaces);
      // Ensure known locales are present (fallback/merge)
      setLocales(Array.from(new Set([...respLocales, 'pt-BR', 'en-US', 'es-ES'])));
    } catch (err: any) {
      // On failure, do not use mock/demo data. Show empty results and surface error.
      console.error('Failed to load translations:', err);
      setNamespaces([]);
      setLocales(['pt-BR', 'en-US', 'es-ES']);
      setTotal(0);
      setTranslations([]);
      setError(err?.message || 'Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // reset to first page and reload when namespace changed
    setPage(1);
    loadTranslations();
  }, [selectedNamespace]);

  // Ensure current page is within bounds when total or pageSize changes
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil((total || 0) / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [total, pageSize]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadTranslations();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // reload when page or pageSize or layout config changes
  useEffect(() => {
    setPageSize(config?.default_page_size || 20);
  }, [config?.default_page_size]);

  useEffect(() => {
    loadTranslations();
  }, [page, pageSize]);

  // Auto-clear toast messages
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Filtered translations
  const filteredTranslations = useMemo(() => {
    // Ensure we never render more rows than the current page size.
    // Backend may return already-paged results or the full list; handle both cases.
    if (!translations || translations.length === 0) return [];

    // If translations length is <= pageSize, just return as-is.
    if (translations.length <= pageSize) return translations;

    const start = (page - 1) * pageSize;
    return translations.slice(start, start + pageSize);
  }, [translations]);

  const filterFields: FilterField[] = [
    { key: 'search', label: tCommon('search') || 'Search', type: 'text', placeholder: t('translations.searchPlaceholder') || 'Search keys or values...' },
    { key: 'namespace', label: t('translations.namespace') || 'Namespace', type: 'select', options: [{ value: '', label: tCommon('all') || 'All' }, ...namespaces.map(ns => ({ value: ns, label: ns }))] },
  ];

  const maxPage = Math.max(1, Math.ceil((total || 0) / pageSize));

  // Helper to show success toasts
  const showSuccess = (msg: string) => {
    setToastType('success');
    setToastMsg(msg);
  };
  // Delete is handled via the detail modal; inline delete removed

  // Create new translation
  const createTranslation = async () => {
    if (!newKeyPath.trim()) return;
    
    setSaving(true);
    try {
      await apiClient.post('/api/v1/translations', {
        path: newKeyPath,
        values: newKeyValues,
      });

      setShowNewKeyModal(false);
      setNewKeyPath('');
      setNewKeyValues({});
      await loadTranslations();
      showSuccess('Translation created');
    } catch (err: any) {
      setError(err.message || 'Failed to create translation');
      setToastType('error');
      setToastMsg(err.message || 'Failed to create translation');
    } finally {
      setSaving(false);
    }
  };

  // Export locale
  const exportLocale = async (locale: string) => {
    try {
      const data = await apiClient.get(`/api/v1/translations/export/${locale}`);
      // open preview modal in export mode
      setPreviewData(data);
      setPreviewLocale(locale);
      setPreviewMode('export');
      setShowImportPreview(true);
    } catch (err: any) {
      setError(err.message || 'Failed to export locale');
      setToastType('error');
      setToastMsg(err.message || 'Failed to export locale');
    }
  };

  // Import locale
  const importLocale = async (locale: string, file: File) => {
    try {
      const text = await file.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        setError('Invalid JSON file');
        setToastType('error');
        setToastMsg('Invalid JSON file');
        return;
      }

      const isValid = (obj: any): boolean => {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
        return Object.keys(obj).every(k => typeof k === 'string');
      };

      if (!isValid(data)) {
        setError('Locale JSON must be an object with string keys');
        setToastType('error');
        setToastMsg('Locale JSON must be an object with string keys');
        return;
      }

      await apiClient.post(`/api/v1/translations/import/${locale}`, data);
      await loadTranslations();
      setToastType('success');
      setToastMsg(`Locale ${locale} imported`);
    } catch (err: any) {
      setError(err.message || 'Failed to import locale');
      setToastType('error');
      setToastMsg(err.message || 'Failed to import locale');
    }
  };

  // Confirm import from preview modal
  const confirmImport = async () => {
    if (!previewLocale || !previewData) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/v1/translations/import/${previewLocale}`, previewData);
      await loadTranslations();
      setShowImportPreview(false);
      setPreviewLocale(null);
      setPreviewData(null);
      showSuccess(`Locale ${previewLocale} imported`);
    } catch (err: any) {
      setError(err.message || 'Failed to import locale');
      setToastType('error');
      setToastMsg(err.message || 'Failed to import locale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('translations.title') || 'Translations'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('translations.description') || 'Manage internationalization keys for all supported languages'}
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="relative">
            <button
              onClick={() => setShowImportExportMenu(v => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('translations.importExport') || 'Import / Export'}
            </button>

            {showImportExportMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 p-2">
                {locales.map(locale => (
                  <div key={locale} className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{LOCALE_FLAGS[locale]} {LOCALE_NAMES[locale]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { exportLocale(locale); setShowImportExportMenu(false); }} className="px-2 py-1 text-sm border rounded">Export</button>
                      <label className="px-2 py-1 text-sm border rounded cursor-pointer">
                        Import
                        <input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
                          const file = e.target.files ? e.target.files[0] : null;
                          if (!file) return;
                          try {
                            const text = await file.text();
                            const data = JSON.parse(text);
                            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                              setError('Locale JSON must be an object');
                              setToastType('error');
                              setToastMsg('Locale JSON must be an object');
                            } else {
                              setPreviewLocale(locale);
                              setPreviewData(data);
                              setPreviewMode('import');
                              setShowImportPreview(true);
                              setShowImportExportMenu(false);
                            }
                          } catch (err: any) {
                            setError('Invalid JSON file');
                            setToastType('error');
                            setToastMsg('Invalid JSON file');
                          }
                          if (e.target) e.target.value = '';
                        }} />
                      </label>
                    </div>
                  </div>
                ))}
                <div className="mt-2 text-right">
                  <button onClick={() => setShowImportExportMenu(false)} className="px-3 py-1 text-sm text-gray-600">Close</button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowNewKeyModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {t('translations.addNewKey') || 'New Key'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 hover:text-red-800"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed right-6 top-6 z-50 px-4 py-2 rounded-lg ${toastType === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          <div className="flex items-center gap-3">
            <span className="text-sm">{toastMsg}</span>
            <button onClick={() => setToastMsg(null)} className="text-sm opacity-80">✕</button>
          </div>
        </div>
      )}

      {/* Statistics bar */}
      <ConfigurableStatisticsBar module="translations" data={translations} />

      {/* Filters */}
      <FilterPanel
        fields={filterFields}
        values={{ search: searchQuery, namespace: selectedNamespace }}
        onChange={(key, value) => {
          if (key === 'search') setSearchQuery(String(value));
          if (key === 'namespace') setSelectedNamespace(String(value));
        }}
        onReset={() => { setSearchQuery(''); setSelectedNamespace(''); }}
        title={t('translations.filtersTitle') || 'Translations Filters'}
        defaultExpanded={false}
      />

      {/* Translations Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Loading translations...
          </div>
        ) : filteredTranslations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No translations found
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3 min-w-0">
                    {t('translations.keyPath')}
                  </th>
                  {locales.map(locale => (
                    <th key={locale} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-0 max-w-[14rem]">
                      {LOCALE_FLAGS[locale]} {LOCALE_NAMES[locale]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTranslations.map((translation) => (
                  <tr
                    key={translation.path}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedTranslation(translation); setShowDetailModal(true); } }}
                    onClick={() => { setSelectedTranslation(translation); setShowDetailModal(true); }}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-white w-1/3 min-w-0 break-words whitespace-normal">
                      {translation.path}
                    </td>
                    {locales.map(locale => (
                      <td key={locale} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 min-w-0 break-words max-w-[14rem] whitespace-normal">
                        <span className={!translation.values[locale] ? 'text-red-500 italic' : ''}>
                          {translation.values[locale] || tCommon('noResults')}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Summary & Pagination */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('translations.showing')} {(total === 0) ? 0 : ( (page - 1) * pageSize + 1 )} - {Math.min(total, (page * pageSize))} {t('translations.of') || 'of'} {total} {t('translations.translationKeys')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{t('layout.uiPreferences.itemsPerPage') || 'items per page'}</div>
            <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }} className="px-2 py-1 border rounded bg-white dark:bg-slate-700 w-20 text-sm">
              {[10,20,25,50,100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-50">‹</button>
              <span className="px-3 text-sm text-gray-700 dark:text-gray-300">{page} / {maxPage}</span>
              <button onClick={() => setPage(p => Math.min(maxPage, p + 1))} disabled={page >= maxPage} className="px-2 py-1 border rounded disabled:opacity-50">›</button>
              <button onClick={() => setPage(maxPage)} disabled={page >= maxPage} className="px-2 py-1 border rounded disabled:opacity-50">»</button>
            </div>
          </div>
        </div>
      </div>

      {/* New Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 m-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('translations.addNewKey')}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('translations.keyPath')}
                </label>
                <input
                  type="text"
                  placeholder="e.g., navigation.newItem"
                  value={newKeyPath}
                  onChange={(e) => setNewKeyPath(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                />
              </div>
              
              {locales.map(locale => (
                <div key={locale}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {LOCALE_FLAGS[locale]} {LOCALE_NAMES[locale]}
                  </label>
                  <input
                    type="text"
                    placeholder={`Translation in ${LOCALE_NAMES[locale]}`}
                    value={newKeyValues[locale] || ''}
                    onChange={(e) => setNewKeyValues(prev => ({ ...prev, [locale]: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  />

                      {locale === 'pt-BR' && (
                    <div className="mt-2">
                      <button
                        type="button"
                        disabled={!newKeyValues['pt-BR'] || newKeyValues['pt-BR'].trim().length === 0}
                        onClick={async () => {
                          const source = newKeyValues['pt-BR'] || '';
                          if (!source.trim()) return;
                          try {
                            // Show temporary UI feedback
                            setSaving(true);
                            const resp = await apiClient.post('/api/v1/ai/translate', {
                              text: source,
                              from_locale: 'pt-BR',
                              targets: ['en-US', 'es-ES']
                            });
                            const data = resp as any;
                            if (data && data.translations) {
                              setNewKeyValues(prev => ({
                                ...prev,
                                ['en-US']: data.translations['en-US'] || prev['en-US'] || '',
                                ['es-ES']: data.translations['es-ES'] || prev['es-ES'] || ''
                              }));
                              setToastType('success');
                              setToastMsg('Auto-translation applied');
                            } else {
                              setToastType('error');
                              setToastMsg('Auto-translation failed');
                            }
                          } catch (err: any) {
                            setToastType('error');
                            setToastMsg(err?.message || 'Auto-translation failed');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className="px-3 py-1 mt-1 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50"
                      >
                        {t('translations.autoTranslate') || 'Traduzir automaticamente'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
                <button
                onClick={() => {
                  setShowNewKeyModal(false);
                  setNewKeyPath('');
                  setNewKeyValues({});
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={createTranslation}
                disabled={saving || !newKeyPath.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? `${t('settings.saving')}...` : t('translations.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Preview locale: {previewLocale}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{previewMode === 'import' ? 'This will overwrite the existing locale file. Review the content below and confirm to proceed.' : 'Preview exported locale JSON. You can download it from here.'}</p>

            <div className="max-h-72 overflow-auto bg-gray-50 dark:bg-slate-700 p-3 rounded mb-4">
              <pre className="text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-100">{JSON.stringify(previewData, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowImportPreview(false);
                  setPreviewLocale(null);
                  setPreviewData(null);
                  setPreviewMode(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {previewMode === 'import' ? (
                <button
                  onClick={confirmImport}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Importing...' : 'Overwrite and Import'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    try {
                      const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${previewLocale}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      setShowImportPreview(false);
                      setPreviewLocale(null);
                      setPreviewData(null);
                      setPreviewMode(null);
                      showSuccess(`Locale ${previewLocale} downloaded`);
                    } catch (e) {
                      setError('Failed to download file');
                    }
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Download JSON
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    
    <TranslationDetailModal
      isOpen={showDetailModal}
      onClose={() => { setShowDetailModal(false); setSelectedTranslation(null); }}
      translation={selectedTranslation}
      locales={locales}
      onUpdated={() => loadTranslations()}
      onDeleted={() => loadTranslations()}
    />
    </>
  );
}
