/**
 * InfrastructureModal - Full CRUD Modal
 * Implements RF-03: Portfólio Institucional - Gestão de Infraestrutura
 * Complete with all entity fields organized in tabs
 */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

// Types
interface Infrastructure {
  id?: string;
  instituto_id: string;
  nome: string;
  descricao: string;
  email_laboratorio: string;
  email_responsavel: string;
  area_predial_m2: number;
  status_isi: string;
  maturidade_gestao?: string;
  maturidade_base_tecnologica?: number;
  maturidade_produtos_servicos?: number;
  maturidade_cooperacao?: number;
  plataformas_tecnologicas: string[];
  areas_conhecimento: string[];
  macroareas_pesquisa: string[];
  midias: MediaItem[];
  equipamentos: EquipmentItem[];
}

interface MediaItem {
  url: string;
  type: string;
  description?: string;
  added_at?: string;
}

interface EquipmentItem {
  id?: string;
  nome: string;
  serial?: string;
  descricao?: string;
  status?: string;
  added_at?: string;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  resource: Infrastructure | null;
}

const statusOptions = [
  { value: 'Operacional', label: 'Operacional' },
  { value: 'Em Manutenção', label: 'Em Manutenção' },
  { value: 'Inativo', label: 'Inativo' },
];

const maturidadeGestaoOptions = [
  'M1a', 'M1b', 'M1c',
  'M2a', 'M2b', 'M2c',
  'M3a', 'M3b', 'M3c',
  'M4a', 'M4b', 'M4c',
];

const predefinedPlatforms = [
  'IoT',
  'Robótica',
  'IA/ML',
  'Automação Industrial',
  'Realidade Estendida',
  'Manufatura Aditiva',
  'Nanotecnologia',
  'Biotecnologia',
  'Eletrônica',
  'Energia',
];

const predefinedAreas = [
  'Ciências Exatas',
  'Engenharias',
  'Ciências Biológicas',
  'Ciências da Saúde',
  'Ciências Agrárias',
  'Ciências Sociais',
  'Ciências Humanas',
  'Linguística e Artes',
];

const predefinedMacroareas = [
  'Manufatura Avançada',
  'Mobilidade',
  'Energia Sustentável',
  'Saúde',
  'Segurança',
  'TIC',
  'Meio Ambiente',
];

