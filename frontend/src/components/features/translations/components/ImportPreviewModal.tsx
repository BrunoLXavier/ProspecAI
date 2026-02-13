// Import / Export Preview Modal
// Shows preview of locale data before importing or allows download for export
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

import BaseModal from '@/components/features/shared/ui/BaseModal';
import { useTranslations } from 'next-intl';
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface ImportPreviewModalProps {
	isOpen: boolean;
	previewLocale: string | null;
	previewData: any;
	previewMode: 'import' | 'export' | null;
	saving: boolean;
	onClose: () => void;
	onConfirmImport: () => void;
	onDownloadSuccess: (msg: string) => void;
	onError: (msg: string) => void;
}

export default function ImportPreviewModal({
	isOpen,
	previewLocale,
	previewData,
	previewMode,
	saving,
	onClose,
	onConfirmImport,
	onDownloadSuccess,
	onError,
}: ImportPreviewModalProps) {
	const t = useTranslations('translations');
	const tCommon = useTranslations('common');

	const handleDownload = () => {
		try {
			const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${previewLocale}.json`;
			a.click();
			URL.revokeObjectURL(url);
			onClose();
			onDownloadSuccess(`Locale ${previewLocale} downloaded`);
		} catch (e) {
			onError('Failed to download file');
		}
	};

	const isImport = previewMode === 'import';

	return (
		<BaseModal
			isOpen={isOpen}
			onClose={onClose}
			title={`${t('preview')}: ${previewLocale}`}
			subtitle={isImport ? t('importOverwriteWarning') : t('exportPreviewHint')}
			icon={
				isImport
					? <ArrowUpTrayIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
					: <ArrowDownTrayIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
			}
			size="3xl"
			footer={
				<div className="flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
					>
						{tCommon('cancel')}
					</button>
					{isImport ? (
						<button
							onClick={onConfirmImport}
							disabled={saving}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
						>
							{saving ? t('importing') : t('overwriteAndImport')}
						</button>
					) : (
						<button
							onClick={handleDownload}
							className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
						>
							{t('downloadJson')}
						</button>
					)}
				</div>
			}
		>
			<div className="max-h-72 overflow-auto bg-gray-50 dark:bg-slate-700 p-3 rounded-lg">
				<pre className="text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-100">
					{JSON.stringify(previewData, null, 2)}
				</pre>
			</div>
		</BaseModal>
	);
}
