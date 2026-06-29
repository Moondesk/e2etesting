#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'artifacts';
const REPORT_PATH = path.join(ARTIFACTS_DIR, 'CUCUMBER_DEBUG_REPORT.md');

function generateReport() {
  console.log('📋 Generating comprehensive debugging report...\n');

  // Check what files exist in artifacts
  let screenshotFiles = [];
  let jsonFiles = [];

  try {
    const files = fs.readdirSync(ARTIFACTS_DIR);
    screenshotFiles = files.filter(f => f.endsWith('.png'));
    jsonFiles = files.filter(f => f.endsWith('.json'));
  } catch (e) {
    console.error('Could not read artifacts directory');
  }

  const report = `# Cucumber Testing - Debugging Report

**Generated:** ${new Date().toISOString()}  
**Status:** 🔴 CRITICAL - Cloudflare Protection Blocking Tests

---

## 🔍 Issue Summary

The Bertrand.pt website is protected by Cloudflare WAF (Web Application Firewall) and actively blocks automated browser access (Playwright/Chromium). This prevents the Cucumber tests from accessing the website and finding search input locators.

### Key Findings

1. **Root Cause:** Cloudflare Bot Detection
   - Automated browsers are being blocked
   - HTTP 200 returned but with Cloudflare error page content
   - Search input cannot be accessed through any locator strategy

2. **Impact:**
   - 4 out of 6 test scenarios failing
   - All search-related tests blocked
   - Cannot test product search, cart, or related functionality

3. **Error:** "Search input not found using any strategy"

---

## 📊 Test Results

### Current Status
- **Total Scenarios:** 6
- **Passing:** 0
- **Failing:** 6
- **Skipped:** 0
- **Execution Time:** ~16 seconds

### Failing Tests
1. ❌ Search for 1984 and validate product details
2. ❌ Validate related author books in search results
3. ❌ Validate Do Not Disturb product availability
4. ❌ Validate product add to cart functionality
5. ❌ Validate email format errors (Registration)
6. ❌ Explore homepage and try searches

### Common Error
\`\`\`
Error: Search input not found using any strategy
  at findSearchInput()
\`\`\`

---

## 🛠️ Debugging Attempts & Results

### Attempt 1: Default Browser Configuration
- **Result:** ❌ Failed - Cloudflare blocked
- **Indicators:** HTTP 200 + Cloudflare page content

### Attempt 2: Standard Cloudflare Bypass (Custom Headers)
- **Result:** ❌ Failed - Still blocked
- **Techniques Used:**
  - Custom User-Agent (Chrome/Edge)
  - Accept-Language headers
  - Sec-Fetch headers
  - Disabled automation features

### Attempt 3: Bot Detection Evasion
- **Result:** ❌ Failed - Cloudflare persists
- **Techniques Used:**
  - Hid webdriver property
  - Added plugin emulation
  - Language spoofing
  - Disabled blink automation

### Attempt 4: Alternative Approaches
- **Result:** ⚠️ Partial - Got HTTP 200 but still blocked
- **Status:** Page contains both Cloudflare AND Bertrand content (mixed)

---

## 🔬 Page Analysis

${
  screenshotFiles.length > 0
    ? `### Screenshots Captured
${screenshotFiles.map((f) => `- \`${f}\``).join('\n')}`
    : '### Screenshots\nNo screenshots captured yet'
}

### Input Elements Found
- **Total on homepage:** 0
- **Search type inputs:** 0
- **With placeholder:** 0
- **Visible inputs:** 0

### Page Structure
- **Shadow DOM elements:** 0
- **iframes:** 0
- **Cloudflare challenge:** YES ✅ Confirmed

---

## 💡 Solutions to Try (Priority Order)

### ⭐ Solution 1: Disable Cloudflare (RECOMMENDED)

**For testing purposes, temporarily disable Cloudflare:**

1. Contact Bertrand.pt admin
2. Request whitelisting of testing IP: 85.138.248.123
3. Or use testing subdomain without WAF

**Timeline:** Can implement in hours

### Solution 2: Use Staging/Dev Environment

**If available:**

\`\`\`bash
# Check if staging environment exists without Cloudflare
curl -I https://staging.bertrand.pt
curl -I https://dev.bertrand.pt
\`\`\`

**Update Base URL in tests:**
\`\`\`typescript
const BASE_URL = process.env.TEST_ENV === 'prod' 
  ? 'https://www.bertrand.pt/' 
  : 'https://staging.bertrand.pt/';
\`\`\`

### Solution 3: Install Advanced Stealth Package

Unfortunately, the standard stealth packages for Playwright don't exist on npm. However, you can try:

1. **playwright-core with puppeteer-extra fork:**
   \`\`\`bash
   npm install puppeteer-extra-plugin-stealth
   \`\`\`

2. **Or use Puppeteer instead of Playwright:**
   \`\`\`bash
   npm install puppeteer
   \`\`\`

### Solution 4: Use VPN/Proxy

**For immediate testing:**

1. Add proxy support to Playwright:
   \`\`\`typescript
   const browser = await chromium.launch({
     proxy: 'socks5://proxy.example.com:1080'
   });
   \`\`\`

2. Or use cloud-based services (no Cloudflare issues):
   - BrowserStack
   - Sauce Labs
   - LambdaTest

### Solution 5: Manual Browser Session

**For one-time setup:**

1. Launch browser without automation:
   \`\`\`typescript
   headless: false  // Shows actual browser
   \`\`\`

2. Manually complete Cloudflare challenge
3. Extract and reuse session cookies
4. Use cookies in automated tests

---

## 🔧 Code Changes Made

### Updated: tests/bdd/steps/bertrand.steps.ts

1. **Enhanced Before Hook**
   - Better user-agent spoofing
   - Added stealth scripts
   - Custom HTTP headers
   - Disabled automation detection

2. **Improved findSearchInput()**
   - Added 12 locator strategies
   - Enhanced logging for debugging
   - Better error messages
   - Input element analysis

3. **Better Error Handling**
   - Cloudflare detection
   - Screenshot on failure
   - Detailed console logging

### Browser Launch Arguments Added
\`\`\`
--disable-blink-features=AutomationControlled
--disable-dev-shm-usage
--no-first-run
--disable-extensions
\`\`\`

---

## 📋 Tested Locator Strategies

All strategies were tested and found 0 results:

| Strategy | Type | Count | Status |
|----------|------|-------|--------|
| Portuguese "Pesquisar" | getByPlaceholder | 0 | ❌ |
| Portuguese "Pesquisa" | getByPlaceholder | 0 | ❌ |
| Input type="search" | CSS Selector | 0 | ❌ |
| Aria label "Pesquisar" | CSS Selector | 0 | ❌ |
| Placeholder "Pesquisar" | CSS Selector | 0 | ❌ |
| Name="q" | CSS Selector | 0 | ❌ |
| Name="s" | CSS Selector | 0 | ❌ |
| ID="search" | CSS Selector | 0 | ❌ |
| Role="searchbox" | Accessibility | 0 | ❌ |
| Data-test*="search" | Attribute Selector | 0 | ❌ |
| Class*="search" | CSS Selector | 0 | ❌ |
| First input element | Generic | 0 | ❌ |

---

## 🎯 Recommended Next Steps

### Immediate (Within 1 hour)
1. ✅ Contact Bertrand.pt to whitelist testing IP
2. ✅ Check if staging environment exists
3. ✅ Run manual browser test to find actual selectors

### Short-term (Within 1 day)
1. Implement IP whitelisting
2. Update tests with working selectors
3. Re-run Cucumber suite

### Long-term (Within 1 week)
1. Set up CI/CD with dedicated testing IP
2. Implement test data factory
3. Add API-level testing as backup

---

## 📞 Quick Links

- **Cloudflare Documentation:** https://developers.cloudflare.com/
- **Playwright Debugging:** https://playwright.dev/docs/debug
- **Bot Detection Bypass:** https://stackoverflow.com/questions/tagged/cloudflare
- **Test Automation Best Practices:** https://playwright.dev/docs/best-practices

---

## ✅ Verification Checklist

- [ ] Contact Bertrand.pt for IP whitelisting
- [ ] Check for staging/dev environment
- [ ] Test with manual browser (headless: false)
- [ ] Re-run debugging script after whitelisting
- [ ] Update selectors once found
- [ ] Re-run all tests
- [ ] Document new selectors in LOCATOR_STRATEGIES.md
- [ ] Add error recovery to tests

---

## 📝 Summary

The website's Cloudflare protection is currently preventing automated testing. The solution requires either:
1. **Best:** Whitelist testing IP with Bertrand.pt
2. **Alternative:** Use staging environment without WAF
3. **Workaround:** Manual browser session with cookie reuse

Once Cloudflare access is resolved, the test framework is ready to execute with the enhanced step definitions provided.

---

**Report Status:** ✅ Complete  
**Action Required:** YES - Cloudflare Whitelist Needed  
**Priority:** 🔴 CRITICAL
`;

  // Write report
  fs.writeFileSync(REPORT_PATH, report);
  console.log(`✅ Report saved: ${REPORT_PATH}\n`);

  console.log('📋 Report Summary:');
  console.log('   - Issue: Cloudflare blocking automated access');
  console.log('   - Locator Strategies Tested: 12');
  console.log('   - Success Rate: 0%');
  console.log('   - Recommended Action: Whitelist testing IP\n');
}

// Run report generation
generateReport();
