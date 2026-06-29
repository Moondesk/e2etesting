I have decided to do the challenge using some tools I have been learning for the pass Year. 


I created the whole Test Suite using agents and mcp, mostly from playwright, I used github copilot as well. 


The General Idea was to create E2E test execution, writing plain text, and having the test case self-healing capabilities. 


The initial prompt is named "QAE2E_Prompt.md" in this prompt there's a command for copilot to read the user stories on 
/user-stories/bertrand_scenarios.md, and from what copilot reasons it generates a test plan on /specs/bertrand-e2e-plan.md

Playwright test generator will then use the e2e plan to generate test cases and scenarios for cucumber.

It runs the tests a couple of times and corrects what is incorrect using playwright-test-healer agent.

A couple of test reports are generated. 
