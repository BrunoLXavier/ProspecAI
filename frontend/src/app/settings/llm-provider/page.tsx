// LLM Provider Settings Page
// Configure AI/LLM provider for the chatbot feature
// Implements RF-07: Chatbot explicável
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getStoredAccessToken } from '@/contexts/AuthContext';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  CpuChipIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// =============================================================================
// Types
// =============================================================================

interface LLMProvider {
  id: string;
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  icon: string;
}

interface LLMConfig {
  id: string;
  provider: string;
  model_name: string;
  api_key_masked: string;
  api_base_url?: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  test_status: 'untested' | 'success' | 'failed';
  last_test_at?: string;
  test_error_message?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  response_time_ms?: number;
  error?: string;
}

// =============================================================================
// Constants
// =============================================================================

const PROVIDERS: LLMProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4, GPT-3.5 Turbo e modelos mais recentes',
    models: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    icon: '🤖',
  },
  {
    id: 'google',
    name: 'Google AI',
    description: 'Gemini 2.0/2.5 e modelos Google AI Studio',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    requiresApiKey: true,
    requiresBaseUrl: false,
    icon: '🌐',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Modelos locais como Llama 3, Mistral, etc.',
    models: ['llama3', 'llama3:70b', 'mistral', 'mixtral', 'codellama'],
    requiresApiKey: false,
    requiresBaseUrl: true,
    icon: '🦙',
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    description: 'Modelos OpenAI hospedados no Azure',
    models: ['gpt-4', 'gpt-35-turbo'],
    requiresApiKey: true,
    requiresBaseUrl: true,
    icon: '☁️',
  },
];

// =============================================================================
// Component
// =============================================================================

