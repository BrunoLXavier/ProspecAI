// Import / Export Preview Modal
// Shows preview of locale data before importing or allows download for export
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)
'use client';

interface ImportPreviewModalProps {
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
	previewLocale,
	previewData,
	previewMode,
	saving,
	onClose,
	onConfirmImport,
	onDownloadSuccess,
	onError,
}: ImportPreviewModalProps) {
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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl p-6 m-4">
				<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Preview locale: {previewLocale}</h2>
				<p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{previewMode === 'import' ? 'This will overwrite the existing locale file. Review the content below and confirm to proceed.' : 'Preview exported locale JSON. You can download it from here.'}</p>

				<div className="max-h-72 overflow-auto bg-gray-50 dark:bg-slate-700 p-3 rounded mb-4">
					<pre className="text-xs whitespace-pre-wrap text-gray-800 dark:text-gray-100">{JSON.stringify(previewData, null, 2)}</pre>
				</div>

				<div className="flex justify-end gap-3">
					<button
						onClick={onClose}
						className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
					>
						Cancel
					</button>
					{previewMode === 'import' ? (
						<button
							onClick={onConfirmImport}
							disabled={saving}
							className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
						>
							{saving ? 'Importing...' : 'Overwrite and Import'}
						</button>
					) : (
						<button
							onClick={handleDownload}
							className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
						>
							Download JSON
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
