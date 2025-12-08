#!/usr/bin/env python3
"""
Weekly HTML Report Generator - Multi-Tenant Support
Creates comprehensive weekly performance and reliability reports per tenant
"""

import argparse
import json
import os
import pathlib
import sys
import zipfile
from datetime import datetime, timedelta
from typing import List
import requests

# Add the parent directory to Python path to import services
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from services.slo_service import slo_service
from services.performance_service import performance_service
from services.uptime_service import uptime_service

# Import tenant utilities
try:
    from app.tenant import current_tenant, list_tenants, tenant_data_path
except ImportError:
    # Fallback if app.tenant is not available
    def current_tenant():
        return os.getenv("FXZ_TENANT", "default")

    def list_tenants():
        return [current_tenant()]

    def tenant_data_path(tenant=None):
        return pathlib.Path(".localdata") / (tenant or current_tenant())


# Configuration
ROOT = pathlib.Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
LOCALDATA = ROOT / ".localdata"
LOCALDATA.mkdir(exist_ok=True)

EMAIL_WEBHOOK = os.environ.get("FXZ_EMAIL_WEBHOOK")
ALERT_TO = os.environ.get("FXZ_ALERT_TO", "ops@yourco.com")
EMAIL_DOMAIN = os.environ.get("EMAIL_DOMAIN", "fixzit.co")


def generate_performance_chart_data(tenant: str = None):
    """Generate data for performance trend charts for specific tenant"""
    if tenant is None:
        tenant = current_tenant()

    # Try tenant-specific trends first, then fall back to global
    trends_file = ART / f"perf-trends-{tenant}.json"
    if not trends_file.exists():
        trends_file = ART / "perf-trends.json"

    if not trends_file.exists():
        return {}

    try:
        trends_data = json.loads(trends_file.read_text())
        chart_data = {}

        for route, route_data in trends_data.get("trends", {}).items():
            daily_averages = route_data.get("daily_averages", {})

            if daily_averages:
                dates = list(daily_averages.keys())
                dates.sort()

                chart_data[route] = {
                    "dates": dates[-7:],  # Last 7 days
                    "fcp": [daily_averages[date]["fcp_avg"] for date in dates[-7:]],
                    "lcp": [daily_averages[date]["lcp_avg"] for date in dates[-7:]],
                    "cls": [daily_averages[date]["cls_avg"] for date in dates[-7:]],
                }

        return chart_data
    except Exception as e:
        print(f"Warning: Could not load trend data: {e}")
        return {}


