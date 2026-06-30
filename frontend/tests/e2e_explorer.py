import os
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        print("Starting Playwright E2E Flow...")
        
        # 1. Login as Broker
        page.goto("http://localhost:5173/login")
        page.fill('input[placeholder="Enterprise Email"]', 'broker@kaggle.com')
        page.fill('input[placeholder="Password"]', 'BrokerPassword123')
        page.click('button:has-text("Sign In To Dashboard")')
        try:
            page.wait_for_url("**/dashboard")
            page.screenshot(path="frontend/tests/screenshots/01_broker_dashboard.png")
            print("1. Broker logged in.")
        except Exception as e:
            page.screenshot(path="frontend/tests/screenshots/01_broker_login_error.png")
            print("Failed to login as Broker. Screenshot taken.")
            raise e

        # 2. Broker creates a new claim via UI navigation
        # Click on Policy Search in Sidebar
        page.click('text="Policy Search"')
        page.wait_for_url("**/claims")
        
        # Click on New Claim button
        page.click('button:has-text("新建报案")')
        page.wait_for_url("**/claims/new")
        
        # Wait for the form container or title to appear
        try:
            page.wait_for_selector('text="Claim Intake Form"')
        except Exception as e:
            page.screenshot(path="frontend/tests/screenshots/02_broker_new_claim_error.png")
            print("Failed to find Claim Intake Form. Screenshot taken.")
            raise e
        
        page.fill('input[id="policy_number"]', 'POL-123456')
        
        # For Select (claim_type), click the element
        page.click('input[id="claim_type"]')
        page.wait_for_selector('div[title="Auto (Vehicle & Liability)"]')
        page.click('div[title="Auto (Vehicle & Liability)"]')
        
        # For DatePicker
        page.fill('input[id="incident_date"]', '2026-06-25')
        page.keyboard.press("Enter")
        
        # Number input
        page.fill('input[id="claimed_amount"]', '5000')
        
        # Textarea
        page.fill('textarea[id="incident_description"]', 'Car accident on highway.')
        
        # Save draft
        page.click('button:has-text("Save Draft")')
        page.wait_for_timeout(2000)
        page.screenshot(path="frontend/tests/screenshots/02_broker_draft_saved.png")
        print("2. Draft saved.")

        # Submit
        page.click('button:has-text("Submit Intake")')
        page.wait_for_timeout(3000)
        page.screenshot(path="frontend/tests/screenshots/03_broker_claim_submitted.png")
        print("3. Claim submitted.")

        # Logout
        # We need to clear local storage to logout
        page.evaluate("localStorage.clear()")
        page.goto("http://localhost:5173/login")
        
        # 4. Login as Adjuster
        page.fill('input[placeholder="Enterprise Email"]', 'adjuster@kaggle.com')
        page.fill('input[placeholder="Password"]', 'AdjusterPassword123')
        page.click('button:has-text("Sign In To Dashboard")')
        page.wait_for_url("**/dashboard")
        page.screenshot(path="frontend/tests/screenshots/04_adjuster_dashboard.png")
        
        # Go to claims list via UI navigation
        page.click('text="Policy Search"')
        page.wait_for_url("**/claims")
        
        # Click on the first claim (the one we just created)
        page.click('button:has-text("查看详情")')
        page.wait_for_timeout(2000)
        page.screenshot(path="frontend/tests/screenshots/05_adjuster_claim_detail.png")
        
        # Trigger AI Analysis
        if page.is_visible('button:has-text("Run AI Analysis")'):
            page.click('button:has-text("Run AI Analysis")')
            page.wait_for_timeout(5000)
            page.screenshot(path="frontend/tests/screenshots/06_ai_analysis_complete.png")
            print("4. AI Analysis triggered.")
        else:
            print("Warning: AI Analysis button not found.")
            
        # 5. Audit Queue Login
        page.evaluate("localStorage.clear()")
        page.goto("http://localhost:5173/login")
        page.fill('input[placeholder="Enterprise Email"]', 'admin@kaggle.com')
        page.fill('input[placeholder="Password"]', 'AdminPassword123')
        page.click('button:has-text("Sign In To Dashboard")')
        page.wait_for_url("**/dashboard")
        
        # Audit Queue might be /audit or /system-logs
        page.click('text="Security Audit"')
        page.wait_for_url("**/system-logs")
        page.wait_for_timeout(2000)
        page.screenshot(path="frontend/tests/screenshots/07_admin_audit_queue.png")
        print("5. Admin Audit Queue.")

        print("Testing Complete.")
        browser.close()

if __name__ == "__main__":
    run()
