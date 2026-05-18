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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/observers.php');

/**
 * Unit tests for tiny_cursive observers.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class observers_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_get_modules_name_extracts_module(): void {
        $eventdata = ['component' => 'mod_forum'];
        $this->assertSame('forum', observers::get_modules_name($eventdata));
    }

    public function test_update_comment_updates_resourceid_and_autosave(): void {
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
        $comment->usercomment = 'pending';
        $comment->timemodified = time();
        $commentid = $DB->insert_record('tiny_cursive_comments', $comment);

        $autosave = new \stdClass();
        $autosave->userid = $user->id;
        $autosave->cmid = $module->cmid;
        $autosave->modulename = 'forum_autosave';
        $autosave->resourceid = 0;
        $autosave->courseid = $course->id;
        $autosave->usercomment = 'pending autosave';
        $autosave->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $autosave);

        $eventdata = [
            'userid' => $user->id,
            'courseid' => $course->id,
            'contextinstanceid' => $module->cmid,
            'objectid' => 42,
            'component' => 'mod_forum',
        ];
        $event = new class($eventdata) {
            private $data;
            public function __construct($data) {
                $this->data = $data;
            }
            public function get_data() {
                return $this->data;
            }
        };

        observers::update_comment($event);

        $updated = $DB->get_record('tiny_cursive_comments', ['id' => $commentid]);
        $this->assertSame(42, $updated->resourceid);

        $updatedautosave = $DB->get_record('tiny_cursive_comments', ['modulename' => 'forum_autosave']);
        $this->assertSame(42, $updatedautosave->resourceid);
    }

    public function test_update_cursive_files_updates_filename_and_resourceid(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $file = new \stdClass();
        $file->userid = $user->id;
        $file->cmid = $module->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 0;
        $file->courseid = $course->id;
        $file->filename = 'initial.json';
        $file->content = 'content';
        $file->timemodified = time();
        $file->uploaded = 0;
        $fileid = $DB->insert_record('tiny_cursive_files', $file);

        $eventdata = [
            'userid' => $user->id,
            'courseid' => $course->id,
            'contextinstanceid' => $module->cmid,
            'objectid' => 12,
            'component' => 'mod_forum',
            'target' => '',
        ];
        $event = new class($eventdata) {
            private $data;
            public function __construct($data) {
                $this->data = $data;
            }
            public function get_data() {
                return $this->data;
            }
        };

        observers::update_cursive_files($event);

        $updated = $DB->get_record('tiny_cursive_files', ['id' => $fileid]);
        $this->assertSame(12, $updated->resourceid);
        $this->assertStringContainsString('_12_'.$module->cmid.'_attempt.json', $updated->filename);
    }

    public function test_discussion_created_updates_comment_resourceid(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $discussion = new \stdClass();
        $discussion->course = $course->id;
        $discussion->forum = $module->instance;
        $discussion->firstpost = 111;
        $discussion->name = 'Discussion';
        $discussionid = $DB->insert_record('forum_discussions', $discussion);

        $post = new \stdClass();
        $post->discussion = $discussionid;
        $post->userid = $user->id;
        $post->created = time();
        $postid = $DB->insert_record('forum_posts', $post);

        $DB->set_field('forum_discussions', 'firstpost', $postid, ['id' => $discussionid]);

        $comment = new \stdClass();
        $comment->userid = $user->id;
        $comment->cmid = $module->cmid;
        $comment->modulename = 'forum';
        $comment->resourceid = 0;
        $comment->courseid = $course->id;
        $comment->usercomment = 'pending';
        $comment->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $comment);

        $eventdata = [
            'userid' => $user->id,
            'courseid' => $course->id,
            'contextinstanceid' => $module->cmid,
            'objectid' => $discussionid,
            'component' => 'mod_forum',
        ];
        $event = new class($eventdata) {
            private $data;
            public function __construct($data) {
                $this->data = $data;
            }
            public function get_data() {
                return $this->data;
            }
        };

        observers::discussion_created($event);

        $updated = $DB->get_record('tiny_cursive_comments', ['userid' => $user->id]);
        $this->assertSame($postid, $updated->resourceid);
    }

    public function test_reset_tracking_data_removes_all_related_records(): void {
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

        $writing = new \stdClass();
        $writing->file_id = $fileid;
        $writing->total_time_seconds = 10;
        $writing->key_count = 10;
        $writing->keys_per_minute = 0;
        $writing->character_count = 100;
        $writing->characters_per_minute = 0;
        $writing->word_count = 10;
        $writing->words_per_minute = 0;
        $writing->backspace_percent = 0;
        $writing->score = 0;
        $writing->copy_behavior = 0;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $diff = new \stdClass();
        $diff->file_id = $fileid;
        $diff->reconstructed_text = 'a';
        $diff->submitted_text = 'b';
        $DB->insert_record('tiny_cursive_writing_diff', $diff);

        $comment = new \stdClass();
        $comment->userid = $user->id;
        $comment->cmid = $module->cmid;
        $comment->modulename = 'forum';
        $comment->resourceid = 1;
        $comment->courseid = $course->id;
        $comment->usercomment = 'comment';
        $comment->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $comment);

        $eventdata = ['courseid' => $course->id];
        $event = new class($eventdata) {
            private $data;
            public function __construct($data) {
                $this->data = $data;
            }
            public function get_data() {
                return $this->data;
            }
        };

        observers::reset_tracking_data($event);

        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
        $this->assertFalse($DB->record_exists('tiny_cursive_comments', ['courseid' => $course->id]));
        $this->assertFalse($DB->record_exists('tiny_cursive_user_writing', ['file_id' => $fileid]));
        $this->assertFalse($DB->record_exists('tiny_cursive_writing_diff', ['file_id' => $fileid]));
    }
}
