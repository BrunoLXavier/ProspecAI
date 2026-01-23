/**
 * TeamModal
 * Full CRUD modal for Team (Equipe) management
 * Implements RF-03: Portfólio Institucional - Team Management
 * 
 * Refactored to use BaseModal + ModalTabs with mobile-friendly navigation
 * No horizontal scroll, tabs organized for better UX
 */
'use client';

import { useEffect, useState } from 'react';
import { UserCircleIcon, LinkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

import BaseModal, { ModalFooter } from '@/components/ui/BaseModal';
import ModalTabs, { TabHint, type TabItem } from '@/components/ui/ModalTabs';
import DeleteConfirmation from '@/components/ui/DeleteConfirmation';

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

const inputClasses = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function TeamModal({ isOpen, onClose, team }: Props) {
  const t = useTranslations('teams');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      setShowDeleteConfirm(false);
    } else {
      reset(defaultValues);
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    }
  }, [team, reset]);

  const saveMutation = useMutation({
    mutationFn: (data: TeamFormData) => {
      const payload = { ...data };
      if (team?.id) return apiClient.put(`/api/v1/teams/${team.id}`, payload);
      return apiClient.post('/api/v1/teams', payload);
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['teams'] }); 
      onClose(); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/teams/${team!.id}`),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['teams'] }); 
      onClose(); 
    },
  });

  const onSubmit = (data: TeamFormData) => saveMutation.mutate(data);

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Tab Content Components
  const BasicInfoTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t('fields.usuario') || 'Usuário'} *</label>
          <select {...register('usuario_id', { required: 'Usuário é obrigatório' })} className={inputClasses}>
            <option value="">Selecione...</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
          {errors.usuario_id && <p className="text-red-500 text-xs mt-1">{errors.usuario_id.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.instituto') || 'Instituto'} *</label>
          <select {...register('instituto_id', { required: 'Instituto é obrigatório' })} className={inputClasses}>
            <option value="">Selecione...</option>
            {institutes.map((i: any) => <option key={i.id} value={i.id}>{i.nome || i.name}</option>)}
          </select>
          {errors.instituto_id && <p className="text-red-500 text-xs mt-1">{errors.instituto_id.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.cargo') || 'Cargo'} *</label>
          <input {...register('cargo', { required: 'Cargo é obrigatório' })} className={inputClasses} placeholder="Coordenador, Pesquisador Chefe, CTO..." />
          {errors.cargo && <p className="text-red-500 text-xs mt-1">{errors.cargo.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.funcao_principal') || 'Função Principal'} *</label>
          <input {...register('funcao_principal', { required: 'Função é obrigatória' })} className={inputClasses} placeholder="Gerência de projetos de P&D..." />
          {errors.funcao_principal && <p className="text-red-500 text-xs mt-1">{errors.funcao_principal.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.email_profissional') || 'E-mail Profissional'}</label>
          <input {...register('email_profissional')} type="email" className={inputClasses} placeholder="nome@instituto.org.br" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.telefone_celular') || 'Telefone Celular'}</label>
          <input {...register('telefone_celular')} className={inputClasses} placeholder="(47) 99999-9999" />
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer">
            <input type="checkbox" {...register('vinculo_principal')} className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{t('fields.vinculo_principal') || 'Vínculo Principal'}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('fields.vinculo_principal_hint') || 'Marque se este é o instituto principal do colaborador'}</p>
            </div>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('fields.foto_perfil_url') || 'URL da Foto de Perfil'}</label>
          <input {...register('foto_perfil_url')} type="url" className={inputClasses} placeholder="https://..." />
        </div>
      </div>
    </div>
  );

  const AcademicProfilesTab = (
    <div className="space-y-4">
      <TabHint variant="info">
        {t('profiles_hint') || 'Links para perfis acadêmicos e de pesquisa do colaborador.'}
      </TabHint>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>LinkedIn</label>
          <input {...register('linkedin_url')} type="url" className={inputClasses} placeholder="https://linkedin.com/in/..." />
        </div>
        <div>
          <label className={labelClasses}>Currículo Lattes</label>
          <input {...register('lattes_url')} type="url" className={inputClasses} placeholder="https://lattes.cnpq.br/..." />
        </div>
        <div>
          <label className={labelClasses}>ORCID iD</label>
          <input {...register('orcid_id')} className={inputClasses} placeholder="0000-0000-0000-0000" />
        </div>
        <div>
          <label className={labelClasses}>ResearchGate</label>
          <input {...register('researchgate_url')} type="url" className={inputClasses} placeholder="https://researchgate.net/profile/..." />
        </div>
        <div>
          <label className={labelClasses}>Scopus Author ID</label>
          <input {...register('scopus_author_id')} className={inputClasses} placeholder="12345678900" />
        </div>
        <div>
          <label className={labelClasses}>Web of Science Researcher ID</label>
          <input {...register('web_of_science_researcher_id')} className={inputClasses} placeholder="A-1234-5678" />
        </div>
      </div>
    </div>
  );

  const DatesTab = (
    <div className="space-y-4">
      <TabHint variant="warning">
        {t('dates_hint') || 'Período de vigência do vínculo com o instituto.'}
      </TabHint>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t('fields.data_vinculo_inicio') || 'Data de Início'}</label>
          <input {...register('data_vinculo_inicio')} type="date" className={inputClasses} />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.data_vinculo_fim') || 'Data de Término'}</label>
          <input {...register('data_vinculo_fim')} type="date" className={inputClasses} />
          <p className="text-xs text-gray-400 mt-1">{t('fields.data_vinculo_fim_hint') || 'Deixe em branco para vínculo ativo'}</p>
        </div>
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', icon: UserCircleIcon, content: BasicInfoTab },
    { name: t('tabs.profiles') || 'Perfis', icon: LinkIcon, content: AcademicProfilesTab },
    { name: t('tabs.dates') || 'Período', icon: CalendarIcon, content: DatesTab },
  ];

  const modalTitle = team 
    ? (watch('cargo') || team.cargo || t('edit') || 'Editar Membro')
    : (t('new') || 'Novo Membro da Equipe');

  const modalSubtitle = team ? (watch('funcao_principal') || team.funcao_principal) : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<UserCircleIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitLabel={team ? (t('save') || 'Salvar') : (t('create') || 'Criar')}
          cancelLabel={tCommon('cancel') || 'Cancelar'}
          deleteLabel={t('delete') || 'Excluir'}
          isSubmitting={saveMutation.isPending}
          isDeleting={deleteMutation.isPending}
          showDelete={!!team}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      }
    >
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
        message={t('confirmDelete') || 'Tem certeza que deseja excluir este vínculo?'}
      />
      
      <ModalTabs
        tabs={tabs}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      />
    </BaseModal>
  );
}
