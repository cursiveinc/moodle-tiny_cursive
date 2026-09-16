@tiny_cursive @javascript
Feature: Data transparency notice acknowledgement report
  In order to evidence who was informed
  As a manager
  I need to see and export the acknowledgement log

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
      | student2 | Student   | Two      | student2@example.com |
      | teacher1 | Teacher   | One      | teacher1@example.com |
      | manager1 | Manager   | One      | manager1@example.com |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "system role assigns" exist:
      | user     | role    |
      | manager1 | manager |
    And the following Cursive notice acknowledgements exist:
      | user     |
      | student1 |

  Scenario: A manager sees the acknowledgement and the pending user
    Given I log in as "manager1"
    When I visit "/lib/editor/tiny/plugins/cursive/notice_report.php"
    Then I should see "Cursive notice acknowledgements"
    And I should see "Notice gating is currently disabled"
    And "Student One" "link" should exist in the "generaltable" "table"
    And I should see "Current" in the "Student One" "table_row"
    And I should not see "Student Two"
    When I visit "/lib/editor/tiny/plugins/cursive/notice_report.php?mode=pending"
    Then I should see "Select a course or a cohort"
    When I set the field "Show" to "Users who have not yet acknowledged"
    And I set the field "Course" to "Course 1"
    And I press "Filter"
    Then I should see "Student Two" in the "generaltable" "table"
    And I should not see "Student One" in the "generaltable" "table"

  Scenario: The stored wording can be viewed
    Given I log in as "manager1"
    When I visit "/lib/editor/tiny/plugins/cursive/notice_report.php"
    And I click on "View wording" "link" in the "Student One" "table_row"
    Then I should see "Notice wording"
    And I should see "This wording matches the current release"
    And I should see "Cursive collects data about your writing style"
