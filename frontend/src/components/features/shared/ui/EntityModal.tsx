/**
 * EntityModal — Unified Entity CRUD Modal
 * Composes BaseModal + ModalTabs (vertical stepper) + ModalFooter +
 * DeleteConfirmation + FormRenderer + useTabValidation + ValidationSummary
 * into a SINGLE reusable modal for all entities.
 *
 * This is the ONLY modal component that should be used for entity CRUD.
 * Manual modal building (duplicating Dialog/Transition/form logic) is prohibited.
 *
 * Features:
 *   - Vertical sidebar stepper for tabbed forms
 *   - Cross-tab validation with error badges and auto-navigation
 *   - On-blur + on-submit validation
 *   - Single-column field layout by default
 *
 * Slots available for custom content:
 *   - beforeFields: above the auto-rendered form fields
 *   - afterFields: below the auto-rendered form fields
 *   - customTabs: additional tabs beyond auto-generated ones
 *   - headerExtra: extra content in the modal header area (badges, status, etc.)
 *   - footerExtra: extra buttons in the footer (between delete and cancel/save)
 *
 * Usage:
 *   <EntityModal
 *     definition={fundingDefinition}
 *     entity={selectedFunding}
 *     mode="edit"
 *     isOpen={isModalOpen}
 *     onClose={() => setModalOpen(false)}
 *     onSuccess={handleSuccess}
 *   />
 *
 * Implements RF-01 through RF-09: Standardized entity modal rendering
 */
'use client';

import React, { useState, useCallback, useMemo, ReactNode, ComponentType } from 'react';
import { useTranslations } from 'next-intl';
import BaseModal from './BaseModal';
import ModalTabs, { TabPanelContent } from './ModalTabs';
import type { TabItem } from './ModalTabs';
import DeleteConfirmation from './DeleteConfirmation';
import ValidationSummary from './ValidationSummary';
import FormRenderer from '@/lib/form-registry/FormRenderer';
import { useEntityForm, EntityFormMode } from '@/hooks/use-entity-form';
import { useTabValidation, getRequiredFieldNames } from '@/hooks/use-tab-validation';
import { usePermission } from '@/contexts/ACLContext';
import type { EntityFormDefinition, TabDefinition } from '@/lib/form-registry/types';
import type { ModalSize } from './BaseModal';

