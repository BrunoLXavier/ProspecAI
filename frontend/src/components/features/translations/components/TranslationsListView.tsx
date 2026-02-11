// Translations List View (Card-based layout)
// Renders translation keys as a grid of cards
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import Pagination from '@/components/features/shared/ui/Pagination';
import { TranslationKey, LOCALE_FLAGS } from './types';

interface TranslationsListViewProps {
	translations: TranslationKey[];
	locales: string[];
	loading: boolean;
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (size: number) => void;
	onSelectTranslation: (item: TranslationKey) => void;
	tCommon: (key: string) => string;
}

export default function TranslationsListView({
	translations,
	locales,
	loading,
	page,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
	onSelectTranslation,
	tCommon,
}: TranslationsListViewProps) {
	if (loading) {
		return (
			<div className="space-y-4">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 animate-pulse">
							<div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
							<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
							<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
						</div>
					))}
				</div>
			</div>
		);
	}

	if (translations.length === 0) {
		return (
			<div className="space-y-4">
				<div className="text-center py-12 text-gray-500 dark:text-gray-400">
					{tCommon('noResults') || 'No translations found'}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{translations.map((item) => {
					const hasAllTranslations = locales.every((loc) => !!item.values[loc]);
					const translationCount = locales.filter((loc) => !!item.values[loc]).length;

					return (
						<div
							key={item.path}
							onClick={() => onSelectTranslation(item)}
							className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4 hover:shadow-lg transition-shadow cursor-pointer"
						>
							<div className="flex items-start justify-between mb-2">
								<h3 className="font-mono text-sm font-medium text-gray-900 dark:text-white truncate flex-1" title={item.path}>
									{item.path}
								</h3>
								<span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
									hasAllTranslations
										? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
										: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
								}`}>
									{translationCount}/{locales.length}
								</span>
							</div>
							<div className="space-y-1">
								{locales.map((locale) => (
									<div key={locale} className="flex items-center gap-2 text-sm">
										<span className="flex-shrink-0">{LOCALE_FLAGS[locale]}</span>
										<span className={`truncate ${
											item.values[locale]
												? 'text-gray-700 dark:text-gray-300'
												: 'text-red-500 italic'
										}`}>
											{item.values[locale] || tCommon('noResults')}
										</span>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
			<Pagination
				currentPage={page}
				pageSize={pageSize}
				onPageChange={onPageChange}
				onPageSizeChange={(size) => {
					onPageSizeChange(size);
				}}
				totalItems={total}
				pageSizeOptions={[10, 20, 25, 50, 100]}
			/>
		</div>
	);
}
