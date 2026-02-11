// Theme & Colors Section — light/dark color pickers, appearance, modal settings
// Implements RF-07 (layout configuration per user/tenant)
'use client';

import React from 'react';
import { PaintBrushIcon } from '@heroicons/react/24/outline';
import { LayoutConfig } from '@/contexts/LayoutContext';
import { rotateHue, adjustLightness } from './color-utils';

interface ThemeColorsSectionProps {
  config: LayoutConfig;
  updateConfig: <K extends keyof LayoutConfig>(key: K, value: LayoutConfig[K]) => void;
  t: (key: string) => string;
}

function autoFillLight(primaryHex: string | undefined, updateConfig: ThemeColorsSectionProps['updateConfig']) {
  if (!primaryHex) return;
  const primary = primaryHex;
  const secondary = rotateHue(primary, 150);
  const sidebar = adjustLightness(primary, -8);
  const chatBtn = secondary;
  const feedbackBtn = rotateHue(primary, 200);
  const body = '#111827';
  const heading = '#0f172a';
  const muted = adjustLightness(body, 40);
  updateConfig('primary_color_light', primary);
  updateConfig('secondary_color_light', secondary);
  updateConfig('sidebar_color', sidebar);
  updateConfig('chat_button_color', chatBtn);
  updateConfig('feedback_button_color', feedbackBtn);
  updateConfig('body_text_light', body);
  updateConfig('heading_text_light', heading);
  updateConfig('muted_text_light', muted);
  const modalBg = '#ffffff';
  updateConfig('bg_light', modalBg);
  updateConfig('modal_bg_light', modalBg);
  updateConfig('border_light', adjustLightness(modalBg, -8));
  updateConfig('modal_border_light', adjustLightness(modalBg, -8));
}

function autoFillDark(primaryHex: string | undefined, updateConfig: ThemeColorsSectionProps['updateConfig']) {
  if (!primaryHex) return;
  const primary = primaryHex;
  const secondary = rotateHue(primary, 150);
  const sidebarDark = adjustLightness(primary, -20);
  const chatBtnDark = secondary;
  const feedbackBtnDark = rotateHue(primary, 200);
  const bodyDark = '#e6eef8';
  const headingDark = '#ffffff';
  const mutedDark = adjustLightness(bodyDark, -30);
  updateConfig('primary_color_dark', primary);
  updateConfig('secondary_color_dark', secondary);
  updateConfig('sidebar_color_dark', sidebarDark);
  updateConfig('chat_button_color_dark', chatBtnDark);
  updateConfig('feedback_button_color_dark', feedbackBtnDark);
  updateConfig('body_text_dark', bodyDark);
  updateConfig('heading_text_dark', headingDark);
  updateConfig('muted_text_dark', mutedDark);
  const modalBg = '#0f172a';
  updateConfig('bg_dark', modalBg);
  updateConfig('modal_bg_dark', modalBg);
  updateConfig('border_dark', adjustLightness(modalBg, 8));
  updateConfig('modal_border_dark', adjustLightness(modalBg, 8));
}

