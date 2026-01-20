# Layout Configuration Service
# Service Layer - User/Tenant Layout Customization
# Implements RF-07 (layout configuration per user/tenant)

import json
from typing import Any, Dict, List, Optional
from pathlib import Path
from datetime import datetime
import logging
from pydantic import BaseModel, Field
from enum import Enum

logger = logging.getLogger(__name__)


class SidebarPosition(str, Enum):
    """Sidebar position options."""
    LEFT = "left"
    RIGHT = "right"


class DashboardWidget(str, Enum):
    """Available dashboard widgets."""
    STATS_OVERVIEW = "stats_overview"
    RECENT_ACTIVITY = "recent_activity"
    PIPELINE_CHART = "pipeline_chart"
    MATCHING_ALERTS = "matching_alerts"
    DEADLINES = "deadlines"
    QUICK_ACTIONS = "quick_actions"
    TOP_OPPORTUNITIES = "top_opportunities"
    PROPOSALS_STATUS = "proposals_status"


class LayoutConfig(BaseModel):
    """Layout configuration for a user or tenant."""
    id: str
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    
    # Sidebar configuration
    sidebar_position: SidebarPosition = SidebarPosition.LEFT
    sidebar_collapsed: bool = False
    sidebar_width: int = 280
    
    # Navigation configuration
    visible_nav_items: List[str] = Field(default_factory=lambda: [
        "dashboard", "funding", "portfolio", "crm", 
        "opportunities", "proposals", "communications", "institutes", "teams", "infrastructure", "settings"
    ])
    # Role-based navigation visibility
    visible_nav_items_by_role: Dict[str, List[str]] = Field(default_factory=lambda: {
        "admin": ["dashboard", "funding", "portfolio", "crm", "opportunities", "proposals", "reports", "activity", "ingestion", "piiAnalysis", "settings"],
        "manager": ["dashboard", "funding", "portfolio", "crm", "opportunities", "proposals", "reports", "activity"],
        "user": ["dashboard", "opportunities", "proposals", "activity"],
        "viewer": ["dashboard", "activity"]
    })
    nav_order: List[str] = Field(default_factory=lambda: [
        "dashboard", "funding", "portfolio", "crm", 
        "opportunities", "proposals", "communications", "institutes", "teams", "infrastructure", "settings"
    ])
    
    # Dashboard configuration
    dashboard_widgets: List[str] = Field(default_factory=lambda: [
        "pipeline", "opportunities", "metrics", "activity",
        "analytics-kpis", "analytics-pipeline", "analytics-trl",
        "analytics-trends", "analytics-export"
    ])
    dashboard_widget_order: List[str] = Field(default_factory=list)  # User's custom order
    dashboard_widgets_by_role: Dict[str, List[str]] = Field(default_factory=lambda: {
        "admin": ["pipeline", "opportunities", "metrics", "activity", "matching", "calendar",
                  "analytics-kpis", "analytics-pipeline", "analytics-trl", "analytics-trends", "analytics-export"],
        "manager": ["pipeline", "opportunities", "metrics", "activity", "analytics-kpis", "analytics-pipeline", "analytics-trends"],
        "user": ["pipeline", "metrics", "activity", "analytics-kpis"],
        "viewer": ["metrics", "activity"],
    })
    dashboard_layout: str = "default"  # default, compact, wide
    
    # Table configuration
    default_page_size: int = 10
    dense_tables: bool = False
    
    # UI preferences
    animations_enabled: bool = True
    compact_mode: bool = False
    # Theme / color tokens
    color_mode: Optional[str] = "light"
    appearance: Optional[str] = "default"
    primary_color: str = "#E30613"
    secondary_color: str = "#003366"
    # Per-button colors (floating controls that should not follow primary/secondary)
    chat_button_color: str = "#E30613"
    feedback_button_color: str = "#f59e0b"
    # Sidebar explicit color tokens (do not assume secondary)
    sidebar_color: Optional[str] = None
    sidebar_color_dark: Optional[str] = None
    # Font color tokens
    body_text_light: Optional[str] = "#0f172a"
    body_text_dark: Optional[str] = "#f8fafc"
    heading_text_light: Optional[str] = "#0f172a"
    heading_text_dark: Optional[str] = "#f8fafc"
    muted_text_light: Optional[str] = "#6b7280"
    muted_text_dark: Optional[str] = "#9ca3af"
    primary_color_light: Optional[str] = "#E30613"
    primary_color_dark: Optional[str] = "#E30613"
    secondary_color_light: Optional[str] = "#003366"
    secondary_color_dark: Optional[str] = "#003366"
    modal_bg_light: Optional[str] = "#ffffff"
    modal_bg_dark: Optional[str] = "#1e293b"
    modal_text_light: Optional[str] = "#0f172a"
    modal_text_dark: Optional[str] = "#f8fafc"
    modal_border_light: Optional[str] = "#e2e8f0"
    modal_border_dark: Optional[str] = "#334155"
    modal_overlay_opacity: Optional[float] = 0.4
    modal_elevation: Optional[str] = "medium"
    
    created_at: str = ""
    updated_at: str = ""


