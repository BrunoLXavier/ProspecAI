// New Translation Key Modal
// Renders a modal form for creating a new translation key with auto-translate
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { LOCALE_FLAGS, LOCALE_NAMES } from './types';
import { apiClient } from '@/lib/api-client';

interface NewKeyModalProps {
	t: (key: string) => string;
	tCommon: (key: string) => string;
	locales: string[];
	newKeyPath: string;
	setNewKeyPath: (value: string) => void;
	newKeyValues: Record<string, string>;
	setNewKeyValues: (value: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
	saving: boolean;
	setSaving: (value: boolean) => void;
	onClose: () => void;
	onCreate: () => void;
	onToast: (msg: string, type: 'success' | 'error') => void;
}

export default function NewKeyModal({
	t,
	tCommon,
	locales,
	newKeyPath,
	setNewKeyPath,
	newKeyValues,
	setNewKeyValues,
	saving,
	setSaving,
	onClose,
	onCreate,
	onToast,
}: NewKeyModalProps) {
	return (
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
													onToast('Auto-translation applied', 'success');
												} else {
													onToast('Auto-translation failed', 'error');
												}
											} catch (err: any) {
												onToast(err?.message || 'Auto-translation failed', 'error');
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
						onClick={onClose}
						className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
					>
						{tCommon('cancel')}
					</button>
					<button
						onClick={onCreate}
						disabled={saving || !newKeyPath.trim()}
						className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
					>
						{saving ? `${t('settings.saving')}...` : t('translations.create')}
					</button>
				</div>
			</div>
		</div>
	);
}
