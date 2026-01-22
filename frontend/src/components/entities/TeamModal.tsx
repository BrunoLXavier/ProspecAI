/**
 * TeamModal
 * Full CRUD modal for Team (Equipe) management
 * Implements RF-03: Portfólio Institucional - Team Management
 */
'use client';

import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import { XMarkIcon, UserCircleIcon, LinkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

interface TeamFormData {
  usuario_id: string;
  instituto_id: string;
  cargo: string;
  funcao_principal: string;
  vinculo_principal: boolean;
  email_profissional: string;
  telefone_celular: string;
  linkedin_url: string;
  lattes_url: string;
  orcid_id: string;
  researchgate_url: string;
  scopus_author_id: string;
  web_of_science_researcher_id: string;
  foto_perfil_url: string;
  data_vinculo_inicio: string;
  data_vinculo_fim: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  team: any | null;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function TeamModal({ isOpen, onClose, team }: Props) {
  const t = useTranslations('teams');
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);

  const defaultValues: TeamFormData = {
    usuario_id: '', instituto_id: '', cargo: '', funcao_principal: '',
    vinculo_principal: false, email_profissional: '', telefone_celular: '',
    linkedin_url: '', lattes_url: '', orcid_id: '', researchgate_url: '',
    scopus_author_id: '', web_of_science_researcher_id: '', foto_perfil_url: '',
    data_vinculo_inicio: '', data_vinculo_fim: '',
  };

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<TeamFormData>({ defaultValues });

  // Load users and institutes for selects
  const { data: users = [] } = useQuery({
    queryKey: ['users', 'select'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/users');
        // Normalize possible response shapes (resp may already be data)
        if (!resp) return [];
        return resp.items ?? resp.data?.items ?? resp.data ?? resp ?? [];
      } catch (e) {
        console.debug('[TeamModal] Failed loading users', e);
        return [];
      }
    },
    staleTime: 60_000,
  });

  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes', 'select'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get('/api/v1/institutes');
        return resp?.items ?? resp ?? [];
      } catch { return []; }
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (team) {
      reset({
        usuario_id: team.usuario_id || '',
        instituto_id: team.instituto_id || '',
        cargo: team.cargo || '',
        funcao_principal: team.funcao_principal || '',
        vinculo_principal: team.vinculo_principal || false,
        email_profissional: team.email_profissional || '',
        telefone_celular: team.telefone_celular || '',
        linkedin_url: team.linkedin_url || '',
        lattes_url: team.lattes_url || '',
        orcid_id: team.orcid_id || '',
        researchgate_url: team.researchgate_url || '',
        scopus_author_id: team.scopus_author_id || '',
        web_of_science_researcher_id: team.web_of_science_researcher_id || '',
        foto_perfil_url: team.foto_perfil_url || '',
        data_vinculo_inicio: team.data_vinculo_inicio || '',
        data_vinculo_fim: team.data_vinculo_fim || '',
      });
      setSelectedTab(0);
    } else {
      reset(defaultValues);
      setSelectedTab(0);
    }
  }, [team, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: TeamFormData) => {
      const payload = { ...data };
      if (team?.id) return apiClient.put(`/api/v1/teams/${team.id}`, payload);
      return apiClient.post('/api/v1/teams', payload);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); onClose(); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/teams/${team!.id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); onClose(); },
  });

  const onSubmit = (data: TeamFormData) => saveMutation.mutate(data);

  const tabs = [
    { name: t('tabs.basic') || 'Informações Básicas', icon: UserCircleIcon },
    { name: t('tabs.profiles') || 'Perfis Acadêmicos', icon: LinkIcon },
    { name: t('tabs.dates') || 'Período do Vínculo', icon: CalendarIcon },
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
                      <UserCircleIcon className="w-6 h-6 text-primary-600" />
                      {team ? (watch('cargo') || team.cargo || t('edit') || 'Editar Membro') : (t('new') || 'Novo Membro da Equipe')}
                    </Dialog.Title>
                    {team && <p className="text-sm text-gray-500 mt-1">{watch('funcao_principal') || team.funcao_principal}</p>}
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
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.usuario') || 'Usuário'} *</label>
                            <select {...register('usuario_id', { required: 'Usuário é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              <option value="">Selecione...</option>
                              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                            </select>
                            {errors.usuario_id && <p className="text-red-500 text-xs mt-1">{errors.usuario_id.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.instituto') || 'Instituto'} *</label>
                            <select {...register('instituto_id', { required: 'Instituto é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500">
                              <option value="">Selecione...</option>
                              {institutes.map((i: any) => <option key={i.id} value={i.id}>{i.nome || i.name}</option>)}
                            </select>
                            {errors.instituto_id && <p className="text-red-500 text-xs mt-1">{errors.instituto_id.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.cargo') || 'Cargo'} *</label>
                            <input {...register('cargo', { required: 'Cargo é obrigatório' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Coordenador, Pesquisador Chefe, CTO..." />
                            {errors.cargo && <p className="text-red-500 text-xs mt-1">{errors.cargo.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.funcao_principal') || 'Função Principal'} *</label>
                            <input {...register('funcao_principal', { required: 'Função é obrigatória' })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="Gerência de projetos de P&D..." />
                            {errors.funcao_principal && <p className="text-red-500 text-xs mt-1">{errors.funcao_principal.message}</p>}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.email_profissional') || 'E-mail Profissional'}</label>
                            <input {...register('email_profissional')} type="email" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="nome@instituto.org.br" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.telefone_celular') || 'Telefone Celular'}</label>
                            <input {...register('telefone_celular')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="(47) 99999-9999" />
                          </div>
                          <div className="col-span-2">
                            <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
                              <input type="checkbox" {...register('vinculo_principal')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{t('fields.vinculo_principal') || 'Vínculo Principal'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{t('fields.vinculo_principal_hint') || 'Marque se este é o instituto principal do colaborador'}</p>
                              </div>
                            </label>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.foto_perfil_url') || 'URL da Foto de Perfil'}</label>
                            <input {...register('foto_perfil_url')} type="url" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="https://..." />
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 2: Academic Profiles */}
                      <Tab.Panel className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm text-blue-700 dark:text-blue-300">{t('profiles_hint') || 'Links para perfis acadêmicos e de pesquisa do colaborador.'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">LinkedIn</label>
                            <input {...register('linkedin_url')} type="url" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="https://linkedin.com/in/..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currículo Lattes</label>
                            <input {...register('lattes_url')} type="url" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="https://lattes.cnpq.br/..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ORCID iD</label>
                            <input {...register('orcid_id')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="0000-0000-0000-0000" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ResearchGate</label>
                            <input {...register('researchgate_url')} type="url" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="https://researchgate.net/profile/..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Scopus Author ID</label>
                            <input {...register('scopus_author_id')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="12345678900" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Web of Science Researcher ID</label>
                            <input {...register('web_of_science_researcher_id')} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" placeholder="A-1234-5678" />
                          </div>
                        </div>
                      </Tab.Panel>

                      {/* Tab 3: Dates */}
                      <Tab.Panel className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">{t('dates_hint') || 'Período de vigência do vínculo com o instituto.'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.data_vinculo_inicio') || 'Data de Início'}</label>
                            <input {...register('data_vinculo_inicio')} type="date" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fields.data_vinculo_fim') || 'Data de Término'}</label>
                            <input {...register('data_vinculo_fim')} type="date" className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500" />
                            <p className="text-xs text-gray-400 mt-1">{t('fields.data_vinculo_fim_hint') || 'Deixe em branco para vínculo ativo'}</p>
                          </div>
                        </div>
                      </Tab.Panel>
                    </Tab.Panels>

                    <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        {team && (
                          <button type="button" onClick={() => { if (confirm(t('confirmDelete') || 'Tem certeza que deseja excluir este vínculo?')) deleteMutation.mutate(); }} disabled={deleteMutation.isPending} className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            {t('delete') || 'Excluir'}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">{t('cancel') || 'Cancelar'}</button>
                        <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                          {saveMutation.isPending ? (t('saving') || 'Salvando...') : (team ? (t('save') || 'Salvar') : (t('create') || 'Criar'))}
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
