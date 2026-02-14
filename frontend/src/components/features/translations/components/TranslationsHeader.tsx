// Translations Header Component
// Renders title, view toggle buttons, import/export menu and add key button
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { ViewMode } from '@/components/features/shared/ui/ViewToggle';
import ImportExportMenu from './ImportExportMenu';

interface TranslationsHeaderProps {
	t: (key: string) => string;
	viewMode: ViewMode;
	setViewMode: (mode: ViewMode) => void;
	locales: string[];
	showImportExportMenu: boolean;
	setShowImportExportMenu: (value: boolean | ((prev: boolean) => boolean)) => void;
	onExportLocale: (locale: string) => void;
	onImportFile: (locale: string, data: any) => void;
	onImportError: (msg: string) => void;
	onAddNewKey: () => void;
}

export default function TranslationsHeader({
	t,
	viewMode,
	setViewMode,
	locales,
	showImportExportMenu,
	setShowImportExportMenu,
	onExportLocale,
	onImportFile,
	onImportError,
	onAddNewKey,
}: TranslationsHeaderProps) {
	return (
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
				{/* View Toggle */}
				<div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
					<button
						onClick={() => setViewMode('list')}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
							viewMode === 'list'
								? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
						}`}
					>
						List
					</button>
					<button
						onClick={() => setViewMode('board')}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
							viewMode === 'board'
								? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
						}`}
					>
						Board
					</button>
					<button
						onClick={() => setViewMode('timeline')}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
							viewMode === 'timeline'
								? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
						}`}
					>
						Timeline
					</button>
					<button
						onClick={() => setViewMode('table')}
						className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
							viewMode === 'table'
								? 'bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm'
								: 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
						}`}
					>
						Table
					</button>
				</div>

				<ImportExportMenu
					t={t}
					locales={locales}
					showMenu={showImportExportMenu}
					setShowMenu={setShowImportExportMenu}
					onExportLocale={onExportLocale}
					onImportFile={onImportFile}
					onImportError={onImportError}
				/>

				<button
					onClick={onAddNewKey}
					title={t('translations.addNewKey') || 'New Key'}
					className="inline-flex items-center justify-center p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition"
				>
					<PlusIcon className="w-5 h-5" />
				</button>
			</div>
		</div>
	);
}
