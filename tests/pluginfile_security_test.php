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
use context_module;
use context_user;

/**
 * Unit tests for file serving and access controls in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      ::tiny_cursive_pluginfile
 * @covers      ::tiny_cursive_get_path_from_pluginfile
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class pluginfile_security_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test tiny_cursive_get_path_from_pluginfile extracts path correctly.
     */
    public function test_get_path_from_pluginfile(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $result1 = tiny_cursive_get_path_from_pluginfile(['revision1']);
        $this->assertEquals(0, $result1['itemid']);
        $this->assertEquals('/', $result1['filepath']);

        $result2 = tiny_cursive_get_path_from_pluginfile(['revision1', 'subfolder', 'nested']);
        $this->assertEquals(0, $result2['itemid']);
        $this->assertEquals('/subfolder/nested/', $result2['filepath']);
    }

    /**
     * Test tiny_cursive_pluginfile rejects invalid context levels.
     */
    public function test_pluginfile_rejects_invalid_context_level(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $usercontext = context_user::instance($user->id);

        $result = tiny_cursive_pluginfile(
            $course,
            $assign,
            $usercontext,
            'cursive_files',
            [1, 'file.json'],
            false
        );

        $this->assertFalse($result);
    }

    /**
     * Test tiny_cursive_pluginfile rejects unauthorized student attempting to access another student's file.
     */
    public function test_pluginfile_rejects_unauthorized_student_access(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $cm = get_coursemodule_from_id('assign', (int) $assign->cmid);
        $context = context_module::instance((int) $assign->cmid);

        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student1->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => 'user1.json',
            'timemodified' => time(),
            'uploaded' => 1,
        ]);

        // Log in as student2 and attempt to download student1's file.
        $this->setUser($student2);
        $result = tiny_cursive_pluginfile(
            $course,
            $cm,
            $context,
            'cursive_files',
            [$fileid, 'user1.json'],
            false
        );

        $this->assertFalse($result);
    }

    /**
     * Test tiny_cursive_pluginfile returns false for nonexistent record.
     */
    public function test_pluginfile_nonexistent_record(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $cm = get_coursemodule_from_id('assign', (int) $assign->cmid);
        $context = context_module::instance((int) $assign->cmid);

        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $this->setUser($student);
        $result = tiny_cursive_pluginfile(
            $course,
            $cm,
            $context,
            'cursive_files',
            [999999, 'missing.json'],
            false
        );

        $this->assertFalse($result);
    }
}
