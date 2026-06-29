# Bertrand E2E Test Plan

Application URL: https://www.bertrand.pt/

Source: user-stories/bertrand_scenarios.md

Purpose:
This plan covers end-to-end validation of book discovery, product details, cart behaviour and account registration flows described in the user stories. It includes happy paths, negative tests, edge cases, navigation flows and UI validations.

Test Scope and Assumptions:
- Tests will focus on desktop web flows using Chromium, Firefox and WebKit.
- No test credentials were provided in the user stories; registration flows will create new test accounts.
- Prices and availability may change; assertions on price will validate presence and numeric format rather than exact values unless specified in a test case.
- Selectors will be refined after exploratory testing (step 3) and added to automation scripts.

Test Data:
- Search terms: "1984", "Do Not Disturb", "Rafa: My Story"
- Expected values from user stories:
  - 1984: author "George Orwell", ISBN "9789722071550", pages "344", dimensions "156 x 238 x 22 mm"
  - Do Not Disturb: author "Freida McFadden", language "Inglês" and UK flag
- Registration: generate unique email addresses (e.g., test+timestamp@example.com), valid and invalid password combinations as described below.

Structure and Naming Conventions:
- Test case title format: (element-action)
- Each test includes: description, step-by-step instructions, expected results, and test data.

---

Epic 1: Product Discovery and Cart Validation

Test Case 1: (search-input-search_1984-validate_product_details)
Description: Search for "1984" and validate product details on the product detail page.
Steps:
  1. Navigate to home page (https://www.bertrand.pt/)
  2. Locate search input and enter "1984" then submit search
  3. From search results, locate the result corresponding to "1984" and open its product detail page
  4. On product page, validate: author, ISBN, number of pages, and dimensions match expected values
Expected Results:
  - Search returns at least one result for "1984"
  - Product detail page shows author "George Orwell"
  - Product detail page shows ISBN "9789722071550"
  - Product detail page shows pages "344"
  - Product detail page shows dimensions "156 x 238 x 22 mm"
Test Data:
  - searchTerm: "1984"
  - expectedAuthor: "George Orwell"
  - expectedISBN: "9789722071550"
  - expectedPages: "344"
  - expectedDimensions: "156 x 238 x 22 mm"
Notes:
  - If product detail elements are not visible immediately, apply stable waits for element visibility.

Test Case 2: (search-results-verify_related_author_books)
Description: When searching for "1984" verify that "A Quinta dos Animais" appears and is authored by the same author.
Steps:
  1. Search for "1984"
  2. In results or suggested items, search for "A Quinta dos Animais" entry
  3. Open its product detail and verify author
Expected Results:
  - "A Quinta dos Animais" is present in results or related listings
  - Its author equals the author of "1984" ("George Orwell")
Test Data:
  - searchTerm: "1984"
  - relatedTitle: "A Quinta dos Animais"

Test Case 3: (search-input-search_DoNotDisturb-validate_language_and_flag)
Description: Search for "Do Not Disturb", verify author, language label and country flag icon.
Steps:
  1. Search for "Do Not Disturb"
  2. Open product detail for relevant result
  3. Verify author is "Freida McFadden"
  4. Verify language/idiom label equals "Inglês"
  5. Verify UK flag icon exists (alt text, aria-label, or CSS class)
Expected Results:
  - Correct author
  - Language label "Inglês" visible
  - UK flag displayed and accessible
Test Data:
  - searchTerm: "Do Not Disturb"
  - expectedAuthor: "Freida McFadden"
  - expectedLanguage: "Inglês"

Test Case 4: (product-addToCart_validate_cart_and_remove)
Description: Search "Rafa: My Story", add to cart, validate item in cart and cart value, then remove item and validate empty cart.
Steps:
  1. Search for "Rafa: My Story"
  2. Open product page and note price
  3. Click Add to Cart
  4. Open cart/mini-cart and verify book is listed
  5. Validate cart total matches item price or expected calculation
  6. Remove item from cart
  7. Verify cart is empty and totals updated
Expected Results:
  - Item appears in cart after adding
  - Cart value reflects item price
  - After removal, cart indicates zero items and zero or no total
Test Data:
  - searchTerm: "Rafa: My Story"

Test Case 5: (cart-edgecase_add_out_of_stock)
Description: Attempt to add an out-of-stock item to cart (if available) and verify error handling.
Steps:
  1. Identify a product marked out-of-stock (if present)
  2. Attempt to add to cart
Expected Results:
  - The UI prevents adding to cart or shows a clear out-of-stock message

Negative and Edge Case Scenarios (additional)
- (search-input-empty) Submit empty search and validate behaviour (suggestions, no-results message)
- (search-input-invalid_characters) Search using special characters and confirm results or error handling
- (product-rapid_add_to_cart) Add same item repeatedly and verify cart increments quantity correctly
- (cart-quantity_boundary) Increase quantity to a high number to check cart math and UI behavior
- (navigation-breadcrumbs) Validate navigation breadcrumbs from product page back to results and home
- (ui-visibility-header_footer) Validate presence of key UI elements (header, footer, search box, account link, cart icon)


Automation and Selector Notes:
- During exploratory testing (Step 3) capture stable selectors (IDs, data-* attributes, roles, aria-labels) and add them to the automation scripts.
- Use robust wait strategies: waitForSelector(visible), locator.waitFor(), expect(locator).toBeVisible(), avoid fixed time sleeps.
- Use test fixtures and hooks: beforeEach to navigate to homepage, afterEach to clear cart or sign out if required.

Reporting and Artifacts:
- Screenshots for key flows and any failures will be saved under artifacts/ with descriptive names.
- Test results and final report will be saved to test-results/bertrand-test-report.md

Next Steps:
1. Perform exploratory testing (Step 3) to capture selectors and screenshots.
2. Update this plan with selector specifics and any changes discovered during exploration.
3. Generate automation scripts (Step 4) using selectors and waits observed during exploration.

---

End of plan.
