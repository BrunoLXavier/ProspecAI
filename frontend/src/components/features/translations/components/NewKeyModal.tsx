// New Translation Key Modal
// Renders a modal form for creating a new translation key with auto-translate
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import { LOCALE_FLAGS, LOCALE_NAMES } from './types';
import { apiClient } from '@/lib/api-client';
import BaseModal, { ModalFooter } from '@/components/features/shared/ui/BaseModal';
import { LanguageIcon } from '@heroicons/react/24/outline';

interface NewKeyModalProps {
	isOpen: boolean;
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
	isOpen,
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
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={t('translations.addNewKey')}
			icon={<LanguageIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
			size="lg"
			footer={
				<ModalFooter
					onCancel={onClose}
					onSubmit={onCreate}
					isSubmitting={saving}
					submitLabel={saving ? `${t('settings.saving')}...` : t('translations.create')}
				/>
			}
		>
			<div className="space-y-5">
				<div>
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						{t('translations.keyPath')}
					</label>
					<input
						type="text"
						placeholder="e.g., navigation.newItem"
						value={newKeyPath}
						onChange={(e) => setNewKeyPath(e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
							className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
									className="px-3 py-1 mt-1 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors"
								>
									{t('translations.autoTranslate') || 'Traduzir automaticamente'}
								</button>
							</div>
						)}
					</div>
				))}
			</div>
		</BaseModal>
	);
}