export default function InfrastructureModal({ isOpen, onClose, resource }: Props) {
  const t = useTranslations('infrastructure');
  const queryClient = useQueryClient();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [newPlatform, setNewPlatform] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newMacroarea, setNewMacroarea] = useState('');
  const [newMedia, setNewMedia] = useState<MediaItem>({ url: '', type: 'image', description: '' });
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipSerial, setNewEquipSerial] = useState('');
  const [newEquipDesc, setNewEquipDesc] = useState('');
  const [newEquipStatus, setNewEquipStatus] = useState('');

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<Infrastructure>({
    defaultValues: {
      instituto_id: '',
      nome: '',
      descricao: '',
      email_laboratorio: '',
      email_responsavel: '',
      area_predial_m2: 0,
      status_isi: 'Operacional',
      maturidade_gestao: '',
      maturidade_base_tecnologica: undefined,
      maturidade_produtos_servicos: undefined,
      maturidade_cooperacao: undefined,
      plataformas_tecnologicas: [],
      areas_conhecimento: [],
      macroareas_pesquisa: [],
      midias: [],
      equipamentos: [],
    }
  });

  // Fetch institutes for dropdown (use stable public institutes endpoint)
  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes', 'for-infra-modal'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/institutes');
        // apiClient returns response.data already; support different shapes
        return (res && (res.items || res.data || res)) || [];
      } catch (e) {
        console.debug('[InfrastructureModal] Failed loading institutes', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  // Watch arrays for UI updates
  const plataformas = watch('plataformas_tecnologicas') || [];
  const areas = watch('areas_conhecimento') || [];
  const macroareas = watch('macroareas_pesquisa') || [];
  const midias = watch('midias') || [];
  const equipamentos = watch('equipamentos') || [];

  useEffect(() => {
    if (resource) {
      reset({
        instituto_id: resource.instituto_id || '',
        nome: resource.nome || '',
        descricao: resource.descricao || '',
        email_laboratorio: resource.email_laboratorio || '',
        email_responsavel: resource.email_responsavel || '',
        area_predial_m2: resource.area_predial_m2 || 0,
        status_isi: resource.status_isi || 'Operacional',
        maturidade_gestao: resource.maturidade_gestao || '',
        maturidade_base_tecnologica: resource.maturidade_base_tecnologica,
        maturidade_produtos_servicos: resource.maturidade_produtos_servicos,
        maturidade_cooperacao: resource.maturidade_cooperacao,
        plataformas_tecnologicas: resource.plataformas_tecnologicas || [],
        areas_conhecimento: resource.areas_conhecimento || [],
        macroareas_pesquisa: resource.macroareas_pesquisa || [],
        midias: resource.midias || [],
        equipamentos: resource.equipamentos || [],
      });
    } else {
      reset({
        instituto_id: '',
        nome: '',
        descricao: '',
        email_laboratorio: '',
        email_responsavel: '',
        area_predial_m2: 0,
        status_isi: 'Operacional',
        maturidade_gestao: '',
        maturidade_base_tecnologica: undefined,
        maturidade_produtos_servicos: undefined,
        maturidade_cooperacao: undefined,
        plataformas_tecnologicas: [],
        areas_conhecimento: [],
        macroareas_pesquisa: [],
        midias: [],
        equipamentos: [],
      });
    }
  }, [resource, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: Infrastructure) => {
      if (resource?.id) {
        return apiClient.patch(`/api/v1/infrastructures/${resource.id}`, data);
      }
      return apiClient.post('/api/v1/infrastructures', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
      queryClient.invalidateQueries({ queryKey: ['infrastructures'] });
      onClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/infrastructures/${resource!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['infrastructure'] });
      queryClient.invalidateQueries({ queryKey: ['infrastructures'] });
      onClose();
    },
  });

  const onSubmit = (data: Infrastructure) => {
    saveMutation.mutate(data);
  };

  // Array management functions
  const addPlatform = () => {
    if (newPlatform && !plataformas.includes(newPlatform)) {
      setValue('plataformas_tecnologicas', [...plataformas, newPlatform]);
      setNewPlatform('');
    }
  };

  const removePlatform = (item: string) => {
    setValue('plataformas_tecnologicas', plataformas.filter(p => p !== item));
  };

  const addArea = () => {
    if (newArea && !areas.includes(newArea)) {
      setValue('areas_conhecimento', [...areas, newArea]);
      setNewArea('');
    }
  };

  const removeArea = (item: string) => {
    setValue('areas_conhecimento', areas.filter(a => a !== item));
  };

  const addMacroarea = () => {
    if (newMacroarea && !macroareas.includes(newMacroarea)) {
      setValue('macroareas_pesquisa', [...macroareas, newMacroarea]);
      setNewMacroarea('');
    }
  };

  const removeMacroarea = (item: string) => {
    setValue('macroareas_pesquisa', macroareas.filter(m => m !== item));
  };

  const addMedia = () => {
    if (newMedia.url) {
      setValue('midias', [...midias, { ...newMedia, added_at: new Date().toISOString() }]);
      setNewMedia({ url: '', type: 'image', description: '' });
    }
  };

  const removeMedia = (index: number) => {
    setValue('midias', midias.filter((_, i) => i !== index));
  };

  // Equipments management
  const addEquipment = (item: EquipmentItem) => {
    const toAdd = { ...item, added_at: new Date().toISOString() };
    setValue('equipamentos', [...equipamentos, toAdd]);
  };

  const removeEquipment = (index: number) => {
    setValue('equipamentos', equipamentos.filter((_, i) => i !== index));
  };

  const tabs = [
    { name: t('basicInfo') || 'Informações Básicas', key: 'basic' },
    { name: t('equipmentsTab') || 'Equipamentos', key: 'equipments' },
    { name: t('areasTab') || 'Áreas e Plataformas', key: 'areas' },
    { name: t('mediaTab') || 'Mídias', key: 'media' },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      {resource ? resource.nome : t('newInfrastructure') || 'Nova Infraestrutura'}
                    </Dialog.Title>
                    {resource && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">ID: {resource.id}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Form with Tabs */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Tab.Group selectedIndex={selectedTabIndex} onChange={setSelectedTabIndex}>
                    <Tab.List className="flex space-x-1 border-b border-gray-200 dark:border-gray-700 px-6 bg-gray-50 dark:bg-slate-900">
                      {tabs.map((tab) => (
                        <Tab
                          key={tab.key}
                          className={({ selected }) =>
                            `px-4 py-3 text-sm font-medium transition-colors focus:outline-none ${
                              selected
                                ? 'text-primary-600 border-b-2 border-primary-600'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`
                          }
                        >
                          {tab.name}
                        </Tab>
                      ))}
                    </Tab.List>

                    <Tab.Panels className="p-6 max-h-[60vh] overflow-y-auto">
                      {/* Tab 1: Basic Info */}
                      <Tab.Panel className="space-y-4">
                        {/* Institute Selector */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('institute') || 'Instituto'} *
                          </label>
                          <select
                            {...register('instituto_id', { required: true })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          >
                            <option value="">{t('selectInstitute') || 'Selecione um instituto'}</option>
                            {institutes?.map((inst: any) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.nome || inst.name}
                              </option>
                            ))}
                          </select>
                          {errors.instituto_id && (
                            <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                          )}
                        </div>

                        {/* Nome */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('name') || 'Nome'} *
                          </label>
                          <input
                            {...register('nome', { required: true, minLength: 1, maxLength: 300 })}
                            placeholder="e.g. Laboratório de Realidade Estendida"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                          {errors.nome && (
                            <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                          )}
                        </div>

                        {/* Descrição */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('description') || 'Descrição'} *
                          </label>
                          <textarea
                            {...register('descricao', { required: true, minLength: 1, maxLength: 4000 })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                          />
                          {errors.descricao && (
                            <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                          )}
                        </div>

                        {/* Emails */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('labEmail') || 'Email do Laboratório'} *
                            </label>
                            <input
                              type="email"
                              {...register('email_laboratorio', { required: true })}
                              placeholder="lab@senai.br"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            {errors.email_laboratorio && (
                              <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('responsibleEmail') || 'Email do Responsável'} *
                            </label>
                            <input
                              type="email"
                              {...register('email_responsavel', { required: true })}
                              placeholder="responsavel@senai.br"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            {errors.email_responsavel && (
                              <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                            )}
                          </div>
                        </div>

                        {/* Área e Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('areaM2') || 'Área Predial (m²)'} *
                            </label>
                            <input
                              type="number"
                              {...register('area_predial_m2', { required: true, min: 0, valueAsNumber: true })}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            {errors.area_predial_m2 && (
                              <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('status') || 'Status'}
                            </label>
                            <select
                              {...register('status_isi')}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 2: Equipments */}
                      <Tab.Panel className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{t('equipmentsHint') || 'Registre equipamentos associados a esta infraestrutura.'}</p>
                        </div>

                        {/* Add equipment form */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('equipmentName') || 'Nome'}</label>
                            <input value={newEquipName} onChange={(e) => setNewEquipName(e.target.value)} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('equipmentSerial') || 'Serial'}</label>
                            <input value={newEquipSerial} onChange={(e) => setNewEquipSerial(e.target.value)} className="w-full px-3 py-2 border rounded" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('equipmentStatus') || 'Status'}</label>
                            <select value={newEquipStatus} onChange={(e) => setNewEquipStatus(e.target.value)} className="w-full px-3 py-2 border rounded">
                              <option value="">{t('select') || 'Select'}</option>
                              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">&nbsp;</label>
                            <div className="flex gap-2">
                              <input value={newEquipDesc} onChange={(e) => setNewEquipDesc(e.target.value)} placeholder={t('equipmentDesc') || 'Descrição'} className="flex-1 px-3 py-2 border rounded" />
                              <button type="button" onClick={() => { if (newEquipName) { addEquipment({ nome: newEquipName, serial: newEquipSerial, descricao: newEquipDesc, status: newEquipStatus }); setNewEquipName(''); setNewEquipSerial(''); setNewEquipDesc(''); setNewEquipStatus(''); } }} className="px-3 py-2 bg-primary-600 text-white rounded">{t('add') || 'Adicionar'}</button>
                            </div>
                          </div>
                        </div>

                        {/* List equipments */}
                        <div className="space-y-2 mt-4">
                          {equipamentos.length === 0 && <p className="text-sm text-gray-500">{t('noEquipments') || 'Nenhum equipamento registrado.'}</p>}
                          {equipamentos.map((eq: EquipmentItem, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-3 border rounded">
                              <div>
                                <div className="font-medium">{eq.nome} {eq.serial ? `(${eq.serial})` : ''}</div>
                                <div className="text-sm text-gray-500">{eq.descricao}</div>
                                <div className="text-xs text-gray-400">{eq.status}</div>
                              </div>
                              <div>
                                <button type="button" onClick={() => removeEquipment(idx)} className="text-red-600">{t('remove') || 'Remover'}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Tab.Panel>

                      {/* Tab 3: Areas and Platforms */}
                      <Tab.Panel className="space-y-6">
                        {/* Technology Platforms */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('techPlatforms') || 'Plataformas Tecnológicas'}
                          </label>
                          <div className="flex gap-2 mb-2">
                            <select
                              value={newPlatform}
                              onChange={(e) => setNewPlatform(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              <option value="">{t('selectOrType') || 'Selecione ou digite'}</option>
                              {predefinedPlatforms.filter(p => !plataformas.includes(p)).map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newPlatform}
                              onChange={(e) => setNewPlatform(e.target.value)}
                              placeholder={t('customPlatform') || 'Ou digite uma nova...'}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={addPlatform}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              <PlusIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {plataformas.map((p) => (
                              <span key={p} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {p}
                                <button type="button" onClick={() => removePlatform(p)} className="ml-2 text-blue-600 hover:text-blue-800">
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Knowledge Areas */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('knowledgeAreas') || 'Áreas de Conhecimento'}
                          </label>
                          <div className="flex gap-2 mb-2">
                            <select
                              value={newArea}
                              onChange={(e) => setNewArea(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              <option value="">{t('selectOrType') || 'Selecione ou digite'}</option>
                              {predefinedAreas.filter(a => !areas.includes(a)).map(a => (
                                <option key={a} value={a}>{a}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newArea}
                              onChange={(e) => setNewArea(e.target.value)}
                              placeholder={t('customArea') || 'Ou digite uma nova...'}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={addArea}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              <PlusIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {areas.map((a) => (
                              <span key={a} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                {a}
                                <button type="button" onClick={() => removeArea(a)} className="ml-2 text-green-600 hover:text-green-800">
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Research Macro-areas */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('researchMacroareas') || 'Macroáreas de Pesquisa'}
                          </label>
                          <div className="flex gap-2 mb-2">
                            <select
                              value={newMacroarea}
                              onChange={(e) => setNewMacroarea(e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              <option value="">{t('selectOrType') || 'Selecione ou digite'}</option>
                              {predefinedMacroareas.filter(m => !macroareas.includes(m)).map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={newMacroarea}
                              onChange={(e) => setNewMacroarea(e.target.value)}
                              placeholder={t('customMacroarea') || 'Ou digite uma nova...'}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={addMacroarea}
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                              <PlusIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {macroareas.map((m) => (
                              <span key={m} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                {m}
                                <button type="button" onClick={() => removeMacroarea(m)} className="ml-2 text-purple-600 hover:text-purple-800">
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 4: Media */}
                      <Tab.Panel className="space-y-4">
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            {t('addMedia') || 'Adicionar Mídia'}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <input
                              type="url"
                              value={newMedia.url}
                              onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })}
                              placeholder="URL da mídia"
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                            <select
                              value={newMedia.type}
                              onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value })}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            >
                              <option value="image">{t('image') || 'Imagem'}</option>
                              <option value="video">{t('video') || 'Vídeo'}</option>
                              <option value="document">{t('document') || 'Documento'}</option>
                              <option value="3d_model">{t('3dModel') || 'Modelo 3D'}</option>
                            </select>
                            <input
                              type="text"
                              value={newMedia.description || ''}
                              onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })}
                              placeholder={t('mediaDescription') || 'Descrição'}
                              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addMedia}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                          >
                            <PlusIcon className="w-4 h-4" />
                            {t('add') || 'Adicionar'}
                          </button>
                        </div>

                        {/* Media List */}
                        <div className="space-y-2">
                          {midias.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                              {t('noMedia') || 'Nenhuma mídia adicionada'}
                            </p>
                          ) : (
                            midias.map((media, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded">
                                      {media.type}
                                    </span>
                                    <a
                                      href={media.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate max-w-xs"
                                    >
                                      {media.url}
                                    </a>
                                  </div>
                                  {media.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{media.description}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeMedia(index)}
                                  className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>
                  </Tab.Group>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
                    <div>
                      {resource && (
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate()}
                          disabled={deleteMutation.isPending}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {t('delete') || 'Excluir'}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                      >
                        {t('cancel') || 'Cancelar'}
                      </button>
                      <button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        {saveMutation.isPending
                          ? (t('saving') || 'Salvando...')
                          : resource
                            ? (t('save') || 'Salvar')
                            : (t('create') || 'Criar')}
                      </button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
