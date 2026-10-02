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
use cursive_json_func_data;
use invalid_parameter_exception;
use required_capability_exception;

/**
 * Unit tests for external API functions in tiny_cursive.
 *
 * @package     tiny_cursive
 * @covers      \cursive_json_func_data
 * @copyright   2026 CTI <info@cursivetechnology.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class externallib_test extends advanced_testcase {
    /**
     * Set up tests.
     */
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest(true);
    }

    /**
     * Test disable_cursive requires tiny/cursive:editsettings capability.
     */
    public function test_disable_cursive_capability(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::disable_cursive(true);
    }

    /**
     * Test disable_cursive succeeds for admin.
     */
    public function test_disable_cursive_admin(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $this->setAdminUser();
        $result = cursive_json_func_data::disable_cursive(true);
        $this->assertTrue($result);
    }

    /**
     * Test remove_student_submission prevents student deleting another user's records.
     */
    public function test_remove_student_submission_idor_prevention(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        // Keep this test independent of capabilities cached in a reused PHPUnit database.
        $studentrole = $DB->get_record('role', ['shortname' => 'student'], '*', MUST_EXIST);
        unassign_capability('tiny/cursive:deletesubmission', $studentrole->id);

        // Log in as student1 and attempt to remove student2's submission.
        $this->setUser($student1);

        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::remove_student_submission($course->id, $student2->id, (int) $assign->cmid);
    }

    /**
     * Test a student can delete only their own Cursive submission data.
     */
    public function test_remove_student_submission_own_data(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $this->setUser($student);
        $this->assertTrue(cursive_json_func_data::remove_student_submission(
            (int) $course->id,
            (int) $student->id,
            (int) $assign->cmid,
        ));
        $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
    }

    /**
     * Test an editing teacher can delete another user's Cursive submission data.
     */
    public function test_remove_student_submission_teacher_can_delete_student_data(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $teacher = $this->getDataGenerator()->create_user();
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $fileids = [];
        foreach (['first', 'second'] as $suffix) {
            $fileids[] = $DB->insert_record('tiny_cursive_files', (object) [
                'userid' => $student->id,
                'cmid' => (int) $assign->cmid,
                'modulename' => 'assign',
                'resourceid' => (int) $assign->cmid,
                'courseid' => $course->id,
                'filename' => "{$student->id}_{$assign->cmid}_{$suffix}_attempt.json",
                'timemodified' => time(),
                'uploaded' => 0,
            ]);
        }

        $this->setUser($teacher);
        $this->assertTrue(cursive_json_func_data::remove_student_submission(
            (int) $course->id,
            (int) $student->id,
            (int) $assign->cmid,
        ));
        foreach ($fileids as $fileid) {
            $this->assertFalse($DB->record_exists('tiny_cursive_files', ['id' => $fileid]));
        }
    }

    /**
     * Test the destructive capability is not granted to the student archetype.
     */
    public function test_delete_submission_capability_assignment(): void {
        global $CFG;

        $capabilities = [];
        require($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/db/access.php');
        $definition = $capabilities['tiny/cursive:deletesubmission'];

        $this->assertSame(RISK_DATALOSS, $definition['riskbitmask']);
        $this->assertSame('write', $definition['captype']);
        $this->assertArrayHasKey('editingteacher', $definition['archetypes']);
        $this->assertArrayNotHasKey('student', $definition['archetypes']);
    }

    /**
     * Test cursive_get_analytics rejects invalid fileid or unauthorized access.
     */
    public function test_cursive_get_analytics_idor_prevention(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        // Create a file record for student2.
        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student2->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student2->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        // Student1 should not be able to get student2's analytics.
        $this->setUser($student1);
        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::cursive_get_analytics((int) $assign->cmid, $fileid);
    }

    /**
     * Test a teacher in one course cannot download another user's data from a different course.
     */
    public function test_json_download_cross_course_authorization(): void {
        $teachercourse = $this->getDataGenerator()->create_course();
        $victimcourse = $this->getDataGenerator()->create_course();
        $this->getDataGenerator()->create_module('assign', ['course' => $teachercourse->id]);
        $victimassign = $this->getDataGenerator()->create_module('assign', ['course' => $victimcourse->id]);
        $attacker = $this->getDataGenerator()->create_user();
        $victim = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($attacker->id, $teachercourse->id, 'editingteacher');
        $this->getDataGenerator()->enrol_user($attacker->id, $victimcourse->id, 'student');
        $this->getDataGenerator()->enrol_user($victim->id, $victimcourse->id, 'student');

        $this->setUser($attacker);
        $victimcontext = \context_module::instance((int) $victimassign->cmid);
        $this->assertTrue(has_capability('tiny/cursive:writingreport', $victimcontext));
        $this->assertFalse(has_capability('tiny/cursive:view', $victimcontext));
        $this->expectException(required_capability_exception::class);
        helper::require_json_download_access((int) $victimassign->cmid, (int) $victim->id);
    }

    /**
     * Test replay JSON cannot be read from another student's filename.
     */
    public function test_reply_json_idor_prevention(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $attacker = $this->getDataGenerator()->create_user();
        $victim = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($attacker->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($victim->id, $course->id, 'student');

        $filename = "{$victim->id}_{$assign->cmid}_{$assign->cmid}_attempt.json";
        $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $victim->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => $filename,
            'content' => '{"payload":[]}',
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $this->setUser($attacker);
        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::cursive_get_reply_json($filename);
    }

    /**
     * Test analytics handles users with multiple files without a multiple-record debugging notice.
     */
    public function test_cursive_get_analytics_multiple_files(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $firstfileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student->id}_first_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);
        $secondfileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid + 1,
            'courseid' => $course->id,
            'filename' => "{$student->id}_second_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);
        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $secondfileid,
            'total_time_seconds' => 60,
            'key_count' => 100,
            'keys_per_minute' => 100,
            'character_count' => 100,
            'characters_per_minute' => 100,
            'word_count' => 20,
            'words_per_minute' => 20,
            'backspace_percent' => 1,
            'score' => 90,
            'copy_behavior' => 0,
            'user_agent' => 'phpunit',
        ]);

        $this->setUser($student);
        $result = cursive_json_func_data::cursive_get_analytics((int) $assign->cmid, $secondfileid);
        $data = json_decode($result['data']);

        $this->assertNotEquals($firstfileid, $secondfileid);
        $this->assertEquals(0, $data->first_file);
        $this->assertDebuggingNotCalled();
    }

    /**
     * Test the forum analytics fallback handles a missing resource without PHP warnings.
     */
    public function test_get_forum_comment_link_missing_resource(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');
        $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $forum->cmid,
            'modulename' => 'forum',
            'resourceid' => 1,
            'courseid' => $course->id,
            'filename' => "{$student->id}_1_{$forum->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $this->setUser($student);
        $result = cursive_json_func_data::get_forum_comment_link(999999, 'forum', (int) $forum->cmid);
        $decoded = json_decode($result, true);

        $this->assertSame('comments', $decoded['usercomment']);
        $this->assertDebuggingNotCalled();
    }

    /**
     * Test forum analytics exposes only the current student's comments and files.
     */
    public function test_get_forum_comment_link_student_data_isolation(): void {
        global $CFG, $DB;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');
        $resourceid = 12345;

        foreach ([$student1, $student2] as $student) {
            $DB->insert_record('tiny_cursive_files', (object) [
                'userid' => $student->id,
                'cmid' => (int) $forum->cmid,
                'modulename' => 'forum',
                'resourceid' => $resourceid,
                'courseid' => $course->id,
                'filename' => "{$student->id}_{$resourceid}_{$forum->cmid}_attempt.json",
                'timemodified' => time(),
                'uploaded' => 0,
            ]);
            $DB->insert_record('tiny_cursive_comments', (object) [
                'userid' => $student->id,
                'cmid' => (int) $forum->cmid,
                'modulename' => 'forum',
                'resourceid' => $resourceid,
                'courseid' => $course->id,
                'usercomment' => "comment-{$student->id}",
                'timemodified' => time(),
            ]);
        }

        $this->setUser($student1);
        $decoded = json_decode(cursive_json_func_data::get_forum_comment_link(
            $resourceid,
            'forum',
            (int) $forum->cmid,
        ), true);

        $this->assertCount(1, $decoded['usercomment']);
        $this->assertSame((int) $student1->id, (int) $decoded['usercomment'][0]['userid']);
        $this->assertSame((int) $student1->id, (int) $decoded['data']['userid']);
        $this->assertSame("comment-{$student1->id}", $decoded['usercomment'][0]['usercomment']);
        $this->assertSame(
            "{$student1->id}_{$resourceid}_{$forum->cmid}_attempt.json",
            $decoded['data']['filename'],
        );
        $this->assertDebuggingNotCalled();
    }

    /**
     * Test the PDF annotation update rejects non-PDF activity modules.
     */
    public function test_update_pdf_annote_id_rejects_non_pdf_module(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');
        $this->setUser($student);

        $this->expectException(invalid_parameter_exception::class);
        cursive_json_func_data::update_pdf_annote_id(
            (int) $assign->cmid,
            (int) $student->id,
            (int) $course->id,
            'assign',
            123,
        );
    }

    /**
     * Test resubmit_payload_data prevents modifying another user's file.
     */
    public function test_resubmit_payload_data_idor_prevention(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student2->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student2->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 1,
        ]);

        // Student1 tries to trigger resubmit on student2's file.
        $this->setUser($student1);
        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::resubmit_payload_data($fileid, (int) $assign->cmid);
    }

    /**
     * Test get_user_list requires tiny/cursive:view capability and returns enrolled users.
     */
    public function test_get_user_list_enrolled_only(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $teacher = $this->getDataGenerator()->create_user();
        $student = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        // Student lacks tiny/cursive:view capability.
        $this->setUser($student);
        try {
            cursive_json_func_data::get_user_list(0, (int) $course->id);
            $this->fail('Expected required_capability_exception was not thrown for student');
        } catch (required_capability_exception $e) {
            $this->assertNotEmpty($e->getMessage());
        }

        // Teacher has permission.
        $this->setUser($teacher);
        $result = cursive_json_func_data::get_user_list(0, (int) $course->id);
        $this->assertIsString($result);
        $decoded = json_decode($result, true);
        $this->assertIsArray($decoded);
    }

    /**
     * Test get_module_list requires tiny/cursive:view capability.
     */
    public function test_get_module_list_by_course(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $teacher = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');

        $this->setUser($teacher);
        $result = cursive_json_func_data::get_module_list(0, (int) $course->id);
        $this->assertIsString($result);
        $decoded = json_decode($result, true);
        $this->assertIsArray($decoded);
    }

    /**
     * Test cursive_approve_token requires tiny/cursive:editsettings.
     */
    public function test_cursive_approve_token_capability(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(required_capability_exception::class);
        cursive_json_func_data::cursive_approve_token_func('dummy_token');
    }

    /**
     * Test cursive_user_comments_func stores user comment correctly.
     */
    public function test_cursive_user_comments_func(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $this->setUser($student);
        $result = cursive_json_func_data::cursive_user_comments_func(
            'assign',
            (int) $assign->cmid,
            (int) $assign->cmid,
            (int) $course->id,
            'My feedback comment',
            time(),
            ''
        );

        $this->assertTrue($result);
        $comment = $DB->get_record('tiny_cursive_comments', [
            'userid' => $student->id,
            'cmid' => (int) $assign->cmid,
        ]);
        $this->assertNotEmpty($comment);
        $this->assertEquals('My feedback comment', $comment->usercomment);
    }

    /**
     * Test get_comment_link rejects non-quiz modulename with invalid_parameter_exception.
     */
    public function test_get_comment_link_quiz_validation(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $teacher = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');

        $this->setUser($teacher);
        $this->expectException(invalid_parameter_exception::class);
        cursive_json_func_data::get_comment_link((int) $assign->cmid, 'assign', (int) $assign->cmid, 0, (int) $teacher->id);
    }

    /**
     * Test store_user_writing inserts and updates telemetry records.
     */
    public function test_store_user_writing_and_update(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        $this->setAdminUser();

        $res1 = cursive_json_func_data::store_user_writing(
            (int) $student->id,
            $fileid,
            120,
            60,
            120.0,
            130,
            130.0,
            25,
            25.0,
            5.2,
            0.0,
            95.5,
            'desktop'
        );

        $this->assertIsArray($res1);
        $this->assertTrue($DB->record_exists('tiny_cursive_user_writing', ['file_id' => $fileid]));

        // Update existing record.
        $res2 = cursive_json_func_data::store_user_writing(
            (int) $student->id,
            $fileid,
            240,
            120,
            120.0,
            260,
            130.0,
            50,
            25.0,
            4.0,
            0.0,
            98.0,
            'desktop'
        );
        $this->assertIsArray($res2);
        $record = $DB->get_record('tiny_cursive_user_writing', ['file_id' => $fileid]);
        $this->assertEquals(240, $record->character_count);
        $this->assertEquals(98.0, $record->score);
    }

    /**
     * Test cursive_store_writing_differencs and cursive_get_writing_differencs with IDOR protection.
     */
    public function test_cursive_writing_differences_and_idor(): void {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student1 = $this->getDataGenerator()->create_user();
        $student2 = $this->getDataGenerator()->create_user();
        $teacher = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student1->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($student2->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student1->id,
            'cmid' => (int) $assign->cmid,
            'modulename' => 'assign',
            'resourceid' => (int) $assign->cmid,
            'courseid' => $course->id,
            'filename' => "{$student1->id}_{$assign->cmid}_{$assign->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => 0,
        ]);

        // Store diff as admin.
        $this->setAdminUser();
        $storeresult = cursive_json_func_data::cursive_store_writing_differencs(
            $fileid,
            'Reconstructed text',
            'Submitted text',
            'meta'
        );
        $this->assertIsArray($storeresult);
        $this->assertTrue($DB->record_exists('tiny_cursive_writing_diff', ['file_id' => $fileid]));

        // Student2 attempting to view Student1's diff throws exception.
        $this->setUser($student2);
        try {
            cursive_json_func_data::cursive_get_writing_differencs($fileid);
            $this->fail('Expected required_capability_exception was not thrown for unauthorized student');
        } catch (required_capability_exception $e) {
            $this->assertNotEmpty($e->getMessage());
        }

        // Student1 viewing their own diff succeeds.
        $this->setUser($student1);
        $studentresult = cursive_json_func_data::cursive_get_writing_differencs($fileid);
        $this->assertIsArray($studentresult);
        $this->assertArrayHasKey('data', $studentresult);

        // Teacher viewing Student1's diff succeeds.
        $this->setUser($teacher);
        $teacherresult = cursive_json_func_data::cursive_get_writing_differencs($fileid);
        $this->assertIsArray($teacherresult);
        $this->assertArrayHasKey('data', $teacherresult);
    }

    /**
     * Test get_guidance_state capability resolution for student vs teacher.
     */
    public function test_get_guidance_state(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $context = \context_module::instance((int) $assign->cmid);
        $student = $this->getDataGenerator()->create_user();
        $teacher = $this->getDataGenerator()->create_user();

        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');
        $this->getDataGenerator()->enrol_user($teacher->id, $course->id, 'editingteacher');

        // Student cannot view guidance.
        $this->setUser($student);
        $studentstate = cursive_json_func_data::get_guidance_state((int) $context->id);
        $this->assertFalse($studentstate['canviewguidance']);
        $this->assertFalse($studentstate['showguidance']);

        // Teacher can view guidance.
        $this->setUser($teacher);
        $teacherstate = cursive_json_func_data::get_guidance_state((int) $context->id);
        $this->assertTrue($teacherstate['canviewguidance']);
    }

    /**
     * Test cursive_get_config returns expected configuration structure.
     */
    public function test_cursive_get_config(): void {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/externallib.php');

        $course = $this->getDataGenerator()->create_course();
        $assign = $this->getDataGenerator()->create_module('assign', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');

        $this->setUser($student);
        $config = cursive_json_func_data::cursive_get_config((int) $course->id, (int) $assign->cmid);
        $this->assertIsArray($config);
        $this->assertArrayHasKey('status', $config);
        $this->assertArrayHasKey('userid', $config);
        $this->assertArrayHasKey('apikey_status', $config);
        $this->assertArrayHasKey('canbypasspaste', $config);
    }
}
