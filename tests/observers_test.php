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
use tiny_cursive\observers;

/**
 * Unit tests for event observers in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \tiny_cursive\observers
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class observers_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test post_created observer reattributes temporary resourceid 0 records to the real post ID.
     */
    public function test_forum_post_created_observer(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        // Insert unassociated records with resourceid = 0.
        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $user->id,
            'cmid' => (int) $forum->cmid,
            'modulename' => 'forum',
            'resourceid' => 0,
            'courseid' => $course->id,
            'filename' => "{$user->id}_0_{$forum->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $user->id,
            'cmid' => (int) $forum->cmid,
            'modulename' => 'forum',
            'resourceid' => 0,
            'courseid' => $course->id,
            'usercomment' => 'draft comment',
            'timemodified' => time(),
        ]);

        // Create a forum discussion and post.
        $this->setUser($user);
        $record = new \stdClass();
        $record->course = $course->id;
        $record->forum = $forum->id;
        $record->userid = $user->id;
        $discussion = $this->getDataGenerator()->get_plugin_generator('mod_forum')->create_discussion($record);

        $postrecord = new \stdClass();
        $postrecord->discussion = $discussion->id;
        $postrecord->userid = $user->id;
        $post = $this->getDataGenerator()->get_plugin_generator('mod_forum')->create_post($postrecord);

        $event = \mod_forum\event\post_created::create([
            'objectid' => $post->id,
            'context' => context_module::instance((int) $forum->cmid),
            'courseid' => $course->id,
            'other' => [
                'discussionid' => $discussion->id,
                'forumid' => $forum->id,
                'forumtype' => 'general',
            ],
        ]);

        observers::observer_login($event);

        // Verify resourceid was updated.
        $updatedfile = $DB->get_record('tiny_cursive_files', ['id' => $fileid]);
        $this->assertEquals($post->id, $updatedfile->resourceid);

        $updatedcomment = $DB->get_record('tiny_cursive_comments', ['userid' => $user->id, 'cmid' => (int) $forum->cmid]);
        $this->assertEquals($post->id, $updatedcomment->resourceid);
    }

    /**
     * Test course_reset_ended purges all tracking records for the reset course.
     */
    public function test_course_reset_ended_purges_records(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => 'attempt.json',
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $user->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'usercomment' => 'comment text',
            'timemodified' => time(),
        ]);

        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $fileid,
            'total_time_seconds' => 120,
            'keys_per_minute' => 100,
            'score' => 90,
        ]);

        $event = \core\event\course_reset_ended::create([
            'objectid' => $course->id,
            'courseid' => $course->id,
            'context' => \context_course::instance((int) $course->id),
            'other' => ['reset_options' => []],
        ]);

        observers::reset_tracking_data($event);

        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['courseid' => $course->id]));
        $this->assertFalse($DB->record_exists('tiny_cursive_comments', ['courseid' => $course->id]));
        $this->assertFalse($DB->record_exists('tiny_cursive_user_writing', ['file_id' => $fileid]));
    }

    /**
     * Test discussion_created observer reattributes draft records to discussion first post.
     */
    public function test_discussion_created_observer(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');

        $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $user->id,
            'cmid' => (int) $forum->cmid,
            'modulename' => 'forum',
            'resourceid' => 0,
            'courseid' => $course->id,
            'usercomment' => 'initial discussion comment',
            'timemodified' => time(),
        ]);

        $this->setUser($user);
        $record = new \stdClass();
        $record->course = $course->id;
        $record->forum = $forum->id;
        $record->userid = $user->id;
        $discussion = $this->getDataGenerator()->get_plugin_generator('mod_forum')->create_discussion($record);

        $event = \mod_forum\event\discussion_created::create([
            'objectid' => $discussion->id,
            'context' => context_module::instance((int) $forum->cmid),
            'courseid' => $course->id,
            'other' => [
                'forumid' => $forum->id,
            ],
        ]);

        observers::discussion_created($event);

        $comment = $DB->get_record('tiny_cursive_comments', ['userid' => $user->id, 'cmid' => (int) $forum->cmid]);
        $this->assertEquals($discussion->firstpost, $comment->resourceid);
    }

    /**
     * Test course_restored observer copies course settings from original course.
     */
    public function test_course_restored_observer(): void {
        $oldcourse = $this->getDataGenerator()->create_course();
        $newcourse = $this->getDataGenerator()->create_course();

        // Set cursive config on old course.
        set_config("cursive-{$oldcourse->id}", '1', 'tiny_cursive');

        $event = \core\event\course_restored::create([
            'objectid' => $newcourse->id,
            'courseid' => $newcourse->id,
            'context' => \context_course::instance((int) $newcourse->id),
            'other' => [
                'originalcourseid' => $oldcourse->id,
                'type' => 'course',
                'target' => 0,
                'mode' => 0,
                'operation' => 'restore',
                'samesite' => true,
            ],
        ]);

        observers::course_restored($event);

        $newsetting = get_config('tiny_cursive', "cursive-{$newcourse->id}");
        $this->assertEquals('1', $newsetting);
    }
}
