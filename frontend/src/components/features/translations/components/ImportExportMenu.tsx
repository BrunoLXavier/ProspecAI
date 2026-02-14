// Import / Export Dropdown Menu Component
// Renders per-locale export/import buttons
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { LOCALE_FLAGS, LOCALE_NAMES } from './types';

interface ImportExportMenuProps {
	t: (key: string) => string;
	locales: string[];
	showMenu: boolean;
	setShowMenu: (value: boolean | ((prev: boolean) => boolean)) => void;
	onExportLocale: (locale: string) => void;
	onImportFile: (locale: string, data: any) => void;
	onImportError: (msg: string) => void;
}

export default function ImportExportMenu({
	t,
	locales,
	showMenu,
	setShowMenu,
	onExportLocale,
	onImportFile,
	onImportError,
}: ImportExportMenuProps) {
	return (
		<div className="relative">
			<button
				onClick={() => setShowMenu((v: boolean) => !v)}
				title={t('translations.importExport') || 'Import / Export'}
				className="inline-flex items-center justify-center p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition"
			>
				<ArrowDownTrayIcon className="w-5 h-5" />
			</button>

			{showMenu && (
				<div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50 p-2">
					{locales.map(locale => (
						<div key={locale} className="flex items-center justify-between px-2 py-1">
							<div className="flex items-center gap-2">
								<span className="text-sm">{LOCALE_FLAGS[locale]} {LOCALE_NAMES[locale]}</span>
							</div>
							<div className="flex items-center gap-2">
								<button onClick={() => { onExportLocale(locale); setShowMenu(false); }} className="px-2 py-1 text-sm border rounded">Export</button>
								<label className="px-2 py-1 text-sm border rounded cursor-pointer">
									Import
									<input type="file" accept="application/json,.json" className="hidden" onChange={async (e) => {
										const file = e.target.files ? e.target.files[0] : null;
										if (!file) return;
										try {
											const text = await file.text();
											const data = JSON.parse(text);
											if (!data || typeof data !== 'object' || Array.isArray(data)) {
												onImportError('Locale JSON must be an object');
											} else {
												onImportFile(locale, data);
												setShowMenu(false);
											}
										} catch (err: any) {
											onImportError('Invalid JSON file');
										}
										if (e.target) e.target.value = '';
									}} />
								</label>
							</div>
						</div>
					))}
					<div className="mt-2 text-right">
						<button onClick={() => setShowMenu(false)} className="px-3 py-1 text-sm text-gray-600">Close</button>
					</div>
				</div>
			)}
		</div>
	);
}
