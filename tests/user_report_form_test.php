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

declare(strict_types=1);

namespace tiny_cursive;

use advanced_testcase;
use tiny_cursive\forms\user_report_form;

/**
 * Unit tests for user_report_form in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\forms\user_report_form
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class user_report_form_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test get_modules with empty course ID returns default 'all modules'.
     */
    public function test_get_modules_empty_course(): void {
        $modules = user_report_form::get_modules(0);
        $this->assertArrayHasKey(0, $modules);
    }

    /**
     * Test get_modules returns supported activity modules in course.
     */
    public function test_get_modules_supported_activities(): void {
        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id, 'name' => 'Test Assignment']);

        $modules = user_report_form::get_modules((int) $course->id);
        $this->assertArrayHasKey((int) $assign->cmid, $modules);
        $this->assertEquals('Test Assignment', $modules[(int) $assign->cmid]);
    }

    /**
     * Test get_user returns enrolled course users.
     */
    public function test_get_user_enrolled_members(): void {
        $course = $this->getDataGenerator()->create_course();
        $user1 = $this->getDataGenerator()->create_user(['firstname' => 'Alice', 'lastname' => 'Smith']);
        $user2 = $this->getDataGenerator()->create_user(['firstname' => 'Bob', 'lastname' => 'Jones']);

        $this->getDataGenerator()->enrol_user($user1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($user2->id, $course->id, 'editingteacher');

        $users = user_report_form::get_user((int) $course->id);
        $this->assertArrayHasKey(0, $users);
        $this->assertArrayHasKey($user1->id, $users);
        $this->assertArrayHasKey($user2->id, $users);
    }
}
