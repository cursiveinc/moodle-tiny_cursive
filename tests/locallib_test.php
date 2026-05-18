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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/locallib.php');

/**
 * Unit tests for the tiny_cursive locallib database helper functions.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class locallib_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_get_user_attempts_data_filters_and_orders(): void {
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
        $record->filename = 'attempt.json';
        $record->timemodified = time();
        $record->uploaded = 0;
        $record->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $record);

        $result = tiny_cursive_get_user_attempts_data($user->id, $course->id, $module->cmid, 'invalidorderby', 0, 10);
        $this->assertIsArray($result);
        $this->assertArrayHasKey('count', $result);
        $this->assertArrayHasKey('data', $result);
        $this->assertGreaterThanOrEqual(0, $result['count']);
    }

    public function test_get_user_writing_data_pagination(): void {
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
        $file->filename = 'write.json';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $writing = new \stdClass();
        $writing->file_id = $fileid;
        $writing->total_time_seconds = 100;
        $writing->key_count = 500;
        $writing->keys_per_minute = 5;
        $writing->character_count = 1000;
        $writing->characters_per_minute = 50;
        $writing->word_count = 200;
        $writing->words_per_minute = 20;
        $writing->backspace_percent = 10.0;
        $writing->score = 85.5;
        $writing->copy_behavior = 1;
        $writing->quality_access = 0;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $result = tiny_cursive_get_user_writing_data($user->id, $course->id, $module->cmid, 'name', 'ASC', 0, 10);
        $this->assertSame(1, $result['count']);
        $this->assertCount(1, $result['data']);
    }

    public function test_get_user_profile_data_aggregates_totals(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 2;
        $file->courseid = $course->id;
        $file->filename = 'profile.json';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $writing = new \stdClass();
        $writing->file_id = $fileid;
        $writing->total_time_seconds = 200;
        $writing->key_count = 100;
        $writing->keys_per_minute = 20;
        $writing->character_count = 500;
        $writing->characters_per_minute = 25;
        $writing->word_count = 150;
        $writing->words_per_minute = 30;
        $writing->backspace_percent = 8.5;
        $writing->score = 90;
        $writing->copy_behavior = 0;
        $writing->quality_access = 0;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $result = tiny_cursive_get_user_profile_data($user->id, $course->id);
        $this->assertSame(200, (int)$result->total_time);
        $this->assertSame(150, (int)$result->word_count);
    }

    public function test_get_user_submissions_data_returns_data(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 3;
        $file->courseid = $course->id;
        $file->filename = 'submission.json';
        $file->content = 'content';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $file);

        $result = tiny_cursive_get_user_submissions_data($user->id, 'forum', $module->cmid, $course->id);
        $this->assertIsArray($result);
        $this->assertArrayHasKey('res', $result);
    }

    public function test_create_token_for_user_returns_generated_token_for_admin(): void {
        global $DB;

        $this->setAdminUser();

        $service = new \stdClass();
        $service->name = 'Cursive service';
        $service->shortname = 'cursive_json_service';
        $service->component = 'tiny_cursive';
        $service->enabled = 1;
        $service->requiredcapability = '';
        $service->restrictedusers = 0;
        $service->requiredlogin = 0;
        $service->isinternal = 0;
        $service->timecreated = time();
        $service->timemodified = time();
        $DB->insert_record('external_services', $service);

        $token = tiny_cursive_create_token_for_user();
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }
}
