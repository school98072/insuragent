import os
import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        
        # Expose console messages and page errors
        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"Browser error: {exc}"))
        
        print("Starting E2E Flow for 4 Agents testing...")
        
        # 1. Login as Broker & Create Claim
        page.goto("http://localhost:5173/login")
        page.fill('input[placeholder="Enterprise Email"]', 'broker@kaggle.com')
        page.fill('input[placeholder="Password"]', 'BrokerPassword123')
        page.click('button:has-text("Sign In To Dashboard")')
        page.wait_for_url("**/dashboard")
        
        page.click('text="Policy Search"')
        page.wait_for_url("**/claims")
        
        page.click('button:has-text("新建报案")')
        page.wait_for_url("**/claims/new")
        
        page.wait_for_selector('text="Claim Intake Form"')
        page.fill('input[id="policy_number"]', 'POL-AGENT-TEST-001')
        page.click('input[id="claim_type"]')
        page.wait_for_selector('div[title="Auto (Vehicle & Liability)"]')
        page.click('div[title="Auto (Vehicle & Liability)"]')
        
        page.fill('input[id="incident_date"]', '2026-06-25')
        page.keyboard.press("Enter")
        page.fill('input[id="claimed_amount"]', '8500')
        page.fill('textarea[id="incident_description"]', 'Collision with another vehicle on main street. Front bumper heavily damaged.')
        
        page.click('button:has-text("Submit Intake")')
        page.wait_for_timeout(3000)
        print("1. New claim created for testing agents.")
        
        # Logout
        page.evaluate("localStorage.clear()")
        page.goto("http://localhost:5173/login")
        
        # 2. Login as Adjuster
        page.fill('input[placeholder="Enterprise Email"]', 'adjuster@kaggle.com')
        page.fill('input[placeholder="Password"]', 'AdjusterPassword123')
        page.click('button:has-text("Sign In To Dashboard")')
        page.wait_for_url("**/dashboard")
        
        page.click('text="Policy Search"')
        page.wait_for_url("**/claims")
        
        # Click on the first claim
        page.click('button:has-text("查看详情")')
        page.wait_for_timeout(2000)
        
        # 3. Trigger Multi-Agent AI Analysis
        if page.is_visible('button:has-text("Run AI Analysis")'):
            page.click('button:has-text("Run AI Analysis")')
            print("2. Multi-Agent AI Analysis triggered. Waiting for completion...")
            # Wait for reasoning to complete (should take ~5-15 seconds)
            page.wait_for_timeout(10000)
            page.screenshot(path="frontend/tests/screenshots/agent_01_analysis_complete.png")
            print("Screenshot taken: agent_01_analysis_complete.png")
            
            # Additional wait if it takes longer
            page.wait_for_timeout(5000)
            page.screenshot(path="frontend/tests/screenshots/agent_02_reasoning_and_decision.png")
            print("Screenshot taken: agent_02_reasoning_and_decision.png")
        else:
            print("Warning: AI Analysis button not found.")
            
        # 4. Open Copilot to interact with Agent
        if page.is_visible('button:has-text("Copilot")'):
            page.click('button:has-text("Copilot")')
            page.wait_for_timeout(1000)
            page.screenshot(path="frontend/tests/screenshots/agent_03_copilot_opened.png")
            
            # Send a prompt to copilot
            page.fill('input[placeholder="Command Copilot..."]', "Can you summarize the damage severity and policy coverage?")
            page.keyboard.press("Enter")
            print("3. Sent question to Copilot Agent.")
            
            # Wait for AI response
            page.wait_for_timeout(10000)
            page.screenshot(path="frontend/tests/screenshots/agent_04_copilot_response.png")
            print("Screenshot taken: agent_04_copilot_response.png")
        else:
            print("Warning: Copilot button not found.")
            
        print("4 Agents E2E Test Finished.")
        browser.close()

if __name__ == "__main__":
    run()