class LayoutConfigUpdate(BaseModel):
    """Update request for layout configuration."""
    sidebar_position: Optional[SidebarPosition] = None
    sidebar_collapsed: Optional[bool] = None
    sidebar_width: Optional[int] = None
    visible_nav_items: Optional[List[str]] = None
    nav_order: Optional[List[str]] = None
    dashboard_widgets: Optional[List[str]] = None
    dashboard_widget_order: Optional[List[str]] = None
    dashboard_widgets_by_role: Optional[Dict[str, List[str]]] = None
    visible_nav_items_by_role: Optional[Dict[str, List[str]]] = None
    dashboard_layout: Optional[str] = None
    default_page_size: Optional[int] = None
    dense_tables: Optional[bool] = None
    animations_enabled: Optional[bool] = None
    compact_mode: Optional[bool] = None
    # Theme / color tokens
    color_mode: Optional[str] = None
    appearance: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    # Per-button colors
    chat_button_color: Optional[str] = None
    feedback_button_color: Optional[str] = None
    sidebar_color: Optional[str] = None
    sidebar_color_dark: Optional[str] = None
    # Font color tokens
    body_text_light: Optional[str] = None
    body_text_dark: Optional[str] = None
    heading_text_light: Optional[str] = None
    heading_text_dark: Optional[str] = None
    muted_text_light: Optional[str] = None
    muted_text_dark: Optional[str] = None
    primary_color_light: Optional[str] = None
    primary_color_dark: Optional[str] = None
    secondary_color_light: Optional[str] = None
    secondary_color_dark: Optional[str] = None
    modal_bg_light: Optional[str] = None
    modal_bg_dark: Optional[str] = None
    modal_text_light: Optional[str] = None
    modal_text_dark: Optional[str] = None
    modal_border_light: Optional[str] = None
    modal_border_dark: Optional[str] = None
    modal_overlay_opacity: Optional[float] = None
    modal_elevation: Optional[str] = None


# Available navigation items
AVAILABLE_NAV_ITEMS = [
    {"id": "dashboard", "label": "Dashboard", "icon": "HomeIcon"},
    {"id": "funding", "label": "Funding Sources", "icon": "BanknotesIcon"},
    {"id": "portfolio", "label": "Portfolio", "icon": "FolderIcon"},
    {"id": "crm", "label": "CRM", "icon": "UsersIcon"},
    {"id": "opportunities", "label": "Opportunities", "icon": "LightBulbIcon"},
    {"id": "proposals", "label": "Proposals", "icon": "DocumentTextIcon"},
    {"id": "communications", "label": "Communications", "icon": "DocumentTextIcon"},
    {"id": "institutes", "label": "Institutes", "icon": "UserGroupIcon"},
    {"id": "teams", "label": "Teams", "icon": "UserGroupIcon"},
    {"id": "infrastructure", "label": "Infrastructure", "icon": "DocumentChartBarIcon"},
    {"id": "analytics", "label": "Analytics", "icon": "ChartBarIcon"},
    {"id": "reports", "label": "Reports", "icon": "DocumentChartBarIcon"},
    {"id": "settings", "label": "Settings", "icon": "Cog6ToothIcon"},
]

# Available dashboard widgets
AVAILABLE_WIDGETS = [
    {"id": "stats_overview", "label": "Statistics Overview", "size": "large"},
    {"id": "recent_activity", "label": "Recent Activity", "size": "medium"},
    {"id": "pipeline_chart", "label": "Pipeline Chart", "size": "large"},
    {"id": "matching_alerts", "label": "Matching Alerts", "size": "medium"},
    {"id": "deadlines", "label": "Upcoming Deadlines", "size": "small"},
    {"id": "quick_actions", "label": "Quick Actions", "size": "small"},
    {"id": "top_opportunities", "label": "Top Opportunities", "size": "medium"},
    {"id": "proposals_status", "label": "Proposals Status", "size": "medium"},
]

