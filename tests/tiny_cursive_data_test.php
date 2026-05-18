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

namespace tiny_cursive;

defined('MOODLE_INTERNAL') || die();

global $CFG;

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/tiny_cursive_data.php');

/**
 * Unit tests for tiny_cursive_data static helper methods.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class tiny_cursive_data_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_get_courses_users_returns_enrolled_non_admin_users(): void {
        $course = $this->getDataGenerator()->create_course();
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $result = tiny_cursive_data::get_courses_users(['courseid' => $course->id]);

        $this->assertIsObject($result);
        $this->assertNotEmpty($result->userlist);
        $ids = array_column($result->userlist, 'id');
        $this->assertContains($student->id, $ids);
        $this->assertNotContains(get_admin()->id, $ids);
    }

    public function test_get_courses_modules_returns_first_module_in_course(): void {
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $result = tiny_cursive_data::get_courses_modules(['courseid' => $course->id]);

        $this->assertIsObject($result);
        $this->assertNotEmpty($result->userlist);
        $ids = array_column($result->userlist, 'id');
        $this->assertContains($module->cmid, $ids);
    }
}
