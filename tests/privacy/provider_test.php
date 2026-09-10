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

namespace tiny_cursive\privacy;

use context_system;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;
use core_privacy\tests\provider_testcase;
use tiny_cursive\notice;

/**
 * Privacy provider tests.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\privacy\provider
 */
final class provider_test extends provider_testcase {
    /**
     * Create a keystroke file record for a user, following the plugin's convention of storing a context id in cmid.
     *
     * @param int $userid
     * @param int $contextid
     * @return int The file record id.
     */
    protected function create_file_record(int $userid, int $contextid): int {
        global $DB;

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $userid,
            'cmid' => $contextid,
            'modulename' => 'assign',
            'resourceid' => 1,
            'courseid' => 1,
            'filename' => 'test.json',
            'content' => '{}',
            'original_content' => 'Some text',
            'timemodified' => time(),
            'uploaded' => 0,
        ]);
        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $fileid,
            'total_time_seconds' => 10,
            'key_count' => 5,
            'keys_per_minute' => 30,
        ]);
        $DB->insert_record('tiny_cursive_writing_diff', (object) [
            'file_id' => $fileid,
            'reconstructed_text' => 'Some text',
            'submitted_text' => 'Some text',
        ]);
        return $fileid;
    }

    /**
     * Every table and preference is declared.
     */
    public function test_get_metadata(): void {
        $collection = new collection('tiny_cursive');
        $collection = provider::get_metadata($collection);
        $items = $collection->get_collection();

        $tables = [];
        $preferences = [];
        foreach ($items as $item) {
            if ($item instanceof \core_privacy\local\metadata\types\database_table) {
                $tables[] = $item->get_name();
            } else if ($item instanceof \core_privacy\local\metadata\types\user_preference) {
                $preferences[] = $item->get_name();
            }
        }

        $expected = [
            'tiny_cursive_files',
            'tiny_cursive_comments',
            'tiny_cursive_user_writing',
            'tiny_cursive_writing_diff',
            'tiny_cursive_notice',
            'tiny_cursive_notice_text',
        ];
        foreach ($expected as $table) {
            $this->assertContains($table, $tables);
        }
        $this->assertContains(notice::PREFERENCE, $preferences);
        $this->assertContains('tiny_cursive_showguidance', $preferences);
    }

    /**
     * An acknowledgement places the user in the system context.
     */
    public function test_get_contexts_for_userid_and_users_in_context(): void {
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $systemcontext = context_system::instance();

        $this->assertEmpty(provider::get_contexts_for_userid($user->id)->get_contextids());

        $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        $this->assertContainsEquals($systemcontext->id, provider::get_contexts_for_userid($user->id)->get_contextids());
        $this->assertEmpty(provider::get_contexts_for_userid($other->id)->get_contextids());

        $userlist = new userlist($systemcontext, 'tiny_cursive');
        provider::get_users_in_context($userlist);
        $this->assertEquals([$user->id], $userlist->get_userids());
    }

    /**
     * The export contains the acknowledgement with a readable timestamp and the full wording.
     */
    public function test_export_user_data(): void {
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $systemcontext = context_system::instance();
        $ack = $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        $this->setUser($user);
        $contextlist = new approved_contextlist($user, 'tiny_cursive', [$systemcontext->id]);
        provider::export_user_data($contextlist);

        $writer = writer::with_context($systemcontext);
        $data = $writer->get_data([
            get_string('pluginname', 'tiny_cursive'),
            get_string('privacy:noticeacknowledgements', 'tiny_cursive'),
        ]);
        $this->assertNotEmpty($data);
        $this->assertCount(1, $data->acknowledgements);
        $exported = $data->acknowledgements[0];
        $this->assertSame(notice::VERSION, $exported->noticeversion);
        $this->assertSame('en', $exported->lang);
        $this->assertSame($ack->noticetexthash, $exported->noticetexthash);
        $this->assertStringContainsString('Cursive collects data about your writing style', $exported->noticetext);
        $this->assertSame(userdate($ack->timecreated), $exported->timecreated);
    }

    /**
     * Preferences are exported.
     */
    public function test_export_user_preferences(): void {
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        provider::export_user_preferences($user->id);
        $preferences = writer::with_context(context_system::instance())->get_user_preferences('tiny_cursive');
        $this->assertSame((string) notice::VERSION, (string) $preferences->{notice::PREFERENCE}->value);
    }

    /**
     * Erasure clears every other table but leaves the acknowledgement and its snapshot in place.
     */
    public function test_delete_data_for_user_retains_acknowledgement(): void {
        global $DB;
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $systemcontext = context_system::instance();
        $this->create_file_record($user->id, $systemcontext->id);
        $ack = $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        $contextlist = new approved_contextlist($user, 'tiny_cursive', [$systemcontext->id]);
        provider::delete_data_for_user($contextlist);

        $this->assertSame(0, $DB->count_records('tiny_cursive_files'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_user_writing'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_writing_diff'));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice', ['id' => $ack->id]));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $ack->noticetexthash]));
    }

    /**
     * Bulk deletion of users behaves the same way.
     */
    public function test_delete_data_for_users_retains_acknowledgement(): void {
        global $DB;
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $systemcontext = context_system::instance();
        $this->create_file_record($user->id, $systemcontext->id);
        $ack = $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        $userlist = new approved_userlist($systemcontext, 'tiny_cursive', [$user->id]);
        provider::delete_data_for_users($userlist);

        $this->assertSame(0, $DB->count_records('tiny_cursive_files'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_user_writing'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_writing_diff'));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice', ['id' => $ack->id]));
    }

    /**
     * Context-wide deletion behaves the same way.
     */
    public function test_delete_data_for_all_users_in_context_retains_acknowledgement(): void {
        global $DB;
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $cm = get_coursemodule_from_instance('assign', $assign->id);
        $this->create_file_record($user->id, $cm->id);
        $ack = $this->getDataGenerator()->get_plugin_generator('tiny_cursive')->create_acknowledgement(['userid' => $user->id]);

        provider::delete_data_for_all_users_in_context(\context_module::instance($cm->id));

        $this->assertSame(0, $DB->count_records('tiny_cursive_files'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_user_writing'));
        $this->assertSame(0, $DB->count_records('tiny_cursive_writing_diff'));
        $this->assertTrue($DB->record_exists('tiny_cursive_notice', ['id' => $ack->id]));
    }
}
