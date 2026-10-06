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

use xmldb_table;

/**
 * Tests for re-linking pending PDF Annotator captures.
 *
 * mod_pdfannotator is a third-party plugin, so the tests create a minimal copy of its
 * comments table and a course module row pointing at it.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\helper::relink_pending_pdfannotator_captures
 */
final class pdfannotator_relink_test extends \advanced_testcase {
    /** @var bool Whether this test created the comments table and has to drop it again. */
    private bool $createdtable = false;

    /** @var int PDF Annotator instance id used by the fake course module. */
    private const INSTANCE = 25;

    /**
     * Drops the fake comments table.
     */
    protected function tearDown(): void {
        global $DB;

        if ($this->createdtable) {
            $DB->get_manager()->drop_table(new xmldb_table('pdfannotator_comments'));
            $this->createdtable = false;
        }
        parent::tearDown();
    }

    /**
     * Creates the fake comments table and a PDF Annotator course module.
     *
     * @return array The course id and the course module id
     */
    private function create_pdfannotator(): array {
        global $DB;

        // Creating a table commits implicitly on some databases, so reset by truncation.
        $this->preventResetByRollback();
        $this->resetAfterTest();

        $dbman = $DB->get_manager();
        $table = new xmldb_table('pdfannotator_comments');
        if (!$dbman->table_exists($table)) {
            $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE, null);
            $table->add_field('pdfannotatorid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '-1');
            $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, null);
            $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '11', null, XMLDB_NOTNULL, null, null);
            $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
            $dbman->create_table($table);
            $this->createdtable = true;
        }

        $course = $this->getDataGenerator()->create_course();
        $moduleid = $DB->get_field('modules', 'id', ['name' => 'pdfannotator']);
        if (!$moduleid) {
            $moduleid = $DB->insert_record('modules', (object) ['name' => 'pdfannotator']);
        }
        $cmid = $DB->insert_record('course_modules', (object) [
            'course' => $course->id,
            'module' => $moduleid,
            'instance' => self::INSTANCE,
            'section' => 0,
            'added' => time(),
        ]);

        return [(int) $course->id, (int) $cmid];
    }

    /**
     * Inserts a pending capture whose keystrokes span the given number of seconds.
     *
     * @param int $userid Owner of the capture
     * @param int $courseid Course id
     * @param int $cmid Course module id
     * @param int $created Server time the capture was created
     * @param int $typingseconds Seconds between the first and last keystroke
     * @return int The tiny_cursive_files id
     */
    private function create_pending_capture(int $userid, int $courseid, int $cmid, int $created, int $typingseconds): int {
        global $DB;

        // The browser clock is deliberately a day off: only the span between events is used.
        $browserstart = ($created + DAYSECS) * 1000;
        return (int) $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $userid,
            'cmid' => $cmid,
            'modulename' => 'pdfannotator',
            'resourceid' => 0,
            'courseid' => $courseid,
            'filename' => "{$userid}_0_{$cmid}_attempt.json",
            'content' => json_encode([
                ['key' => 'a', 'unixTimestamp' => $browserstart],
                ['key' => 'b', 'unixTimestamp' => $browserstart + $typingseconds * 1000],
            ]),
            'timemodified' => $created,
            'uploaded' => 0,
        ]);
    }

    /**
     * Inserts a PDF Annotator comment.
     *
     * @param int $userid Author
     * @param int $timecreated Creation time
     * @param int $instance PDF Annotator instance id
     * @return int The comment id
     */
    private function create_comment(int $userid, int $timecreated, int $instance = self::INSTANCE): int {
        global $DB;

        return (int) $DB->insert_record('pdfannotator_comments', (object) [
            'pdfannotatorid' => $instance,
            'userid' => $userid,
            'timecreated' => $timecreated,
        ]);
    }

    /**
     * Nothing happens on a site without PDF Annotator.
     */
    public function test_no_pdfannotator_installed(): void {
        global $DB;

        if ($DB->get_manager()->table_exists('pdfannotator_comments')) {
            $this->markTestSkipped('mod_pdfannotator is installed.');
        }
        $this->resetAfterTest();

        $this->assertSame(
            ['linked' => 0, 'parked' => 0],
            helper::relink_pending_pdfannotator_captures(null, null, true),
        );
    }

    /**
     * A pending capture is linked to the user's unlinked comment nearest to its last keystroke.
     */
    public function test_links_to_nearest_unlinked_comment(): void {
        global $DB;

        [$courseid, $cmid] = $this->create_pdfannotator();
        $student = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $created = time() - WEEKSECS;

        $fileid = $this->create_pending_capture($student->id, $courseid, $cmid, $created, 60);
        foreach (['pdfannotator', 'pdfannotator_autosave'] as $modulename) {
            $DB->insert_record('tiny_cursive_comments', (object) [
                'userid' => $student->id,
                'cmid' => $cmid,
                'modulename' => $modulename,
                'resourceid' => 0,
                'courseid' => $courseid,
                'usercomment' => 'pending',
                'questionid' => 0,
                'timemodified' => $created,
            ]);
        }

        // Too early, someone else's, in another activity, already linked, and the real one.
        $this->create_comment($student->id, $created - DAYSECS);
        $this->create_comment($other->id, $created + 65);
        $this->create_comment($student->id, $created + 65, self::INSTANCE + 1);
        $linked = $this->create_comment($student->id, $created + 62);
        $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => $cmid,
            'modulename' => 'pdfannotator',
            'resourceid' => $linked,
            'courseid' => $courseid,
            'filename' => "{$student->id}_{$linked}_{$cmid}_attempt.json",
            'timemodified' => $created,
            'uploaded' => 0,
        ]);
        $later = $this->create_comment($student->id, $created + 900);
        $expected = $this->create_comment($student->id, $created + 70);

        $this->assertSame(
            ['linked' => 1, 'parked' => 0],
            helper::relink_pending_pdfannotator_captures(),
        );

        $file = $DB->get_record('tiny_cursive_files', ['id' => $fileid]);
        $this->assertEquals($expected, $file->resourceid);
        $this->assertNotEquals($later, $file->resourceid);
        $this->assertSame("{$student->id}_{$expected}_{$cmid}_attempt.json", $file->filename);
        $this->assertEquals(2, $DB->count_records('tiny_cursive_comments', [
            'userid' => $student->id,
            'cmid' => $cmid,
            'resourceid' => $expected,
        ]));
    }

    /**
     * A capture with no matching comment is left alone unless parking is requested.
     */
    public function test_unmatched_capture_is_parked_only_on_request(): void {
        global $DB;

        [$courseid, $cmid] = $this->create_pdfannotator();
        $student = $this->getDataGenerator()->create_user();
        $created = time() - WEEKSECS;

        $fileid = $this->create_pending_capture($student->id, $courseid, $cmid, $created, 30);
        // Saved long after the last keystroke: not this capture's comment.
        $this->create_comment($student->id, $created + 30 + constants::PDF_RELINK_AFTER + 1);

        $this->assertSame(
            ['linked' => 0, 'parked' => 0],
            helper::relink_pending_pdfannotator_captures(),
        );
        $this->assertEquals(0, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $fileid]));

        $this->assertSame(
            ['linked' => 0, 'parked' => 1],
            helper::relink_pending_pdfannotator_captures(null, null, true),
        );
        $this->assertEquals(-$fileid, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $fileid]));
        // The next annotation no longer finds a pending capture to append to.
        $this->assertFalse($DB->record_exists('tiny_cursive_files', [
            'userid' => $student->id,
            'cmid' => $cmid,
            'modulename' => 'pdfannotator',
            'resourceid' => 0,
        ]));
    }

    /**
     * The user and course module filters limit which captures are touched.
     */
    public function test_filters_by_user_and_module(): void {
        global $DB;

        [$courseid, $cmid] = $this->create_pdfannotator();
        $student = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $created = time() - WEEKSECS;

        $fileid = $this->create_pending_capture($student->id, $courseid, $cmid, $created, 10);
        $otherfileid = $this->create_pending_capture($other->id, $courseid, $cmid, $created, 10);
        $comment = $this->create_comment($student->id, $created + 12);
        $this->create_comment($other->id, $created + 12);

        $this->assertSame(
            ['linked' => 0, 'parked' => 0],
            helper::relink_pending_pdfannotator_captures((int) $student->id, $cmid + 1),
        );
        $this->assertSame(
            ['linked' => 1, 'parked' => 0],
            helper::relink_pending_pdfannotator_captures((int) $student->id, $cmid),
        );
        $this->assertEquals($comment, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $fileid]));
        $this->assertEquals(0, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $otherfileid]));
    }
}
