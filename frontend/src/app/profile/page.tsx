// Profile Page
// User profile management
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  KeyIcon,
  CameraIcon,
  CheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const t = useTranslations('profile');
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.fullName || user?.username || 'Admin User',
    email: user?.email || 'admin@prospecai.com',
    department: 'Pesquisa e Desenvolvimento',
    phone: '(21) 99999-9999',
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSaving(false);
    setIsEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const userRoles = user?.roles || ['admin'];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Card */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-secondary-500" />
        
        {/* Avatar & Basic Info */}
        <div className="relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-800 p-1 shadow-lg">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                  {formData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              </div>
              <button className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition">
                <CameraIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Name & Email */}
            <div className="flex-1 pt-4 sm:pt-0">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {formData.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{formData.email}</p>
            </div>

            {/* Edit Button */}
            <div className="flex gap-2">
              {showSaved && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                  <CheckIcon className="w-4 h-4" />
                  {t('saved')}
                </div>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {t('save')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                >
                  {t('edit')}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Personal Information */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <UserCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('personalInfo.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('personalInfo.name')}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
              />
            ) : (
              <p className="text-gray-900 dark:text-white py-2">{formData.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <EnvelopeIcon className="w-4 h-4 inline mr-1" />
              {t('personalInfo.email')}
            </label>
            <p className="text-gray-900 dark:text-white py-2">{formData.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('personalInfo.emailNote')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
              {t('personalInfo.department')}
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
              />
            ) : (
              <p className="text-gray-900 dark:text-white py-2">{formData.department}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('personalInfo.phone')}
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
              />
            ) : (
              <p className="text-gray-900 dark:text-white py-2">{formData.phone}</p>
            )}
          </div>
        </div>
      </section>

      {/* Roles & Permissions */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <ShieldCheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('roles.title')}
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {userRoles.map((role) => (
            <span
              key={role}
              className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
            >
              {t(`roles.${role}`)}
            </span>
          ))}
        </div>

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
          {t('roles.note')}
        </p>
      </section>

      {/* Preferences */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Cog6ToothIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('preferences.title') || 'Preferências'}
          </h2>
        </div>

        <div className="space-y-3">
          <Link
            href="/profile/statistics"
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <ChartBarIcon className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {t('preferences.statistics') || 'Estatísticas Visíveis'}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('preferences.statisticsDesc') || 'Configure quais estatísticas você deseja visualizar em cada página'}
                </p>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
        </div>
      </section>

      {/* Security */}
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-soft p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <KeyIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('security.title')}
          </h2>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <KeyIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                {t('security.changePassword')}
              </span>
            </div>
            <span className="text-gray-400">→</span>
          </button>

          <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-gray-700 dark:text-gray-300">{t('security.lastLogin')}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="px-6 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition font-medium"
        >
          {t('logout')}
        </button>
      </div>

      {/* Password Change Modal (placeholder) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-floating">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('security.changePassword')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('security.currentPassword')}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('security.newPassword')}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('security.confirmPassword')}
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-slate-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                {t('security.updatePassword')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