export default function ThemeColorsSection({ config, updateConfig, t }: ThemeColorsSectionProps) {
  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-pink-100 rounded-lg"><PaintBrushIcon className="w-5 h-5 text-pink-600" /></div>
        <div>
          <h2 className="text-lg font-semibold">{t('layout.themeColors.title') || 'Theme & Colors'}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('layout.themeColors.description') || 'Personalize cores e modo.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Light mode column */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('layout.theme.lightTitle') || 'Claro'}</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.primary') || 'Primary color'}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.primary_color_light || config.primary_color} onChange={(e) => updateConfig('primary_color_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                <button type="button" onClick={() => autoFillLight(config.primary_color_light || config.primary_color, updateConfig)} className="px-3 py-2 border rounded text-sm">Auto Cor</button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.secondary') || 'Secondary color'}</label>
              <input type="color" value={config.secondary_color_light || config.secondary_color} onChange={(e) => updateConfig('secondary_color_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar background</label>
              <input type="color" value={config.sidebar_color || config.secondary_color_light || config.secondary_color} onChange={(e) => updateConfig('sidebar_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cores da fonte</h4>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Body text</label>
                  <input type="color" value={config.body_text_light || ''} onChange={(e) => updateConfig('body_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Heading text</label>
                  <input type="color" value={config.heading_text_light || ''} onChange={(e) => updateConfig('heading_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Muted text</label>
                  <input type="color" value={config.muted_text_light || ''} onChange={(e) => updateConfig('muted_text_light', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar text</label>
                  <input type="color" value={config.sidebar_text_light ?? ''} onChange={(e) => updateConfig('sidebar_text_light' as any, e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Botões Flutuantes</h4>
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Chat</label>
                  <input type="color" value={config.chat_button_color || ''} onChange={(e) => updateConfig('chat_button_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Feedback</label>
                  <input type="color" value={config.feedback_button_color || ''} onChange={(e) => updateConfig('feedback_button_color', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fundo e Borda (Sistema & Modal)</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Fundo</label>
                  <input type="color" value={config.bg_light || config.modal_bg_light} onChange={(e) => { updateConfig('bg_light', e.target.value); updateConfig('modal_bg_light', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borda</label>
                  <input type="color" value={config.border_light ?? config.modal_border_light ?? ''} onChange={(e) => { updateConfig('border_light', e.target.value); updateConfig('modal_border_light', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dark mode column */}
        <div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('layout.theme.darkTitle') || 'Escuro'}</h3>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.primary') || 'Primary color'}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.primary_color_dark || config.primary_color} onChange={(e) => updateConfig('primary_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                <button type="button" onClick={() => autoFillDark(config.primary_color_dark || config.primary_color, updateConfig)} className="px-3 py-2 border rounded text-sm">Auto Cor</button>
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.secondary') || 'Secondary color'}</label>
              <input type="color" value={config.secondary_color_dark || config.secondary_color} onChange={(e) => updateConfig('secondary_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
            </div>

            <div>
              <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar background</label>
              <input type="color" value={config.sidebar_color_dark || config.secondary_color_dark || config.secondary_color} onChange={(e) => updateConfig('sidebar_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cores da fonte</h4>
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Body text</label>
                  <input type="color" value={config.body_text_dark || ''} onChange={(e) => updateConfig('body_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Heading text</label>
                  <input type="color" value={config.heading_text_dark || ''} onChange={(e) => updateConfig('heading_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Muted text</label>
                  <input type="color" value={config.muted_text_dark || ''} onChange={(e) => updateConfig('muted_text_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Sidebar text</label>
                  <input type="color" value={config.sidebar_text_dark ?? ''} onChange={(e) => updateConfig('sidebar_text_dark' as any, e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>

            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Botões Flutuantes</h4>
              <div className="flex gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Chat</label>
                  <input type="color" value={config.chat_button_color_dark || config.chat_button_color || ''} onChange={(e) => updateConfig('chat_button_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Feedback</label>
                  <input type="color" value={config.feedback_button_color_dark || config.feedback_button_color || ''} onChange={(e) => updateConfig('feedback_button_color_dark', e.target.value)} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t pt-4">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Fundo e Borda (Sistema & Modal)</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Fundo</label>
                  <input type="color" value={config.bg_dark || config.modal_bg_dark} onChange={(e) => { updateConfig('bg_dark', e.target.value); updateConfig('modal_bg_dark', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Borda</label>
                  <input type="color" value={config.border_dark ?? config.modal_border_dark ?? ''} onChange={(e) => { updateConfig('border_dark', e.target.value); updateConfig('modal_border_dark', e.target.value); }} className="w-16 h-10 p-1 rounded border" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.themeColors.appearance') || 'Appearance'}</label>
          <select
            value={config.appearance || 'default'}
            onChange={(e) => updateConfig('appearance', e.target.value as 'default' | 'highContrast' | 'system')}
            className="w-full border-2 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="default">{t('layout.themeColors.appearanceOptions.default') || 'Default'}</option>
            <option value="highContrast">{t('layout.themeColors.appearanceOptions.highContrast') || 'High contrast'}</option>
            <option value="system">{t('layout.themeColors.appearanceOptions.system') || 'System'}</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.modalOverlay') || 'Overlay opacity'}</label>
          <input type="range" min="0" max="100" value={Math.round((config.modal_overlay_opacity ?? 0.4) * 100)} onChange={(e) => updateConfig('modal_overlay_opacity', parseInt(e.target.value) / 100)} className="w-full" />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">{t('layout.theme.modalElevation') || 'Elevation'}</label>
          <select value={config.modal_elevation} onChange={(e) => updateConfig('modal_elevation', e.target.value as any)} className="w-full border-2 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>
    </section>
  );
}
