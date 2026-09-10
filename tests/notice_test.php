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

use context_module;

/**
 * Tests for the transparency notice logic.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\notice
 */
final class notice_test extends \advanced_testcase {
    /**
     * Put $PAGE on a Cursive-enabled assignment submission page for the given course.
     *
     * @return \stdClass The course.
     */
    protected function setup_capture_page(): \stdClass {
        global $PAGE;

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $cm = get_coursemodule_from_instance('assign', $assign->id);

        set_config("cursive-{$course->id}", 1, 'tiny_cursive');

        $PAGE = new \moodle_page();
        $PAGE->set_context(context_module::instance($cm->id));
        $PAGE->set_course($course);
        $PAGE->set_cm($cm);
        $PAGE->set_pagetype('mod-assign-editsubmission');

        return $course;
    }

    /**
     * The wording is assembled from language strings and the privacy URL only.
     */
    public function test_get_text_and_hash(): void {
        $this->resetAfterTest();

        set_config('notice_privacyurl', '', 'tiny_cursive');
        $text = notice::get_text('en');
        $this->assertSame(2, substr_count($text, '<p>'));
        $this->assertStringContainsString('Cursive collects data about your writing style', $text);
        $this->assertStringContainsString('<strong>I consent</strong>', $text);
        $this->assertStringNotContainsString('<a ', $text);
        $this->assertSame(notice::hash($text), notice::get_current_hash('en'));
        $this->assertSame(64, strlen(notice::hash($text)));
        $this->assertSame($text, notice::get_text('en'), 'Rendering must be deterministic');

        set_config('notice_privacyurl', 'https://example.com/privacy', 'tiny_cursive');
        $withurl = notice::get_text('en');
        $this->assertSame(3, substr_count($withurl, '<p>'));
        $this->assertStringContainsString('href="https://example.com/privacy"', $withurl);
        $this->assertNotSame(notice::hash($text), notice::hash($withurl));
    }

    /**
     * The gate is only required for real users, on capture pages, with the setting on.
     */
    public function test_is_required_for_current_user(): void {
        global $USER;
        $this->resetAfterTest();

        $this->setup_capture_page();
        $user = $this->getDataGenerator()->create_user();

        // Setting off: never required.
        $this->setUser($user);
        $this->assertFalse(notice::is_required_for_current_user());
        $this->assertSame(notice::STATE_NOTREQUIRED, notice::get_user_state($user->id));

        set_config('notice_enabled', 1, 'tiny_cursive');

        // Not logged in and guest: never required.
        $this->setUser(0);
        $this->assertFalse(notice::is_required_for_current_user());
        $this->setGuestUser();
        $this->assertFalse(notice::is_required_for_current_user());

        // A real user who has not acknowledged.
        $this->setUser($user);
        $this->assertTrue(notice::is_required_for_current_user());
        $this->assertSame(notice::STATE_PENDING, notice::get_user_state($user->id));

        // Same user, a page without capture.
        global $PAGE;
        $PAGE->set_pagetype('course-view-topics');
        $this->assertFalse(notice::is_required_for_current_user());
        $PAGE->set_pagetype('mod-assign-editsubmission');

        // After acknowledging.
        notice::record_acknowledgement((int) $USER->id);
        $this->assertFalse(notice::is_required_for_current_user());
        $this->assertSame(notice::STATE_ACKNOWLEDGED, notice::get_user_state($user->id));
    }

    /**
     * An acknowledged user is resolved from the preference without touching the database.
     */
    public function test_has_acknowledged_uses_preference_cache(): void {
        global $DB, $USER;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        notice::record_acknowledgement((int) $USER->id);
        $this->assertSame(notice::VERSION, (int) get_user_preferences(notice::PREFERENCE));

        $reads = $DB->perf_get_reads();
        $this->assertTrue(notice::has_acknowledged((int) $USER->id));
        $this->assertSame($reads, $DB->perf_get_reads(), 'Preference hit must cost no queries');

        // A missing preference falls through to the table and is re-derived.
        unset_user_preference(notice::PREFERENCE);
        $this->assertTrue(notice::has_acknowledged((int) $USER->id));
        $this->assertSame(notice::VERSION, (int) get_user_preferences(notice::PREFERENCE));

        // Other users are resolved too.
        $other = $this->getDataGenerator()->create_user();
        $this->assertFalse(notice::has_acknowledged((int) $other->id));
    }

    /**
     * An acknowledgement at an older version does not satisfy the current one, and both rows survive.
     */
    public function test_version_bump_reprompts(): void {
        global $DB;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_cursive');
        $old = $generator->create_acknowledgement(['userid' => $user->id, 'noticeversion' => notice::VERSION - 1]);
        set_user_preference(notice::PREFERENCE, notice::VERSION - 1);

        $this->assertFalse(notice::has_acknowledged((int) $user->id));

        $new = notice::record_acknowledgement((int) $user->id);
        $this->assertNotSame($old->id, $new->id);
        $this->assertSame(2, $DB->count_records('tiny_cursive_notice', ['userid' => $user->id]));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice', ['id' => $old->id]));
        $this->assertTrue(notice::has_acknowledged((int) $user->id));
    }

    /**
     * Recording twice yields one row, one snapshot, and one event.
     */
    public function test_record_acknowledgement_is_idempotent(): void {
        global $DB;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $sink = $this->redirectEvents();
        $first = notice::record_acknowledgement((int) $user->id);
        $second = notice::record_acknowledgement((int) $user->id);
        $events = $sink->get_events();
        $sink->close();

        $this->assertSame((int) $first->id, (int) $second->id);
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice'));
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice_text'));
        $this->assertSame(notice::get_current_hash('en'), $first->noticetexthash);

        $this->assertCount(1, $events);
        $event = reset($events);
        $this->assertInstanceOf(event\notice_acknowledged::class, $event);
        $this->assertSame((int) $user->id, (int) $event->relateduserid);
        $this->assertSame((int) $first->id, (int) $event->objectid);
        $this->assertSame(notice::VERSION, $event->other['noticeversion']);
    }

    /**
     * A second user at the same wording reuses the snapshot; a changed wording creates a new one.
     */
    public function test_snapshot_written_once_per_wording(): void {
        global $DB;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $users = [$this->getDataGenerator()->create_user(), $this->getDataGenerator()->create_user()];

        notice::record_acknowledgement((int) $users[0]->id);
        notice::record_acknowledgement((int) $users[1]->id);
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice_text'));

        // A translation or URL change without a version bump: new snapshot, nobody re-prompted.
        set_config('notice_privacyurl', 'https://example.com/privacy', 'tiny_cursive');
        $this->assertTrue(notice::has_acknowledged((int) $users[0]->id));

        $third = $this->getDataGenerator()->create_user();
        notice::record_acknowledgement((int) $third->id);
        $this->assertSame(2, $DB->count_records('tiny_cursive_notice_text'));
    }

    /**
     * Nothing can be recorded while the gate is disabled.
     */
    public function test_record_acknowledgement_requires_setting(): void {
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\moodle_exception::class);
        notice::record_acknowledgement((int) $user->id);
    }
}
