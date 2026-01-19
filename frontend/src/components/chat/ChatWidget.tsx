/**
 * ChatWidget Component
 * Floating chat widget for AI assistant
 * Implements RF-07: Chatbot explicável
 */
"use client";

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import apiClient from '@/lib/api-client';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

type SourceReference = {
  type: string;
  id: string;
  title: string;
  relevance_score: number;
  excerpt?: string;
};

interface ChatResponse {
  answer: string;
  confidence: number;
  confidence_level: 'high' | 'medium' | 'low';
  sources: SourceReference[];
  reasoning_steps: string[];
  suggestions: string[];
  requires_human_validation: boolean;
  timestamp: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: ChatResponse;
  timestamp: Date;
}

function ConfidenceBadge({ level, score }: { level: string; score: number }) {
  const config: Record<string, any> = {
    high: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', icon: CheckCircleIcon, label: 'Alta confiança' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', icon: InformationCircleIcon, label: 'Confiança média' },
    low: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', icon: ExclamationTriangleIcon, label: 'Baixa confiança' },
  };

  const { bg, text, icon: Icon, label } = config[level] || config.medium;
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${bg} ${text}`}>
      <Icon className="h-3 w-3" />
      <span>{label} ({Math.round(score * 100)}%)</span>
    </div>
  );
}

function SourceList({ sources }: { sources: SourceReference[] }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fontes utilizadas:</p>
      <div className="flex flex-wrap gap-1">
        {sources.map((source, idx) => (
          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300" title={source.excerpt}>
            {source.type}: {source.title}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [showReasoning, setShowReasoning] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tChat = useTranslations('chat');

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiClient.post<ChatResponse>('/api/v1/chatbot/chat', { message, context: { current_page: pathname } });
      return response;
    },
    onSuccess: (response) => {
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: response.answer, response, timestamp: new Date() }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua mensagem.', timestamp: new Date() }]);
    }
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    chatMutation.mutate(input.trim());
    setInput('');
  };

  const handleSuggestionClick = (suggestion: string) => { setInput(suggestion); inputRef.current?.focus(); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="chat-button fixed bottom-6 right-6 w-14 h-14 text-white rounded-full shadow-lg hover:scale-105 hover:shadow-2xl transform-gpu flex items-center justify-center z-50 ring-2 ring-transparent focus:outline-none"
        aria-label={isOpen ? tCommon('close') : tDashboard('chatbot.open')}
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          // Inline robot SVG to clearly indicate AI assistant
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="3" y="7" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="8.5" cy="12" r="0.9" fill="currentColor" />
            <circle cx="15.5" cy="12" r="0.9" fill="currentColor" />
            <path d="M9 16c.6.6 1.4 1 3 1s2.4-.4 3-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="9" y="3" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-28 right-6 w-96 h-[500px] bg-white dark:bg-slate-800 rounded-xl shadow-2xl dark:shadow-black/30 flex flex-col z-50 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3 bg-primary-600 dark:bg-primary-700 text-white rounded-t-xl">
            <div className="flex items-center gap-2"><SparklesIcon className="h-5 w-5" /><span className="font-medium">{tChat('title')}</span></div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-primary-700 dark:hover:bg-primary-800 rounded" aria-label={tCommon('close') || 'Fechar'}><XMarkIcon className="h-5 w-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8"><SparklesIcon className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" /><p className="text-sm">{tChat('welcomeTitle')}</p><p className="text-xs mt-1">{tChat('welcomeSubtitle')}</p></div>
            ) : messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-primary-600 dark:bg-primary-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'}`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === 'assistant' && msg.response && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2"><ConfidenceBadge level={msg.response.confidence_level} score={msg.response.confidence} />{msg.response.requires_human_validation && (<span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1"><ExclamationTriangleIcon className="h-3 w-3" />Validar</span>)}</div>
                      {msg.response.reasoning_steps?.length > 0 && (<button onClick={() => setShowReasoning(showReasoning === msg.id ? null : msg.id)} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">{showReasoning === msg.id ? 'Ocultar raciocínio' : 'Ver raciocínio'}</button>)}
                      {showReasoning === msg.id && (<div className="bg-gray-50 dark:bg-slate-600 rounded p-2 text-xs"><ol className="list-decimal list-inside space-y-1">{msg.response.reasoning_steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>)}
                      <SourceList sources={msg.response.sources} />
                      {msg.response.suggestions?.length > 0 && (<div className="flex flex-wrap gap-1 mt-2">{msg.response.suggestions.map((s, idx) => (<button key={idx} onClick={() => handleSuggestionClick(s)} className="text-xs bg-white dark:bg-slate-600 border border-gray-200 dark:border-slate-500 rounded-full px-2 py-1 hover:bg-gray-50 dark:hover:bg-slate-500 transition-colors text-gray-700 dark:text-gray-200">{s}</button>))}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-slate-700">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={tChat('inputPlaceholder')} className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" disabled={chatMutation.isPending} />
              <button onClick={handleSend} disabled={!input.trim() || chatMutation.isPending} className="px-3 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><PaperAirplaneIcon className="h-5 w-5" /></button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
