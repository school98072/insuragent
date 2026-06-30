import os
import time
import asyncio
import re
from PIL import Image, ImageDraw
import fitz
from playwright.async_api import async_playwright

# Define paths
TEMP_DIR = os.path.abspath("temp_claims")
os.makedirs(TEMP_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# 1. Document Generator Helpers
# ---------------------------------------------------------------------------
def generate_pdf(filename: str, title: str, details: str):
    filepath = os.path.join(TEMP_DIR, filename)
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), f"DOCUMENT TYPE: {title}", fontsize=16)
    page.insert_text((50, 100), details, fontsize=10)
    doc.save(filepath)
    doc.close()
    print(f"Generated PDF: {filepath} ({os.path.getsize(filepath)} bytes)")
    return filepath

def generate_png(filename: str, text: str):
    filepath = os.path.join(TEMP_DIR, filename)
    img = Image.new('RGB', (600, 400), color=(240, 240, 240))
    d = ImageDraw.Draw(img)
    d.text((50, 50), text, fill=(0, 0, 0))
    img.save(filepath)
    print(f"Generated PNG: {filepath} ({os.path.getsize(filepath)} bytes)")
    return filepath

# ---------------------------------------------------------------------------
# 2. Claim Specifications (8 cases)
# ---------------------------------------------------------------------------
claims_to_create = [
    # --- AUTO ---
    {
        "type": "auto",
        "label": "Auto (Vehicle & Liability)",
        "policy": "POL-2024-9988X",
        "amount": 850.0,
        "location": "Hong Kong Central",
        "description": "Our insured car was involved in a minor parking fender bender. The front bumper sustained light scratches and required paint touch-up and minor realignment at the authorized shop.",
        "filename": "auto_invoice_approve.pdf",
        "doc_title": "Authorized Repair Invoice",
        "doc_text": "INVOICE #INV-8820\nGarage: AutoCare Central\nServices: Bumper realignment, painting.\nTotal Amount: $850.00 USD\nStatus: Paid in full.",
        "expected": "approve"
    },
    {
        "type": "auto",
        "label": "Auto (Vehicle & Liability)",
        "policy": "POL-2024-9988X",
        "amount": 4200.0,
        "location": "Route 3 Highway",
        "description": "The vehicle suffered a severe mechanical transmission breakdown and engine overheating while driving. We towed it to the repair shop for transmission replacement and cooling system repair.",
        "filename": "auto_invoice_reject.png",
        "doc_title": "Transmission Repair Report",
        "doc_text": "DIAGNOSTIC REPORT\nSymptoms: Severe overheating, transmission failure.\nRepairs: Replaced transmission assembly, water pump, and radiator.\nMechanical breakdown exclusion applies under standard motor terms.",
        "expected": "reject"
    },
    
    # --- HEALTH ---
    {
        "type": "health",
        "label": "Health (Medical & Subsidies)",
        "policy": "POL-2025-1123H",
        "amount": 350.0,
        "location": "St. Paul's Hospital Clinic",
        "description": "The insured visited the general outpatient clinic due to acute bronchitis. Received nebulizer treatment and prescribed antibiotics. Original diagnosis and medical receipt are attached.",
        "filename": "health_receipt_approve.png",
        "doc_title": "Medical Outpatient Receipt",
        "doc_text": "OFFICIAL RECEIPT #R-8890\nHospital: St. Paul's Clinic\nTreatment: Outpatient consultation, nebulizer, medications.\nTotal Paid: $350.00 USD",
        "expected": "approve"
    },
    {
        "type": "health",
        "label": "Health (Medical & Subsidies)",
        "policy": "POL-2025-1123H",
        "amount": 15000.0,
        "location": "Premium Aesthetic Center",
        "description": "The insured underwent cosmetic rhinoplasty and facial laser treatments to enhance facial features and symmetry. Fully elective procedure performed by the specialist surgeon.",
        "filename": "health_invoice_reject.pdf",
        "doc_title": "Cosmetic Rhinoplasty Invoice",
        "doc_text": "INVOICE #INV-COS-772\nFacility: Premium Aesthetic Surgery\nProcedure: Elective Rhinoplasty, facial contouring.\nTotal Cost: $15,000.00 USD\nElective cosmetic surgery exclusions apply.",
        "expected": "reject"
    },

    # --- PROPERTY ---
    {
        "type": "property",
        "label": "Property (Real Estate & Assets)",
        "policy": "POL-2024-5512B",
        "amount": 1200.0,
        "location": "Residential Tower, HK",
        "description": "A sudden lightning strike during yesterday's severe thunderstorm caused a power surge that fried the control board of our central air conditioning unit. Invoice is attached.",
        "filename": "property_invoice_approve.pdf",
        "doc_title": "AC Surge Repair Invoice",
        "doc_text": "INVOICE #INV-AC-0091\nContractor: HK Cooling Specialists\nRepair: Replaced fried control circuit board due to lightning surge.\nTotal Cost: $1,200.00 USD\nPeril: Lightning/Power Surge covered.",
        "expected": "approve"
    },
    {
        "type": "property",
        "label": "Property (Real Estate & Assets)",
        "policy": "POL-2024-5512B",
        "amount": 18000.0,
        "location": "Basement Storage, HK",
        "description": "The basement wooden flooring and carpet have gradually rotted and mold has spread over three months due to slow condensation and seepage through the building foundation.",
        "filename": "property_invoice_reject.png",
        "doc_title": "Gradual Mold Remediation Quote",
        "doc_text": "MOLD INSPECTION REPORT\nFindings: Gradual condensation and seepage over 90+ days.\nSeverity: Rotting and mold expansion.\nExclude gradual wear/tear/leakage under Section B.4 of homeowners policy.",
        "expected": "reject"
    },

    # --- LIFE ---
    {
        "type": "life",
        "label": "Life (Mortality & Disability)",
        "policy": "POL-2026-8899A",
        "amount": 5000.0,
        "location": "Queen Mary Hospital",
        "description": "The insured was hospitalized for five consecutive days due to acute bacterial pneumonia. Claiming the daily hospital cash benefit of $1,000 per day under the policy provisions.",
        "filename": "life_discharge_approve.pdf",
        "doc_title": "Hospital Discharge Certificate",
        "doc_text": "DISCHARGE SUMMARY\nPatient: John Doe\nHospitalization: 5 Days (Pneumonia treatment).\nDischarge Date: 2026-06-25\nStatus: Recovered. Claiming daily cash benefit.",
        "expected": "approve"
    },
    {
        "type": "life",
        "label": "Life (Mortality & Disability)",
        "policy": "POL-2026-8899A",
        "amount": 50000.0,
        "location": "Private Clinic, HK",
        "description": "The insured sustained a self-inflicted fracture on the left arm during a non-accidental hazard event. Claiming coverage for disability compensation and orthopedic surgery costs.",
        "filename": "life_report_reject.png",
        "doc_title": "Self-Inflicted Injury Medical Report",
        "doc_text": "MEDICAL EXAM REPORT\nFindings: Left arm fracture.\nEtiology: Self-inflicted injury sustained during a deliberate event.\nExclusion: Self-inflicted injuries are excluded from life/disability policies.",
        "expected": "reject"
    }
]

