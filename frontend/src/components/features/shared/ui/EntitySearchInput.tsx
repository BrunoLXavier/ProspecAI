/**
 * EntitySearchInput - Searchable dropdown for selecting entities
 * 
 * Fetches entities from API based on type and allows filtering
 * Used in CommunicationModal to link threads to entities
 * Pre-loads 5 most recent entities when opening
 * 
 * Implements RF-08: Communications and collaboration
 */
'use client';

import { Fragment, useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Combobox, Transition } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, MagnifyingGlassIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { createPortal } from 'react-dom';

interface Entity {
  id: string;
  name: string;
  description?: string;
}

interface EntitySearchInputProps {
  entityType: string;
  value: string;
  onChange: (id: string, name?: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Map entity types to API endpoints
const ENTITY_ENDPOINTS: Record<string, string> = {
  proposal: '/api/v1/proposals',
  client: '/api/v1/clients',
  funding_source: '/api/v1/funding',
  opportunity: '/api/v1/opportunities',
  project: '/api/v1/portfolio/projects',
};

// Map entity types to display field names
const ENTITY_NAME_FIELDS: Record<string, string[]> = {
  proposal: ['title', 'name'],
  client: ['company_name', 'name', 'contact_name'],
  funding_source: ['name', 'title'],
  opportunity: ['title', 'name'],
  project: ['title', 'name'],
};

export default function EntitySearchInput({
  entityType,
  value,
  onChange,
  placeholder = 'Search entities...',
  disabled = false,
}: EntitySearchInputProps) {
  const t = useTranslations('common');
  const [query, setQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Fetch entities based on type
  const { data: entities = [], isLoading } = useQuery<Entity[]>({
    queryKey: ['entities', entityType],
    queryFn: async () => {
      const endpoint = ENTITY_ENDPOINTS[entityType];
      if (!endpoint) return [];
      
      try {
        const response = await apiClient.get(endpoint);
        const items = response.items || response || [];
        
        // Normalize entities to common format
        const nameFields = ENTITY_NAME_FIELDS[entityType] || ['name', 'title'];
        return items.map((item: any) => {
          let name = '';
          for (const field of nameFields) {
            if (item[field]) {
              name = item[field];
              break;
            }
          }
          return {
            id: item.id,
            name: name || `ID: ${item.id?.substring(0, 8)}...`,
            description: item.description || item.summary || undefined,
          };
        });
      } catch (error) {
        console.error(`Failed to fetch ${entityType} entities:`, error);
        return [];
      }
    },
    enabled: Boolean(entityType),
    staleTime: 30000, // 30 seconds
  });

  // Set selected entity when value changes
  useEffect(() => {
    if (value && entities.length > 0) {
      const found = entities.find((e: Entity) => e.id === value);
      if (found) {
        setSelectedEntity(found);
      }
    } else if (!value) {
      setSelectedEntity(null);
    }
  }, [value, entities]);

  // Filter entities based on query
  // When no query: show first 5 most recent
  // When typing: search all entities
  const filteredEntities = useMemo(() => {
    if (!query) {
      // Show only 5 most recent entities when no search query
      return entities.slice(0, 5);
    }
    const lowerQuery = query.toLowerCase();
    return entities.filter(
      (entity: Entity) =>
        entity.name.toLowerCase().includes(lowerQuery) ||
        entity.id.toLowerCase().includes(lowerQuery) ||
        entity.description?.toLowerCase().includes(lowerQuery)
    );
  }, [entities, query]);

  // Check if there are more entities than shown
  const hasMoreEntities = !query && entities.length > 5;

  const handleSelect = (entity: Entity | null) => {
    setSelectedEntity(entity);
    onChange(entity?.id || '', entity?.name);
  };

  return (
    <Combobox value={selectedEntity} onChange={handleSelect} disabled={disabled}>
      <div className="relative">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <Combobox.Input
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            displayValue={(entity: Entity | null) => entity?.name || ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isLoading ? t('loading') : placeholder}
          />
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </Combobox.Button>
        </div>

        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options 
            className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-slate-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
            style={{ position: 'absolute' }}
          >
            {isLoading ? (
              <div className="relative cursor-default select-none py-3 px-4 text-gray-500 dark:text-gray-400 text-center">
                <span className="animate-pulse">{t('loadingEntities')}</span>
              </div>
            ) : entities.length === 0 ? (
              <div className="relative cursor-default select-none py-4 px-4 text-gray-500 dark:text-gray-400 text-center">
                <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium">{t('noRecordsFound')}</p>
                <p className="text-xs mt-1">{t('noRecordsOfType')}</p>
              </div>
            ) : filteredEntities.length === 0 ? (
              <div className="relative cursor-default select-none py-3 px-4 text-gray-500 dark:text-gray-400 text-center">
                <p>{t('noResultsFor', { query })}</p>
                <p className="text-xs mt-1">{t('tryAnotherSearch')}</p>
              </div>
            ) : (
              <>
                {/* Option to clear selection */}
                {selectedEntity && (
                  <Combobox.Option
                    value={null}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 px-4 ${
                        active ? 'bg-gray-100 dark:bg-slate-600' : ''
                      } text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-600`
                    }
                  >
                    <span className="italic">{t('clearSelection')}</span>
                  </Combobox.Option>
                )}
                
                {filteredEntities.map((entity: Entity) => (
                  <Combobox.Option
                    key={entity.id}
                    value={entity}
                    className={({ active }) =>
                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                        active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100' : 'text-gray-900 dark:text-white'
                      }`
                    }
                  >
                    {({ selected, active }) => (
                      <>
                        <div className="flex flex-col">
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {entity.name}
                          </span>
                          {entity.description && (
                            <span className={`block truncate text-xs ${active ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}>
                              {entity.description.length > 60 
                                ? entity.description.substring(0, 60) + '...' 
                                : entity.description}
                            </span>
                          )}
                          <span className={`block text-xs font-mono ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            ID: {entity.id.substring(0, 8)}...
                          </span>
                        </div>
                        {selected && (
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))}
                
                {/* Hint about more entities */}
                {hasMoreEntities && (
                  <div className="py-2 px-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-600/50 border-t border-gray-100 dark:border-gray-600">
                    💡 {t('typeToSearchAll', { count: entities.length })}
                  </div>
                )}
              </>
            )}
          </Combobox.Options>
        </Transition>
      </div>
    </Combobox>
  );
}
