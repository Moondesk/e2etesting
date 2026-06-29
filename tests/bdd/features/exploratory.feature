@exploratory @search
Feature: Exploratory checks for Bertrand site

  Background:
    Given I navigate to the Bertrand homepage
    And I wait for the page to load completely
    And I take a screenshot named "explore-homepage"

  Scenario: Explore homepage and try searches
    When I locate the search input using multiple strategies
    And I search for "1984"
    And I wait for search results to load
    And I take a screenshot named "search-1984-results"
    And I click on the first product link
    And I wait for the product page to load
    And I take a screenshot named "1984-product-page"
    Then I should see product details on the page
