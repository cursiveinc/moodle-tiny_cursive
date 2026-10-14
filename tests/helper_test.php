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
use tiny_cursive\constants;
use tiny_cursive\helper;

/**
 * Unit tests for helper and constants classes in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\constants
 * @covers      \tiny_cursive\helper
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class helper_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test constants::NAMES contains all required Moodle modules.
     */
    public function test_supported_module_names(): void {
        $expected = ['assign', 'forum', 'quiz', 'lesson', 'pdfannotator', 'workshop', 'diary'];
        $this->assertEquals($expected, constants::NAMES);
    }

    /**
     * Test constants::has_api_key reflects configuration state.
     */
    public function test_constants_has_api_key(): void {
        set_config('secretkey', '', 'tiny_cursive');
        $this->assertFalse(constants::has_api_key());

        set_config('secretkey', 'valid_secret_key_123', 'tiny_cursive');
        set_config('apiKey', 1, 'tiny_cursive');
        set_config('ApiSyncInterval', time() + 3600, 'tiny_cursive');
        $this->assertTrue(constants::has_api_key());
    }

    /**
     * Test helper::update_resource_id updates cursive files and comments.
     */
    public function test_helper_update_resource_id(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => 0,
            'courseid' => $course->id,
            'filename' => "{$user->id}_0_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => 0,
            'courseid' => $course->id,
            'usercomment' => 'draft comment',
            'timemodified' => time(),
        ]);

        $data = [
            'userid' => $user->id,
            'modulename' => 'assign',
            'courseid' => $course->id,
            'cmid' => (int) $assign->cmid,
            'resourceid' => 555,
        ];

        helper::update_resource_id($data);

        $file = $DB->get_record('tiny_cursive_files', ['id' => $fileid]);
        $this->assertEquals(555, $file->resourceid);
        $this->assertEquals("{$user->id}_555_{$assign->cmid}_attempt.json", $file->filename);

        $comment = $DB->get_record('tiny_cursive_comments', ['userid' => $user->id, 'cmid' => (int) $assign->cmid]);
        $this->assertEquals(555, $comment->resourceid);
    }
}
