#!/usr/bin/env python3
"""
Performance Collection for Multiple Routes
Collects performance metrics across multiple routes for trend analysis
"""

import json
import os
import sys
import time
import subprocess
import signal
import pathlib
from contextlib import contextmanager
from playwright.sync_api import sync_playwright
from datetime import datetime

# Configuration
ART = pathlib.Path("artifacts")
ART.mkdir(exist_ok=True)

ROUTES_FILE = pathlib.Path("routes.txt")
TRENDS_FILE = ART / "perf-trends.json"
STREAMLIT_FILE = os.environ.get("FXZ_APP_ENTRY", "app.py")
APP_PORT = int(os.environ.get("FXZ_APP_PORT", "5000"))
APP_URL = f"http://localhost:{APP_PORT}"

TIMEOUT = 60_000  # 60 seconds


def get_routes_to_test():
    """Get routes from routes.txt file"""
    if not ROUTES_FILE.exists():
        print("No routes.txt file found, testing root route only")
        return ["/"]

    try:
        routes = []
        with open(ROUTES_FILE, "r") as f:
            for line in f:
                route = line.strip()
                if route and not route.startswith("#"):
                    if not route.startswith("/"):
                        route = "/" + route
                    routes.append(route)

        return routes if routes else ["/"]

    except Exception as e:
        print(f"Error reading routes.txt: {e}")
        return ["/"]


