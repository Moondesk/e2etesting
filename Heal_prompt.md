Step 1 : Execute and Heal Automation Tests 

Prompt: 
 Now I need to execute the automation scripts located on /tests/bdd/steps/ and heal any failures, skips, and tests leading to broken pages using the playwright-test-healer agent,have in mind that cucumber is essential,and keep best playwright test case pratices. create a document with information regarding the healing done, document to be named healing_report.md and to be saved on /playwright-report/.

 1. Run all automation scripts in : /tests/bdd/steps/
 2. Identify any failing tests
 3. for each failure test. use the playwright-test-healer agent to:
  - Analyze the failure (selector issues,timing issues, assertion failures)
  - Auto-heal the test by fixing those issues 
  - Update the test script with fixes 
4. Re-run the healed tests to verify they pass 
5. repeat the heal process untill all tests are stable and passing 
6. document :
 - Initial test results(pass/fail count)
 - Healing activities performed 
 - Final test results after healing 
 - Any tests that couldn't be auto-healed after 3 attempts   


Expected output:
All automation tests executed 
Failling tests identified and healed using the test-healer agent 
Healed test scripts updated in /tests/
Final stable test execution results 
Summary of healing activies performed
Document named healing_report.md created on /playwright-report/