<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

// phpcs:disable moodle.NamingConventions.ValidVariableName.VariableNameLowerCase

require_once(__DIR__ . '/../../../../../../../lib/behat/behat_base.php');

use Behat\Gherkin\Node\TableNode;

/**
 * Behat steps for tiny_cursive.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_tiny_cursive extends behat_base {
    /**
     * Enable Cursive capture for a course, as the course settings form would.
     *
     * @Given Cursive is enabled for course :shortname
     * @param string $shortname
     */
    public function cursive_is_enabled_for_course(string $shortname): void {
        global $DB;

        $courseid = $DB->get_field('course', 'id', ['shortname' => $shortname], MUST_EXIST);
        set_config("cursive-{$courseid}", 1, 'tiny_cursive');
    }

    /**
     * Create notice acknowledgements directly.
     *
     * @Given the following Cursive notice acknowledgements exist:
     * @param TableNode $table Columns: user (username), optionally noticeversion and lang.
     */
    public function the_following_cursive_notice_acknowledgements_exist(TableNode $table): void {
        global $DB;

        $generator = testing_util::get_data_generator()->get_plugin_generator('tiny_cursive');
        foreach ($table->getHash() as $row) {
            $record = ['userid' => $DB->get_field('user', 'id', ['username' => $row['user']], MUST_EXIST)];
            if (!empty($row['noticeversion'])) {
                $record['noticeversion'] = (int) $row['noticeversion'];
            }
            if (!empty($row['lang'])) {
                $record['lang'] = $row['lang'];
            }
            $generator->create_acknowledgement($record);
        }
    }
}