# ---------------------------------------------------------------------------
# 3. Playwright Automation
# ---------------------------------------------------------------------------
async def run_automation():
    # Pre-generate all documents
    for spec in claims_to_create:
        if spec["filename"].endswith(".pdf"):
            spec["filepath"] = generate_pdf(spec["filename"], spec["doc_title"], spec["doc_text"])
        else:
            spec["filepath"] = generate_png(spec["filename"], f"{spec['doc_title']}\n\n{spec['doc_text']}")

    async with async_playwright() as p:
        print("[Playwright] Launching browser...")
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()

        # Login flow
        print("[Playwright] Navigating to Login Page...")
        await page.goto("http://localhost:5173/login")
        await page.wait_for_selector(".ant-select-selector")

        print("[Playwright] Selecting Broker role...")
        await page.click(".ant-select-selector")
        await page.click("text=Insurance Broker")
        
        # Wait for redirect to dashboard
        print("[Playwright] Waiting for redirect to dashboard...")
        await page.wait_for_url("**/dashboard", timeout=15000)
        await page.wait_for_timeout(2000)

        # Loop to create claims
        for idx, spec in enumerate(claims_to_create):
            print(f"\n[Playwright] [{idx+1}/8] Creating {spec['expected'].upper()} claim for {spec['type'].upper()}...")
            
            # Go to new claim page
            await page.goto("http://localhost:5173/claims/new")
            await page.wait_for_selector("#policy_number")

            # Fill Policy Number
            await page.fill("#policy_number", spec["policy"])

            # Select Claim Type
            await page.click('.ant-form-item:has-text("Claim Type") .ant-select-selector')
            await page.click(f'.ant-select-item-option-content:has-text("{spec["label"]}")')

            # Fill Incident Date
            await page.click("#incident_date")
            await page.fill("#incident_date", "2026-06-20")
            await page.keyboard.press("Enter")

            # Fill Location
            await page.fill("#incident_location", spec["location"])

            # Fill Amount
            await page.fill("#claimed_amount", str(spec["amount"]))

            # Fill Description
            await page.fill("#incident_description", spec["description"])

            # Click Save Draft first to trigger document attachment linkage
            print("  - Saving draft...")
            await page.click("text=Save Draft")
            
            # Wait for save button text to change to 'Saved'
            await page.wait_for_selector("text=Saved", timeout=8000)

            # Upload Document
            print(f"  - Uploading support file: {spec['filename']}...")
            await page.set_input_files('input[type="file"]', spec["filepath"])
            
            # Wait for file list or success message
            await page.wait_for_selector(f"text={spec['filename']}", timeout=8000)
            print("  - File uploaded successfully.")

            # Submit claim
            print("  - Submitting claim to AI analysis...")
            await page.click("text=Submit Intake")
            
            # Wait for redirect to details page (exclude /claims/new)
            await page.wait_for_url(lambda u: "/claims/" in u and not u.endswith("/new"), timeout=25000)
            claim_url = page.url
            claim_id = claim_url.split("/")[-1]
            print(f"  - Submitted successfully! Claim ID: {claim_id} (URL: {claim_url})")
            
            # Run pre-approval
            print("  - Running pre-approval scan...")
            await page.click('text="Run Pre-approval"')
            
            # Wait for analysis reasoning logs to contain decision
            print("  - Waiting for AI evaluation...")
            for attempt in range(25):
                reasoning_box = page.locator(".font-mono")
                if await reasoning_box.count() > 0:
                    text = await reasoning_box.first.inner_text()
                    # Check if decision was evaluated
                    if any(x in text.lower() for x in ["decision", "adjudication", "approved", "rejected", "reject", "approve", "human_review"]):
                        print(f"  - AI evaluation completed! Decision details populated.")
                        break
                await page.wait_for_timeout(2000)
            else:
                print("  - Warning: AI analysis timed out.")

            # Pause briefly
            await page.wait_for_timeout(2000)

        # Cleanup and close
        print("\n[Playwright] All 8 claims generated and pre-approved successfully.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_automation())
