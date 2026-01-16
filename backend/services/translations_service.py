# Translations Service
# Service Layer - Translation Management with JSON File Storage
# Implements RF-01 (i18n support for pt-BR, en-US, es-ES)

import json
import os
from typing import Any, Dict, List, Optional
from pathlib import Path
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Supported locales
SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-ES"]

# Path to frontend locales directory (can be overridden by env var TRANSLATIONS_DIR)
def _find_locales_dir() -> Path:
    """Find the frontend locales directory by trying several likely locations.

    This helps when the backend runs inside Docker and the frontend folder
    may be mounted at different paths (e.g., `/app/frontend`).
    """
    candidates = []
    # Default (repo layout when running locally)
    candidates.append(Path(__file__).parent.parent.parent / "frontend" / "src" / "locales")
    # Common container mount used in docker-compose (we mount frontend to /app/frontend)
    candidates.append(Path("/app/frontend/src/locales"))
    # Also try relative to module path with different up-level assumptions
    candidates.append(Path(__file__).parent.parent / "frontend" / "src" / "locales")
    candidates.append(Path(__file__).parent / "../frontend/src/locales")

    for c in candidates:
        try:
            p = c.resolve()
        except Exception:
            p = c
        if p.exists() and p.is_dir():
            logger.info(f"Found locales directory: {p}")
            return p

    # Fallback to the first candidate (may not exist)
    fallback = candidates[0]
    logger.warning(f"Locales directory not found in candidates; using fallback: {fallback}")
    return fallback


# Allow overriding the locales directory via environment variable for containerized
# or permission-restricted environments. If set, prefer it (even if it doesn't
# yet exist) so operators can control where the backend stores locale files.
env_dir = os.getenv("TRANSLATIONS_DIR")
if env_dir:
    try:
        LOCALES_DIR = Path(env_dir)
        logger.info(f"Using TRANSLATIONS_DIR from env: {LOCALES_DIR}")
    except Exception:
        LOCALES_DIR = _find_locales_dir()
else:
    LOCALES_DIR = _find_locales_dir()


class TranslationKey(BaseModel):
    """Translation key with values for all locales."""
    key: str
    path: str  # Dot notation path like "navigation.dashboard"
    values: Dict[str, str]  # locale -> translation


class TranslationUpdate(BaseModel):
    """Update request for a translation."""
    path: str
    locale: str
    value: str


class TranslationCreate(BaseModel):
    """Create request for a new translation key."""
    path: str
    values: Dict[str, str]  # locale -> translation


