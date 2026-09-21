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

use advanced_testcase;
use cursive_json_func_data;
use invalid_parameter_exception;
use required_capability_exception;

/**
 * QA verification of the MOO-31 audit findings (MOO-32 to MOO-40) against their acceptance criteria.
 *
 * Supplements externallib_test.php, which covers one negative case per finding.
 *
 * @package     tiny_cursive
 * @category    test
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers      \cursive_json_func_data
 */
final class qa_moo31_verification_test extends advanced_testcase {
    /** @var \stdClass course */
    private $course;
    /** @var \stdClass assign module (cmid A) */
    private $assign;
    /** @var \stdClass forum module (cmid B) */
    private $forum;
    /** @var \stdClass attacker student */
    private $attacker;
    /** @var \stdClass victim student */
    private $victim;
    /** @var \stdClass editing teacher */
    private $teacher;

    protected function setUp(): void {
        global $CFG;
        parent::setUp();
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');
        $this->resetAfterTest();

        $gen = $this->getDataGenerator();
        $this->course = $gen->create_course();
        $this->assign = $gen->create_module('assign', ['course' => $this->course->id]);
        $this->forum = $gen->create_module('forum', ['course' => $this->course->id]);
        $this->attacker = $gen->create_user();
        $this->victim = $gen->create_user();
        $this->teacher = $gen->create_user();
        $gen->enrol_user($this->attacker->id, $this->course->id, 'student');
        $gen->enrol_user($this->victim->id, $this->course->id, 'student');
        $gen->enrol_user($this->teacher->id, $this->course->id, 'editingteacher');
    }

