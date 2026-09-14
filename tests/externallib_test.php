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
use cursive_json_func_data;
use invalid_parameter_exception;
use required_capability_exception;

/**
 * Unit tests for external API functions in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \cursive_json_func_data
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class externallib_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test disable_cursive requires tiny/cursive:editsettings capability.
     */
    public function test_disable_cursive_capability(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::disable_cursive(true);
    }

    /**
     * Test disable_cursive succeeds for admin.
     */
    public function test_disable_cursive_admin(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $this->setAdminUser();
        $result = cursive_json_func_data::disable_cursive(true);
        $this->assertTrue($result);
    }

    /**
     * Test remove_student_submission prevents student deleting another user's records.
     */
    public function test_remove_student_submission_idor_prevention(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        // Log in as student1 and attempt to remove student2's submission.
        $this->setUser($student1);

        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::remove_student_submission($course->id, $student2->id, (int) $assign->cmid);
    }

    /**
     * Test cursive_get_analytics rejects invalid fileid or unauthorized access.
     */
    public function test_cursive_get_analytics_idor_prevention(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        // Create a file record for student2.
        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student2->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student2->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        // Student1 should not be able to get student2's analytics.
        $this->setUser($student1);
        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::cursive_get_analytics((int) $assign->cmid, $fileid);
    }

    /**
     * Test resubmit_payload_data prevents modifying another user's file.
     */
    public function test_resubmit_payload_data_idor_prevention(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student2->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student2->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 1,
        ]);

        // Student1 tries to trigger resubmit on student2's file.
        $this->setUser($student1);
        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::resubmit_payload_data($fileid, (int) $assign->cmid);
    }
}
