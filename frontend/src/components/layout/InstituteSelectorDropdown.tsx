/**
 * InstituteSelectorDropdown Component
 * Multi-select combobox for institute selection with chips, search, and localStorage persistence.
 * Implements RF-03: Institute-scoped data filtering
 */
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface Institute {
  id: string;
  name?: string;
  nome?: string;
  title?: string;
  label?: string;
  code?: string;
  isi_sigla?: string;
  is_admin?: boolean;
  managed?: boolean;
  user_role?: string;
  role?: string;
}

export function InstituteSelectorDropdown() {
  const t = useTranslations('institutes');
  const { user, selectedInstitutes, setSelectedInstitutes } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load institutes for dropdown
  const { data: institutes = [], isLoading } = useQuery<Institute[]>({
    queryKey: ['institutes', 'selector'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        const data = resp?.items ?? resp ?? [];
        console.debug('[InstituteSelectorDropdown] Full response:', resp);
        console.debug('[InstituteSelectorDropdown] Loaded institutes:', data);
        console.debug('[InstituteSelectorDropdown] Institutes count:', Array.isArray(data) ? data.length : 0);
        return data;
      } catch (e) {
        console.debug('[InstituteSelectorDropdown] Failed to load institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Get display name for institute
  const getInstituteName = (ins: Institute): string => {
    return ins.nome || ins.name || ins.title || ins.label || 'Instituto';
  };

  // Get short code for badge
  const getInstituteCode = (ins: Institute): string => {
    return ins.isi_sigla || ins.code || getInstituteName(ins).substring(0, 3).toUpperCase();
  };

  // Check if user manages this institute
  const isManagedByUser = (ins: Institute): boolean => {
    return !!(ins.is_admin || ins.managed || ins.user_role === 'admin' || ins.role === 'admin');
  };

  // Filter institutes by search query
  const filteredInstitutes = useMemo(() => {
    if (!searchQuery.trim()) return institutes;
    const query = searchQuery.toLowerCase();
    return institutes.filter(ins => {
      const name = getInstituteName(ins).toLowerCase();
      const code = getInstituteCode(ins).toLowerCase();
      return name.includes(query) || code.includes(query);
    });
  }, [institutes, searchQuery]);

  // Get selected institute objects
  const selectedInstitutesData = useMemo(() => {
    return institutes.filter(ins => selectedInstitutes.includes(ins.id));
  }, [institutes, selectedInstitutes]);

  const toggleInstitute = (id: string) => {
    if (selectedInstitutes.includes(id)) {
      setSelectedInstitutes(selectedInstitutes.filter(x => x !== id));
    } else {
      setSelectedInstitutes([...selectedInstitutes, id]);
    }
  };

  const selectAllInstitutes = () => {
    setSelectedInstitutes(institutes.map(ins => ins.id));
  };

  const clearAllInstitutes = () => {
    setSelectedInstitutes([]);
  };

  const selectMyInstitutes = () => {
    const mine = institutes.filter(isManagedByUser).map(ins => ins.id);
    if (mine.length) setSelectedInstitutes(mine);
  };

  const handleSaveSelection = async () => {
    try {
      setIsSaving(true);
      await apiClient.put('/api/v1/user/preferences/institutes', {
        user_id: user?.id ?? null,
        selectedInstitutes: selectedInstitutes,
      });
      setSavedAt(new Date().toISOString());
    } catch (e) {
      console.debug('[InstituteSelectorDropdown] Failed to save selected institutes', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Safe translation with fallback
  const safeT = (key: string, fallback: string): string => {
    try {
      const result = t(key);
      return result || fallback;
    } catch {
      return fallback;
    }
  };

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              text-sm font-medium
              ${open 
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
            `}
          >
            <BuildingOffice2Icon className="w-5 h-5" />
            
            {/* Show chips for selected institutes (max 2) */}
            {selectedInstitutesData.length > 0 ? (
              <div className="flex items-center gap-1">
                {selectedInstitutesData.slice(0, 2).map(ins => (
                  <span
                    key={ins.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium
                      bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200"
                  >
                    {getInstituteCode(ins)}
                  </span>
                ))}
                {selectedInstitutesData.length > 2 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{selectedInstitutesData.length - 2}
                  </span>
                )}
              </div>
            ) : (
              <span className="hidden sm:inline text-gray-500 dark:text-gray-400">
                {safeT('selectInstitutes', 'Selecionar Institutos')}
              </span>
            )}
            
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Popover.Button>

          <Transition
            show={open}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel
              className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl
                bg-white dark:bg-slate-800 shadow-elevated
                border border-gray-200 dark:border-slate-700
                focus:outline-none z-50"
            >
              {/* Header with search */}
              <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={safeT('searchPlaceholder', 'Buscar instituto...')}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg
                      bg-gray-50 dark:bg-slate-700
                      border border-gray-200 dark:border-slate-600
                      text-gray-900 dark:text-white
                      placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Selected chips preview */}
              {selectedInstitutesData.length > 0 && (
                <div className="p-2 border-b border-gray-200 dark:border-slate-700">
                  <div className="flex flex-wrap gap-1">
                    {selectedInstitutesData.map(ins => (
                      <span
                        key={ins.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs
                          bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200"
                      >
                        {getInstituteCode(ins)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleInstitute(ins.id);
                          }}
                          className="hover:bg-primary-200 dark:hover:bg-primary-700 rounded p-0.5"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick actions */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2 text-xs">
                <button
                  onClick={selectAllInstitutes}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  {safeT('selectAll', 'Selecionar todos')}
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={clearAllInstitutes}
                  className="text-gray-600 hover:text-gray-700 dark:text-gray-400"
                >
                  {safeT('clearAll', 'Limpar')}
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={selectMyInstitutes}
                  className="text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  {safeT('myInstitutes', 'Meus institutos')}
                </button>
              </div>

              {/* Institute list */}
              <div className="max-h-60 overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {safeT('loading', 'Carregando...')}
                  </div>
                ) : filteredInstitutes.length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    {searchQuery 
                      ? safeT('noResults', 'Nenhum instituto encontrado')
                      : safeT('noInstitutes', 'Nenhum instituto disponível')
                    }
                  </div>
                ) : (
                  filteredInstitutes.map(ins => {
                    const isSelected = selectedInstitutes.includes(ins.id);
                    const isManaged = isManagedByUser(ins);
                    return (
                      <button
                        key={ins.id}
                        onClick={() => toggleInstitute(ins.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 text-left
                          transition-colors
                          ${isSelected 
                            ? 'bg-primary-50 dark:bg-primary-900/20' 
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                          }
                        `}
                      >
                        <div className={`
                          w-5 h-5 rounded flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'bg-primary-600 text-white'
                            : 'border-2 border-gray-300 dark:border-gray-600'
                          }
                        `}>
                          {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {getInstituteName(ins)}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getInstituteCode(ins)}
                            </span>
                          </div>
                        </div>
                        
                        {isManaged && (
                          <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full
                            bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            Admin
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Footer with save button */}
              <div className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedInstitutes.length} {safeT('selected', 'selecionado(s)')}
                </div>
                <div className="flex items-center gap-2">
                  {savedAt && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ {safeT('saved', 'Salvo')}
                    </span>
                  )}
                  <button
                    onClick={handleSaveSelection}
                    disabled={isSaving}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium
                      transition-colors
                      ${isSaving 
                        ? 'opacity-70 cursor-not-allowed bg-gray-300 dark:bg-gray-600 text-gray-500' 
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                      }
                    `}
                  >
                    {isSaving ? safeT('saving', 'Salvando...') : safeT('save', 'Salvar')}
                  </button>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

export default InstituteSelectorDropdown;
