"""
Report Generation Service
Implements RF-09: Customizable reports with templates
"""
import io
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
from dataclasses import dataclass
import json

from pydantic import BaseModel


class ReportFormat(str, Enum):
    """Supported report formats"""
    PDF = "pdf"
    DOCX = "docx"
    HTML = "html"
    JSON = "json"
    CSV = "csv"


class ReportType(str, Enum):
    """Available report types"""
    PROPOSAL_SUMMARY = "proposal_summary"
    MATCHING_ANALYSIS = "matching_analysis"
    PORTFOLIO_OVERVIEW = "portfolio_overview"
    PIPELINE_STATUS = "pipeline_status"
    FUNDING_OPPORTUNITIES = "funding_opportunities"
    CLIENT_REPORT = "client_report"


@dataclass
class ReportTemplate:
    """Report template definition"""
    id: str
    name: str
    type: ReportType
    description: str
    sections: List[str]
    default_format: ReportFormat


# =============================================================================
# Templates Registry
# =============================================================================

REPORT_TEMPLATES: Dict[str, ReportTemplate] = {
    "proposal_summary": ReportTemplate(
        id="proposal_summary",
        name="Proposal Summary",
        type=ReportType.PROPOSAL_SUMMARY,
        description="Summarized proposal document for submission",
        sections=[
            "header", "executive_summary", "objectives",
            "methodology", "budget", "timeline", "team"
        ],
        default_format=ReportFormat.PDF,
    ),
    "matching_analysis": ReportTemplate(
        id="matching_analysis",
        name="Matching Analysis",
        type=ReportType.MATCHING_ANALYSIS,
        description="Detailed project-funding adherence report",
        sections=[
            "header", "score_breakdown", "strengths",
            "gaps", "recommendations", "appendix"
        ],
        default_format=ReportFormat.PDF,
    ),
    "portfolio_overview": ReportTemplate(
        id="portfolio_overview",
        name="Portfolio Overview",
        type=ReportType.PORTFOLIO_OVERVIEW,
        description="Consolidated status of all projects",
        sections=[
            "header", "summary_stats", "projects_list",
            "trl_distribution", "lessons_learned"
        ],
        default_format=ReportFormat.PDF,
    ),
    "pipeline_status": ReportTemplate(
        id="pipeline_status",
        name="Pipeline Status",
        type=ReportType.PIPELINE_STATUS,
        description="Opportunities report by stage",
        sections=[
            "header", "funnel_chart", "opportunities_table",
            "forecast", "action_items"
        ],
        default_format=ReportFormat.PDF,
    ),
    "funding_opportunities": ReportTemplate(
        id="funding_opportunities",
        name="Funding Opportunities",
        type=ReportType.FUNDING_OPPORTUNITIES,
        description="Available funding calls with analysis",
        sections=[
            "header", "active_calls", "upcoming_deadlines",
            "budget_summary", "recommendations"
        ],
        default_format=ReportFormat.PDF,
    ),
}


# =============================================================================
# Report Generator
# =============================================================================

