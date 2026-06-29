@e2e @bertrand
Feature: Bertrand E2E Test Scenarios

  Background:
    Given I navigate to the Bertrand home page
    And I wait for the page to load completely
    And I accept cookies if presented
    And I wait for any cookie banner to disappear

  @search @product @validation
  Scenario: Search for 1984 and validate product details
    When I locate the search input using multiple strategies
    And I search for "1984"
    And I wait for search results to load
    And I take a screenshot named "1984-results"
    And I click on the first product link containing "1984"
    And I wait for the product page title to load
    And I take a screenshot named "1984-product-page"
    Then I should see "George Orwell" in the page content
    And I should see ISBN information on the page

  @search @product @related-books @validation
  Scenario: Validate related author books in search results
    When I locate the search input using multiple strategies
    And I search for "1984"
    And I wait for search results to load
    And I take a screenshot named "1984-related-results"
    Then I should find either "A Quinta dos Animais" or "Animal Farm" in the results
    When I click on the related book product link
    And I wait for the related product page to load
    And I take a screenshot named "a-quinta-dos-animais"
    Then I should see "George Orwell" in the page content

  @search @product @validation
  Scenario: Validate Do Not Disturb product availability and details
    When I locate the search input using multiple strategies
    And I search for "Do Not Disturb"
    And I wait for search results to load
    And I take a screenshot named "do-not-disturb-results"
    And I click on the product link for "Do Not Disturb"
    And I wait for the product page title to load
    And I take a screenshot named "do-not-disturb-product"
    Then I should see "Freida McFadden" in the page content
    And I should see "Inglês" in the page content

  @search @product @cart @validation
  Scenario: Validate product add to cart functionality
    When I locate the search input using multiple strategies
    And I search for "Rafa: My Story"
    And I wait for search results to load
    And I take a screenshot named "rafa-results"
    And I click on the product link for "Rafa"
    And I wait for the product page title to load
    And I take a screenshot named "rafa-product-page"
    When I click the add to cart button
    And I wait for the add to cart action to complete
    And I take a screenshot named "rafa-after-add"
    Then I should see a cart confirmation message
    When I navigate to the cart page
    Then I should see the product "Rafa" in the cart
    When I click the remove button for the item
    And I wait for the removal action to complete
    And I take a screenshot named "cart-after-remove"
    Then I should not see the product in the cart

  @search @product @cart @validation
  Scenario: Validate Do Not Disturb details and cart flow
    When I locate the search input using multiple strategies
    And I search for "Do Not Disturb"
    And I wait for search results to load
    And I take a screenshot named "do-not-disturb-validation-results"
    And I click on the product link for "Do Not Disturb"
    And I wait for the product page title to load
    And I take a screenshot named "do-not-disturb-validation-product"
    Then I should see "Freida McFadden" in the page content
    And I should see "Inglês" in the page content
    When I click the add to cart button
    And I wait for the add to cart action to complete
    And I take a screenshot named "do-not-disturb-after-add"
    Then I should see a cart confirmation message
    When I navigate to the cart page
    And I take a screenshot named "do-not-disturb-after-add-cart"
    Then I should see the product "Do Not Disturb" in the cart
    And I should see the cart quantity as 1
    When I increase the cart quantity from the cart sidebar
    Then I should see the cart quantity as 2
    When I decrease the cart quantity from the cart sidebar
    Then I should see the cart quantity as 1
    When I click the remove button for the item
    And I wait for the removal action to complete
    And I take a screenshot named "do-not-disturb-cart-after-remove"
    Then I should not see the product in the cart
