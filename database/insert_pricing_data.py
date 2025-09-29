"""
Script to parse and insert pricing benchmark data into the database
Based on Eng. Sultan Al Hassni's operational services benchmark
"""

import psycopg2
import os
from decimal import Decimal


def parse_percentage(value):
    """Parse percentage values like '4.5%' to decimal"""
    if value and "%" in str(value):
        return Decimal(str(value).replace("%", "").strip())
    return None


def parse_price(value):
    """Parse price values, handling various formats"""
    if not value or value == "—" or value == "-":
        return None

    # Remove commas and extra text
    value = str(value).replace(",", "").strip()

    # Extract numeric value from strings like "37,500 (Analyst)"
    if "(" in value:
        value = value.split("(")[0].strip()

    # Handle ranges like "5–7%" or "8–10%"
    if "–" in value:
        parts = value.split("–")
        # Take the average of the range
        try:
            return (Decimal(parts[0].strip()) + Decimal(parts[1].strip())) / 2
        except (ValueError, IndexError, TypeError):
            return Decimal(parts[0].strip())

    # Handle values like "B/W: 0.10–0.17"
    if ":" in value:
        value = value.split(":")[1].strip()
        if "–" in value:
            parts = value.split("–")
            return (Decimal(parts[0].strip()) + Decimal(parts[1].strip())) / 2

    try:
        return Decimal(value)
    except (ValueError, TypeError):
        return None


