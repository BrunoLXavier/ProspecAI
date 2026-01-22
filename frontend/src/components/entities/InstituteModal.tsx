/**
 * InstituteModal
 * Full CRUD modal for Institute management with all fields
 * Implements RF-03: Portfólio Institucional
 */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { XMarkIcon, BuildingOffice2Icon, MapPinIcon, ChartBarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

interface InstituteFormData {
  nome: string;
  nome_fantasia: string;
  isi_sigla: string;
  descricao: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cep: string;
  endereco_cidade: string;
  endereco_uf: string;
  area_predial_m2: number | null;
  status_operacional: string;
  status: string;
  maturidade_gestao: string;
  maturidade_base_tecnologica: number | null;
  maturidade_produtos_servicos: number | null;
  maturidade_cooperacao: number | null;
  credenciamento_cati: boolean;
  credenciamento_ed: boolean;
  logo_url: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  institute: any | null;
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const STATUS_OPERACIONAL_OPTIONS = [
  { value: 'Operacional', label: 'Operacional' },
  { value: 'Em Implantação', label: 'Em Implantação' },
  { value: 'Inativo', label: 'Inativo' },
];

const STATUS_OPTIONS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Inativo', label: 'Inativo' },
];

const MATURIDADE_GESTAO_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'M1a', label: 'M1a' }, { value: 'M1b', label: 'M1b' }, { value: 'M1c', label: 'M1c' },
  { value: 'M2a', label: 'M2a' }, { value: 'M2b', label: 'M2b' }, { value: 'M2c', label: 'M2c' },
  { value: 'M3a', label: 'M3a' }, { value: 'M3b', label: 'M3b' }, { value: 'M3c', label: 'M3c' },
  { value: 'M4a', label: 'M4a' }, { value: 'M4b', label: 'M4b' }, { value: 'M4c', label: 'M4c' },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function InstituteModal({ isOpen, onClose, institute }: Props) {
  const t = useTranslations('institutes');
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);

  const defaultValues: InstituteFormData = {
    nome: '', nome_fantasia: '', isi_sigla: '', descricao: '',
    endereco_rua: '', endereco_numero: '', endereco_complemento: '',
    endereco_bairro: '', endereco_cep: '', endereco_cidade: '', endereco_uf: 'SP',
    area_predial_m2: null, status_operacional: 'Operacional', status: 'Ativo',
    maturidade_gestao: '', maturidade_base_tecnologica: null,
    maturidade_produtos_servicos: null, maturidade_cooperacao: null,
    credenciamento_cati: false, credenciamento_ed: false, logo_url: '',
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<InstituteFormData>({ defaultValues });

  useEffect(() => {
    if (institute) {
      reset({
        nome: institute.nome || institute.name || '',
        nome_fantasia: institute.nome_fantasia || '',
        isi_sigla: institute.isi_sigla || institute.code || '',
        descricao: institute.descricao || institute.description || '',
        endereco_rua: institute.endereco_rua || '',
        endereco_numero: institute.endereco_numero || '',
        endereco_complemento: institute.endereco_complemento || '',
        endereco_bairro: institute.endereco_bairro || '',
        endereco_cep: institute.endereco_cep || '',
        endereco_cidade: institute.endereco_cidade || '',
        endereco_uf: institute.endereco_uf || 'SP',
        area_predial_m2: institute.area_predial_m2 || null,
        status_operacional: institute.status_operacional || 'Operacional',
        status: institute.status || 'Ativo',
        maturidade_gestao: institute.maturidade_gestao || '',
        maturidade_base_tecnologica: institute.maturidade_base_tecnologica || null,
        maturidade_produtos_servicos: institute.maturidade_produtos_servicos || null,
        maturidade_cooperacao: institute.maturidade_cooperacao || null,
        credenciamento_cati: institute.credenciamento_cati || false,
        credenciamento_ed: institute.credenciamento_ed || false,
        logo_url: institute.logo_url || '',
      });
      setSelectedTab(0);
    } else {
      reset(defaultValues);
      setSelectedTab(0);
    }
  }, [institute, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: InstituteFormData) => {
      const payload = {
        ...data,
        area_predial_m2: data.area_predial_m2 ? Number(data.area_predial_m2) : null,
        maturidade_base_tecnologica: data.maturidade_base_tecnologica ? Number(data.maturidade_base_tecnologica) : null,
        maturidade_produtos_servicos: data.maturidade_produtos_servicos ? Number(data.maturidade_produtos_servicos) : null,
        maturidade_cooperacao: data.maturidade_cooperacao ? Number(data.maturidade_cooperacao) : null,
      };
      if (institute?.id) return apiClient.put(`/api/v1/institutes/${institute.id}`, payload);
      return apiClient.post('/api/v1/institutes', payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['institutes'] }); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/institutes/${institute!.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['institutes'] }); onClose(); },
  });

  const onSubmit = (data: InstituteFormData) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Informações Básicas', icon: BuildingOffice2Icon },
    { name: t('tabs.address') || 'Endereço', icon: MapPinIcon },
    { name: t('tabs.maturity') || 'Maturidade', icon: ChartBarIcon },
    { name: t('tabs.accreditation') || 'Credenciamento', icon: CheckBadgeIcon },
  ];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-xl transition-all">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <BuildingOffice2Icon className="w-6 h-6 text-primary-600" />
                      {institute ? watch('nome') || institute.nome : t('new') || 'Novo Instituto'}
                    </Dialog.Title>
                    {institute && <p className="text-sm text-gray-500 mt-1">{watch('isi_sigla') || institute.isi_sigla}</p>}
                  </div>
                  <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                  <Tab.List className="flex border-b border-gray-200 dark:border-gray-700 px-6">
                    {tabs.map((tab) => (
                      <Tab key={tab.name} className={({ selected }) => classNames('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px outline-none', selected ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')}>
                        <tab.icon className="w-4 h-4" />{tab.name}
                      </Tab>
                    ))}
                  </Tab.List>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <Tab.Panels className="p-6 max-h-[60vh] overflow-y-auto">
                      {/* Tab 1: Basic Info */}
                      <Tab.Panel className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.nome') || 'Nome'} *</label>
                            <input {...register('nome', { required: 'Nome é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="ISI em Sistemas Virtuais de Produção" />
                            {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.nome_fantasia') || 'Nome Fantasia'}</label>
                            <input {...register('nome_fantasia')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="ISI SVP" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.isi_sigla') || 'Sigla ISI'} *</label>
                            <input {...register('isi_sigla', { required: 'Sigla é obrigatória' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="ISI em Sistemas Virtuais" />
                            {errors.isi_sigla && <p className="text-red-500 text-xs mt-1">{errors.isi_sigla.message}</p>}
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.descricao') || 'Descrição'} *</label>
                            <textarea {...register('descricao', { required: 'Descrição é obrigatória' })} rows={4} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Descrição detalhada do instituto..." />
                            {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.status_operacional') || 'Status Operacional'}</label>
                            <select {...register('status_operacional')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              {STATUS_OPERACIONAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.status') || 'Status'}</label>
                            <select {...register('status')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.logo_url') || 'URL do Logo'}</label>
                            <input {...register('logo_url')} type="url" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="https://..." />
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 2: Address */}
                      <Tab.Panel className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_rua') || 'Rua'} *</label>
                            <input {...register('endereco_rua', { required: 'Rua é obrigatória' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Rua Dr. João Colin" />
                            {errors.endereco_rua && <p className="text-red-500 text-xs mt-1">{errors.endereco_rua.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_numero') || 'Número'}</label>
                            <input {...register('endereco_numero')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="2700" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_complemento') || 'Complemento'}</label>
                            <input {...register('endereco_complemento')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Bloco A, Sala 101" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_bairro') || 'Bairro'} *</label>
                            <input {...register('endereco_bairro', { required: 'Bairro é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Santo Antônio" />
                            {errors.endereco_bairro && <p className="text-red-500 text-xs mt-1">{errors.endereco_bairro.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_cep') || 'CEP'} *</label>
                            <input {...register('endereco_cep', { required: 'CEP é obrigatório', pattern: { value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' } })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="89218-035" />
                            {errors.endereco_cep && <p className="text-red-500 text-xs mt-1">{errors.endereco_cep.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_cidade') || 'Cidade'} *</label>
                            <input {...register('endereco_cidade', { required: 'Cidade é obrigatória' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Joinville" />
                            {errors.endereco_cidade && <p className="text-red-500 text-xs mt-1">{errors.endereco_cidade.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.endereco_uf') || 'UF'} *</label>
                            <select {...register('endereco_uf', { required: 'UF é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                            </select>
                            {errors.endereco_uf && <p className="text-red-500 text-xs mt-1">{errors.endereco_uf.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.area_predial_m2') || 'Área Predial (m²)'}</label>
                            <input {...register('area_predial_m2', { valueAsNumber: true })} type="number" min="0" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="5000" />
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 3: Maturity */}
                      <Tab.Panel className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm text-blue-700 dark:text-blue-300">{t('maturity_hint') || 'Níveis de maturidade conforme modelo ISI (M1a a M4c para gestão, 0-5 para demais indicadores).'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.maturidade_gestao') || 'Maturidade de Gestão'}</label>
                            <select {...register('maturidade_gestao')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              {MATURIDADE_GESTAO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.maturidade_base_tecnologica') || 'Base Tecnológica'}</label>
                            <input {...register('maturidade_base_tecnologica', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="0.0 - 5.0" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.maturidade_produtos_servicos') || 'Produtos e Serviços'}</label>
                            <input {...register('maturidade_produtos_servicos', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="0.0 - 5.0" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.maturidade_cooperacao') || 'Cooperação'}</label>
                            <input {...register('maturidade_cooperacao', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="0.0 - 5.0" />
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 4: Accreditation */}
                      <Tab.Panel className="space-y-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm text-green-700 dark:text-green-300">{t('accreditation_hint') || 'Credenciamentos oficiais do instituto junto aos órgãos reguladores.'}</p>
                        </div>
                        <div className="space-y-4">
                          <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" {...register('credenciamento_cati')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{t('fields.credenciamento_cati') || 'Credenciamento CATI'}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Centro de Apoio à Tecnologia e Inovação</p>
                            </div>
                          </label>
                          <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                            <input type="checkbox" {...register('credenciamento_ed')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{t('fields.credenciamento_ed') || 'Credenciamento Embrapii'}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">Empresa Brasileira de Pesquisa e Inovação Industrial</p>
                            </div>
                          </label>
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        {institute && (
                          <button type="button" onClick={() => { if (confirm(t('confirmDelete') || 'Tem certeza que deseja excluir este instituto?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            {t('delete') || 'Excluir'}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('cancel') || 'Cancelar'}</button>
                        <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                          {saveMutation.isPending ? (t('saving') || 'Salvando...') : (institute ? (t('save') || 'Salvar') : (t('create') || 'Criar'))}
                        </button>
                      </div>
                    </div>
                  </form>
                </Tab.Group>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
