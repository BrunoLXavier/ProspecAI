// Branding Section — site name, logo upload, favicon upload
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';
import { LayoutConfig, DEFAULT_CONFIG } from '@/contexts/LayoutContext';
import { getStoredAccessToken } from '@/contexts/AuthContext';

interface BrandingSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  t: (key: string) => string;
  removeLogo: () => void;
  restoreLogoDefault: () => void;
  removeFavicon: () => void;
  restoreFaviconDefault: () => void;
}

export default function BrandingSection({
  config,
  updateConfig,
  t,
  removeLogo,
  restoreLogoDefault,
  removeFavicon,
  restoreFaviconDefault,
}: BrandingSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg"><PhotoIcon className="w-5 h-5 text-orange-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.branding.title') || 'Branding'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.branding.description') || 'Configurações de marca.'}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm mb-1">{t('layout.branding.siteName') || 'Site name'}</label>
          <input
            placeholder={DEFAULT_CONFIG.site_name}
            className="w-full border rounded px-2 py-1 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100"
            value={config.site_name ?? ''}
            onChange={(e) => updateConfig('site_name', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t('layout.branding.siteLogoUrl') || 'Logo URL'}</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const token = getStoredAccessToken();
                    const fd = new FormData();
                    fd.append('file', f, f.name);
                    const prefix = 'branding';
                    const res = await fetch(`/api/v1/files/upload/attachments?prefix=${encodeURIComponent(prefix)}`, {
                      method: 'POST',
                      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                      body: fd,
                    });
                    if (!res.ok) {
                      const txt = await res.text();
                      throw new Error(txt || 'Upload failed');
                    }
                    const data = await res.json();
                    updateConfig('site_logo_url', data.url || null);
                  } catch (err: any) {
                    console.error('Logo upload failed:', err);
                    alert(t('layout.branding.uploadError') || 'Upload failed');
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('layout.branding.uploadHelp') || 'Envie um arquivo de imagem para usar como logo. O campo URL será atualizado automaticamente.'}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {config.site_logo_url ? (
                <div className="w-20 h-12 flex items-center justify-center border rounded p-1 bg-white dark:bg-slate-800">
                  <img src={config.site_logo_url} alt="logo" className="max-h-10 max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-20 h-12 flex items-center justify-center border rounded text-xs text-gray-400">Preview</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={removeLogo}
                  className="flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                >
                  {t('layout.branding.remove') || 'Remover'}
                </button>
                <button
                  type="button"
                  onClick={restoreLogoDefault}
                  className="flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  {t('layout.branding.restoreDefault') || 'Restaurar padrão'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">{t('layout.branding.siteFaviconUrl') || 'Favicon URL'}</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                type="file"
                accept="image/*,.ico"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const token = getStoredAccessToken();
                    const fd = new FormData();
                    fd.append('file', f, f.name);
                    const prefix = 'branding';
                    const res = await fetch(`/api/v1/files/upload/attachments?prefix=${encodeURIComponent(prefix)}`, {
                      method: 'POST',
                      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
                      body: fd,
                    });
                    if (!res.ok) {
                      const txt = await res.text();
                      throw new Error(txt || 'Upload failed');
                    }
                    const data = await res.json();
                    updateConfig('site_favicon_url', data.url || null);
                    try {
                      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
                      if (link) link.href = data.url;
                    } catch (e) { }
                  } catch (err: any) {
                    console.error('Favicon upload failed:', err);
                    alert(t('layout.branding.uploadError') || 'Upload failed');
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('layout.branding.uploadFaviconHelp') || 'Envie um arquivo para usar como favicon. O campo URL será atualizado automaticamente.'}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {config.site_favicon_url ? (
                <div className="w-10 h-10 flex items-center justify-center border rounded p-1 bg-white dark:bg-slate-800">
                  <img src={config.site_favicon_url} alt="favicon" className="max-h-8 max-w-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 flex items-center justify-center border rounded text-xs text-gray-400">Fav</div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={removeFavicon}
                  className="flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                >
                  {t('layout.branding.remove') || 'Remover'}
                </button>
                <button
                  type="button"
                  onClick={restoreFaviconDefault}
                  className="flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                >
                  {t('layout.branding.restoreDefault') || 'Restaurar padrão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