@contextmanager
def run_streamlit():
    """Launch Streamlit app and wait for it to be ready"""
    print(f"🚀 Starting Streamlit app on port {APP_PORT}...")

    proc = subprocess.Popen(
        [
            "streamlit",
            "run",
            STREAMLIT_FILE,
            "--server.port",
            str(APP_PORT),
            "--server.headless",
            "true",
            "--server.address",
            "0.0.0.0",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    try:
        # Wait until server is up
        started = False
        t0 = time.time()

        while time.time() - t0 < 40:
            if proc.poll() is not None:
                raise RuntimeError(
                    f"Streamlit process exited early with code {proc.returncode}"
                )

            if proc.stdout:
                line = proc.stdout.readline()
            else:
                line = ""
            if not line:
                time.sleep(0.1)
                continue

            print(f"📡 {line.strip()}")

            if "Running on" in line and f":{APP_PORT}/" in line:
                started = True
                print("✅ Streamlit server is ready!")
                break

        if not started:
            raise RuntimeError("Streamlit did not start in time.")

        # Give it a moment to fully initialize
        time.sleep(2)
        yield

    finally:
        print("🛑 Shutting down Streamlit...")
        try:
            os.kill(proc.pid, signal.SIGTERM)
            proc.wait(timeout=5)
        except Exception as e:
            print(f"Warning: Failed to gracefully shutdown: {e}")
            try:
                os.kill(proc.pid, signal.SIGKILL)
            except Exception:
                pass


def collect_route_metrics(page, route="/"):
    """Collect performance metrics for a specific route"""
    print(f"📊 Collecting metrics for: {route}")

    # Inject performance observers
    page.add_init_script(
        """
        (() => {
            window.__fxzMetrics = {
                cls: 0,
                lcp: undefined,
                fid: undefined,
                navigationStart: performance.timeOrigin
            };
            
            if ('PerformanceObserver' in window) {
                try {
                    // Cumulative Layout Shift
                    let clsValue = 0;
                    const clsObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) {
                                clsValue += entry.value;
                            }
                        }
                        window.__fxzMetrics.cls = clsValue;
                    });
                    clsObserver.observe({ type: 'layout-shift', buffered: true });

                    // Largest Contentful Paint
                    const lcpObserver = new PerformanceObserver((list) => {
                        const entries = list.getEntries();
                        const lastEntry = entries[entries.length - 1];
                        if (lastEntry) {
                            window.__fxzMetrics.lcp = lastEntry.startTime;
                        }
                    });
                    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

                } catch (e) {
                    console.warn('Performance observers setup failed:', e);
                }
            }
        })();
    """
    )

    # Navigate to the route
    full_url = f"{APP_URL}{route}"
    print(f"🔍 Loading: {full_url}")

    try:
        page.goto(full_url, wait_until="networkidle", timeout=TIMEOUT)
    except Exception as e:
        print(f"❌ Failed to load {route}: {e}")
        return None

    # Wait for page to settle
    page.wait_for_timeout(2000)

    # Collect all metrics
    try:
        metrics = page.evaluate(
            """
            () => {
                const nav = performance.getEntriesByType('navigation')[0] || {};
                const paints = performance.getEntriesByType('paint') || [];
                
                const fcp = (paints.find(p => p.name === 'first-contentful-paint') || {}).startTime || 0;
                const lcp = window.__fxzMetrics?.lcp || 0;
                const cls = window.__fxzMetrics?.cls || 0;
                
                // Navigation Timing metrics
                const ttfb = nav.responseStart || 0;
                const domContentLoaded = nav.domContentLoadedEventEnd || 0;
                const loadComplete = nav.loadEventEnd || 0;
                
                // Calculate TTI approximation
                const tti = Math.max(fcp, domContentLoaded);
                
                // Total Blocking Time approximation
                const tbt = Math.max(0, (nav.domInteractive || 0) - fcp - 50);
                
                // Speed Index approximation
                const speedIndex = fcp + (lcp - fcp) * 0.5;
                
                return {
                    route: window.location.pathname,
                    timestamp: Date.now(),
                    ttfb: Math.round(ttfb),
                    fcp: Math.round(fcp),
                    lcp: Math.round(lcp),
                    cls: parseFloat(cls.toFixed(4)),
                    tti: Math.round(tti),
                    tbt: Math.round(tbt),
                    speedIndex: Math.round(speedIndex),
                    domContentLoaded: Math.round(domContentLoaded),
                    loadComplete: Math.round(loadComplete)
                };
            }
        """
        )

        print(
            f"✅ Metrics collected: FCP={metrics['fcp']}ms, LCP={metrics['lcp']}ms, CLS={metrics['cls']}"
        )
        return metrics

    except Exception as e:
        print(f"❌ Failed to collect metrics for {route}: {e}")
        return None


def load_existing_trends():
    """Load existing trend data"""
    if TRENDS_FILE.exists():
        try:
            return json.loads(TRENDS_FILE.read_text())
        except Exception:
            pass

    return {"version": "1.0", "created_at": datetime.now().isoformat(), "trends": {}}


def save_trends(trends_data):
    """Save trend data to file"""
    trends_data["updated_at"] = datetime.now().isoformat()
    TRENDS_FILE.write_text(json.dumps(trends_data, indent=2))


def add_metrics_to_trends(trends_data, metrics):
    """Add new metrics to trend data"""
    if not metrics:
        return

    route = metrics.get("route", "/")
    timestamp = metrics.get("timestamp")
    date_key = datetime.fromtimestamp(timestamp / 1000).strftime("%Y-%m-%d")

    # Initialize route data if not exists
    if route not in trends_data["trends"]:
        trends_data["trends"][route] = {
            "route": route,
            "samples": [],
            "daily_averages": {},
        }

    # Add sample
    trends_data["trends"][route]["samples"].append(metrics)

    # Keep only last 100 samples per route
    trends_data["trends"][route]["samples"] = trends_data["trends"][route]["samples"][
        -100:
    ]

    # Calculate daily average for this date
    date_samples = [
        sample
        for sample in trends_data["trends"][route]["samples"]
        if datetime.fromtimestamp(sample["timestamp"] / 1000).strftime("%Y-%m-%d")
        == date_key
    ]

    if date_samples:
        daily_avg = {
            "date": date_key,
            "samples_count": len(date_samples),
            "fcp_avg": sum(s.get("fcp", 0) for s in date_samples) / len(date_samples),
            "lcp_avg": sum(s.get("lcp", 0) for s in date_samples) / len(date_samples),
            "cls_avg": sum(s.get("cls", 0) for s in date_samples) / len(date_samples),
            "ttfb_avg": sum(s.get("ttfb", 0) for s in date_samples) / len(date_samples),
        }

        trends_data["trends"][route]["daily_averages"][date_key] = daily_avg


def main():
    """Main function to collect performance trends"""
    print("🎯 Starting Performance Trend Collection")
    print("=" * 50)

    routes = get_routes_to_test()
    print(f"📍 Routes to test: {', '.join(routes)}")

    # Load existing trends
    trends_data = load_existing_trends()
    all_metrics = []

    with run_streamlit():
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            context = browser.new_context(viewport={"width": 1366, "height": 768})
            page = context.new_page()

            try:
                for route in routes:
                    print(f"\n🧪 Testing: {route}")

                    metrics = collect_route_metrics(page, route)
                    if metrics:
                        all_metrics.append(metrics)
                        add_metrics_to_trends(trends_data, metrics)
                    else:
                        print(f"❌ Failed to collect metrics for {route}")

            finally:
                browser.close()

    # Save trends
    if all_metrics:
        save_trends(trends_data)

        # Also save individual metrics for compatibility
        (ART / "perf-routes-latest.json").write_text(json.dumps(all_metrics, indent=2))

        print(f"\n✅ Collected metrics for {len(all_metrics)} routes")
        print(f"💾 Trends saved to: {TRENDS_FILE}")

        # Show summary
        for metrics in all_metrics:
            route = metrics["route"]
            fcp = metrics["fcp"]
            lcp = metrics["lcp"]
            cls = metrics["cls"]
            print(f"   📊 {route}: FCP={fcp}ms, LCP={lcp}ms, CLS={cls}")
    else:
        print("❌ No metrics collected")
        return 1

    return 0


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⏹️  Performance trend collection interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Performance trend collection failed: {e}")
        sys.exit(1)
