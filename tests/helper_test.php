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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/helper.php');

/**
 * Unit tests for the tiny_cursive helper class.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class helper_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_update_comment_and_cursive_files_update_resource_and_filename(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $comment = new \stdClass();
        $comment->userid = $user->id;
        $comment->cmid = $module->cmid;
        $comment->modulename = 'forum';
        $comment->resourceid = 0;
        $comment->courseid = $course->id;
        $comment->usercomment = 'initial comment';
        $comment->timemodified = time();
        $commentid = $DB->insert_record('tiny_cursive_comments', $comment);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 0;
        $file->courseid = $course->id;
        $file->filename = 'initial.json';
        $file->content = 'hello';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        helper::update_resource_id([
            'userid' => $user->id,
            'modulename' => 'forum',
            'courseid' => $course->id,
            'cmid' => $module->cmid,
            'resourceid' => 55,
        ]);

        $updatedcomment = $DB->get_record('tiny_cursive_comments', ['id' => $commentid]);
        $updatedfile = $DB->get_record('tiny_cursive_files', ['id' => $fileid]);

        $this->assertSame(55, $updatedcomment->resourceid);
        $this->assertSame(55, $updatedfile->resourceid);
        $this->assertStringContainsString('_55_'.$module->cmid.'_attempt.json', $updatedfile->filename);
    }

    public function test_get_curl_sets_headers_and_endpoint(): void {
        set_config('secret', 'supersecret', 'tiny_cursive');
        [$curl, $url, $options] = helper::get_curl('https://example.com/api');

        $this->assertInstanceOf(\curl::class, $curl);
        $this->assertSame('https://example.com/api', $url);
        $this->assertArrayHasKey('CURLOPT_RETURNTRANSFER', $options);
        $this->assertSame(true, $options['CURLOPT_RETURNTRANSFER']);
    }

    public function test_perform_data_sent_with_empty_payload_returns_without_error(): void {
        $this->expectNotToPerformAssertions();
        helper::perform_data_sent([]);
    }
}
