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

namespace tiny_cursive\task;

use tiny_cursive\notice;

/**
 * Tests for the retention purge task.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\task\purge_old_records
 */
final class purge_old_records_test extends \advanced_testcase {
    /**
     * With no retention period nothing is ever deleted, however old.
     */
    public function test_noop_when_period_unset(): void {
        global $DB;
        $this->resetAfterTest();

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $generator->create_acknowledgement(['userid' => $user->id, 'timecreated' => 1]);

        set_config('notice_retentionperiod', 0, 'tiny_cursive');
        $this->expectOutputRegex('/kept indefinitely/');
        $task = new purge_old_records();
        $task->execute();

        $this->assertSame(1, $DB->count_records('tiny_cursive_notice'));
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice_text'));
    }

    /**
     * Only rows past the period go, along with snapshots nothing refers to any more.
     */
    public function test_purges_only_expired_rows_and_orphaned_snapshots(): void {
        global $DB;
        $this->resetAfterTest();

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_cursive');
        $old = $this->getDataGenerator()->create_user();
        $recent = $this->getDataGenerator()->create_user();
        $oldwording = $this->getDataGenerator()->create_user();

        $period = 30 * DAYSECS;
        set_config('notice_retentionperiod', $period, 'tiny_cursive');

        // Two users on the current wording, one expired and one not; a third on an old wording, expired.
        $generator->create_acknowledgement(['userid' => $old->id, 'timecreated' => time() - $period - DAYSECS]);
        $generator->create_acknowledgement(['userid' => $recent->id, 'timecreated' => time() - DAYSECS]);
        $generator->create_acknowledgement([
            'userid' => $oldwording->id,
            'timecreated' => time() - $period - DAYSECS,
            'noticetext' => '<p>An earlier wording.</p>',
        ]);
        $this->assertSame(3, $DB->count_records('tiny_cursive_notice'));
        $this->assertSame(2, $DB->count_records('tiny_cursive_notice_text'));

        $this->expectOutputRegex('/Deleted 2 notice acknowledgement record/');
        $task = new purge_old_records();
        $task->execute();

        $this->assertSame(1, $DB->count_records('tiny_cursive_notice'));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice', ['userid' => $recent->id]));

        // The current wording is still referenced; the earlier wording is not.
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice_text'));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => notice::get_current_hash('en')]));
    }

    /**
     * Large volumes are deleted in batches rather than one statement.
     */
    public function test_purges_in_batches(): void {
        global $DB;
        $this->resetAfterTest();

        $hash = notice::get_current_hash('en');
        $DB->insert_record('tiny_cursive_notice_text', (object) [
            'noticetexthash' => $hash,
            'noticetext' => notice::get_text('en'),
            'lang' => 'en',
            'noticeversion' => notice::VERSION,
            'timecreated' => 1,
        ]);

        $total = purge_old_records::BATCH_SIZE + 5;
        $rows = [];
        for ($i = 1; $i <= $total; $i++) {
            $rows[] = ['userid' => $i, 'noticeversion' => notice::VERSION, 'noticetexthash' => $hash, 'timecreated' => 1];
        }
        $DB->insert_records('tiny_cursive_notice', $rows);
        $this->assertSame($total, $DB->count_records('tiny_cursive_notice'));

        $writes = $DB->perf_get_writes();
        $deleted = purge_old_records::purge_before(2);
        fwrite(STDERR, "
");

        $this->assertSame($total, $deleted);
        $this->assertSame(0, $DB->count_records('tiny_cursive_notice'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_notice_text'));
        // Two batches of acknowledgements plus the snapshot clean-up.
        $this->assertGreaterThanOrEqual(3, $DB->perf_get_writes() - $writes);
    }
}