class ReportGenerator:
    """
    Generates reports from templates with dynamic data.
    """
    
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
    
    def get_available_templates(self) -> List[ReportTemplate]:
        """Get all available report templates"""
        return list(REPORT_TEMPLATES.values())
    
    def get_template(self, template_id: str) -> Optional[ReportTemplate]:
        """Get specific template by ID"""
        return REPORT_TEMPLATES.get(template_id)
    
    async def generate(
        self,
        template_id: str,
        data: Dict[str, Any],
        format: ReportFormat = None,
        custom_sections: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Generate report from template with provided data.
        
        Args:
            template_id: Template to use
            data: Dynamic data to populate template
            format: Output format (uses template default if not specified)
            custom_sections: Override template sections
        
        Returns:
            Dict with report content and metadata
        """
        template = self.get_template(template_id)
        if not template:
            raise ValueError(f"Template not found: {template_id}")
        
        output_format = format or template.default_format
        sections = custom_sections or template.sections
        
        # Build report content
        report_content = self._build_content(template, sections, data)
        
        # Format output
        if output_format == ReportFormat.JSON:
            output = json.dumps(report_content, indent=2, default=str)
        elif output_format == ReportFormat.HTML:
            output = self._render_html(template, report_content)
        elif output_format == ReportFormat.CSV:
            output = self._render_csv(report_content)
        else:
            # PDF/DOCX would require external libraries
            # Return HTML that can be converted client-side
            output = self._render_html(template, report_content)
        
        return {
            "template_id": template_id,
            "template_name": template.name,
            "format": output_format.value,
            "generated_at": datetime.now().isoformat(),
            "tenant_id": self.tenant_id,
            "content": output,
            "sections_included": sections,
        }
    
    def _build_content(
        self,
        template: ReportTemplate,
        sections: List[str],
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Build structured content for each section"""
        content = {
            "metadata": {
                "report_type": template.type.value,
                "report_name": template.name,
                "generated_at": datetime.now().isoformat(),
            },
            "sections": {}
        }
        
        for section in sections:
            section_data = data.get(section, {})
            content["sections"][section] = {
                "title": self._get_section_title(section),
                "data": section_data,
            }
        
        return content
    
    def _get_section_title(self, section: str) -> str:
        """Get human-readable section title"""
        titles = {
            "header": "Header",
            "executive_summary": "Executive Summary",
            "objectives": "Objectives",
            "methodology": "Methodology",
            "budget": "Budget",
            "timeline": "Timeline",
            "team": "Team",
            "score_breakdown": "Score Breakdown",
            "strengths": "Strengths",
            "gaps": "Identified Gaps",
            "recommendations": "Recommendations",
            "appendix": "Appendix",
            "summary_stats": "Statistics",
            "projects_list": "Projects List",
            "trl_distribution": "TRL Distribution",
            "lessons_learned": "Lessons Learned",
            "funnel_chart": "Sales Funnel",
            "opportunities_table": "Opportunities Table",
            "forecast": "Forecast",
            "action_items": "Action Items",
            "active_calls": "Active Calls",
            "upcoming_deadlines": "Upcoming Deadlines",
            "budget_summary": "Budget Summary",
        }
        return titles.get(section, section.replace("_", " ").title())
    
    def _render_html(self, template: ReportTemplate, content: Dict[str, Any]) -> str:
        """Render report as HTML document"""
        sections_html = ""
        
        for section_id, section in content.get("sections", {}).items():
            section_data = section.get("data", {})
            data_html = self._data_to_html(section_data)
            
            sections_html += f"""
            <section class="report-section" id="{section_id}">
                <h2>{section.get('title', section_id)}</h2>
                <div class="section-content">
                    {data_html}
                </div>
            </section>
            """
        
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{template.name} - ProspecAI</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }}
        .report-header {{
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        .report-header h1 {{
            color: #2563eb;
            margin: 0;
        }}
        .report-meta {{
            color: #666;
            font-size: 0.9em;
        }}
        .report-section {{
            margin-bottom: 30px;
        }}
        .report-section h2 {{
            color: #1e40af;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 10px;
        }}
        .section-content {{
            padding: 10px 0;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }}
        th, td {{
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
        }}
        th {{
            background: #f3f4f6;
        }}
        .badge {{
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.85em;
        }}
        .badge-success {{ background: #d1fae5; color: #065f46; }}
        .badge-warning {{ background: #fef3c7; color: #92400e; }}
        .badge-danger {{ background: #fee2e2; color: #991b1b; }}
        @media print {{
            body {{ max-width: none; }}
            .report-section {{ page-break-inside: avoid; }}
        }}
    </style>
</head>
<body>
    <header class="report-header">
        <h1>{template.name}</h1>
        <p class="report-meta">
            Generated on: {content['metadata']['generated_at']}<br>
            Type: {template.description}
        </p>
    </header>
    
    <main>
        {sections_html}
    </main>
    
    <footer>
        <p style="color: #666; font-size: 0.8em; text-align: center; margin-top: 40px;">
            Report generated by ProspecAI - Intelligent R&D Prospecting System
        </p>
    </footer>
</body>
</html>
        """
    
    def _data_to_html(self, data: Any, level: int = 0) -> str:
        """Convert data structure to HTML representation"""
        if data is None or data == {}:
            return "<p><em>No data available</em></p>"
        
        if isinstance(data, dict):
            if not data:
                return "<p><em>No data</em></p>"
            
            items = []
            for key, value in data.items():
                label = key.replace("_", " ").title()
                items.append(f"<dt><strong>{label}</strong></dt><dd>{self._data_to_html(value, level+1)}</dd>")
            return f"<dl>{''.join(items)}</dl>"
        
        elif isinstance(data, list):
            if not data:
                return "<p><em>Empty list</em></p>"
            
            # If list of dicts, render as table
            if data and isinstance(data[0], dict):
                headers = list(data[0].keys())
                header_row = "".join(f"<th>{h.replace('_', ' ').title()}</th>" for h in headers)
                rows = ""
                for item in data:
                    cells = "".join(f"<td>{item.get(h, '')}</td>" for h in headers)
                    rows += f"<tr>{cells}</tr>"
                return f"<table><thead><tr>{header_row}</tr></thead><tbody>{rows}</tbody></table>"
            
            # Simple list
            items = "".join(f"<li>{self._data_to_html(item, level+1)}</li>" for item in data)
            return f"<ul>{items}</ul>"
        
        else:
            return str(data)
    
    def _render_csv(self, content: Dict[str, Any]) -> str:
        """Render report as CSV (flat structure)"""
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write metadata
        writer.writerow(["Report Type", content["metadata"]["report_type"]])
        writer.writerow(["Generated At", content["metadata"]["generated_at"]])
        writer.writerow([])
        
        # Write each section
        for section_id, section in content.get("sections", {}).items():
            writer.writerow([f"=== {section.get('title', section_id)} ==="])
            
            data = section.get("data", {})
            if isinstance(data, dict):
                for key, value in data.items():
                    writer.writerow([key, str(value)])
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        writer.writerow(list(item.values()))
                    else:
                        writer.writerow([item])
            
            writer.writerow([])
        
        return output.getvalue()


# =============================================================================
# Factory
# =============================================================================

def get_report_generator(tenant_id: str) -> ReportGenerator:
    """Get report generator for tenant"""
    return ReportGenerator(tenant_id)
