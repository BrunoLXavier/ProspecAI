/**
 * InfrastructureModal - Full CRUD Modal
 * Implements RF-03: Portfólio Institucional - Gestão de Infraestrutura
 * 
 * Refactored to use BaseModal + ModalTabs with mobile-friendly navigation
 * No horizontal scroll, 4 tabs organized for better UX
 */
'use client';

import { useEffect, useState } from 'react';
import { BuildingOfficeIcon, CpuChipIcon, BeakerIcon, PhotoIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api-client';

import BaseModal, { ModalFooter } from '@/components/ui/BaseModal';
import ModalTabs, { TabHint, type TabItem } from '@/components/ui/ModalTabs';
import DeleteConfirmation from '@/components/ui/DeleteConfirmation';

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

const predefinedPlatforms = [
  'IoT', 'Robótica', 'IA/ML', 'Automação Industrial', 'Realidade Estendida',
  'Manufatura Aditiva', 'Nanotecnologia', 'Biotecnologia', 'Eletrônica', 'Energia',
];

const predefinedAreas = [
  'Ciências Exatas', 'Engenharias', 'Ciências Biológicas', 'Ciências da Saúde',
  'Ciências Agrárias', 'Ciências Sociais', 'Ciências Humanas', 'Linguística e Artes',
];

const predefinedMacroareas = [
  'Manufatura Avançada', 'Mobilidade', 'Energia Sustentável', 'Saúde',
  'Segurança', 'TIC', 'Meio Ambiente',
];

const inputClasses = "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent";
const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function InfrastructureModal({ isOpen, onClose, resource }: Props) {
  const t = useTranslations('infrastructure');
  const tCommon = useTranslations('common');
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Dynamic array state
  const [newPlatform, setNewPlatform] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newMacroarea, setNewMacroarea] = useState('');
  const [newMedia, setNewMedia] = useState<MediaItem>({ url: '', type: 'image', description: '' });
  const [newEquipName, setNewEquipName] = useState('');
  const [newEquipSerial, setNewEquipSerial] = useState('');
  const [newEquipDesc, setNewEquipDesc] = useState('');
  const [newEquipStatus, setNewEquipStatus] = useState('');

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Infrastructure>({
    defaultValues: {
      instituto_id: '', nome: '', descricao: '', email_laboratorio: '', email_responsavel: '',
      area_predial_m2: 0, status_isi: 'Operacional', maturidade_gestao: '',
      maturidade_base_tecnologica: undefined, maturidade_produtos_servicos: undefined,
      maturidade_cooperacao: undefined, plataformas_tecnologicas: [], areas_conhecimento: [],
      macroareas_pesquisa: [], midias: [], equipamentos: [],
    }
  });

  // Fetch institutes for dropdown
  const { data: institutes = [] } = useQuery({
    queryKey: ['institutes', 'for-infra-modal'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/institutes');
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
      setSelectedTab(0);
      setShowDeleteConfirm(false);
    } else {
      reset({
        instituto_id: '', nome: '', descricao: '', email_laboratorio: '', email_responsavel: '',
        area_predial_m2: 0, status_isi: 'Operacional', maturidade_gestao: '',
        maturidade_base_tecnologica: undefined, maturidade_produtos_servicos: undefined,
        maturidade_cooperacao: undefined, plataformas_tecnologicas: [], areas_conhecimento: [],
        macroareas_pesquisa: [], midias: [], equipamentos: [],
      });
      setSelectedTab(0);
      setShowDeleteConfirm(false);
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

  const onSubmit = (data: Infrastructure) => saveMutation.mutate(data);

  const handleDelete = () => {
    deleteMutation.mutate();
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

  const addEquipment = () => {
    if (newEquipName) {
      setValue('equipamentos', [...equipamentos, { 
        nome: newEquipName, 
        serial: newEquipSerial, 
        descricao: newEquipDesc, 
        status: newEquipStatus,
        added_at: new Date().toISOString() 
      }]);
      setNewEquipName('');
      setNewEquipSerial('');
      setNewEquipDesc('');
      setNewEquipStatus('');
    }
  };

  const removeEquipment = (index: number) => {
    setValue('equipamentos', equipamentos.filter((_, i) => i !== index));
  };

  // Tab Content Components
  const BasicInfoTab = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('institute') || 'Instituto'} *</label>
          <select {...register('instituto_id', { required: true })} className={inputClasses}>
            <option value="">{t('selectInstitute') || 'Selecione um instituto'}</option>
            {institutes?.map((inst: any) => (
              <option key={inst.id} value={inst.id}>{inst.nome || inst.name}</option>
            ))}
          </select>
          {errors.instituto_id && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('name') || 'Nome'} *</label>
          <input {...register('nome', { required: true })} className={inputClasses} placeholder="Laboratório de Realidade Estendida" />
          {errors.nome && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className={labelClasses}>{t('description') || 'Descrição'} *</label>
          <textarea {...register('descricao', { required: true })} rows={3} className={inputClasses} placeholder="Descrição da infraestrutura..." />
          {errors.descricao && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('labEmail') || 'Email do Laboratório'} *</label>
          <input type="email" {...register('email_laboratorio', { required: true })} className={inputClasses} placeholder="lab@senai.br" />
          {errors.email_laboratorio && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('responsibleEmail') || 'Email do Responsável'} *</label>
          <input type="email" {...register('email_responsavel', { required: true })} className={inputClasses} placeholder="responsavel@senai.br" />
          {errors.email_responsavel && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('areaM2') || 'Área Predial (m²)'} *</label>
          <input type="number" {...register('area_predial_m2', { required: true, min: 0, valueAsNumber: true })} className={inputClasses} placeholder="500" />
          {errors.area_predial_m2 && <p className="text-red-500 text-xs mt-1">{t('required') || 'Campo obrigatório'}</p>}
        </div>
        <div>
          <label className={labelClasses}>{t('status') || 'Status'}</label>
          <select {...register('status_isi')} className={inputClasses}>
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );

  const EquipmentsTab = (
    <div className="space-y-4">
      <TabHint variant="info">
        {t('equipmentsHint') || 'Registre equipamentos associados a esta infraestrutura.'}
      </TabHint>

      {/* Add equipment form */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClasses}>{t('equipmentName') || 'Nome'} *</label>
            <input value={newEquipName} onChange={(e) => setNewEquipName(e.target.value)} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>{t('equipmentSerial') || 'Serial'}</label>
            <input value={newEquipSerial} onChange={(e) => setNewEquipSerial(e.target.value)} className={inputClasses} />
          </div>
          <div>
            <label className={labelClasses}>{t('equipmentStatus') || 'Status'}</label>
            <select value={newEquipStatus} onChange={(e) => setNewEquipStatus(e.target.value)} className={inputClasses}>
              <option value="">{t('select') || 'Selecione'}</option>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClasses}>{t('equipmentDesc') || 'Descrição'}</label>
            <input value={newEquipDesc} onChange={(e) => setNewEquipDesc(e.target.value)} className={inputClasses} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={addEquipment} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            {t('add') || 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Equipment list */}
      <div className="space-y-2">
        {equipamentos.length === 0 && <p className="text-sm text-gray-500 text-center py-4">{t('noEquipments') || 'Nenhum equipamento registrado.'}</p>}
        {equipamentos.map((eq: EquipmentItem, idx: number) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 dark:text-white">{eq.nome} {eq.serial ? `(${eq.serial})` : ''}</div>
              {eq.descricao && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{eq.descricao}</div>}
              {eq.status && <div className="text-xs text-gray-400">{eq.status}</div>}
            </div>
            <button type="button" onClick={() => removeEquipment(idx)} className="p-2 text-red-600 hover:text-red-800 shrink-0">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const AreasTab = (
    <div className="space-y-6">
      {/* Technology Platforms */}
      <div>
        <label className={labelClasses}>{t('techPlatforms') || 'Plataformas Tecnológicas'}</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <select value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} className={`${inputClasses} sm:flex-1`}>
            <option value="">{t('selectOrType') || 'Selecione'}</option>
            {predefinedPlatforms.filter(p => !plataformas.includes(p)).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="text" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value)} placeholder={t('customPlatform') || 'Ou digite...'} className={`${inputClasses} flex-1`} />
            <button type="button" onClick={addPlatform} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shrink-0">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {plataformas.map((p) => (
            <span key={p} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {p}
              <button type="button" onClick={() => removePlatform(p)} className="ml-2 text-blue-600 hover:text-blue-800"><XMarkIcon className="w-4 h-4" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Knowledge Areas */}
      <div>
        <label className={labelClasses}>{t('knowledgeAreas') || 'Áreas de Conhecimento'}</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <select value={newArea} onChange={(e) => setNewArea(e.target.value)} className={`${inputClasses} sm:flex-1`}>
            <option value="">{t('selectOrType') || 'Selecione'}</option>
            {predefinedAreas.filter(a => !areas.includes(a)).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="text" value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder={t('customArea') || 'Ou digite...'} className={`${inputClasses} flex-1`} />
            <button type="button" onClick={addArea} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shrink-0">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.map((a) => (
            <span key={a} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              {a}
              <button type="button" onClick={() => removeArea(a)} className="ml-2 text-green-600 hover:text-green-800"><XMarkIcon className="w-4 h-4" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Research Macro-areas */}
      <div>
        <label className={labelClasses}>{t('researchMacroareas') || 'Macroáreas de Pesquisa'}</label>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <select value={newMacroarea} onChange={(e) => setNewMacroarea(e.target.value)} className={`${inputClasses} sm:flex-1`}>
            <option value="">{t('selectOrType') || 'Selecione'}</option>
            {predefinedMacroareas.filter(m => !macroareas.includes(m)).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="text" value={newMacroarea} onChange={(e) => setNewMacroarea(e.target.value)} placeholder={t('customMacroarea') || 'Ou digite...'} className={`${inputClasses} flex-1`} />
            <button type="button" onClick={addMacroarea} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 shrink-0">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {macroareas.map((m) => (
            <span key={m} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
              {m}
              <button type="button" onClick={() => removeMacroarea(m)} className="ml-2 text-purple-600 hover:text-purple-800"><XMarkIcon className="w-4 h-4" /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const MediaTab = (
    <div className="space-y-4">
      <TabHint variant="info">
        {t('mediaHint') || 'Adicione imagens, vídeos e outros arquivos de mídia associados à infraestrutura.'}
      </TabHint>

      {/* Add media form */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClasses}>URL *</label>
            <input type="url" value={newMedia.url} onChange={(e) => setNewMedia({ ...newMedia, url: e.target.value })} className={inputClasses} placeholder="https://..." />
          </div>
          <div>
            <label className={labelClasses}>{t('mediaType') || 'Tipo'}</label>
            <select value={newMedia.type} onChange={(e) => setNewMedia({ ...newMedia, type: e.target.value })} className={inputClasses}>
              <option value="image">{t('image') || 'Imagem'}</option>
              <option value="video">{t('video') || 'Vídeo'}</option>
              <option value="document">{t('document') || 'Documento'}</option>
              <option value="3d_model">{t('3dModel') || 'Modelo 3D'}</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className={labelClasses}>{t('mediaDescription') || 'Descrição'}</label>
            <input type="text" value={newMedia.description || ''} onChange={(e) => setNewMedia({ ...newMedia, description: e.target.value })} className={inputClasses} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={addMedia} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            {t('add') || 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Media list */}
      <div className="space-y-2">
        {midias.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">{t('noMedia') || 'Nenhuma mídia adicionada'}</p>
        ) : (
          midias.map((media, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-600 px-2 py-1 rounded shrink-0">
                    {media.type}
                  </span>
                  <a href={media.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                    {media.url}
                  </a>
                </div>
                {media.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">{media.description}</p>}
              </div>
              <button type="button" onClick={() => removeMedia(index)} className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 shrink-0">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const tabs: TabItem[] = [
    { name: t('basicInfo') || 'Básico', icon: BuildingOfficeIcon, content: BasicInfoTab },
    { name: t('equipmentsTab') || 'Equipamentos', icon: CpuChipIcon, content: EquipmentsTab },
    { name: t('areasTab') || 'Áreas', icon: BeakerIcon, content: AreasTab },
    { name: t('mediaTab') || 'Mídias', icon: PhotoIcon, content: MediaTab },
  ];

  const modalTitle = resource 
    ? (resource.nome || t('edit') || 'Editar Infraestrutura')
    : (t('newInfrastructure') || 'Nova Infraestrutura');

  const modalSubtitle = resource?.id ? `ID: ${resource.id}` : undefined;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      icon={<BuildingOfficeIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />}
      size="3xl"
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit(onSubmit)}
          submitLabel={resource ? (t('save') || 'Salvar') : (t('create') || 'Criar')}
          cancelLabel={tCommon('cancel') || 'Cancelar'}
          deleteLabel={t('delete') || 'Excluir'}
          isSubmitting={saveMutation.isPending}
          isDeleting={deleteMutation.isPending}
          showDelete={!!resource}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      }
    >
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDeleting={deleteMutation.isPending}
        message={t('confirmDelete') || 'Tem certeza que deseja excluir esta infraestrutura?'}
      />
      
      <ModalTabs
        tabs={tabs}
        selectedIndex={selectedTab}
        onChange={setSelectedTab}
      />
    </BaseModal>
  );
}