    /**
     * Insert a tiny_cursive_files row.
     *
     * @param int $userid owner
     * @param int $cmid course module id
     * @param string $modulename module name
     * @param int $resourceid resource id
     * @param int $uploaded uploaded flag
     * @return int file id
     */
    private function make_file(int $userid, int $cmid, string $modulename, int $resourceid, int $uploaded = 1): int {
        global $DB;
        return $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $userid,
            'cmid' => $cmid,
            'modulename' => $modulename,
            'resourceid' => $resourceid,
            'courseid' => $this->course->id,
            'filename' => "{$userid}_{$resourceid}_{$cmid}_attempt.json",
            'content' => 'e30=',
            'timemodified' => time(),
            'uploaded' => $uploaded,
        ]);
    }

    /**
     * Insert a tiny_cursive_comments row.
     *
     * @param int $userid owner
     * @param int $cmid course module id
     * @param string $modulename module name
     * @param int $resourceid resource id
     * @param string $text comment text
     * @return int comment id
     */
    private function make_comment(int $userid, int $cmid, string $modulename, int $resourceid, string $text): int {
        global $DB;
        return $DB->insert_record('tiny_cursive_comments', (object) [
            'userid' => $userid,
            'cmid' => $cmid,
            'modulename' => $modulename,
            'resourceid' => $resourceid,
            'courseid' => $this->course->id,
            'usercomment' => $text,
            'questionid' => 0,
            'timemodified' => time(),
        ]);
    }

    /**
     * Insert analytics for a file.
     *
     * @param int $fileid file id
     */
    private function make_analytics(int $fileid): void {
        global $DB;
        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $fileid, 'total_time_seconds' => 60, 'key_count' => 100, 'keys_per_minute' => 100,
            'character_count' => 90, 'characters_per_minute' => 90, 'word_count' => 20, 'words_per_minute' => 20,
            'backspace_percent' => 0.1, 'score' => 0.9, 'copy_behavior' => 0, 'user_agent' => 'phpunit',
        ]);
    }

    /**
     * MOO-32: an editing teacher (no system-level editsettings) is rejected and config is untouched.
     */
    public function test_moo32_teacher_cannot_disable_all_courses(): void {
        set_config("cursive-{$this->course->id}", 1, 'tiny_cursive');
        $this->setUser($this->teacher);
        try {
            cursive_json_func_data::disable_cursive(true);
            $this->fail('Teacher was able to call disable_cursive');
        } catch (required_capability_exception $e) {
            $this->assertEquals(1, get_config('tiny_cursive', "cursive-{$this->course->id}"));
        }
    }

    /**
     * MOO-32: the service definition is a write service gated on editsettings.
     */
    public function test_moo32_service_definition(): void {
        global $CFG;
        $functions = [];
        include($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/db/services.php');
        $def = $functions['tiny_cursive_disable_all_course'];
        $this->assertSame('write', $def['type']);
        $this->assertSame('tiny/cursive:editsettings', $def['capabilities']);
    }

    /**
     * MOO-33: a student's cross-user delete leaves every row in place.
     */
    public function test_moo33_cross_user_delete_leaves_rows(): void {
        global $DB;
        $cmid = (int) $this->assign->cmid;
        $fileid = $this->make_file($this->victim->id, $cmid, 'assign', $cmid);
        $this->make_analytics($fileid);

        $this->setUser($this->attacker);
        try {
            cursive_json_func_data::remove_student_submission($this->course->id, $this->victim->id, $cmid);
            $this->fail('Student deleted another user\'s submission');
        } catch (required_capability_exception $e) {
            $this->assertTrue($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
            $this->assertTrue($DB->record_exists('tiny_cursive_user_writing', ['file_id' => $fileid]));
        }
    }

    /**
     * MOO-33: self-deletion and teacher deletion still work.
     */
    public function test_moo33_own_and_teacher_delete_work(): void {
        global $DB;
        $cmid = (int) $this->assign->cmid;
        $own = $this->make_file($this->attacker->id, $cmid, 'assign', $cmid);
        $other = $this->make_file($this->victim->id, $cmid, 'assign', $cmid);

        $this->setUser($this->attacker);
        cursive_json_func_data::remove_student_submission($this->course->id, $this->attacker->id, $cmid);
        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $own]));

        $this->setUser($this->teacher);
        cursive_json_func_data::remove_student_submission($this->course->id, $this->victim->id, $cmid);
        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $other]));
    }

    /**
     * MOO-33: the capability guarding deletion should carry RISK_DATALOSS (acceptance criterion).
     */
    public function test_moo33_capability_carries_dataloss_risk(): void {
        global $CFG;
        $capabilities = [];
        include($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/db/access.php');
        $risk = ($capabilities['tiny/cursive:write']['riskbitmask'] ?? 0) | ($capabilities['tiny/cursive:view']['riskbitmask'] ?? 0);
        $this->assertNotEquals(0, $risk & RISK_DATALOSS, 'Neither tiny/cursive:write nor :view declares RISK_DATALOSS');
    }

    /**
     * MOO-35: a student only gets their own comments and metrics; a teacher gets everyone's.
     */
    public function test_moo35_forum_comment_link_scoping(): void {
        $cmid = (int) $this->forum->cmid;
        $postid = 22;
        $this->make_comment($this->victim->id, $cmid, 'forum', $postid, 'VICTIM-SECRET');
        $fileid = $this->make_file($this->victim->id, $cmid, 'forum', $postid);
        $this->make_analytics($fileid);

        $this->setUser($this->attacker);
        $json = cursive_json_func_data::get_forum_comment_link($postid, 'forum', $cmid);
        $this->assertStringNotContainsString('VICTIM-SECRET', $json);
        $this->assertStringNotContainsString("{$this->victim->id}_{$postid}_{$cmid}_attempt.json", $json);
        $decoded = json_decode($json, true);
        $this->assertArrayNotHasKey('score', $decoded['data']);

        $this->setUser($this->teacher);
        $json = cursive_json_func_data::get_forum_comment_link($postid, 'forum', $cmid);
        $this->assertStringContainsString('VICTIM-SECRET', $json);
    }

    /**
     * MOO-36: a fileid from a different cmid is rejected.
     */
    public function test_moo36_analytics_cross_cmid_rejected(): void {
        $fileid = $this->make_file($this->victim->id, (int) $this->assign->cmid, 'assign', (int) $this->assign->cmid);
        $this->make_analytics($fileid);

        $this->setUser($this->attacker);
        $this->expectException(invalid_parameter_exception::class);
        cursive_json_func_data::cursive_get_analytics((int) $this->forum->cmid, $fileid);
    }

    /**
     * MOO-36: owner and teacher can still read seeded analytics, including when the owner has several files.
     */
    public function test_moo36_analytics_owner_and_teacher_allowed(): void {
        $cmid = (int) $this->assign->cmid;
        $this->make_file($this->victim->id, (int) $this->forum->cmid, 'forum', 5);
        $fileid = $this->make_file($this->victim->id, $cmid, 'assign', $cmid);
        $this->make_analytics($fileid);

        $this->setUser($this->victim);
        $result = cursive_json_func_data::cursive_get_analytics($cmid, $fileid);
        $this->assertNotEmpty($result);

        $this->setUser($this->teacher);
        $result = cursive_json_func_data::cursive_get_analytics($cmid, $fileid);
        $this->assertNotEmpty($result);
    }

    /**
     * MOO-37: cross-cmid and cross-user resubmits leave the uploaded flag alone; own resubmit works.
     */
    public function test_moo37_resubmit_scoping(): void {
        global $DB;
        $cmid = (int) $this->assign->cmid;
        $victimfile = $this->make_file($this->victim->id, $cmid, 'assign', $cmid, 1);
        $ownfile = $this->make_file($this->attacker->id, $cmid, 'assign', $cmid, 1);

        $this->setUser($this->attacker);
        try {
            cursive_json_func_data::resubmit_payload_data($victimfile, (int) $this->forum->cmid);
            $this->fail('Cross-cmid resubmit was accepted');
        } catch (invalid_parameter_exception $e) {
            $this->assertEquals(1, $DB->get_field('tiny_cursive_files', 'uploaded', ['id' => $victimfile]));
        }
        try {
            cursive_json_func_data::resubmit_payload_data($victimfile, $cmid);
            $this->fail('Cross-user resubmit was accepted');
        } catch (required_capability_exception $e) {
            $this->assertEquals(1, $DB->get_field('tiny_cursive_files', 'uploaded', ['id' => $victimfile]));
        }

        $this->assertTrue((bool) cursive_json_func_data::resubmit_payload_data($ownfile, $cmid));
        $this->assertEquals(0, $DB->get_field('tiny_cursive_files', 'uploaded', ['id' => $ownfile]));
    }

    /**
     * MOO-38: a student passing another userid gets their own autosave; a teacher gets the student's.
     */
    public function test_moo38_autosave_scoping(): void {
        $cmid = (int) $this->forum->cmid;
        $this->make_comment($this->victim->id, $cmid, 'forum_autosave', 22, 'VICTIM-DRAFT');
        $this->make_comment($this->attacker->id, $cmid, 'forum_autosave', 22, 'ATTACKER-DRAFT');

        $this->setUser($this->attacker);
        $json = cursive_json_func_data::get_autosave_content(22, 'forum_autosave', $cmid, '', $this->victim->id, $this->course->id);
        $this->assertStringNotContainsString('VICTIM-DRAFT', $json);
        $this->assertStringContainsString('ATTACKER-DRAFT', $json);

        $this->setUser($this->teacher);
        $json = cursive_json_func_data::get_autosave_content(22, 'forum_autosave', $cmid, '', $this->victim->id, $this->course->id);
        $this->assertStringContainsString('VICTIM-DRAFT', $json);
    }

    /**
     * MOO-39: a student cannot remap another user's pending rows; their own pending rows still link.
     */
    public function test_moo39_pending_remap_scoping(): void {
        global $DB;
        $cmid = (int) $this->forum->cmid;
        $victimfile = $this->make_file($this->victim->id, $cmid, 'forum', 0);
        $victimcomment = $this->make_comment($this->victim->id, $cmid, 'forum', 0, 'pending');
        $ownfile = $this->make_file($this->attacker->id, $cmid, 'forum', 0);

        $this->setUser($this->attacker);
        try {
            cursive_json_func_data::update_pdf_annote_id($cmid, $this->victim->id, $this->course->id, 'forum', 999);
            $this->fail('Student remapped another user\'s pending records');
        } catch (required_capability_exception $e) {
            $this->assertEquals(0, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $victimfile]));
            $this->assertEquals(0, $DB->get_field('tiny_cursive_comments', 'resourceid', ['id' => $victimcomment]));
        }

        cursive_json_func_data::update_pdf_annote_id($cmid, $this->attacker->id, $this->course->id, 'forum', 77);
        $this->assertEquals(77, $DB->get_field('tiny_cursive_files', 'resourceid', ['id' => $ownfile]));
    }

    /**
     * MOO-39: a write operation should not be listed against a read capability in db/services.php.
     */
    public function test_moo39_service_definition_is_write(): void {
        global $CFG;
        $functions = [];
        include($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/db/services.php');
        $this->assertSame('write', $functions['tiny_cursive_update_pdf_annote_id']['type']);
    }

    /**
     * MOO-40: the callback has the standard pluginfile signature.
     */
    public function test_moo40_pluginfile_signature(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');
        $names = array_map(fn($p) => $p->getName(), (new \ReflectionFunction('tiny_cursive_pluginfile'))->getParameters());
        $this->assertSame(['course', 'cm', 'context', 'filearea', 'args', 'forcedownload', 'options'], $names);
    }
}
