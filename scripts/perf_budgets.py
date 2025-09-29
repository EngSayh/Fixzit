#!/usr/bin/env python3
"""
Performance Budget Testing Script for Fixzit Streamlit Application
Launches the app, collects performance metrics, and enforces budgets.
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

# Configuration
ART = pathlib.Path("artifacts")
ART.mkdir(exist_ok=True)

BUDGETS_FILE = pathlib.Path("perf_budgets.json")
STREAMLIT_FILE = os.environ.get("FXZ_APP_ENTRY", "app.py")
APP_PORT = int(os.environ.get("FXZ_APP_PORT", "5000"))
APP_URL = f"http://localhost:{APP_PORT}"

TIMEOUT = 60_000  # 60 seconds


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


def collect_metrics(page, path="/"):
    """Collect performance metrics from a page"""
    print(f"📊 Collecting metrics for: {path}")

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

                    // First Input Delay (approximate)
                    const fidObserver = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            window.__fxzMetrics.fid = entry.processingStart - entry.startTime;
                        }
                    });
                    fidObserver.observe({ type: 'first-input', buffered: true });
                } catch (e) {
                    console.warn('Performance observers setup failed:', e);
                }
            }
        })();
    """
    )

    # Navigate to the page
    full_url = f"{APP_URL}{path}"
    print(f"🔍 Loading: {full_url}")

    page.goto(full_url, wait_until="networkidle", timeout=TIMEOUT)

    # Wait for page to settle
    page.wait_for_timeout(2000)

    # Collect all metrics
    metrics = page.evaluate(
        """
        () => {
            const nav = performance.getEntriesByType('navigation')[0] || {};
            const paints = performance.getEntriesByType('paint') || [];
            
            const fcp = (paints.find(p => p.name === 'first-contentful-paint') || {}).startTime || 0;
            const lcp = window.__fxzMetrics?.lcp || 0;
            const cls = window.__fxzMetrics?.cls || 0;
            const fid = window.__fxzMetrics?.fid || 0;
            
            // Navigation Timing metrics
            const ttfb = nav.responseStart || 0;
            const domContentLoaded = nav.domContentLoadedEventEnd || 0;
            const loadComplete = nav.loadEventEnd || 0;
            
            // Calculate TTI approximation (when main thread becomes idle)
            const tti = Math.max(fcp, domContentLoaded);
            
            // Total Blocking Time approximation
            const tbt = Math.max(0, (nav.domInteractive || 0) - fcp - 50);
            
            // Speed Index approximation
            const speedIndex = fcp + (lcp - fcp) * 0.5;
            
            return {
                path: window.location.pathname,
                timestamp: Date.now(),
                ttfb: Math.round(ttfb),
                fcp: Math.round(fcp),
                lcp: Math.round(lcp),
                cls: parseFloat(cls.toFixed(4)),
                fid: Math.round(fid),
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


def load_budgets():
    """Load performance budgets from configuration"""
    if not BUDGETS_FILE.exists():
        print("⚠️  No budgets file found, using defaults")
        return {
            "global": {
                "first_contentful_paint_ms": 1800,
                "largest_contentful_paint_ms": 2500,
                "cumulative_layout_shift": 0.10,
                "total_blocking_time_ms": 200,
            }
        }

    return json.loads(BUDGETS_FILE.read_text())


def check_budgets(metrics, budgets):
    """Check if metrics meet budget requirements"""
    violations = []
    path = metrics.get("path", "/")

    # Get budget thresholds (page-specific or global)
    thresholds = budgets.get("pages", {}).get(path, budgets["global"])

    checks = [
        ("fcp", "first_contentful_paint_ms", "FCP"),
        ("lcp", "largest_contentful_paint_ms", "LCP"),
        ("cls", "cumulative_layout_shift", "CLS"),
        ("tbt", "total_blocking_time_ms", "TBT"),
        ("tti", "time_to_interactive_ms", "TTI"),
        ("speedIndex", "speed_index_ms", "Speed Index"),
    ]

    for metric_key, budget_key, display_name in checks:
        if budget_key not in thresholds:
            continue

        actual_value = metrics.get(metric_key, 0)
        budget_value = thresholds[budget_key]

        if actual_value > budget_value:
            if metric_key == "cls":
                violations.append(
                    f"{display_name}: {actual_value:.3f} > {budget_value:.3f}"
                )
            else:
                violations.append(
                    f"{display_name}: {actual_value}ms > {budget_value}ms"
                )

    return violations


def main():
    """Main performance testing function"""
    print("🎯 Starting Performance Budget Testing")
    print("=" * 50)

    budgets = load_budgets()
    all_metrics = []
    all_violations = []

    # Test pages
    test_paths = ["/"]  # Add more paths as needed

    with run_streamlit():
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"]
            )
            context = browser.new_context(viewport={"width": 1366, "height": 768})
            page = context.new_page()

            try:
                for path in test_paths:
                    print(f"\n🧪 Testing: {path}")

                    try:
                        metrics = collect_metrics(page, path)
                        all_metrics.append(metrics)

                        violations = check_budgets(metrics, budgets)
                        if violations:
                            all_violations.extend([f"{path}: {v}" for v in violations])
                            print(f"❌ Budget violations for {path}:")
                            for violation in violations:
                                print(f"   • {violation}")
                        else:
                            print(f"✅ {path} meets all budget requirements")

                    except Exception as e:
                        print(f"❌ Failed to test {path}: {e}")
                        all_violations.append(f"{path}: Test failed - {e}")

            finally:
                browser.close()

    # Save results
    results = {
        "timestamp": int(time.time() * 1000),
        "budgets": budgets,
        "metrics": all_metrics,
        "violations": all_violations,
        "passed": len(all_violations) == 0,
    }

    (ART / "perf-budget-results.json").write_text(json.dumps(results, indent=2))

    if all_metrics:
        # Save latest metrics for health dashboard
        (ART / "perf-metrics.json").write_text(json.dumps(all_metrics[-1], indent=2))

    # Report results
    print("\n" + "=" * 50)
    print("📊 Performance Budget Results")
    print("=" * 50)

    if all_violations:
        (ART / "perf-budget-violations.txt").write_text("\n".join(all_violations))
        print(f"❌ Found {len(all_violations)} budget violations:")
        for violation in all_violations:
            print(f"   • {violation}")
        print(f"\n💾 Results saved to: {ART}")
        sys.exit(1)
    else:
        print("✅ All pages meet performance budget requirements!")
        print(f"💾 Results saved to: {ART}")
        return 0


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⏹️  Performance testing interrupted")
        sys.exit(1)
    except Exception as e:
        print(f"💥 Performance testing failed: {e}")
        sys.exit(1)
