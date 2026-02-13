/**
 * ThreadDetailModal
 *
 * Wraps ThreadView inside a BaseModal for use in Board, Timeline and Table views.
 * Provides edit, delete (with ConfirmModal) and close capabilities.
 *
 * Implements RF-08: Communication CRUD modals
 */
import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import BaseModal from '@/components/features/shared/ui/BaseModal';
import { ConfirmModal } from '@/components/features/shared/ui';
import ThreadView from './ThreadView';
import apiClient from '@/lib/api-client';

interface ThreadDetailModalProps {
  isOpen: boolean;
  threadId: string | null;
  currentUserId?: string;
  currentUserName?: string;
  onClose: () => void;
  /** Called after thread data changes (e.g. confirm/reject) */
  onThreadUpdated?: () => void;
  /** Called after the thread is soft-deleted */
  onThreadDeleted?: (threadId: string) => void;
}

export default function ThreadDetailModal({
  isOpen,
  threadId,
  currentUserId,
  currentUserName,
  onClose,
  onThreadUpdated,
  onThreadDeleted,
}: ThreadDetailModalProps) {
  const t = useTranslations('communications');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [hasUnsentAttachments, setHasUnsentAttachments] = useState(false);

  const handleEdit = useCallback(
    (thread: { id: string; subject?: string }) => {
      // For now, editing is inline in ThreadView's header.
      // Future: could open a separate edit form modal.
    },
    [],
  );

  const handleDeleteRequest = useCallback((_threadId: string) => {
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!threadId) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/api/v1/communications/${threadId}`);
      setShowDeleteConfirm(false);
      onClose();
      onThreadDeleted?.(threadId);
    } catch (e) {
      console.error('Failed to delete thread:', e);
    } finally {
      setDeleting(false);
    }
  }, [threadId, onClose, onThreadDeleted]);

  const handleClose = useCallback(() => {
    if (hasUnsentAttachments) {
      // Could show a confirmation, but for now just close
    }
    onClose();
  }, [onClose, hasUnsentAttachments]);

  if (!threadId) return null;

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={handleClose}
        title={t('threadDetail')}
        icon={<ChatBubbleLeftRightIcon className="w-6 h-6 text-primary-500" />}
        size="3xl"
      >
        <div className="h-[70vh] -mx-6 -mb-6">
          <ThreadView
            threadId={threadId}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onThreadUpdate={() => onThreadUpdated?.()}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onHasUnsentAttachmentsChange={setHasUnsentAttachments}
          />
        </div>
      </BaseModal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title={t('deleteThread')}
        description={t('deleteConfirmation')}
        confirmLabel={t('delete')}
        variant="danger"
        isLoading={deleting}
      />
    </>
  );
}
