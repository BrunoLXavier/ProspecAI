/**
 * InstituteModal
 * Full CRUD modal for Institute management with all fields
 * Implements RF-03: Portfólio Institucional
 * 
 * Refactored to use BaseModal + ModalTabs with mobile-friendly navigation
 * No horizontal scroll, tabs organized for better UX
 */
'use client';

import { useEffect, useState } from 'react';
import { BuildingOffice2Icon, MapPinIcon, ChartBarIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

import BaseModal, { ModalFooter } from '@/components/ui/BaseModal';
import ModalTabs, { TabHint, type TabItem } from '@/components/ui/ModalTabs';
import DeleteConfirmation from '@/components/ui/DeleteConfirmation';

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

const inputClasses = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function InstituteModal({ isOpen, onClose, institute }: Props) {
  const t = useTranslations('institutes');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      setShowDeleteConfirm(false);
    } else {
      reset(defaultValues);
      setSelectedTab(0);
      setShowDeleteConfirm(false);
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
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['institutes'] }); 
      onClose(); 
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.delete(`/api/v1/institutes/${institute!.id}`),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['institutes'] }); 
      onClose(); 
    },
  });

  const onSubmit = (data: InstituteFormData) => saveMutation.mutate(data);

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  // Tab Content Components
  const BasicInfoTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('fields.nome') || 'Nome'} *</label>
          <input {...register('nome', { required: 'Nome é obrigatório' })} className={inputClasses} placeholder="ISI em Sistemas Virtuais de Produção" />
          {errors.nome && <p className="text-red-500 text-xs mt-1">{errors.nome.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.nome_fantasia') || 'Nome Fantasia'}</label>
          <input {...register('nome_fantasia')} className={inputClasses} placeholder="ISI SVP" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.isi_sigla') || 'Sigla ISI'} *</label>
          <input {...register('isi_sigla', { required: 'Sigla é obrigatória' })} className={inputClasses} placeholder="ISI em Sistemas Virtuais" />
          {errors.isi_sigla && <p className="text-red-500 text-xs mt-1">{errors.isi_sigla.message}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('fields.descricao') || 'Descrição'} *</label>
          <textarea {...register('descricao', { required: 'Descrição é obrigatória' })} rows={4} className={inputClasses} placeholder="Descrição detalhada do instituto..." />
          {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.status_operacional') || 'Status Operacional'}</label>
          <select {...register('status_operacional')} className={inputClasses}>
            {STATUS_OPERACIONAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClasses}>{t('fields.status') || 'Status'}</label>
          <select {...register('status')} className={inputClasses}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('fields.logo_url') || 'URL do Logo'}</label>
          <input {...register('logo_url')} type="url" className={inputClasses} placeholder="https://..." />
        </div>
      </div>
    </div>
  );

  const AddressTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('fields.endereco_rua') || 'Rua'} *</label>
          <input {...register('endereco_rua', { required: 'Rua é obrigatória' })} className={inputClasses} placeholder="Rua Dr. João Colin" />
          {errors.endereco_rua && <p className="text-red-500 text-xs mt-1">{errors.endereco_rua.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_numero') || 'Número'}</label>
          <input {...register('endereco_numero')} className={inputClasses} placeholder="2700" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_complemento') || 'Complemento'}</label>
          <input {...register('endereco_complemento')} className={inputClasses} placeholder="Bloco A, Sala 101" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_bairro') || 'Bairro'} *</label>
          <input {...register('endereco_bairro', { required: 'Bairro é obrigatório' })} className={inputClasses} placeholder="Santo Antônio" />
          {errors.endereco_bairro && <p className="text-red-500 text-xs mt-1">{errors.endereco_bairro.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_cep') || 'CEP'} *</label>
          <input {...register('endereco_cep', { required: 'CEP é obrigatório', pattern: { value: /^\d{5}-?\d{3}$/, message: 'CEP inválido' } })} className={inputClasses} placeholder="89218-035" />
          {errors.endereco_cep && <p className="text-red-500 text-xs mt-1">{errors.endereco_cep.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_cidade') || 'Cidade'} *</label>
          <input {...register('endereco_cidade', { required: 'Cidade é obrigatória' })} className={inputClasses} placeholder="Joinville" />
          {errors.endereco_cidade && <p className="text-red-500 text-xs mt-1">{errors.endereco_cidade.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.endereco_uf') || 'UF'} *</label>
          <select {...register('endereco_uf', { required: 'UF é obrigatório' })} className={inputClasses}>
            {UF_OPTIONS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
          {errors.endereco_uf && <p className="text-red-500 text-xs mt-1">{errors.endereco_uf.message}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('fields.area_predial_m2') || 'Área Predial (m²)'}</label>
          <input {...register('area_predial_m2', { valueAsNumber: true })} type="number" min="0" className={inputClasses} placeholder="5000" />
        </div>
      </div>
    </div>
  );

  const MaturityTab = (
    <div className="space-y-4">
      <TabHint variant="info">
        {t('maturity_hint') || 'Níveis de maturidade conforme modelo ISI (M1a a M4c para gestão, 0-5 para demais indicadores).'}
      </TabHint>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClasses}>{t('fields.maturidade_gestao') || 'Maturidade de Gestão'}</label>
          <select {...register('maturidade_gestao')} className={inputClasses}>
            {MATURIDADE_GESTAO_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClasses}>{t('fields.maturidade_base_tecnologica') || 'Base Tecnológica'}</label>
          <input {...register('maturidade_base_tecnologica', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className={inputClasses} placeholder="0.0 - 5.0" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.maturidade_produtos_servicos') || 'Produtos e Serviços'}</label>
          <input {...register('maturidade_produtos_servicos', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className={inputClasses} placeholder="0.0 - 5.0" />
        </div>
        <div>
          <label className={labelClasses}>{t('fields.maturidade_cooperacao') || 'Cooperação'}</label>
          <input {...register('maturidade_cooperacao', { valueAsNumber: true })} type="number" min="0" max="5" step="0.1" className={inputClasses} placeholder="0.0 - 5.0" />
        </div>
      </div>
    </div>
  );

  const AccreditationTab = (
    <div className="space-y-4">
      <TabHint variant="success">
        {t('accreditation_hint') || 'Credenciamentos oficiais do instituto junto aos órgãos reguladores.'}
      </TabHint>
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
    </div>
  );

  const tabs: TabItem[] = [
    { name: t('tabs.basic') || 'Básico', icon: BuildingOffice2Icon, content: BasicInfoTab },
    { name: t('tabs.address') || 'Endereço', icon: MapPinIcon, content: AddressTab },
    { name: t('tabs.maturity') || 'Maturidade', icon: ChartBarIcon, content: MaturityTab },
    { name: t('tabs.accreditation') || 'Credenciamento', icon: CheckBadgeIcon, content: AccreditationTab },
  ];

  const modalTitle = institute 
    ? (watch('nome') || institute.nome || t('edit') || 'Editar Instituto')
    : (t('new') || 'Novo Instituto');

  const modalSubtitle = institute ? (watch('isi_sigla') || institute.isi_sigla) : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<BuildingOffice2Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="2xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitLabel={institute ? (t('save') || 'Salvar') : (t('create') || 'Criar')}
          cancelLabel={tCommon('cancel') || 'Cancelar'}
          deleteLabel={t('delete') || 'Excluir'}
          isSubmitting={saveMutation.isPending}
          isDeleting={deleteMutation.isPending}
          showDelete={!!institute}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      }
    >
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
        message={t('confirmDelete') || 'Tem certeza que deseja excluir este instituto?'}
      />
      
      <ModalTabs
        tabs={tabs}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      />
    </BaseModal>
  );
}
