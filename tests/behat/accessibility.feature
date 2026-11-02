@editor @editor_tiny @tiny @tiny_cursive @javascript @accessibility
Feature: Cursive surfaces meet accessibility standards
  In order to keep Cursive usable with assistive technology
  As a developer
  I need every Cursive surface to pass an axe-core scan in CI

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
      | teacher1 | Teacher   | One      | teacher1@example.com |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | course | name        | assignsubmission_onlinetext_enabled | submissiondrafts |
      | assign   | C1     | Test assign | 1                                   | 0                |
    And the following config values are set as admin:
      | notice_enabled | 0 | tiny_cursive |
    And Cursive is enabled for course "C1"
    And Cursive has an API key
    And the following Cursive submissions exist:
      | user     | module | activity    |
      | student1 | assign | Test assign |

  Scenario: Assignment submission editor with the capture indicator open
    Given I am on the "Test assign" "assign activity" page logged in as student1
    And I press "Add submission"
    And I wait until ".tiny_cursive_StateButtonWrap" "css_element" exists
    When I hover ".tiny_cursive_StateButtonWrap" "css_element"
    Then ".tiny_cursive_state_tooltip" "css_element" should be visible
    # The editor header holds the indicator and its tooltip. TinyMCE's own statusbar and other
    # plugins' content on the page are outside the plugin's control.
    And the ".tox-editor-header" "css_element" should meet accessibility standards
    And the ".tox-editor-header" "css_element" should meet accessibility standards with "best-practice" extra tests

  Scenario: Analytics modal on the Analytics, Difference and Replay tabs
    Given I am on the "Test assign" "tiny_cursive > Grading" page logged in as teacher1
    And I wait until "button[id^='analytics']" "css_element" exists
    When I click on "button[id^='analytics']" "css_element"
    And I wait until ".modal.show table" "css_element" exists
    # The modal is scanned as a region: the grading table around it is core mod_assign markup.
    Then the ".modal.show" "css_element" should meet accessibility standards
    And the ".modal.show" "css_element" should meet accessibility standards with "best-practice" extra tests
    When I click on "Difference" "button"
    And I wait until ".modal.show .tiny_cursive-diff-legend" "css_element" exists
    Then the ".modal.show" "css_element" should meet accessibility standards
    And the ".modal.show" "css_element" should meet accessibility standards with "best-practice" extra tests
    When I click on "Replay" "button"
    And I wait until ".modal.show .tiny_cursive_replay_legend" "css_element" exists
    Then the ".modal.show" "css_element" should meet accessibility standards
    And the ".modal.show" "css_element" should meet accessibility standards with "best-practice" extra tests

  Scenario: Course writing report
    Given I am on the "C1" "tiny_cursive > Course report" page logged in as teacher1
    Then the page should meet accessibility standards
    And the page should meet accessibility standards with "best-practice" extra tests

  Scenario: Student writing report
    Given I am on the "student1" "tiny_cursive > Writing report" page logged in as teacher1
    Then the page should meet accessibility standards
    And the page should meet accessibility standards with "best-practice" extra tests

  Scenario: PDF export page and its rendered template
    Given I am on the "student1" "tiny_cursive > PDF export" page logged in as teacher1
    # The page builds and downloads the PDF on load; wait until it has settled before scanning.
    And I wait until "Back to report" "button" exists
    When I render the Cursive PDF export template into the page
    # Core's scan step gives up before a scan on this page finishes; this one waits for it.
    Then the Cursive PDF export should meet accessibility standards

  Scenario: Plugin settings page
    Given I am on the "tiny_cursive > Settings" page logged in as admin
    Then the page should meet accessibility standards
    # Best-practice rules run on the settings form only: the site navigation is core Boost markup.
    And the "#region-main" "css_element" should meet accessibility standards with "best-practice" extra tests
