@editor @editor_tiny @tiny_cursive @javascript
Feature: Data transparency notice gate
  In order to be informed before biometric data is collected
  As a student
  I need to acknowledge the notice before the Cursive-enabled editor loads

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | course | name         | assignsubmission_onlinetext_enabled | submissiondrafts |
      | assign   | C1     | Test assign  | 1                                   | 0                |
    And Cursive is enabled for course "C1"

  Scenario: The editor renders normally while gating is off
    Given the following config values are set as admin:
      | notice_enabled | 0 | tiny_cursive |
    When I am on the "Test assign" "assign activity" page logged in as student1
    And I press "Add submission"
    Then I should not see "Notice about data collection"
    And "I consent" "button" should not exist
    And ".tox-tinymce" "css_element" should be visible

  Scenario: The gate replaces the editor until the notice is acknowledged
    Given the following config values are set as admin:
      | notice_enabled     | 1                           | tiny_cursive |
      | notice_privacyurl  | https://example.com/privacy | tiny_cursive |
    When I am on the "Test assign" "assign activity" page logged in as student1
    And I press "Add submission"
    Then I should see "Notice about data collection"
    And I should see "Cursive collects data about your writing style"
    And I should see "your institution's privacy notice"
    And "I consent" "button" should exist
    And "Choose a different text editor in your editor preferences instead" "link" should exist
    And "Decline" "button" should not exist in the "[data-region='tiny_cursive-notice-gate']" "css_element"
    And ".tox-tinymce" "css_element" should not be visible
    When I reload the page
    Then I should see "Notice about data collection"
    And ".tox-tinymce" "css_element" should not be visible
    When I click on "I consent" "button"
    Then I should not see "Notice about data collection"
    And ".tox-tinymce" "css_element" should be visible
    And I should see "Your acknowledgement has been recorded"
    When I reload the page
    Then I should not see "Notice about data collection"
    And ".tox-tinymce" "css_element" should be visible

  Scenario: Leaving without acknowledging writes nothing and the gate returns
    Given the following config values are set as admin:
      | notice_enabled | 1 | tiny_cursive |
    When I am on the "Test assign" "assign activity" page logged in as student1
    And I press "Add submission"
    Then I should see "Notice about data collection"
    When I am on the "Test assign" "assign activity" page
    And I press "Add submission"
    Then I should see "Notice about data collection"
    And ".tox-tinymce" "css_element" should not be visible

  Scenario: A user who switches to the plain text area is not gated
    Given the following config values are set as admin:
      | notice_enabled | 1 | tiny_cursive |
    And I log in as "student1"
    And I follow "Preferences" in the user menu
    And I follow "Editor preferences"
    And I set the field "Text editor" to "Plain text area"
    And I press "Save changes"
    When I am on the "Test assign" "assign activity" page
    And I press "Add submission"
    Then I should not see "Notice about data collection"
    And "I consent" "button" should not exist
    And ".tox-tinymce" "css_element" should not exist
