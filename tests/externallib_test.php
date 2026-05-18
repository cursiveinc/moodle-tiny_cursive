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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

/**
 * Unit tests for tiny_cursive external API methods.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class externallib_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->setAdminUser();
    }

    public function test_cursive_user_comments_func_inserts_comment(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $result = \cursive_json_func_data::cursive_user_comments_func(
            'forum',
            $module->cmid,
            1,
            $course->id,
            'Test comment',
            time(),
            ''
        );

        $this->assertTrue($result);
        $this->assertTrue($DB->record_exists('tiny_cursive_comments', [
            'userid' => $user->id,
            'cmid' => $module->cmid,
            'resourceid' => 1,
        ]));
    }

    public function test_cursive_approve_token_func_returns_empty_for_missing_secret(): void {
        set_config('secretkey', '', 'tiny_cursive');
        set_config('python_server', 'https://example.com', 'tiny_cursive');
        $result = \cursive_json_func_data::cursive_approve_token_func('sometoken');
        $this->assertSame('', $result);
    }

    public function test_get_module_list_returns_json(): void {
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $json = \cursive_json_func_data::get_module_list(0, $course->id);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('userlist', $data);
        $this->assertNotEmpty($data['userlist']);
    }

    public function test_get_comment_link_returns_json_for_forum(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
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

        $writing = new \stdClass();
        $writing->file_id = $fileid;
        $writing->total_time_seconds = 10;
        $writing->key_count = 50;
        $writing->keys_per_minute = 5;
        $writing->character_count = 100;
        $writing->characters_per_minute = 10;
        $writing->word_count = 20;
        $writing->words_per_minute = 4;
        $writing->backspace_percent = 0;
        $writing->score = 80;
        $writing->copy_behavior = 0;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $json = \cursive_json_func_data::get_comment_link(1, 'forum', $module->cmid, 0, $user->id);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('usercomment', $data);
        $this->assertArrayHasKey('data', $data);
        $this->assertSame('test.json', $data['data']['filename']);
    }

    public function test_get_forum_comment_link_returns_json(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 1;
        $file->courseid = $course->id;
        $file->filename = 'forum.json';
        $file->content = 'content';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $writing = new \stdClass();
        $writing->file_id = $fileid;
        $writing->total_time_seconds = 10;
        $writing->key_count = 50;
        $writing->keys_per_minute = 5;
        $writing->character_count = 100;
        $writing->characters_per_minute = 10;
        $writing->word_count = 20;
        $writing->words_per_minute = 4;
        $writing->backspace_percent = 0;
        $writing->score = 80;
        $writing->copy_behavior = 0;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $json = \cursive_json_func_data::get_forum_comment_link(1, 'forum', $module->cmid);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('usercomment', $data);
        $this->assertArrayHasKey('data', $data);
    }

    public function test_get_assign_comment_link_returns_default_message(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $assignmodule = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();

        $assignsubmission = new \stdClass();
        $assignsubmission->userid = $user->id;
        $assignsubmission->assignment = $assignmodule->instance;
        $assignsubmission->timecreated = time();
        $assignsubmission->timemodified = time();
        $assignsubmission->status = 'submitted';
        $submissionid = $DB->insert_record('assign_submission', $assignsubmission);

        $json = \cursive_json_func_data::get_assign_comment_link($submissionid, 'assign', $assignmodule->cmid);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertSame([['usercomment' => 'comments']], $data);
    }

    public function test_disable_cursive_sets_config(): void {
        $result = \cursive_json_func_data::disable_cursive(1);
        $this->assertSame('true', $result);
        $this->assertSame(1, get_config('tiny_cursive', 'disabled'));
    }

    public function test_get_user_list_submission_stats_returns_json(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 1;
        $file->courseid = $course->id;
        $file->filename = 'submission.json';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $file);

        $json = \cursive_json_func_data::get_user_list_submission_stats($user->id, 'forum', $module->cmid);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('res', $data);
    }

    public function test_cursive_filtered_writing_func_returns_filtered_data_string(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 1;
        $file->courseid = $course->id;
        $file->filename = 'filtered.json';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $file);

        $json = \cursive_json_func_data::cursive_filtered_writing_func($course->id);
        $data = json_decode($json, true);

        $this->assertIsArray($data);
        $this->assertArrayHasKey('count', $data);
        $this->assertArrayHasKey('data', $data);
    }
}
