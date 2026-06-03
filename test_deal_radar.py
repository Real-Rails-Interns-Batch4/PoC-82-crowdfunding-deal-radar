import sys
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# --- CONFIGURATION ---
# Replace this with your actual Render URL
TARGET_URL = "https://crowdfunding-frontend-2bqs.onrender.com" 
REPORT_FILE = "Test_Report_Deal_Radar.txt"

class DealRadarUAT:
    def __init__(self):
        # Using Headless Chrome for better CI/CD compatibility
        options = webdriver.ChromeOptions()
        # options.add_argument("--headless") # Uncomment if running in a CI environment
        options.add_argument("--start-maximized")
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 60)  # Increased to 60s for Render cold-starts
        self.results = []

    def log_result(self, test_name, status, message=""):
        self.results.append({
            "test": test_name,
            "status": status,
            "message": message
        })
        print(f"[{status}] {test_name}: {message}")

    def test_visual_load(self):
        """Test Case 1: Visual Load & Background CSS"""
        try:
            self.driver.get(TARGET_URL)
            main_element = self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "main")))
            backdrop = self.driver.find_element(By.CSS_SELECTOR, "div[aria-hidden='true']")
            
            if main_element and backdrop:
                self.log_result("Visual Load", "PASS", "Page loaded with cinematic backdrop.")
            else:
                self.log_result("Visual Load", "FAIL", "Main components not found.")
        except Exception as e:
            self.log_result("Visual Load", "FAIL", str(e))

    def test_data_handshake(self):
        """Test Case 2: Intelligence Panel & Marker Click"""
        try:
            # Wait for "Loading" screen to disappear if present
            try:
                WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Loading deals')]"))
                )
                print("Waiting for backend to wake up...")
                self.wait.until_not(
                    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Loading deals')]"))
                )
            except TimeoutException:
                pass # Already loaded or loading screen skipped

            # Locate map marker node
            marker_selector = "button.group.absolute"
            marker = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, marker_selector)))
            
            deal_name = marker.get_attribute("title").split(":")[0] if marker.get_attribute("title") else "Unknown Deal"
            
            # Use JS click to avoid interception and scroll issues
            self.driver.execute_script("arguments[0].scrollIntoView();", marker)
            self.driver.execute_script("arguments[0].click();", marker)
            
            # Verify Intelligence Panel entry
            panel = self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "aside")))
            
            # Verify specific analytical data blocks
            terms_card = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Deal Terms')]")))
            
            if panel and terms_card:
                self.log_result("Data Handshake", "PASS", f"Panel opened for '{deal_name}' with data blocks.")
            else:
                self.log_result("Data Handshake", "FAIL", "Intelligence panel or data blocks missing.")

            # Step 6: Close the panel to clear the UI for the next test
            close_btn = self.wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button[aria-label='Close Intelligence Panel']")))
            close_btn.click()
            self.wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "aside")))
            
        except Exception as e:
            self.log_result("Data Handshake", "FAIL", f"Handshake failed: {str(e)[:150]}")

    def test_signature_popover(self):
        """Test Case 3: Developer Signature Popover"""
        try:
            # Locate the (i) Info icon in the header
            info_btn = self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button[aria-label='Open developer signature']")))
            
            # Use JS click as it's more robust against overlays
            self.driver.execute_script("arguments[0].click();", info_btn)
            
            # Wait for the signature modal
            self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(), 'Developer Signature')]")))
            
            body_text = self.driver.page_source
            has_name = "Ananthakrishnan A H" in body_text
            has_batch = "Batch 4 Interns" in body_text
            
            if has_name and has_batch:
                self.log_result("Signature Popover", "PASS", "Credentials verified: Ananthakrishnan A H, Batch 4 Interns.")
            else:
                self.log_result("Signature Popover", "FAIL", "Developer name or batch info missing from popover.")
        except Exception as e:
            self.log_result("Signature Popover", "FAIL", str(e))

    def generate_report(self):
        with open(REPORT_FILE, "w") as f:
            f.write("="*50 + "\n")
            f.write(" INFOCREON INTERNSHIP - CROWDFUNDING DEAL RADAR - UAT REPORT\n")
            f.write("="*50 + "\n\n")
            f.write(f"Target URL: {TARGET_URL}\n\n")
            f.write(f"{'TEST CASE':<25} | {'STATUS':<8} | {'MESSAGE'}\n")
            f.write("-" * 80 + "\n")
            for r in self.results:
                f.write(f"{r['test']:<25} | {r['status']:<8} | {r['message']}\n")
            f.write("\n" + "="*50 + "\n")
        print(f"\nReport generated: {REPORT_FILE}")

    def teardown(self):
        self.driver.quit()

if __name__ == "__main__":
    uat = DealRadarUAT()
    try:
        uat.test_visual_load()
        uat.test_data_handshake()
        uat.test_signature_popover()
        uat.generate_report()
    finally:
        uat.teardown()
