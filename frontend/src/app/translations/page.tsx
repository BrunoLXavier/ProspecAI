// Translations Management Page
// Admin interface for managing i18n translations
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLayout } from '@/contexts/LayoutContext';
import { useTranslations } from 'next-intl';
import FilterPanel, { FilterField } from '@/components/features/shared/ui/FilterPanel';
import ConfigurableStatisticsBar from '@/components/features/shared/ui/ConfigurableStatisticsBar';
import TranslationModal from '@/components/features/translations/components/TranslationModal';
import TableView, { TableColumn } from '@/components/features/shared/ui/TableView';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import { apiClient } from '@/lib/api-client';
import {
	TranslationsHeader,
	TranslationsListView,
	TranslationsBoardView,
	TranslationsTimelineView,
	NewKeyModal,
	ImportPreviewModal,
	LOCALE_FLAGS,
	LOCALE_NAMES,
} from '@/components/features/translations';
import type { TranslationKey, TranslationsResponse } from '@/components/features/translations';

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
	// View mode
	const [viewMode, setViewMode] = useState<ViewMode>(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const mode = params.get('view');
			if (mode === 'list' || mode === 'board' || mode === 'timeline' || mode === 'table') {
				return mode;
			}
		}
		return 'table';
	});
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
			const skip = (page - 1) * pageSize;
			params.append('skip', String(skip));
			params.append('limit', String(pageSize));
      
			const response = await apiClient.get<TranslationsResponse>(
				`/api/v1/translations?${params.toString()}`
			);
      
			const respTranslations = response.translations ?? [];
			const respNamespaces = response.namespaces ?? [];
			const respLocales = response.locales ?? [];

			if (response.total != null) {
				setTotal(response.total);
				setTranslations(respTranslations);
			} else {
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
			setLocales(Array.from(new Set([...respLocales, 'pt-BR', 'en-US', 'es-ES'])));
		} catch (err: any) {
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
		setPage(1);
		loadTranslations();
	}, [selectedNamespace]);

	useEffect(() => {
		const maxPage = Math.max(1, Math.ceil((total || 0) / pageSize));
		if (page > maxPage) setPage(maxPage);
	}, [total, pageSize]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			loadTranslations();
		}, 300);
		return () => clearTimeout(timeout);
	}, [searchQuery]);

	useEffect(() => {
		setPageSize(config?.default_page_size || 20);
	}, [config?.default_page_size]);

	useEffect(() => {
		loadTranslations();
	}, [page, pageSize]);

	useEffect(() => {
		if (!toastMsg) return;
		const t = setTimeout(() => setToastMsg(null), 3000);
		return () => clearTimeout(t);
	}, [toastMsg]);

	// Filtered translations
	const filteredTranslations = useMemo(() => {
		if (!translations || translations.length === 0) return [];
		if (translations.length <= pageSize) return translations;
		const start = (page - 1) * pageSize;
		return translations.slice(start, start + pageSize);
	}, [translations]);

	const filterFields: FilterField[] = [
		{ key: 'search', label: tCommon('search') || 'Search', type: 'text', placeholder: t('translations.searchPlaceholder') || 'Search keys or values...' },
		{ key: 'namespace', label: t('translations.namespace') || 'Namespace', type: 'select', options: [{ value: '', label: tCommon('all') || 'All' }, ...namespaces.map(ns => ({ value: ns, label: ns }))] },
	];

	// Table columns definition for TableView
	const translationColumns: TableColumn<TranslationKey>[] = useMemo(() => [
		{
			key: 'path',
			header: t('translations.keyPath') || 'Key Path',
			accessor: 'path',
			sortable: true,
			width: '33%',
			cellClassName: 'font-mono',
		},
		...locales.map((locale) => ({
			key: locale,
			header: `${LOCALE_FLAGS[locale]} ${LOCALE_NAMES[locale]}`,
			accessor: (row: TranslationKey) => row.values[locale] || '',
			sortable: false,
			render: (value: unknown, row: TranslationKey) => (
				<span className={!row.values[locale] ? 'text-red-500 italic' : ''}>
					{row.values[locale] || tCommon('noResults')}
				</span>
			),
		})),
	], [locales, t, tCommon]);

	// Helper to show toasts
	const showToast = (msg: string, type: 'success' | 'error') => {
		setToastType(type);
		setToastMsg(msg);
	};

	const showSuccess = (msg: string) => showToast(msg, 'success');

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
			showToast(err.message || 'Failed to create translation', 'error');
		} finally {
			setSaving(false);
		}
	};

	// Export locale
	const exportLocale = async (locale: string) => {
		try {
			const data = await apiClient.get(`/api/v1/translations/export/${locale}`);
			setPreviewData(data);
			setPreviewLocale(locale);
			setPreviewMode('export');
			setShowImportPreview(true);
		} catch (err: any) {
			setError(err.message || 'Failed to export locale');
			showToast(err.message || 'Failed to export locale', 'error');
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
				showToast('Invalid JSON file', 'error');
				return;
			}

			const isValid = (obj: any): boolean => {
				if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
				return Object.keys(obj).every(k => typeof k === 'string');
			};

			if (!isValid(data)) {
				setError('Locale JSON must be an object with string keys');
				showToast('Locale JSON must be an object with string keys', 'error');
				return;
			}

			await apiClient.post(`/api/v1/translations/import/${locale}`, data);
			await loadTranslations();
			showSuccess(`Locale ${locale} imported`);
		} catch (err: any) {
			setError(err.message || 'Failed to import locale');
			showToast(err.message || 'Failed to import locale', 'error');
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
			showToast(err.message || 'Failed to import locale', 'error');
		} finally {
			setSaving(false);
		}
	};

	// Handlers for selecting a translation across views
	const handleSelectTranslation = (item: TranslationKey) => {
		setSelectedTranslation(item);
		setShowDetailModal(true);
	};

	const handleImportFile = (locale: string, data: any) => {
		setPreviewLocale(locale);
		setPreviewData(data);
		setPreviewMode('import');
		setShowImportPreview(true);
	};

	const handleImportError = (msg: string) => {
		setError(msg);
		showToast(msg, 'error');
	};

	const closeImportPreview = () => {
		setShowImportPreview(false);
		setPreviewLocale(null);
		setPreviewData(null);
		setPreviewMode(null);
	};

	return (
		<>
			<div className="max-w-7xl mx-auto space-y-6 pb-24">
				{/* Header */}
				<TranslationsHeader
					t={t}
					viewMode={viewMode}
					setViewMode={setViewMode}
					locales={locales}
					showImportExportMenu={showImportExportMenu}
					setShowImportExportMenu={setShowImportExportMenu}
					onExportLocale={exportLocale}
					onImportFile={handleImportFile}
					onImportError={handleImportError}
					onAddNewKey={() => setShowNewKeyModal(true)}
				/>

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

				{/* View Modes */}
				{viewMode === 'list' && (
					<TranslationsListView
						translations={filteredTranslations}
						locales={locales}
						loading={loading}
						page={page}
						pageSize={pageSize}
						total={total}
						onPageChange={setPage}
						onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
						onSelectTranslation={handleSelectTranslation}
						tCommon={tCommon}
					/>
				)}

				{viewMode === 'board' && (
					<TranslationsBoardView
						translations={filteredTranslations}
						locales={locales}
						onSelectTranslation={handleSelectTranslation}
					/>
				)}

				{viewMode === 'timeline' && (
					<TranslationsTimelineView
						translations={filteredTranslations}
						locales={locales}
						loading={loading}
						page={page}
						pageSize={pageSize}
						total={total}
						onPageChange={setPage}
						onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
						onSelectTranslation={handleSelectTranslation}
						tCommon={tCommon}
					/>
				)}

				{viewMode === 'table' && (
					<TableView<TranslationKey>
						data={filteredTranslations}
						columns={translationColumns}
						getRowKey={(row) => row.path}
						onRowClick={handleSelectTranslation}
						loading={loading}
						emptyMessage={tCommon('noResults') || 'No translations found'}
						searchable={false}
						paginated={true}
						pageSize={pageSize}
						currentPage={page}
						totalItems={total}
						onPageChange={setPage}
						onPageSizeChange={(size) => {
							setPageSize(size);
							setPage(1);
						}}
						pageSizeOptions={[10, 20, 25, 50, 100]}
						striped={true}
						hoverable={true}
					/>
				)}

				{/* New Key Modal */}
				{showNewKeyModal && (
					<NewKeyModal
						t={t}
						tCommon={tCommon}
						locales={locales}
						newKeyPath={newKeyPath}
						setNewKeyPath={setNewKeyPath}
						newKeyValues={newKeyValues}
						setNewKeyValues={setNewKeyValues}
						saving={saving}
						setSaving={setSaving}
						onClose={() => {
							setShowNewKeyModal(false);
							setNewKeyPath('');
							setNewKeyValues({});
						}}
						onCreate={createTranslation}
						onToast={showToast}
					/>
				)}

				{/* Import Preview Modal */}
				{showImportPreview && (
					<ImportPreviewModal
						previewLocale={previewLocale}
						previewData={previewData}
						previewMode={previewMode}
						saving={saving}
						onClose={closeImportPreview}
						onConfirmImport={confirmImport}
						onDownloadSuccess={showSuccess}
						onError={(msg) => setError(msg)}
					/>
				)}
			</div>

			<TranslationModal
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
