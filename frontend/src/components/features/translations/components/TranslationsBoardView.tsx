// Translations Board View
// Renders translations grouped by namespace using BoardView
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { useMemo } from 'react';
import BoardView, { BoardItem } from '@/components/features/shared/ui/BoardView';
import { TranslationKey, LOCALE_FLAGS } from './types';

interface TranslationsBoardViewProps {
	translations: TranslationKey[];
	locales: string[];
	onSelectTranslation: (item: TranslationKey) => void;
}

export default function TranslationsBoardView({
	translations,
	locales,
	onSelectTranslation,
}: TranslationsBoardViewProps) {
	const groupedByNamespace = useMemo(() => {
		const groups: Record<string, TranslationKey[]> = {};
		translations.forEach((item) => {
			const namespace = item.path.split('.')[0] || 'common';
			if (!groups[namespace]) {
				groups[namespace] = [];
			}
			groups[namespace].push(item);
		});
		return groups;
	}, [translations]);

	return (
		<BoardView
			columns={Object.keys(groupedByNamespace).map((namespace) => ({
				id: namespace,
				title: namespace.charAt(0).toUpperCase() + namespace.slice(1),
				items: groupedByNamespace[namespace].map((item) => ({
					id: item.path,
					title: item.path.split('.').slice(1).join('.') || item.path,
					description: locales.map((loc) =>
						item.values[loc] ? `${LOCALE_FLAGS[loc]} ${item.values[loc].substring(0, 30)}${item.values[loc].length > 30 ? '...' : ''}` : null
					).filter(Boolean).join(' | '),
					metadata: {
						namespace,
						hasAllTranslations: locales.every((loc) => !!item.values[loc]),
					},
				})),
			}))}
			onItemClick={(item: BoardItem) => {
				const translation = translations.find((t) => t.path === item.id);
				if (translation) {
					onSelectTranslation(translation);
				}
			}}
			renderCard={(item: BoardItem) => (
				<div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer">
					<p className="font-mono text-sm text-gray-900 dark:text-white truncate" title={item.title}>
						{item.title}
					</p>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
						{item.description || 'No translations'}
					</p>
					{item.metadata?.hasAllTranslations === false && (
						<span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
							Incomplete
						</span>
					)}
				</div>
			)}
		/>
	);
}
