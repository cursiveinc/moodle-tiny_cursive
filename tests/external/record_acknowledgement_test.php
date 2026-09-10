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

namespace tiny_cursive\external;

use core_external\external_api;
use tiny_cursive\notice;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/webservice/tests/helpers.php');

/**
 * Tests for the record_acknowledgement external function.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\external\record_acknowledgement
 */
final class record_acknowledgement_test extends \externallib_advanced_testcase {
    /**
     * Call the external function the way core/ajax would.
     *
     * @param int $version
     * @return array
     */
    protected function call(int $version = notice::VERSION): array {
        $result = record_acknowledgement::execute($version);
        return external_api::clean_returnvalue(record_acknowledgement::execute_returns(), $result);
    }

    /**
     * A real user's acknowledgement is written once, hashed server-side, and logged.
     */
    public function test_execute_writes_once(): void {
        global $DB;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $sink = $this->redirectEvents();
        $result = $this->call();
        $this->assertTrue($result['acknowledged']);
        $this->assertSame(notice::VERSION, $result['noticeversion']);

        $record = $DB->get_record('tiny_cursive_notice', ['userid' => $user->id], '*', MUST_EXIST);
        $this->assertSame(notice::get_current_hash('en'), $record->noticetexthash);
        $this->assertSame($result['timecreated'], (int) $record->timecreated);
        $this->assertTrue($DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $record->noticetexthash]));
        $this->assertSame(notice::VERSION, (int) get_user_preferences(notice::PREFERENCE));

        // Double submit (two tabs): still one row, no error.
        $again = $this->call();
        $this->assertSame($result['timecreated'], $again['timecreated']);
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice'));
        $this->assertSame(1, $DB->count_records('tiny_cursive_notice_text'));

        $events = array_filter($sink->get_events(), fn($e) => $e instanceof \tiny_cursive\event\notice_acknowledged);
        $sink->close();
        $this->assertCount(1, $events);
    }

    /**
     * With the setting off a stale tab cannot write a row.
     */
    public function test_execute_rejects_when_disabled(): void {
        global $DB;
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        try {
            $this->call();
            $this->fail('Expected a moodle_exception');
        } catch (\moodle_exception $e) {
            $this->assertSame('notice_disabled', $e->errorcode);
        }
        $this->assertSame(0, $DB->count_records('tiny_cursive_notice'));
    }

    /**
     * Guests are never gated and may not acknowledge.
     */
    public function test_execute_rejects_guest(): void {
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $this->setGuestUser();

        $this->expectException(\require_login_exception::class);
        $this->call();
    }

    /**
     * Anonymous requests are refused.
     */
    public function test_execute_rejects_not_logged_in(): void {
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $this->setUser(0);

        $this->expectException(\require_login_exception::class);
        $this->call();
    }

    /**
     * The displayed version must be the one currently in force.
     */
    public function test_execute_rejects_version_mismatch(): void {
        global $DB;
        $this->resetAfterTest();

        set_config('notice_enabled', 1, 'tiny_cursive');
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        try {
            $this->call(notice::VERSION + 1);
            $this->fail('Expected a moodle_exception');
        } catch (\moodle_exception $e) {
            $this->assertSame('notice_versionmismatch', $e->errorcode);
        }
        $this->assertSame(0, $DB->count_records('tiny_cursive_notice'));
    }
}
