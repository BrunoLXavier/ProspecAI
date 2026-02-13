"use client";
// Implements RF-03: Institute management modal using EntityModal + form-registry
import React, { useEffect } from 'react';
import EntityModal from '@/components/features/shared/ui/EntityModal';
import { instituteDefinition } from '@/lib/form-registry/definitions/institute.definition';
import apiClient from '@/lib/api-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  institute?: any | null;
}

export default function InstituteModal({ isOpen, onClose, institute }: Props) {
  return (
    <EntityModal
      definition={instituteDefinition}
      entity={institute}
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
    />
  );
}

/**
 * CNPJAutofill hook for CNPJ enrichment.
 * Watches the CNPJ field and auto-fills empty fields from backend enrichment API.
 * Preserved from the original InstituteModal implementation.
 */
export function useCNPJAutofill(watchCnpj: () => string | undefined, getValues: any, setValue: any) {
  const cnpj = watchCnpj();

  useEffect(() => {
    if (!cnpj) return;
    const clean = String(cnpj).replace(/\D/g, '');
    if (clean.length !== 14) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const resp = await apiClient.enrichCNPJ(clean);
        if (cancelled) return;
        if (!resp || resp.error) return;

        const current = getValues();
        const setIfEmpty = (field: string, val: any) => {
          const cur = current[field];
          if (cur === undefined || cur === null || cur === '') {
            setValue(field, val);
          }
        };

        const nome = resp.nome || resp.name || resp.razao_social || resp.razaoSocial;
        if (nome) setIfEmpty('nome', nome);

        const telefone = resp.telefone || resp.telefone1 || resp.telefone_1 || resp.phone;
        if (telefone) setIfEmpty('phone', telefone);
        const email = resp.email || resp.contact_email;
        if (email) setIfEmpty('email', email);

        const endereco = resp.endereco || resp.address || {};
        setIfEmpty('endereco_rua', endereco.logradouro || resp.logradouro || '');
        setIfEmpty('endereco_numero', endereco.numero || resp.numero || '');
        setIfEmpty('endereco_complemento', endereco.complemento || resp.complemento || '');
        setIfEmpty('endereco_bairro', endereco.bairro || resp.bairro || '');
        setIfEmpty('endereco_cidade', endereco.municipio || resp.municipio || '');
        setIfEmpty('endereco_uf', endereco.uf || resp.uf || '');
        setIfEmpty('endereco_cep', endereco.cep || resp.cep || '');

        const situacao = resp.situacao_cadastral || resp.situacaoCadastral || resp.situacao || resp.status;
        if (situacao) {
          setValue('status_receita', situacao);
        }
      } catch (e) {
        console.error('[InstituteModal] CNPJ enrich failed', e);
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cnpj, getValues, setValue]);
}