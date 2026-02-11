// Translations Shared Types & Constants
// Implements RF-01 (i18n support for pt-BR, en-US, es-ES)

export interface TranslationKey {
	key: string;
	path: string;
	values: Record<string, string>;
}

export interface TranslationsResponse {
	translations: TranslationKey[];
	total: number;
	namespaces: string[];
	locales: string[];
}

export const LOCALE_FLAGS: Record<string, string> = {
	'pt-BR': '🇧🇷',
	'en-US': '🇺🇸',
	'es-ES': '🇪🇸',
};

export const LOCALE_NAMES: Record<string, string> = {
	'pt-BR': 'Português',
	'en-US': 'English',
	'es-ES': 'Español',
};