class TranslationsService:
    """Service for managing translations across all supported locales."""
    
    def __init__(self, locales_dir: Optional[Path] = None):
        self.locales_dir = locales_dir or LOCALES_DIR
    
    def _get_locale_file_path(self, locale: str) -> Path:
        """Get the path to a locale JSON file."""
        return self.locales_dir / f"{locale}.json"
    
    def _load_locale(self, locale: str) -> Dict[str, Any]:
        """Load a locale JSON file."""
        file_path = self._get_locale_file_path(locale)
        if not file_path.exists():
            logger.warning(f"Locale file not found: {file_path}")
            return {}
        
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def _save_locale(self, locale: str, data: Dict[str, Any]) -> None:
        """Save a locale JSON file."""
        file_path = self._get_locale_file_path(locale)
        # Ensure directory exists and is writable
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except OSError as e:
            msg = (
                f"Failed to write locale file '{file_path}': {e}.\n"
                "Set the environment variable TRANSLATIONS_DIR to a writable path "
                "or ensure the configured frontend 'locales' directory is mounted and writable."
            )
            logger.error(msg)
            raise RuntimeError(msg)

        logger.info(f"Saved locale file: {file_path}")
    
    def _flatten_dict(self, d: Dict[str, Any], parent_key: str = "") -> Dict[str, str]:
        """Flatten a nested dictionary to dot notation keys."""
        items = {}
        for k, v in d.items():
            new_key = f"{parent_key}.{k}" if parent_key else k
            if isinstance(v, dict):
                items.update(self._flatten_dict(v, new_key))
            else:
                items[new_key] = str(v)
        return items
    
    def _get_nested_value(self, d: Dict[str, Any], path: str) -> Optional[str]:
        """Get a value from nested dict using dot notation path."""
        keys = path.split(".")
        current = d
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return str(current) if not isinstance(current, dict) else None
    
    def _set_nested_value(self, d: Dict[str, Any], path: str, value: str) -> None:
        """Set a value in nested dict using dot notation path."""
        keys = path.split(".")
        current = d
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
        current[keys[-1]] = value
    
    def _delete_nested_value(self, d: Dict[str, Any], path: str) -> bool:
        """Delete a value from nested dict using dot notation path."""
        keys = path.split(".")
        current = d
        for key in keys[:-1]:
            if key not in current:
                return False
            current = current[key]
        
        if keys[-1] in current:
            del current[keys[-1]]
            return True
        return False
    
    def get_all_translations(self) -> List[TranslationKey]:
        """Get all translation keys with values from all locales."""
        # Load all locales
        locale_data = {}
        for locale in SUPPORTED_LOCALES:
            locale_data[locale] = self._load_locale(locale)
        
        # Use pt-BR as the base for keys (it's the default locale)
        base_locale = "pt-BR"
        base_data = locale_data.get(base_locale, {})
        flattened = self._flatten_dict(base_data)
        
        # Build translation keys
        translations = []
        for path, pt_value in sorted(flattened.items()):
            values = {}
            for locale in SUPPORTED_LOCALES:
                values[locale] = self._get_nested_value(locale_data[locale], path) or ""
            
            translations.append(TranslationKey(
                key=path.split(".")[-1],
                path=path,
                values=values
            ))
        
        return translations
    
    def get_translations_by_namespace(self, namespace: str) -> List[TranslationKey]:
        """Get translations filtered by namespace (top-level key)."""
        all_translations = self.get_all_translations()
        return [t for t in all_translations if t.path.startswith(f"{namespace}.")]
    
    def get_translation(self, path: str) -> Optional[TranslationKey]:
        """Get a single translation key."""
        locale_data = {}
        for locale in SUPPORTED_LOCALES:
            locale_data[locale] = self._load_locale(locale)
        
        values = {}
        for locale in SUPPORTED_LOCALES:
            value = self._get_nested_value(locale_data[locale], path)
            if value:
                values[locale] = value
        
        if not values:
            return None
        
        return TranslationKey(
            key=path.split(".")[-1],
            path=path,
            values=values
        )
    
    def update_translation(self, update: TranslationUpdate) -> TranslationKey:
        """Update a single translation value."""
        if update.locale not in SUPPORTED_LOCALES:
            raise ValueError(f"Unsupported locale: {update.locale}")
        
        # Load the locale data
        data = self._load_locale(update.locale)
        
        # Update the value
        self._set_nested_value(data, update.path, update.value)
        
        # Save the file
        self._save_locale(update.locale, data)
        
        # Return the updated translation
        return self.get_translation(update.path)
    
    def create_translation(self, create: TranslationCreate) -> TranslationKey:
        """Create a new translation key across all locales."""
        for locale in SUPPORTED_LOCALES:
            data = self._load_locale(locale)
            value = create.values.get(locale, "")
            if value:
                self._set_nested_value(data, create.path, value)
                self._save_locale(locale, data)
        
        return self.get_translation(create.path)
    
    def delete_translation(self, path: str) -> bool:
        """Delete a translation key from all locales."""
        deleted = False
        for locale in SUPPORTED_LOCALES:
            data = self._load_locale(locale)
            if self._delete_nested_value(data, path):
                self._save_locale(locale, data)
                deleted = True
        return deleted
    
    def get_namespaces(self) -> List[str]:
        """Get all top-level namespaces from translations."""
        base_data = self._load_locale("pt-BR")
        return sorted(base_data.keys())
    
    def export_locale(self, locale: str) -> Dict[str, Any]:
        """Export a complete locale file."""
        if locale not in SUPPORTED_LOCALES:
            raise ValueError(f"Unsupported locale: {locale}")
        return self._load_locale(locale)
    
    def import_locale(self, locale: str, data: Dict[str, Any]) -> None:
        """Import/replace a complete locale file."""
        if locale not in SUPPORTED_LOCALES:
            raise ValueError(f"Unsupported locale: {locale}")
        self._save_locale(locale, data)


# Singleton instance
translations_service = TranslationsService()
