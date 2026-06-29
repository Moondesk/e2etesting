# Bertrand challenge

## Step 1: Read user scenarios

**Prompt:**  
I need to start a new automation testing workflow for Bertrand. Read the user stories from `user-stories/bertrand_scenarios.md`.

Summarize:
1. Key requirements
2. Acceptance criteria
3. Application URL
4. Test data and credentials, if any
5. Main functional areas to validate

**Expected output:**  
- Summary of the user stories  
- List of acceptance criteria  
- Application URL  
- Test credentials, if they exist  
- Key features to test  

---

## Step 2: Create test plan

**Prompt:**  
Based on `user-stories/bertrand_scenarios.md`, use the `playwright-test-planner` agent to create a practical test plan aligned with the current repository structure and current Bertrand implementation.

Requirements:
1. Read the application URL and test data from the user stories.
2. Explore the application flows described in the user stories.
3. Create a test plan covering:
   - Search flows
   - Product detail validation
   - Related product validation
   - Add-to-cart and remove-from-cart flows
   - Negative scenarios only when they are supported by the current application and scope
4. Save the plan to `specs/bertrand-e2e-plan.md`.

Ensure each test case includes:
- Clear title
- Step-by-step execution
- Expected results
- Required test data

**Expected output:**  
- Complete test plan saved to `specs/bertrand-e2e-plan.md`  
- Scenarios organized by business flow  

---

## Step 3: Perform exploratory testing

**Prompt:**  
Now perform exploratory testing using Playwright MCP browser tools.

Use `specs/bertrand-e2e-plan.md` and:
1. Execute the relevant flows manually in the browser
2. Confirm the selectors and page behavior that are actually working
3. Take screenshots at key checkpoints and failure states
4. Document:
   - Actual execution results
   - Working selectors and interaction patterns
   - UI inconsistencies or bugs
   - Important implementation details

Important notes for current Bertrand behavior:
- The cart should be treated as a **right-side lateral sidebar / popup**, not as a standalone cart page
- Prefer selectors that were proven during exploration
- Keep findings grounded in the current application behavior, not assumptions from the original story text

**Expected output:**  
- Manual exploratory findings  
- Screenshots in `artifacts/`  
- Notes about working selectors, behaviors, and issues  

---

## Step 4: Generate or update automation scripts

**Prompt:**  
Now create or update the automation to match the current implementation.

Use:
1. `specs/bertrand-e2e-plan.md`
2. Exploratory findings from Step 3
3. Existing repository structure and current automation files

The primary automation in this repository is **Cucumber + Playwright**, so update or generate files in:
- Features: `tests/bdd/features/`
- Step definitions: `tests/bdd/steps/`

Current implementation guidance:
1. Keep feature scenarios in `tests/bdd/features/bertrand-e2e.feature` and related BDD files
2. Keep step definitions in `tests/bdd/steps/bertrand.steps.ts`
3. Reuse and improve the current step-definition style instead of generating a separate framework
4. If Playwright-only specs are needed, place them under `tests/playwright/`, but BDD remains the main implementation
5. Use robust selectors, stable waits, and repository conventions already present in the current code
6. Keep the cart flow aligned with the real UI behavior: open the lateral cart sidebar and validate inside it

**Expected output:**  
- Updated BDD feature files in `tests/bdd/features/`  
- Updated step definitions in `tests/bdd/steps/`  
- Optional Playwright specs in `tests/playwright/` only if needed  

---

## Step 5: Execute and heal automation tests

**Prompt:**  
Now execute and heal the automation using the `playwright-test-healer` agent where needed.

Run the current suite using the repository scripts:
1. `npm test`
2. `npm run test:e2e`
3. `npm run test:cart`
4. `npm run test:exploratory`

If failures occur:
1. Identify the failing scenarios or steps
2. Use `playwright-test-healer` to analyze:
   - Selector issues
   - Timing and wait issues
   - Assertion mismatches
   - Flow mismatches between user story and real UI
3. Update the current automation files in `tests/bdd/steps/` and `tests/bdd/features/`
4. Re-run the affected commands until the suite is stable
5. Document:
   - Initial results
   - Fixes applied
   - Final results
   - Remaining blockers, if any

**Expected output:**  
- Executed automation suite  
- Healed BDD automation where required  
- Stable results for the supported scenarios  
- Summary of healing activities  

---

## Step 6: Create test report

**Prompt:**  
Now create a consolidated test report based on exploratory work, automation execution, and healing activities.

Save it to `test-results/bertrand-test-report.md`.

Include:
1. Executive summary
   - Total planned scenarios
   - Executed scenarios
   - Pass / fail / blocked summary
2. Exploratory testing results
   - Findings
   - Screenshots
   - UI observations
3. Automated test results
   - Commands executed
   - Initial results
   - Fixes and healing work
   - Final results
4. Defect log
   - Issue summary
   - Severity
   - Steps to reproduce
   - Expected vs actual behavior
   - Evidence
5. Coverage analysis
   - What is covered by current BDD automation
   - What was only explored manually
   - Known gaps
6. Recommendations
   - Next improvements
   - Risks or unstable areas

**Expected output:**  
- Comprehensive report in `test-results/bertrand-test-report.md`  
- Clear evidence of current coverage and known gaps  

---

## Step 7: Commit to git repository

**Git URL:** `https://github.com/Moondesk/e2etesting.git`

**Prompt:**  
When all required updates are complete, use the repository git workflow to commit the current automation changes.

Perform:
1. Ensure only the intended updated files are staged
2. Stage all relevant modified files
3. Create a commit with the message:  
   `(tests): Update Bertrand BDD automation workflow`
4. Push the changes to the configured repository
5. Provide a short summary of what changed

**Expected output:**  
- Updated automation files committed  
- Descriptive commit message  
- Confirmation of successful push  
- Summary of changes  