def generate_html_report(tenant: str = None):
    """Generate comprehensive HTML report for a specific tenant"""
    if tenant is None:
        tenant = current_tenant()

    # Get tenant-specific data
    slo_status = slo_service.calculate_slo_status()
    health_score = uptime_service.get_system_health_score()
    budget_results = performance_service.get_budget_results()
    latest_metrics = performance_service.get_latest_metrics()
    recent_alerts = uptime_service.get_alerts()[:10]
    chart_data = generate_performance_chart_data(tenant)

    # Calculate report period
    end_date = datetime.now()
    start_date = end_date - timedelta(days=7)

    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fixzit Weekly Report - {end_date.strftime('%Y-%m-%d')}</title>
    <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }}
        .content {{
            padding: 30px;
        }}
        .section {{
            margin-bottom: 40px;
        }}
        .section h2 {{
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .metric-card {{
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            border-left: 4px solid #3498db;
        }}
        .metric-card.healthy {{
            border-left-color: #27ae60;
        }}
        .metric-card.warning {{
            border-left-color: #f39c12;
        }}
        .metric-card.critical {{
            border-left-color: #e74c3c;
        }}
        .metric-value {{
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        .metric-label {{
            color: #7f8c8d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .metric-target {{
            color: #95a5a6;
            font-size: 0.8em;
            margin-top: 5px;
        }}
        .alert-item {{
            background: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
        }}
        .alert-item.warning {{
            background: #fffbeb;
            border-color: #fed7aa;
        }}
        .alert-item.info {{
            background: #ebf8ff;
            border-color: #90cdf4;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: bold;
            text-transform: uppercase;
        }}
        .status-healthy {{
            background: #d4edda;
            color: #155724;
        }}
        .status-warning {{
            background: #fff3cd;
            color: #856404;
        }}
        .status-critical {{
            background: #f8d7da;
            color: #721c24;
        }}
        .chart-container {{
            height: 400px;
            margin: 20px 0;
        }}
        .summary-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }}
        .summary-table th,
        .summary-table td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}
        .summary-table th {{
            background-color: #f8f9fa;
            font-weight: 600;
        }}
        .footer {{
            background: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
        }}
        @media (max-width: 768px) {{
            .metrics-grid {{
                grid-template-columns: 1fr;
            }}
            .container {{
                margin: 10px;
                border-radius: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Fixzit Weekly Report</h1>
            <p>Performance & Reliability Summary - Tenant: {tenant}</p>
            <p>{start_date.strftime('%B %d')} - {end_date.strftime('%B %d, %Y')}</p>
        </div>
        
        <div class="content">
            <!-- Executive Summary -->
            <div class="section">
                <h2>📊 Executive Summary</h2>
                <div class="metrics-grid">
                    <div class="metric-card healthy">
                        <div class="metric-value">{health_score.get('score', 0):.1f}%</div>
                        <div class="metric-label">System Health Score</div>
                        <div class="metric-target">Grade: {health_score.get('grade', 'N/A')}</div>
                    </div>
                    <div class="metric-card {'healthy' if budget_results and budget_results.get('passed') else 'critical'}">
                        <div class="metric-value">{'✅' if budget_results and budget_results.get('passed') else '❌'}</div>
                        <div class="metric-label">Performance Budget</div>
                        <div class="metric-target">{'All budgets met' if budget_results and budget_results.get('passed') else f'{len(budget_results.get("violations", []))} violations' if budget_results else 'No data'}</div>
                    </div>
                    <div class="metric-card {'healthy' if len(recent_alerts) == 0 else 'warning'}">
                        <div class="metric-value">{len(recent_alerts)}</div>
                        <div class="metric-label">Active Alerts</div>
                        <div class="metric-target">Last 7 days</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">{health_score.get('endpoints_monitored', 0)}</div>
                        <div class="metric-label">Monitored Endpoints</div>
                        <div class="metric-target">Uptime tracking</div>
                    </div>
                </div>
            </div>
            
            <!-- SLO Status -->
            <div class="section">
                <h2>🎯 Service Level Objectives</h2>
                <div class="metrics-grid">
"""

    # Add SLO cards
    for slo_id, slo in slo_status.items():
        status_class = (
            slo.get("status", "unknown")
            .replace("healthy", "healthy")
            .replace("warning", "warning")
            .replace("critical", "critical")
        )
        status_badge_class = f"status-{status_class}"

        html_content += f"""
                    <div class="metric-card {status_class}">
                        <div class="metric-value">{slo.get('current_value', 0)}{slo.get('unit', '')}</div>
                        <div class="metric-label">{slo.get('name', slo_id)}</div>
                        <div class="metric-target">Target: {slo.get('target', 0)}{slo.get('unit', '')}</div>
                        <span class="status-badge {status_badge_class}">{slo.get('status', 'unknown')}</span>
                    </div>
"""

    # Continue with performance metrics
    html_content += """
                </div>
            </div>
            
            <!-- Performance Metrics -->
            <div class="section">
                <h2>⚡ Core Web Vitals</h2>
"""

    if latest_metrics:
        fcp = latest_metrics.get("fcp", 0)
        lcp = latest_metrics.get("lcp", 0)
        cls = latest_metrics.get("cls", 0)

        html_content += f"""
                <div class="metrics-grid">
                    <div class="metric-card {'healthy' if fcp <= 1800 else 'warning' if fcp <= 3000 else 'critical'}">
                        <div class="metric-value">{fcp}ms</div>
                        <div class="metric-label">First Contentful Paint</div>
                        <div class="metric-target">Target: ≤ 1.8s</div>
                    </div>
                    <div class="metric-card {'healthy' if lcp <= 2500 else 'warning' if lcp <= 4000 else 'critical'}">
                        <div class="metric-value">{lcp}ms</div>
                        <div class="metric-label">Largest Contentful Paint</div>
                        <div class="metric-target">Target: ≤ 2.5s</div>
                    </div>
                    <div class="metric-card {'healthy' if cls <= 0.1 else 'warning' if cls <= 0.25 else 'critical'}">
                        <div class="metric-value">{cls:.3f}</div>
                        <div class="metric-label">Cumulative Layout Shift</div>
                        <div class="metric-target">Target: ≤ 0.1</div>
                    </div>
                </div>
"""

        # Add performance trends chart if available
        if chart_data:
            html_content += (
                """
                <div class="chart-container">
                    <div id="performanceChart"></div>
                </div>
                <script>
                    var chartData = """
                + json.dumps(chart_data)
                + """;
                    
                    var traces = [];
                    var colors = ['#3498db', '#e74c3c', '#f39c12', '#27ae60'];
                    var colorIndex = 0;
                    
                    for (var route in chartData) {
                        var data = chartData[route];
                        
                        traces.push({
                            x: data.dates,
                            y: data.fcp,
                            name: route + ' - FCP',
                            mode: 'lines+markers',
                            line: { color: colors[colorIndex % colors.length] }
                        });
                        
                        traces.push({
                            x: data.dates,
                            y: data.lcp,
                            name: route + ' - LCP',
                            mode: 'lines+markers',
                            line: { color: colors[(colorIndex + 1) % colors.length], dash: 'dash' }
                        });
                        
                        colorIndex += 2;
                    }
                    
                    var layout = {
                        title: 'Performance Trends (Last 7 Days)',
                        xaxis: { title: 'Date' },
                        yaxis: { title: 'Time (ms)' },
                        hovermode: 'x unified'
                    };
                    
                    Plotly.newPlot('performanceChart', traces, layout, {responsive: true});
                </script>
"""
            )
    else:
        html_content += """
                <p>No performance metrics available. Run performance tests to generate data.</p>
"""

    # Add alerts section
    html_content += """
            </div>
            
            <!-- Recent Alerts -->
            <div class="section">
                <h2>🚨 Recent Alerts</h2>
"""

    if recent_alerts:
        html_content += """
                <div class="alerts-list">
"""
        for alert in recent_alerts[:5]:  # Show only top 5
            severity = alert.get("severity", "info")
            alert_class = "warning" if severity in ["warning", "error"] else "info"
            timestamp = datetime.fromisoformat(alert.get("datetime", "")).strftime(
                "%m/%d %H:%M"
            )

            html_content += f"""
                    <div class="alert-item {alert_class}">
                        <strong>{alert.get('type', 'Alert')}</strong> - {alert.get('message', 'No message')}
                        <br><small>🕒 {timestamp}</small>
                    </div>
"""
        html_content += """
                </div>
"""
    else:
        html_content += """
                <p>✅ No alerts in the past week. All systems are operating normally.</p>
"""

    # Add recommendations
    html_content += """
            </div>
            
            <!-- Recommendations -->
            <div class="section">
                <h2>💡 Recommendations</h2>
                <ul>
"""

    recommendations = []

    # Generate recommendations based on current state
    if budget_results and not budget_results.get("passed"):
        recommendations.append(
            "🎯 Performance budget violations detected. Consider optimizing Core Web Vitals."
        )

    if health_score.get("score", 100) < 95:
        recommendations.append(
            "📈 System health score could be improved. Review uptime monitoring alerts."
        )

    if len(recent_alerts) > 5:
        recommendations.append(
            "⚠️ High number of alerts. Consider reviewing alert thresholds and system stability."
        )

    if not latest_metrics:
        recommendations.append(
            "📊 No recent performance metrics. Run performance tests to establish baseline."
        )

    if not recommendations:
        recommendations.append(
            "✅ All systems are performing well. Continue current monitoring practices."
        )

    for rec in recommendations:
        html_content += f"<li>{rec}</li>"

    # Close HTML
    html_content += f"""
                </ul>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated on {end_date.strftime('%Y-%m-%d at %H:%M:%S')} | Fixzit Performance & Reliability Report</p>
            <p>Tenant: {tenant} | Period: {start_date.strftime('%B %d')} to {end_date.strftime('%B %d, %Y')}</p>
        </div>
    </div>
</body>
</html>
"""

    return html_content


def send_email_report(html_content):
    """Send email report via webhook"""
    if not EMAIL_WEBHOOK:
        print("📧 No email webhook configured (FXZ_EMAIL_WEBHOOK)")
        return False

    try:
        # Prepare email payload
        subject = f"Fixzit Weekly Report - {datetime.now().strftime('%Y-%m-%d')}"

        payload = {
            "to": ALERT_TO,
            "subject": subject,
            "html": html_content,
            "from": f"reports@{EMAIL_DOMAIN}",
        }

        response = requests.post(
            EMAIL_WEBHOOK,
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 200:
            print(f"✅ Email report sent to {ALERT_TO}")
            return True
        else:
            print(f"❌ Email send failed: HTTP {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Email send error: {e}")
        return False


def zip_reports(files: List[pathlib.Path]) -> pathlib.Path:
    """Bundle multiple reports into a ZIP file"""
    ts = datetime.now().strftime("%Y%m%d-%H%M")
    zip_path = ART / f"weekly-reports-{ts}.zip"

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in files:
            if file_path.exists():
                zf.write(file_path, file_path.name)

    return zip_path


def main(args: argparse.Namespace = None):
    """Generate and optionally send weekly report(s)"""
    if args is None:
        parser = argparse.ArgumentParser(description="Generate weekly HTML reports")
        parser.add_argument("--tenant", help="Generate for specific tenant")
        parser.add_argument(
            "--all", action="store_true", help="Generate for all tenants"
        )
        parser.add_argument("--zip", action="store_true", help="Create ZIP bundle")
        args = parser.parse_args()

    print("📊 Generating Weekly Report(s)")
    print("=" * 40)

    try:
        generated_files = []

        if args.all:
            # Generate for all tenants
            tenants = list_tenants()
            print(f"📋 Found {len(tenants)} tenant(s): {', '.join(tenants)}")

            for tenant in tenants:
                print(f"\n🏢 Processing tenant: {tenant}")
                html_content = generate_html_report(tenant)

                # Save tenant-specific report
                report_file = ART / f"weekly-report-{tenant}.html"
                report_file.write_text(html_content, encoding="utf-8")
                generated_files.append(report_file)

                print(f"✅ Report saved: {report_file}")
                print(f"📁 File size: {len(html_content):,} bytes")
        else:
            # Generate for single tenant
            tenant = args.tenant or current_tenant()
            print(f"🏢 Processing tenant: {tenant}")

            html_content = generate_html_report(tenant)

            # Save report
            report_file = ART / f"weekly-report-{tenant}.html"
            report_file.write_text(html_content, encoding="utf-8")
            generated_files.append(report_file)

            print(f"✅ Report saved: {report_file}")
            print(f"📁 File size: {len(html_content):,} bytes")

        # Create ZIP bundle if requested
        if args.zip and generated_files:
            zip_path = zip_reports(generated_files)
            print(f"📦 ZIP bundle created: {zip_path}")
            print(f"📁 Bundle size: {zip_path.stat().st_size:,} bytes")

        print("\n🎯 Weekly report generation completed!")
        print(f"📂 All files saved to: {ART}")

        return 0

    except Exception as e:
        print(f"💥 Report generation failed: {e}")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Report generation interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        sys.exit(1)
