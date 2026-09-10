@tiny_cursive @javascript
Feature: Data transparency notice settings
  In order to gate the editor knowingly
  As an administrator
  I need to be warned when no alternative editor exists

  Scenario: Gating on with Cursive as the only editor shows the no-fallback warning
    Given the following config values are set as admin:
      | texteditors | tiny |
    And the following config values are set as admin:
      | notice_enabled | 1 | tiny_cursive |
    And I log in as "admin"
    When I visit "/admin/settings.php?section=tiny_cursive_settings"
    Then I should see "Cursive is currently the only enabled text editor on this site"
    And I should see "users who do not acknowledge will not be able to enter written work"
    And "Manage editors" "link" should exist

  Scenario: No warning once another editor is enabled
    Given the following config values are set as admin:
      | texteditors | tiny,textarea |
    And the following config values are set as admin:
      | notice_enabled | 1 | tiny_cursive |
    And I log in as "admin"
    When I visit "/admin/settings.php?section=tiny_cursive_settings"
    Then I should not see "Cursive is currently the only enabled text editor on this site"

  Scenario: No warning while gating is off
    Given the following config values are set as admin:
      | texteditors | tiny |
    And the following config values are set as admin:
      | notice_enabled | 0 | tiny_cursive |
    And I log in as "admin"
    When I visit "/admin/settings.php?section=tiny_cursive_settings"
    Then I should not see "Cursive is currently the only enabled text editor on this site"
    And I should see "Require notice acknowledgement"