# Path to layout configuration file
LAYOUT_CONFIG_DIR = Path(__file__).parent.parent / "config"
LAYOUT_CONFIG_FILE = LAYOUT_CONFIG_DIR / "layouts.json"


class LayoutService:
    """Service for managing layout configurations."""
    
    def __init__(self, config_file: Optional[Path] = None):
        self.config_file = config_file or LAYOUT_CONFIG_FILE
        self._ensure_config_exists()
    
    def _ensure_config_exists(self):
        """Ensure the layout config file exists."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        
        if not self.config_file.exists():
            self._save_config({"layouts": []})
    
    def _load_config(self) -> Dict[str, Any]:
        """Load the layout configuration."""
        with open(self.config_file, "r", encoding="utf-8") as f:
            return json.load(f)
    
    def _save_config(self, config: Dict[str, Any]) -> None:
        """Save the layout configuration."""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(config, f, ensure_ascii=False, indent=2)
    
    def _get_default_config(self, user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> LayoutConfig:
        """Get default layout configuration."""
        now = datetime.utcnow().isoformat() + "Z"
        config_id = f"{user_id or 'default'}_{tenant_id or 'default'}"
        
        return LayoutConfig(
            id=config_id,
            user_id=user_id,
            tenant_id=tenant_id,
            created_at=now,
            updated_at=now
        )
    
    def get_layout(self, user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> LayoutConfig:
        """Get layout configuration for a user/tenant."""
        config = self._load_config()
        
        # Try to find user-specific config first
        if user_id:
            for layout in config.get("layouts", []):
                if layout.get("user_id") == user_id:
                    return LayoutConfig(**layout)
        
        # Then try tenant-specific config
        if tenant_id:
            for layout in config.get("layouts", []):
                if layout.get("tenant_id") == tenant_id and not layout.get("user_id"):
                    return LayoutConfig(**layout)
        
        # Return default config
        return self._get_default_config(user_id, tenant_id)
    
    def update_layout(
        self, 
        update: LayoutConfigUpdate,
        user_id: Optional[str] = None, 
        tenant_id: Optional[str] = None
    ) -> LayoutConfig:
        """Update layout configuration."""
        config = self._load_config()
        now = datetime.utcnow().isoformat() + "Z"
        
        # Find existing config or create new
        layout_index = None
        for i, layout in enumerate(config.get("layouts", [])):
            if user_id and layout.get("user_id") == user_id:
                layout_index = i
                break
            if tenant_id and layout.get("tenant_id") == tenant_id and not layout.get("user_id"):
                layout_index = i
                break
        
        if layout_index is not None:
            # Update existing
            existing = config["layouts"][layout_index]
            for key, value in update.model_dump(exclude_none=True).items():
                existing[key] = value
            existing["updated_at"] = now
            config["layouts"][layout_index] = existing
        else:
            # Create new
            new_layout = self._get_default_config(user_id, tenant_id).model_dump()
            for key, value in update.model_dump(exclude_none=True).items():
                new_layout[key] = value
            new_layout["updated_at"] = now
            config.setdefault("layouts", []).append(new_layout)
        
        self._save_config(config)
        return self.get_layout(user_id, tenant_id)
    
    def reset_layout(self, user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> LayoutConfig:
        """Reset layout to default."""
        config = self._load_config()
        
        # Remove existing config
        config["layouts"] = [
            l for l in config.get("layouts", [])
            if not (
                (user_id and l.get("user_id") == user_id) or
                (tenant_id and l.get("tenant_id") == tenant_id and not l.get("user_id"))
            )
        ]
        
        self._save_config(config)
        return self._get_default_config(user_id, tenant_id)
    
    def get_available_nav_items(self) -> List[Dict[str, str]]:
        """Get available navigation items."""
        return AVAILABLE_NAV_ITEMS
    
    def get_available_widgets(self) -> List[Dict[str, str]]:
        """Get available dashboard widgets."""
        return AVAILABLE_WIDGETS


# Singleton instance
layout_service = LayoutService()
