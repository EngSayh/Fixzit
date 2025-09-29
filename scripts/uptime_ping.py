#!/usr/bin/env python3
"""
Uptime Ping Script
Quick uptime check for all monitored endpoints
"""

import asyncio
import sys
import pathlib

# Add the parent directory to Python path to import services
sys.path.append(str(pathlib.Path(__file__).parent.parent))

from services.uptime_service import uptime_service


async def ping_all_endpoints():
    """Ping all configured endpoints"""
    print("📡 Running Uptime Ping Check")
    print("=" * 40)

    endpoints = uptime_service.get_endpoints()
    enabled_endpoints = [ep for ep in endpoints if ep.get("enabled", True)]

    if not enabled_endpoints:
        print("ℹ️  No endpoints configured for monitoring")
        return True

    print(f"🎯 Checking {len(enabled_endpoints)} endpoints...")

    # Run checks
    try:
        results = await uptime_service.check_all_endpoints()

        if not results:
            print("❌ No results from endpoint checks")
            return False

        # Summary
        successful = sum(1 for r in results if r.get("success", False))
        failed = len(results) - successful

        print("\n📊 Results Summary:")
        print(f"   ✅ Successful: {successful}")
        print(f"   ❌ Failed: {failed}")
        print(f"   📈 Success Rate: {(successful/len(results)*100):.1f}%")

        # Detailed results
        print("\n📋 Detailed Results:")
        for result in results:
            name = result.get("endpoint_name", "Unknown")
            result.get("url", "")
            success = result.get("success", False)
            response_time = result.get("response_time", 0)
            error = result.get("error")

            status_icon = "✅" if success else "❌"
            status_text = f"{response_time:.0f}ms" if success else f"Error: {error}"

            print(f"   {status_icon} {name}: {status_text}")

        # Generate alerts for failures
        for result in results:
            if not result.get("success", False):
                endpoint_id = result.get("endpoint_id")
                error = result.get("error", "Unknown error")

                uptime_service.add_alert(
                    endpoint_id=endpoint_id,
                    alert_type="endpoint_failure",
                    message=f"Endpoint {result.get('endpoint_name')} failed: {error}",
                    severity="error",
                )

        return successful == len(results)

    except Exception as e:
        print(f"💥 Ping check failed: {e}")
        return False


def main():
    """Main function"""
    try:
        # Run async ping check
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        success = loop.run_until_complete(ping_all_endpoints())
        loop.close()

        if success:
            print("\n🎉 All endpoints are healthy!")
            return 0
        else:
            print("\n⚠️  Some endpoints are experiencing issues")
            return 1

    except KeyboardInterrupt:
        print("\n⏹️  Uptime ping interrupted")
        return 1
    except Exception as e:
        print(f"\n💥 Uptime ping failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
