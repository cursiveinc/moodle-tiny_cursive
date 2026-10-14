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

namespace tiny_cursive\local\table;

use tiny_cursive\notice;

/**
 * Tests for the report queries.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\local\table\notice_report_table
 */
final class notice_report_table_test extends \advanced_testcase {
    /**
     * Run a query built from table SQL parts.
     *
     * @param array $parts [fields, from, where, params]
     * @return array
     */
    protected function fetch(array $parts): array {
        global $DB;
        [$fields, $from, $where, $params] = $parts;
        return $DB->get_records_sql("SELECT {$fields} FROM {$from} WHERE {$where}", $params);
    }

    /**
     * The acknowledged view returns one row per acknowledgement, filtered, in a single query.
     */
    public function test_acknowledged_sql(): void {
        global $DB;
        $this->resetAfterTest();

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_cursive');
        $users = [];
        for ($i = 0; $i < 5; $i++) {
            $users[$i] = $this->getDataGenerator()->create_user();
            $generator->create_acknowledgement(['userid' => $users[$i]->id, 'timecreated' => 1000 + $i]);
        }

        $reads = $DB->perf_get_reads();
        $rows = $this->fetch(notice_report_table::get_acknowledged_sql(['mode' => notice_report_table::MODE_ACKNOWLEDGED]));
        $this->assertSame(1, $DB->perf_get_reads() - $reads, 'The report must be a single query regardless of user count');

        $this->assertCount(5, $rows);
        $row = reset($rows);
        $this->assertObjectHasProperty('firstname', $row);
        $this->assertObjectHasProperty('email', $row);
        $this->assertSame('en', $row->lang);

        $filtered = $this->fetch(notice_report_table::get_acknowledged_sql(['datefrom' => 1003]));
        $this->assertCount(2, $filtered);

        $filtered = $this->fetch(notice_report_table::get_acknowledged_sql(['dateto' => 1001, 'lang' => 'en']));
        $this->assertCount(2, $filtered);

        $filtered = $this->fetch(notice_report_table::get_acknowledged_sql(['noticeversion' => notice::VERSION + 1]));
        $this->assertCount(0, $filtered);
    }

    /**
     * The pending view lists enrolled (or cohort) users without a current acknowledgement, each once.
     */
    public function test_pending_sql(): void {
        global $DB;
        $this->resetAfterTest();

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_cursive');
        $course = $this->getDataGenerator()->create_course();
        $othercourse = $this->getDataGenerator()->create_course();

        $acknowledged = $this->getDataGenerator()->create_user();
        $pending = $this->getDataGenerator()->create_user();
        $oldversion = $this->getDataGenerator()->create_user();
        $unenrolled = $this->getDataGenerator()->create_user();

        foreach ([$acknowledged, $pending, $oldversion] as $user) {
            $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');
        }
        // Two enrolments in the same course must not produce two rows.
        $this->getDataGenerator()->enrol_user($pending->id, $course->id, 'student', 'self');
        $this->getDataGenerator()->enrol_user($unenrolled->id, $othercourse->id, 'student');

        $generator->create_acknowledgement(['userid' => $acknowledged->id]);
        $generator->create_acknowledgement(['userid' => $oldversion->id, 'noticeversion' => notice::VERSION - 1]);

        // No scope: nothing.
        $this->assertCount(0, $this->fetch(notice_report_table::get_pending_sql([])));

        $reads = $DB->perf_get_reads();
        $rows = $this->fetch(notice_report_table::get_pending_sql(['courseid' => $course->id]));
        $this->assertSame(1, $DB->perf_get_reads() - $reads);
        $this->assertEqualsCanonicalizing([$pending->id, $oldversion->id], array_keys($rows));

        // Cohort scope.
        $cohort = $this->getDataGenerator()->create_cohort();
        cohort_add_member($cohort->id, $unenrolled->id);
        cohort_add_member($cohort->id, $acknowledged->id);
        $rows = $this->fetch(notice_report_table::get_pending_sql(['cohortid' => $cohort->id]));
        $this->assertEquals([$unenrolled->id], array_keys($rows));
    }
}
