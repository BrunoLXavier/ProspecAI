'use client';

/**
 * TranscriptionReportModal Component
 * 
 * Modal for generating reports from audio/video transcriptions.
 * Allows selecting a report template and generates a structured report
 * that is attached as a message in the thread.
 * 
 * Implements RF-09: Report generation from transcription with template support.
 */
import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition, Listbox, RadioGroup } from '@headlessui/react';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckIcon,
  ChevronUpDownIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  PlayIcon,
  PauseIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  sections: string[];
  default_format: string;
}

interface TranscriptionResult {
  text: string;
  language: string;
  duration_seconds: number;
  confidence: number;
  segments: Array<{ start: number; end: number; text: string }>;
}

interface TranscriptionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  threadId: string;
  mediaBlob: Blob;
  mediaType: 'audio' | 'video';
  onReportGenerated?: (reportUrl: string, messageId: string) => void;
}

type ProcessStep = 'idle' | 'transcribing' | 'selecting' | 'generating' | 'complete' | 'error';

export default function TranscriptionReportModal({
  isOpen,
  onClose,
  threadId,
  mediaBlob,
  mediaType,
  onReportGenerated,
}: TranscriptionReportModalProps) {
  const t = useTranslations('communications');
  
  // Templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Transcription
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  
  // Additional context
  const [additionalContext, setAdditionalContext] = useState('');
  
  // Processing state
  const [step, setStep] = useState<ProcessStep>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Result
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  
  // Media preview
  const [isPlaying, setIsPlaying] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  const languages = [
    { id: 'auto', name: t('transcription.languageAuto') },
    { id: 'pt', name: t('transcription.languagePt') },
    { id: 'en', name: t('transcription.languageEn') },
    { id: 'es', name: t('transcription.languageEs') },
  ];
  
  // Load templates on mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      // Create media URL for preview
      const url = URL.createObjectURL(mediaBlob);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [isOpen, mediaBlob]);
  
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const templates = await apiClient.get('/api/v1/communications/report-templates');
      // apiClient.get already returns response.data, so templates is the array directly
      const templateList = Array.isArray(templates) ? templates : [];
      setTemplates(templateList);
      if (templateList.length > 0) {
        setSelectedTemplate(templateList[0]);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError(t('transcription.errorLoadingTemplates'));
    } finally {
      setLoadingTemplates(false);
    }
  };
  
  const handleTranscribe = async () => {
    setStep('transcribing');
    setError(null);
    
    try {
      const formData = new FormData();
      const extension = mediaType === 'audio' ? 'webm' : 'webm';
      const filename = `recording.${extension}`;
      formData.append('file', mediaBlob, filename);
      
      const response = await apiClient.post(
        `/api/v1/communications/transcribe?language=${selectedLanguage}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      
      setTranscription(response.data);
      setStep('selecting');
    } catch (err: any) {
      console.error('Transcription failed:', err);
      setError(err.response?.data?.detail || t('transcription.errorTranscribing'));
      setStep('error');
    }
  };
  
  const handleGenerateReport = async () => {
    if (!selectedTemplate || !transcription) return;
    
    setStep('generating');
    setError(null);
    
    try {
      const response = await apiClient.post(
        `/api/v1/communications/${threadId}/transcription-report`,
        {
          template_id: selectedTemplate.id,
          transcription_text: transcription.text,
          transcription_language: transcription.language,
          additional_context: additionalContext || undefined,
          attach_to_thread: true,
        }
      );
      
      setReportUrl(response.data.download_url);
      setMessageId(response.data.message_id);
      setStep('complete');
      
      if (onReportGenerated && response.data.download_url && response.data.message_id) {
        onReportGenerated(response.data.download_url, response.data.message_id);
      }
    } catch (err: any) {
      console.error('Report generation failed:', err);
      setError(err.response?.data?.detail || t('transcription.errorGenerating'));
      setStep('error');
    }
  };
  
  const handleClose = () => {
    // Reset state
    setStep('idle');
    setTranscription(null);
    setError(null);
    setReportUrl(null);
    setMessageId(null);
    setAdditionalContext('');
    onClose();
  };
  
  const copyTranscription = () => {
    if (transcription) {
      navigator.clipboard.writeText(transcription.text);
    }
  };
  
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[150]" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <SparklesIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                        {t('transcription.reportTitle')}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('transcription.reportDescription')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Progress Steps */}
                  <div className="flex items-center justify-center gap-2">
                    {['transcribing', 'selecting', 'generating', 'complete'].map((s, idx) => (
                      <Fragment key={s}>
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            step === s
                              ? 'bg-purple-600 text-white'
                              : step === 'complete' || (idx < ['transcribing', 'selecting', 'generating', 'complete'].indexOf(step))
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                        >
                          {step === 'complete' || (idx < ['transcribing', 'selecting', 'generating', 'complete'].indexOf(step)) ? (
                            <CheckIcon className="h-4 w-4" />
                          ) : (
                            idx + 1
                          )}
                        </div>
                        {idx < 3 && (
                          <div
                            className={`w-12 h-0.5 ${
                              idx < ['transcribing', 'selecting', 'generating', 'complete'].indexOf(step)
                                ? 'bg-green-400'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}
                          />
                        )}
                      </Fragment>
                    ))}
                  </div>

                  {/* Step: Idle - Select Language and Start */}
                  {step === 'idle' && (
                    <div className="space-y-4">
                      {/* Media Preview */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            {mediaType === 'video' && mediaUrl ? (
                              <video
                                src={mediaUrl}
                                className="w-32 h-20 rounded object-cover"
                                controls={false}
                              />
                            ) : (
                              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                <DocumentTextIcon className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {mediaType === 'audio' ? t('transcription.audioRecording') : t('transcription.videoRecording')}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {(mediaBlob.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          {mediaUrl && (
                            <button
                              onClick={() => {
                                const el = document.getElementById('preview-media') as HTMLAudioElement | HTMLVideoElement;
                                if (el) {
                                  if (isPlaying) {
                                    el.pause();
                                  } else {
                                    el.play();
                                  }
                                  setIsPlaying(!isPlaying);
                                }
                              }}
                              className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
                            >
                              {isPlaying ? (
                                <PauseIcon className="h-5 w-5" />
                              ) : (
                                <PlayIcon className="h-5 w-5" />
                              )}
                            </button>
                          )}
                        </div>
                        {mediaUrl && (
                          <audio
                            id="preview-media"
                            src={mediaUrl}
                            className="hidden"
                            onEnded={() => setIsPlaying(false)}
                          />
                        )}
                      </div>

                      {/* Language Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('transcription.selectLanguage')}
                        </label>
                        <RadioGroup value={selectedLanguage} onChange={setSelectedLanguage}>
                          <div className="grid grid-cols-2 gap-2">
                            {languages.map((lang) => (
                              <RadioGroup.Option
                                key={lang.id}
                                value={lang.id}
                                className={({ checked }) =>
                                  `${
                                    checked
                                      ? 'bg-purple-50 border-purple-500 dark:bg-purple-900/30 dark:border-purple-400'
                                      : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600'
                                  } relative flex cursor-pointer rounded-lg border p-3 focus:outline-none`
                                }
                              >
                                {({ checked }) => (
                                  <div className="flex items-center justify-between w-full">
                                    <span
                                      className={`text-sm ${
                                        checked
                                          ? 'text-purple-700 dark:text-purple-300 font-medium'
                                          : 'text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      {lang.name}
                                    </span>
                                    {checked && (
                                      <CheckIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    )}
                                  </div>
                                )}
                              </RadioGroup.Option>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}

                  {/* Step: Transcribing */}
                  {step === 'transcribing' && (
                    <div className="text-center py-8">
                      <ArrowPathIcon className="h-12 w-12 text-purple-600 animate-spin mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('transcription.transcribing')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('transcription.transcribingHint')}
                      </p>
                    </div>
                  )}

                  {/* Step: Selecting Template */}
                  {step === 'selecting' && transcription && (
                    <div className="space-y-4">
                      {/* Transcription Result */}
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('transcription.result')}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {formatDuration(transcription.duration_seconds)} • {Math.round(transcription.confidence * 100)}%
                            </span>
                            <button
                              onClick={copyTranscription}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title={t('transcription.copyText')}
                            >
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {transcription.text}
                          </p>
                        </div>
                      </div>

                      {/* Template Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('transcription.selectTemplate')}
                        </label>
                        {loadingTemplates ? (
                          <div className="flex items-center justify-center py-4">
                            <ArrowPathIcon className="h-5 w-5 animate-spin text-gray-400" />
                          </div>
                        ) : (
                          <Listbox value={selectedTemplate} onChange={setSelectedTemplate}>
                            <div className="relative">
                              <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-3 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-purple-500">
                                <span className="block truncate text-gray-900 dark:text-white">
                                  {selectedTemplate?.name || t('transcription.selectTemplatePlaceholder')}
                                </span>
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                                </span>
                              </Listbox.Button>
                              <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                              >
                                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-gray-800 py-1 shadow-lg ring-1 ring-black/5 focus:outline-none">
                                  {templates.map((template) => (
                                    <Listbox.Option
                                      key={template.id}
                                      value={template}
                                      className={({ active }) =>
                                        `relative cursor-pointer select-none py-3 pl-10 pr-4 ${
                                          active
                                            ? 'bg-purple-50 dark:bg-purple-900/30'
                                            : 'text-gray-900 dark:text-white'
                                        }`
                                      }
                                    >
                                      {({ selected }) => (
                                        <>
                                          <div>
                                            <span
                                              className={`block truncate ${
                                                selected ? 'font-medium text-purple-600 dark:text-purple-400' : ''
                                              }`}
                                            >
                                              {template.name}
                                            </span>
                                            <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                                              {template.description}
                                            </span>
                                          </div>
                                          {selected && (
                                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-purple-600 dark:text-purple-400">
                                              <CheckIcon className="h-5 w-5" />
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </Listbox.Option>
                                  ))}
                                </Listbox.Options>
                              </Transition>
                            </div>
                          </Listbox>
                        )}
                      </div>

                      {/* Template Sections Preview */}
                      {selectedTemplate && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">
                            {t('transcription.sectionsIncluded')}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {selectedTemplate.sections.map((section) => (
                              <span
                                key={section}
                                className="text-xs bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded"
                              >
                                {section.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Context */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('transcription.additionalContext')}
                          <span className="text-gray-400 font-normal ml-1">({t('optional')})</span>
                        </label>
                        <textarea
                          value={additionalContext}
                          onChange={(e) => setAdditionalContext(e.target.value)}
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder={t('transcription.additionalContextPlaceholder')}
                        />
                      </div>
                    </div>
                  )}

                  {/* Step: Generating */}
                  {step === 'generating' && (
                    <div className="text-center py-8">
                      <SparklesIcon className="h-12 w-12 text-purple-600 animate-pulse mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('transcription.generating')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('transcription.generatingHint')}
                      </p>
                    </div>
                  )}

                  {/* Step: Complete */}
                  {step === 'complete' && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {t('transcription.reportComplete')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {t('transcription.reportAttached')}
                      </p>
                      
                      {reportUrl && (
                        <a
                          href={reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                          {t('transcription.downloadReport')}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Step: Error */}
                  {step === 'error' && error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-300">
                            {t('transcription.errorTitle')}
                          </p>
                          <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                            {error}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                  {step === 'idle' && (
                    <>
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={handleTranscribe}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <SparklesIcon className="h-5 w-5" />
                        {t('transcription.startTranscription')}
                      </button>
                    </>
                  )}
                  
                  {step === 'selecting' && (
                    <>
                      <button
                        onClick={() => setStep('idle')}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        {t('back')}
                      </button>
                      <button
                        onClick={handleGenerateReport}
                        disabled={!selectedTemplate}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                        {t('transcription.generateReport')}
                      </button>
                    </>
                  )}
                  
                  {step === 'error' && (
                    <>
                      <button
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        {t('cancel')}
                      </button>
                      <button
                        onClick={() => setStep('idle')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <ArrowPathIcon className="h-5 w-5" />
                        {t('transcription.retry')}
                      </button>
                    </>
                  )}
                  
                  {step === 'complete' && (
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      {t('close')}
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