// Heroicons for modal headers
import {
  PlusCircleIcon,
  PencilSquareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EntityModalProps<T = any> {
  /** Entity form definition from the registry */
  definition: EntityFormDefinition<T>;
  /** Entity data for edit/view mode (null/undefined for create) */
  entity?: T | null;
  /** Form mode — defaults to 'create' if no entity, 'edit' otherwise */
  mode?: EntityFormMode;
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Callback after successful create/update */
  onSuccess?: (data: any) => void;
  /** Callback after successful delete */
  onDeleteSuccess?: () => void;
  /** Override modal size (defaults to '3xl') */
  size?: ModalSize;
  /** Override API endpoint */
  apiEndpoint?: string;
  /** React Query cache key override */
  queryKey?: string;
  /** Additional data merged into the submission payload */
  extraData?: Record<string, any>;
  /** Custom title override (defaults to i18n entity name) */
  title?: string;
  /** Modal subtitle */
  subtitle?: string;
  /** Custom icon override */
  icon?: ReactNode;
  /** Whether to show delete button (checked against ACL) */
  showDelete?: boolean;

  // ── Slots ──────────────────────────────────────────────────────────────

  /** Content rendered above the form fields (within the first tab or main body) */
  beforeFields?: ReactNode;
  /** Content rendered below the form fields */
  afterFields?: ReactNode;
  /** Additional custom tabs appended after auto-generated tabs */
  customTabs?: TabItem[];
  /** Extra content in the header area (badges, status indicators) */
  headerExtra?: ReactNode;
  /** Extra buttons in the footer area (between delete and cancel/save) */
  footerExtra?: ReactNode;
}

// ─── Mode Icon Map ───────────────────────────────────────────────────────────

const modeIcons: Record<EntityFormMode, ComponentType<{ className?: string }>> = {
  create: PlusCircleIcon,
  edit: PencilSquareIcon,
  view: EyeIcon,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EntityModal<T extends Record<string, any> = any>({
  definition,
  entity,
  mode: initialMode,
  isOpen,
  onClose,
  onSuccess,
  onDeleteSuccess,
  size = '3xl',
  apiEndpoint,
  queryKey,
  extraData,
  title: titleOverride,
  subtitle,
  icon: iconOverride,
  showDelete = true,
  beforeFields,
  afterFields,
  customTabs,
  headerExtra,
  footerExtra,
}: EntityModalProps<T>) {
  const effectiveMode: EntityFormMode = initialMode ?? (entity ? 'edit' : 'create');
  const t = useTranslations(definition.i18nNamespace);
  const tCommon = useTranslations('common');
  const tModal = useTranslations('modal');

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Controlled tab index for stepper navigation
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // ACL permission check
  const { can } = usePermission();
  const canEdit = effectiveMode === 'create'
    ? can(definition.resource, 'create')
    : can(definition.resource, 'update');
  const canDelete = can(definition.resource, 'delete');

  // ── useEntityForm ───────────────────────────────────────────────────────

  const entityForm = useEntityForm<T>({
    definition,
    entity,
    mode: effectiveMode,
    apiEndpoint,
    queryKey,
    extraData,
    onSuccess: (data) => {
      onSuccess?.(data);
      onClose();
    },
    onDeleteSuccess: () => {
      onDeleteSuccess?.();
      onClose();
    },
  });

  const {
    form,
    mode,
    onSubmit: originalOnSubmit,
    onDelete,
    isSubmitting,
    isDeleting,
    serverError,
  } = entityForm;

  const { control, register, formState: { errors }, watch, trigger } = form;

  const isViewMode = mode === 'view';
  const isReadOnly = isViewMode || !canEdit;

  // ── Tab Validation ──────────────────────────────────────────────────────

  const requiredFields = useMemo(
    () => getRequiredFieldNames(definition.fields),
    [definition.fields]
  );

  const formValues = watch();

  const { tabStates, firstTabWithError, totalErrors, tabsWithErrors } =
    useTabValidation(errors, definition.tabs, requiredFields, formValues);

  // Enhanced submit: trigger full validation, navigate to first error tab
  const onSubmit = useCallback(async () => {
    const isValid = await trigger();
    if (!isValid && firstTabWithError !== null) {
      setActiveTabIndex(firstTabWithError);
      return;
    }
    originalOnSubmit();
  }, [trigger, firstTabWithError, originalOnSubmit]);

  // ── Title ───────────────────────────────────────────────────────────────

  const resolvedTitle = useMemo(() => {
    if (titleOverride) return titleOverride;

    // Try entity-specific i18n key first
    let entityName: string;
    try {
      entityName = t('entityName');
    } catch {
      entityName = definition.entityKey;
    }

    let modeLabel: string;
    try {
      switch (mode) {
        case 'create':
          modeLabel = tModal('createTitle');
          break;
        case 'edit':
          modeLabel = tModal('editTitle');
          break;
        case 'view':
          modeLabel = tModal('viewTitle');
          break;
        default:
          modeLabel = '';
      }
    } catch {
      modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
    }

    return `${modeLabel} ${entityName}`;
  }, [titleOverride, mode, t, tModal, definition.entityKey]);

  // ── Icon ────────────────────────────────────────────────────────────────

  const resolvedIcon = useMemo(() => {
    if (iconOverride) return iconOverride;
    const IconComponent = modeIcons[mode];
    return <IconComponent className="w-6 h-6 text-primary-600 dark:text-primary-400" />;
  }, [iconOverride, mode]);

  // ── Handle close ────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    setShowDeleteConfirm(false);
    setActiveTabIndex(0);
    onClose();
  }, [onClose]);

  // ── Handle delete flow ──────────────────────────────────────────────────

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteConfirm(false);
    onDelete();
  }, [onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // ── Build tab items with error/completion state ─────────────────────────

  const tabItems = useMemo((): TabItem[] | null => {
    if (!definition.tabs || definition.tabs.length === 0) {
      return null; // No tabs — render flat form
    }

    const entityTabs: TabItem[] = definition.tabs.map((tabDef: TabDefinition) => {
      let tabName: string;
      try {
        tabName = t(tabDef.nameKey);
      } catch {
        tabName = tabDef.nameKey;
      }

      const tabState = tabStates[tabDef.key];

      return {
        name: tabName,
        errorCount: tabState?.errorCount ?? 0,
        isComplete: tabState?.isComplete ?? false,
        content: (
          <TabPanelContent>
            <FormRenderer
              definition={definition}
              mode={mode}
              control={control}
              register={register}
              errors={errors}
              watch={watch}
              tabKey={tabDef.key}
              gridCols={1}
              beforeFields={tabDef.key === definition.tabs![0].key ? beforeFields : undefined}
              afterFields={tabDef.key === definition.tabs![definition.tabs!.length - 1].key ? afterFields : undefined}
            />
          </TabPanelContent>
        ),
      };
    });

    // Append custom tabs
    if (customTabs && customTabs.length > 0) {
      entityTabs.push(...customTabs);
    }

    return entityTabs;
  }, [definition, mode, control, register, errors, watch, t, beforeFields, afterFields, customTabs, tabStates]);

  // ── Validation summary tab errors ───────────────────────────────────────

  const tabErrorInfos = useMemo(() => {
    if (!definition.tabs || !tabItems) return [];
    return definition.tabs
      .map((tabDef, index) => ({
        name: tabItems[index]?.name ?? tabDef.nameKey,
        errorCount: tabStates[tabDef.key]?.errorCount ?? 0,
        index,
      }))
      .filter((t) => t.errorCount > 0);
  }, [definition.tabs, tabItems, tabStates]);

  // ── Footer ──────────────────────────────────────────────────────────────

  const footer = useMemo(() => {
    // Server error display
    const errorBanner = serverError ? (
      <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
        {serverError}
      </div>
    ) : null;

    return (
      <div>
        {errorBanner}
        {/* Cross-tab validation summary */}
        <ValidationSummary
          totalErrors={totalErrors}
          tabErrors={tabErrorInfos}
          onNavigateToTab={setActiveTabIndex}
        />
        <div className="flex items-center justify-between">
          {/* Left side: delete + footerExtra */}
          <div className="flex items-center gap-2">
            {showDelete && canDelete && mode === 'edit' && entity && (
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isDeleting || showDeleteConfirm}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {tCommon('delete')}
              </button>
            )}
            {footerExtra}
          </div>

          {/* Right side: cancel + submit */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {isViewMode ? tCommon('close') : tCommon('cancel')}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                onClick={onSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? tCommon('saving') : tCommon('save')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }, [
    serverError, showDelete, canDelete, mode, entity, isDeleting,
    showDeleteConfirm, isViewMode, isReadOnly, isSubmitting,
    tCommon, handleDeleteClick, handleClose, onSubmit, footerExtra,
    totalErrors, tabErrorInfos,
  ]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={resolvedTitle}
      subtitle={subtitle}
      icon={resolvedIcon}
      size={size}
      footer={footer}
      noContentScroll={!!tabItems}
    >
      {/* Header extra slot */}
      {headerExtra && (
        <div className="mb-4">{headerExtra}</div>
      )}

      {/* Delete confirmation */}
      <DeleteConfirmation
        isVisible={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />

      {/* Form content — tabbed or flat */}
      {tabItems ? (
        <ModalTabs
          tabs={tabItems}
          selectedIndex={activeTabIndex}
          onChange={setActiveTabIndex}
        />
      ) : (
        <FormRenderer
          definition={definition}
          mode={mode}
          control={control}
          register={register}
          errors={errors}
          watch={watch}
          gridCols={1}
          beforeFields={beforeFields}
          afterFields={afterFields}
        />
      )}
    </BaseModal>
  );
}