export default function LLMProviderSettingsPage() {
  const t = useTranslations('settings');
  
  // State
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string>('openai');
  const [modelName, setModelName] = useState<string>('gpt-4-turbo-preview');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [showApiKey, setShowApiKey] = useState(false);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  
  // ==========================================================================
  // Data Loading
  // ==========================================================================
  
  const fetchConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      // Prefer AuthContext storage keys to read access token
      let token = getStoredAccessToken();
      try {
          if (!token && typeof window !== 'undefined' && (window as any).__PROSPECAI_ACCESS_TOKEN) {
          token = (window as any).__PROSPECAI_ACCESS_TOKEN as string;
        }
      } catch (e) {
        // ignore
      }
      if (!token) {
        // Fallback to in-memory token set by AuthProvider; avoid legacy localStorage keys
        token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      }

      if (!token) {
        throw new Error('No auth token found (check localStorage or login).');
      }

      const response = await fetch('/api/v1/admin/llm-config/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let body = '';
        try { body = await response.text(); } catch (e) {}
        throw new Error(`Failed to fetch LLM configurations (status ${response.status}): ${body || response.statusText}`);
      }

      const data = await response.json();
      setConfigs(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      console.error('LLM configs load error:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);
  
  // ==========================================================================
  // Provider Selection
  // ==========================================================================
  
  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider);
  
  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (provider && provider.models.length > 0) {
      setModelName(provider.models[0]);
    }
    setApiKey('');
    setApiBaseUrl(providerId === 'ollama' ? 'http://localhost:11434' : '');
    setTestResult(null);
  };
  
  // ==========================================================================
  // Test Connection
  // ==========================================================================
  
  const handleTestConnection = async () => {
    if (!currentProvider) return;
    
    if (currentProvider.requiresApiKey && !apiKey) {
      setTestResult({ success: false, message: t('llm.errors.apiKeyRequired') });
      return;
    }

    if (currentProvider.requiresBaseUrl && !apiBaseUrl) {
      setTestResult({ success: false, message: t('llm.errors.baseUrlRequired') });
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch('/api/v1/admin/llm-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model_name: modelName,
          api_key: apiKey,
          ...(apiBaseUrl && { api_base_url: apiBaseUrl }),
        }),
      });
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Backend returned non-JSON response:', textResponse);
        setTestResult({
          success: false,
          message: `Server error: ${response.status} ${response.statusText}. Check console for details.`,
        });
        return;
      }
      
      const data = await response.json();
      setTestResult({
        success: data.success,
        message: data.message,
        response_time_ms: data.response_time_ms,
        error: data.error,
      });
    } catch (err) {
      console.error('Test connection error:', err);
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : t('llm.errors.testError'),
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // ==========================================================================
  // Save Configuration
  // ==========================================================================
  
  const handleSave = async (activate: boolean = false) => {
    if (!currentProvider) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      const payload = {
        provider: selectedProvider,
        model_name: modelName,
        api_key: apiKey,
        api_base_url: apiBaseUrl || undefined,
        temperature,
        max_tokens: maxTokens,
        is_active: activate,
      };
      
      const url = editingConfig 
        ? `/api/v1/admin/llm-config/${editingConfig}`
        : '/api/v1/admin/llm-config/';
      
      const method = editingConfig ? 'PUT' : 'POST';
      
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || t('errors.save'));
      }
      
      // Refresh configs
      await fetchConfigs();
      
      // Reset form
      setApiKey('');
      setEditingConfig(null);
      setTestResult(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setIsSaving(false);
    }
  };
  
  // ==========================================================================
  // Activate/Deactivate Config
  // ==========================================================================
  
  const handleActivate = async (configId: string) => {
    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/admin/llm-config/${configId}/activate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) throw new Error(t('errors.activate'));
      
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    }
  };
  
  const handleDelete = async (configId: string) => {
    if (!confirm(t('confirm.deleteLLM'))) return;

    try {
      const token = getStoredAccessToken() || (typeof window !== 'undefined' ? (window as any).__PROSPECAI_ACCESS_TOKEN : null);
      const response = await fetch(`/api/v1/admin/llm-config/${configId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(t('errors.delete'));

      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    }
  };
  
  // ==========================================================================
  // Render
  // ==========================================================================
  
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('llm.title')}</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('llm.subtitle')}</p>
      </div>
      
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            ✕
          </button>
        </div>
      )}
      
      {/* Provider Selection */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-primary-500" />
          {t('llm.selectProvider')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider.id)}
              className={`p-4 rounded-lg border-2 text-left transition ${
                selectedProvider === provider.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <h3 className={`font-medium ${
                    selectedProvider === provider.id
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {provider.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {provider.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
      
      {/* Configuration Form */}
      {currentProvider && (
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('llm.configure', { name: currentProvider.name })}
          </h2>
          
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('llm.modelLabel')}
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {currentProvider.models.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          
          {/* API Key */}
          {currentProvider.requiresApiKey && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('llm.apiKey')}
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 pr-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('llm.apiKeyStored')}
              </p>
            </div>
          )}
          
          {/* Base URL */}
          {currentProvider.requiresBaseUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('llm.baseUrl')}
              </label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder={
                  selectedProvider === 'ollama'
                    ? 'http://localhost:11434'
                    : 'https://your-resource.openai.azure.com'
                }
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          )}
          
          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('llm.temperature')} ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('llm.temperatureHint')}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('llm.maxTokens')}
              </label>
              <input
                type="number"
                min="256"
                max="8192"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* Test Result */}
          {testResult && (
            <div className={`p-4 rounded-lg ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-3">
                {testResult.success ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p className={testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                    {testResult.error || testResult.message || (testResult.success ? 'Conexão bem-sucedida!' : 'Erro de conexão')}
                  </p>
                  {testResult.response_time_ms && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Tempo de resposta: {testResult.response_time_ms}ms
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition flex items-center gap-2 disabled:opacity-50"
            >
                  {isTesting ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  {t('llm.testButton.testing')}
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-4 h-4" />
                  {t('llm.testButton.label')}
                </>
              )}
            </button>
            
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
            >
              {t('llm.save')}
            </button>
            
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving || !testResult?.success}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
            >
                  {isSaving ? (
                <>
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  {t('llm.saving')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-4 h-4" />
                  {t('llm.saveActivate')}
                </>
              )}
            </button>
          </div>
        </section>
      )}
      
      {/* Existing Configurations */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Configurações Existentes
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              {t('llm.noConfigs')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => {
              const provider = PROVIDERS.find(p => p.id === config.provider);
              return (
                <div
                  key={config.id}
                  className={`p-4 rounded-lg border ${
                    config.is_active
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{provider?.icon || '🤖'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {provider?.name || config.provider}
                          </h3>
                          {config.is_active && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                              {t('llm.status.active')}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            config.test_status === 'success'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : config.test_status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {config.test_status === 'success' ? t('llm.status.tested') : config.test_status === 'failed' ? t('llm.status.failed') : t('llm.status.untested')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {config.model_name} • API Key: {config.api_key_masked}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!config.is_active && (
                        <button
                          onClick={() => handleActivate(config.id)}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                        >
                          {t('llm.activate')}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        {t('llm.delete')}
                      </button>
                    </div>
                  </div>
                  
                  {config.test_error_message && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      Erro: {config.test_error_message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
