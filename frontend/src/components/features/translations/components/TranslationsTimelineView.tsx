// Translations Timeline View
// Renders translations in a timeline format
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { useMemo } from 'react';
import TimelineView, { TimelineItem } from '@/components/features/shared/ui/TimelineView';
import Pagination from '@/components/features/shared/ui/Pagination';
import { TranslationKey, LOCALE_FLAGS } from './types';

interface TranslationsTimelineViewProps {
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

export default function TranslationsTimelineView({
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
}: TranslationsTimelineViewProps) {
	const timelineItems = useMemo((): TimelineItem[] => {
		return translations.map((item) => {
			const hasAllTranslations = locales.every((loc) => !!item.values[loc]);
			const translationCount = locales.filter((loc) => !!item.values[loc]).length;

			return {
				id: item.path,
				title: item.path,
				description: locales.map((loc) =>
					item.values[loc] ? `${LOCALE_FLAGS[loc]} ${item.values[loc].substring(0, 50)}${item.values[loc].length > 50 ? '...' : ''}` : null
				).filter(Boolean).join(' • '),
				date: new Date(),
				status: hasAllTranslations ? 'success' : translationCount > 0 ? 'warning' : 'error',
				tags: [
					{ label: item.path.split('.')[0] || 'common', color: 'blue' },
					{ label: `${translationCount}/${locales.length}`, color: hasAllTranslations ? 'green' : 'yellow' },
				],
				onClick: () => {
					onSelectTranslation(item);
				},
			};
		});
	}, [translations, locales, onSelectTranslation]);

	return (
		<div className="space-y-4">
			<TimelineView
				items={timelineItems}
				loading={loading}
				emptyMessage={tCommon('noResults') || 'No translations found'}
				size="md"
				showConnectors={true}
				animated={true}
			/>
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
