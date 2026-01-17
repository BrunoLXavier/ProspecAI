"""
User Preferences Service
Simple file-backed storage for user preferences (per-module)
"""
import json
from pathlib import Path
from typing import Any, Dict, Optional
from datetime import datetime

PREFS_DIR = Path(__file__).parent.parent / "config"
PREFS_FILE = PREFS_DIR / "preferences.json"


def _ensure_file():
    PREFS_DIR.mkdir(parents=True, exist_ok=True)
    if not PREFS_FILE.exists():
        PREFS_FILE.write_text(json.dumps({"preferences": []}, ensure_ascii=False, indent=2))


class PreferencesService:
    def __init__(self):
        _ensure_file()

    def _load(self) -> Dict[str, Any]:
        with open(PREFS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save(self, data: Dict[str, Any]):
        with open(PREFS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def get_preferences(self, user_id: Optional[str], module: str) -> Optional[Dict[str, Any]]:
        data = self._load()
        for p in data.get("preferences", []):
            if p.get("user_id") == user_id and p.get("module") == module:
                return p
        # fallback: tenant or global prefs not implemented; return None
        return None

    def save_preferences(self, prefs: Dict[str, Any]) -> Dict[str, Any]:
        data = self._load()
        prefs = prefs.copy()
        prefs["updated_at"] = datetime.utcnow().isoformat() + "Z"

        # Find existing
        found = False
        for i, p in enumerate(data.get("preferences", [])):
            if p.get("user_id") == prefs.get("user_id") and p.get("module") == prefs.get("module"):
                data["preferences"][i] = prefs
                found = True
                break

        if not found:
            data.setdefault("preferences", []).append(prefs)

        self._save(data)
        return prefs


preferences_service = PreferencesService()
