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

use context_module;
use core_privacy\local\request\userlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\tests\provider_testcase;
use tiny_cursive\privacy\provider;

/**
 * Unit tests for Privacy API provider in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\privacy\provider
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class privacy_provider_test extends provider_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test get_users_in_context returns correct users based on cmid.
     */
    public function test_get_users_in_context(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $context = context_module::instance((int) $assign->cmid);
        $user1 = $this->getDataGenerator()->create_user();
        $user2 = $this->getDataGenerator()->create_user();

        // Insert records keyed by cmid.
        $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $user1->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => 'user1.json',
            'timemodified' => time(),
            'uploaded' => 1,
        ]);

        $userlist = new userlist($context, 'tiny_cursive');
        provider::get_users_in_context($userlist);

        $this->assertCount(1, $userlist);
        $this->assertEquals([$user1->id], $userlist->get_userids());
    }

    /**
     * Test delete_data_for_users removes records from cursive tables without crashing.
     */
    public function test_delete_data_for_users(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $context = context_module::instance((int) $assign->cmid);
        $user = $this->getDataGenerator()->create_user();

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => 'user.json',
            'timemodified' => time(),
            'uploaded' => 1,
        ]);

        $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'usercomment' => 'test comment',
            'timemodified' => time(),
        ]);

        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $fileid,
            'total_time_seconds' => 10,
            'keys_per_minute' => 60,
            'score' => 95.0,
        ]);

        $approveduserlist = new approved_userlist($context, 'tiny_cursive', [$user->id]);
        provider::delete_data_for_users($approveduserlist);

        // Verify records were deleted.
        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
        $this->assertFalse($DB->record_exists('tiny_cursive_comments', ['userid' => $user->id, 'cmid' => (int) $assign->cmid]));
        $this->assertFalse($DB->record_exists('tiny_cursive_user_writing', ['file_id' => $fileid]));
    }
}