def insert_pricing_data():
    """Insert all pricing benchmark data"""

    # Database connection
    conn = psycopg2.connect(os.environ.get("DATABASE_URL"))
    cur = conn.cursor()

    try:
        # Real Estate Services
        real_estate_services = [
            (
                "Brokerage – Office (new lease)",
                "% of 1st-year net rent",
                4.5,
                6,
                7,
                "Applies on 1st-year net rent (service charge excluded)",
            ),
            (
                "Brokerage – Retail/Entertainment (sub-lease)",
                "% of 1st-year net rent",
                7,
                11,
                13,
                "Sub-lease brokerage fees",
            ),
            (
                "Brokerage – Industrial/Logistics (new lease)",
                "% of 1st-year net rent",
                6,
                9,
                13,
                "Industrial and logistics properties",
            ),
            (
                "Lease Administration – platform setup",
                "One-time / client",
                25000,
                25000,
                25000,
                "One-time platform setup fee",
            ),
            (
                "Lease Administration – run & maintain",
                "Per lease / year",
                8000,
                8000,
                8000,
                "Annual lease administration fee",
            ),
            (
                "Lease Translation",
                "Per lease",
                2000,
                6000,
                10000,
                "Translation complexity affects pricing",
            ),
        ]

        # Get Real Estate category ID
        cur.execute("SELECT id FROM service_categories WHERE category_code = 'RE'")
        re_category_id = cur.fetchone()[0]

        for service in real_estate_services:
            cur.execute(
                """
                INSERT INTO service_pricing 
                (category_id, service_name, unit_description, min_price, typical_price, max_price, notes, service_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (service_code) DO UPDATE
                SET min_price = EXCLUDED.min_price,
                    typical_price = EXCLUDED.typical_price,
                    max_price = EXCLUDED.max_price,
                    updated_at = CURRENT_TIMESTAMP
            """,
                (
                    re_category_id,
                    service[0],
                    service[1],
                    service[2],
                    service[3],
                    service[4],
                    service[5],
                    f"RE_{service[0][:20].replace(' ', '_').replace('–', '').upper()}",
                ),
            )

        # Facilities Management Services
        fm_services = [
            (
                "IFM / T&C / Move Mgmt – Analyst",
                "Monthly",
                37500,
                37500,
                37500,
                "Analyst resource rate",
            ),
            (
                "IFM / T&C / Move Mgmt – Consultant",
                "Monthly",
                64800,
                64800,
                64800,
                "Consultant resource rate",
            ),
            (
                "IFM / T&C / Move Mgmt – Sr Manager",
                "Monthly",
                95904,
                95904,
                95904,
                "Senior Manager resource rate",
            ),
            (
                "IFM / T&C / Move Mgmt – Sr Director",
                "Monthly",
                181440,
                181440,
                181440,
                "Senior Director resource rate",
            ),
            (
                "Records Storage – Storage Only",
                "/month (≤50 boxes)",
                1000,
                1000,
                1000,
                "Basic storage up to 50 boxes",
            ),
            (
                "Records Storage – Storage & Mgmt (Base)",
                "/month (≤50 boxes)",
                3000,
                3000,
                3000,
                "Storage with management services",
            ),
            (
                "Records Storage – Medium / Large",
                "/month",
                9000,
                9000,
                16000,
                "101-500 boxes storage",
            ),
            (
                "Digitization (scanning)",
                "Per image",
                0.50,
                0.50,
                0.50,
                "OCR 1 index field included; failed OCR adds 0.60/field",
            ),
            (
                "Document verification",
                "Per document",
                7.5,
                7.5,
                7.5,
                "Document verification service",
            ),
            (
                "Retrieval (same day)",
                "Per request",
                750,
                750,
                750,
                "Same day retrieval up to 10 boxes/20 files",
            ),
            ("Email retrieval", "Per image", 1.5, 1.5, 1.5, "Email retrieval service"),
            (
                "Secure shredding (offsite) - Riyadh",
                "Per 2,000 kg (trip)",
                11500,
                11500,
                11500,
                "Riyadh location",
            ),
            (
                "Secure shredding (offsite) - Jeddah/DMM",
                "Per 2,000 kg (trip)",
                13500,
                13500,
                13500,
                "Jeddah/DMM location +5/kg extra",
            ),
            (
                "Asset destruction (offsite) - Riyadh",
                "Per 500 units (trip)",
                14500,
                14500,
                14500,
                "Riyadh location",
            ),
            (
                "Asset destruction (offsite) - Jeddah/DMM",
                "Per 500 units (trip)",
                16500,
                16500,
                16500,
                "Jeddah/DMM location +25/unit extra",
            ),
            (
                "Fixed Asset Inventory - Small",
                "Package (≤2,500 assets, 1 site)",
                95000,
                95000,
                95000,
                "Small package",
            ),
            (
                "Fixed Asset Inventory - Medium",
                "Package (≤5,000 assets, ≤3 sites)",
                150000,
                150000,
                150000,
                "Medium package",
            ),
            (
                "Asset Mgmt System - Light",
                "Annual license (up to 5k assets)",
                38000,
                38000,
                38000,
                "Light license",
            ),
            (
                "Asset Mgmt System - Basic",
                "Annual license (up to 30k assets)",
                48000,
                48000,
                48000,
                "Basic license",
            ),
            (
                "Asset Mgmt System - Enterprise",
                "Annual license (up to 60k assets)",
                58000,
                58000,
                58000,
                "Enterprise license",
            ),
            (
                "Managed Print – fixed minimum",
                "Monthly",
                213400,
                213400,
                213400,
                "Fixed minimum monthly fee",
            ),
            (
                "Managed Print – B/W impression",
                "Per A4 page",
                0.10,
                0.135,
                0.17,
                "Black & white printing",
            ),
            (
                "Managed Print – Color impression",
                "Per A4 page",
                0.26,
                0.425,
                0.59,
                "Color printing",
            ),
            (
                "Transport concierge - Office hours",
                "Monthly admin",
                10000,
                10000,
                10000,
                "Office hours help-desk",
            ),
            (
                "Transport concierge - 24×7",
                "Monthly admin",
                25000,
                25000,
                25000,
                "24×7 help-desk + actuals (+10% fee if ad-hoc)",
            ),
            (
                "Car rental - Corolla",
                "Monthly (36-mo term)",
                2217,
                2217,
                2217,
                "Toyota Corolla or similar",
            ),
            (
                "Car rental - Taurus",
                "Monthly (36-mo term)",
                3630,
                3630,
                3630,
                "Ford Taurus or similar",
            ),
            (
                "Car rental - GMC",
                "Monthly (36-mo term)",
                7528,
                7528,
                7528,
                "GMC or similar SUV",
            ),
            (
                "Driver resources - 8h sedan",
                "Day rate",
                1188,
                1188,
                1188,
                "8-hour sedan service",
            ),
            (
                "Driver resources - 12h sedan",
                "Day rate",
                1584,
                1584,
                1584,
                "12-hour sedan service",
            ),
            (
                "Driver resources - 12h SUV",
                "Day rate",
                2376,
                2376,
                2376,
                "12-hour SUV service",
            ),
        ]

        # Get FM category ID
        cur.execute("SELECT id FROM service_categories WHERE category_code = 'FM'")
        fm_category_id = cur.fetchone()[0]

        for service in fm_services:
            cur.execute(
                """
                INSERT INTO service_pricing 
                (category_id, service_name, unit_description, min_price, typical_price, max_price, notes, service_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (service_code) DO UPDATE
                SET min_price = EXCLUDED.min_price,
                    typical_price = EXCLUDED.typical_price,
                    max_price = EXCLUDED.max_price,
                    updated_at = CURRENT_TIMESTAMP
            """,
                (
                    fm_category_id,
                    service[0],
                    service[1],
                    service[2],
                    service[3],
                    service[4],
                    service[5],
                    f"FM_{service[0][:20].replace(' ', '_').replace('–', '').replace('/', '').upper()}",
                ),
            )

        # People Ops Services
        po_services = [
            (
                "Background check (KSA nationals)",
                "Per report",
                1600,
                1950,
                2300,
                "Standard to urgent processing",
            ),
            (
                "Background check (international)",
                "Per report",
                2500,
                3250,
                4000,
                "Standard to urgent processing",
            ),
            (
                "Onboarding – Standard (Saudi)",
                "Per new hire",
                4125,
                4125,
                4125,
                "Saudi nationals",
            ),
            (
                "Onboarding – Standard (Non-Saudi)",
                "Per new hire",
                6000,
                6000,
                6000,
                "Non-Saudi nationals",
            ),
            (
                "Onboarding – Elite (Saudi in Riyadh)",
                "Per new hire",
                5250,
                5250,
                5250,
                "Elite service - Saudi in Riyadh",
            ),
            (
                "Onboarding – Elite (Non-Saudi in KSA)",
                "Per new hire",
                6750,
                6750,
                6750,
                "Elite service - Non-Saudi in KSA",
            ),
            (
                "Onboarding – Elite (Non-Saudi outside KSA)",
                "Per new hire",
                9000,
                9000,
                9000,
                "Elite service - Non-Saudi outside KSA",
            ),
        ]

        # Get PO category ID
        cur.execute("SELECT id FROM service_categories WHERE category_code = 'PO'")
        po_category_id = cur.fetchone()[0]

        for service in po_services:
            cur.execute(
                """
                INSERT INTO service_pricing 
                (category_id, service_name, unit_description, min_price, typical_price, max_price, notes, service_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (service_code) DO UPDATE
                SET min_price = EXCLUDED.min_price,
                    typical_price = EXCLUDED.typical_price,
                    max_price = EXCLUDED.max_price,
                    updated_at = CURRENT_TIMESTAMP
            """,
                (
                    po_category_id,
                    service[0],
                    service[1],
                    service[2],
                    service[3],
                    service[4],
                    service[5],
                    f"PO_{service[0][:20].replace(' ', '_').replace('–', '').replace('(', '').replace(')', '').upper()}",
                ),
            )

        # Relocation & Mobility Services
        rm_services = [
            (
                "Airport meet & pickup",
                "Per file",
                1031,
                1031,
                1031,
                "Airport assistance service",
            ),
            (
                "Iqama issuance",
                "Per file",
                1650,
                1650,
                1650,
                "Residence permit processing",
            ),
            (
                "Bank account opening",
                "Per file",
                1238,
                1238,
                1238,
                "Banking assistance",
            ),
            (
                "Home search (2 days, 6–8 viewings/day)",
                "Lump sum",
                8250,
                8250,
                8250,
                "Comprehensive home search service",
            ),
        ]

        # Get RM category ID
        cur.execute("SELECT id FROM service_categories WHERE category_code = 'RM'")
        rm_category_id = cur.fetchone()[0]

        for service in rm_services:
            cur.execute(
                """
                INSERT INTO service_pricing 
                (category_id, service_name, unit_description, min_price, typical_price, max_price, notes, service_code)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (service_code) DO UPDATE
                SET min_price = EXCLUDED.min_price,
                    typical_price = EXCLUDED.typical_price,
                    max_price = EXCLUDED.max_price,
                    updated_at = CURRENT_TIMESTAMP
            """,
                (
                    rm_category_id,
                    service[0],
                    service[1],
                    service[2],
                    service[3],
                    service[4],
                    service[5],
                    f"RM_{service[0][:20].replace(' ', '_').replace('–', '').replace('(', '').replace(')', '').upper()}",
                ),
            )

        conn.commit()
        print("✅ Successfully inserted all pricing benchmark data!")

        # Display summary
        cur.execute(
            """
            SELECT sc.category_name, COUNT(sp.id) as service_count
            FROM service_categories sc
            LEFT JOIN service_pricing sp ON sc.id = sp.category_id
            GROUP BY sc.id, sc.category_name
            ORDER BY sc.display_order
        """
        )

        print("\n📊 Pricing Data Summary:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]} services")

        cur.execute("SELECT COUNT(*) FROM service_pricing")
        total = cur.fetchone()[0]
        print(f"\n  Total Services: {total}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error inserting pricing data: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    insert_pricing_data()
