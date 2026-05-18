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

namespace tiny_cursive\privacy;

defined('MOODLE_INTERNAL') || die();

global $CFG;

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/privacy/provider.php');

use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\userlist;

/**
 * Privacy provider tests for tiny_cursive.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class provider_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_get_contexts_for_userid_returns_course_module_context(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $record = new \stdClass();
        $record->userid = $user->id;
        $record->cmid = $module->cmid;
        $record->modulename = 'forum';
        $record->resourceid = 1;
        $record->courseid = $course->id;
        $record->filename = 'test.json';
        $record->content = 'content';
        $record->timemodified = time();
        $record->uploaded = 0;
        $record->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $record);

        $contextlist = provider::get_contexts_for_userid($user->id);
        $this->assertNotEmpty($contextlist->get_contextids());
        $this->assertContains($module->cmid, $contextlist->get_contextids());
    }

    public function test_get_users_in_context_returns_user_from_file_record(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $record = new \stdClass();
        $record->userid = $user->id;
        $record->cmid = $module->cmid;
        $record->modulename = 'forum';
        $record->resourceid = 1;
        $record->courseid = $course->id;
        $record->filename = 'test.json';
        $record->content = 'content';
        $record->timemodified = time();
        $record->uploaded = 0;
        $record->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $record);

        $context = \context_module::instance($module->cmid);
        $userlist = new userlist($context);
        provider::get_users_in_context($userlist);
        $this->assertContains($user->id, $userlist->get_userids());
    }

    public function test_delete_data_for_all_users_in_context_removes_file_and_comment_records(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 1;
        $file->courseid = $course->id;
        $file->filename = 'test.json';
        $file->content = 'content';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $comment = new \stdClass();
        $comment->userid = $user->id;
        $comment->cmid = $module->cmid;
        $comment->modulename = 'forum';
        $comment->resourceid = 1;
        $comment->courseid = $course->id;
        $comment->usercomment = 'comment';
        $comment->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $comment);

        $context = \context_module::instance($module->cmid);
        provider::delete_data_for_all_users_in_context($context);

        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
        $this->assertFalse($DB->record_exists('tiny_cursive_comments', ['cmid' => $module->cmid]));
    }

    public function test_delete_data_for_user_removes_user_records_in_context(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 1;
        $file->courseid = $course->id;
        $file->filename = 'delete.json';
        $file->content = 'content';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $context = \context_module::instance($module->cmid);
        $contextlist = new approved_contextlist(new contextlist(), $user);
        $contextlist->add_context($context);

        provider::delete_data_for_user($contextlist);

        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
    }
}
