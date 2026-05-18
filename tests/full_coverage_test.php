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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/constants.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/hook_callbacks.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/forms/user_report_form.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/local/page/visualization.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/local/page/pdfexport.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/task/upload_student_json_cron.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/classes/task/post_upgrade_task.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/renderer.php');
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

class fake_mform {
    public array $elements = [];
    public array $types = [];
    public array $defaults = [];

    public function addElement($type, $name, $label, $options = null, $attribs = []) {
        $this->elements[] = compact('type', 'name', 'label', 'options', 'attribs');
    }

    public function setDefault($name, $value) {
        $this->defaults[$name] = $value;
    }

    public function setType($name, $type) {
        $this->types[$name] = $type;
    }
}

class fake_formwrapper {
    private object $current;

    public function __construct(object $current) {
        $this->current = $current;
    }

    public function get_current(): object {
        return $this->current;
    }
}

class fake_page_requires {
    public array $calls = [];

    public function js_call_amd($module, $function, $args) {
        $this->calls[] = [$module, $function, $args];
    }
}

class fake_page {
    public string $bodyid = '';
    public object $cm;
    public fake_page_requires $requires;
    public moodle_url $url;

    public function __construct() {
        $this->requires = new fake_page_requires();
        $this->url = new moodle_url('/');
    }
}

/**
 * Unit tests for additional tiny_cursive logic and plugin entry points.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class full_coverage_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_constants_normalize_string(): void {
        $input = 'Hello&nbsp;&nbsp;&nbsp;World';
        $result = constants::normalize_string($input);
        $this->assertSame('Hello World', $result);
    }

    public function test_constants_get_paste_setting_uses_course_and_cmid(): void {
        global $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $COURSE = $course;
        set_config('PASTE' . $course->id . '_' . $module->cmid, 'block', 'tiny_cursive');

        $this->assertSame('block', constants::get_paste_setting($course->id, $module->cmid));
    }

    public function test_constants_is_active_true_when_no_state_configured(): void {
        global $PAGE, $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $COURSE = $course;
        $PAGE = new fake_page();
        $PAGE->cm = (object)['id' => $module->cmid, 'course' => $course->id];
        $PAGE->bodyid = 'page-mod-forum-discuss';
        $this->assertTrue(constants::is_active());
    }

    public function test_constants_is_resubmitable_false_without_api_key(): void {
        set_config('secretkey', '', 'tiny_cursive');
        $this->assertFalse(constants::is_resubmitable(['effort_ratio' => 0.1, 'total_time_seconds' => 0], 0));
    }

    public function test_constants_no_difference_detects_same_comment(): void {
        global $USER, $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $COURSE = $course;
        $questionid = 0;
        $comment = new \stdClass();
        global $DB;
        $comment->userid = $user->id;
        $comment->cmid = 0;
        $comment->modulename = 'forum_autosave';
        $comment->resourceid = 0;
        $comment->courseid = $course->id;
        $comment->questionid = $questionid;
        $comment->usercomment = 'Same Text';
        $comment->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $comment);

        $this->assertTrue(constants::no_difference([
            'originalText' => 'Same Text',
            'cmid' => 0,
            'resourceId' => 0,
            'modulename' => 'forum',
            'questionid' => $questionid,
            'courseId' => $course->id,
        ]));
    }

    public function test_constants_cursive_auto_save_inserts_comment_record(): void {
        global $USER, $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $COURSE = $course;

        $recordid = constants::cursive_auto_save([
            'cmid' => 0,
            'modulename' => 'forum',
            'resourceId' => 1,
            'courseId' => $course->id,
            'originalText' => 'Hello world',
            'questionid' => 0,
        ]);

        $this->assertIsInt($recordid);
        $this->assertGreaterThan(0, $recordid);
    }

    public function test_hook_callbacks_after_form_submission_sets_course_config(): void {
        $course = $this->getDataGenerator()->create_course();
        $hook = new class {
            public function get_data() {
                $obj = new \stdClass();
                $obj->id = 42;
                $obj->cursive_status = 1;
                return $obj;
            }
        };

        hook_callbacks::after_form_submission($hook);
        $this->assertSame(1, get_config('tiny_cursive', 'cursive-42'));
    }

    public function test_hook_callbacks_before_footer_html_generation_adds_js_when_enabled(): void {
        global $PAGE, $COURSE, $USER;
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $COURSE = $course;
        $USER = get_admin();
        $this->setAdminUser();

        $PAGE = new fake_page();
        $PAGE->bodyid = 'page-mod-forum-discuss';
        $PAGE->cm = (object)['id' => $module->cmid, 'course' => $course->id];

        set_config('cursive-' . $course->id, 1, 'tiny_cursive');

        $hook = new \core\hook\output\before_footer_html_generation();
        hook_callbacks::before_footer_html_generation($hook);

        $this->assertNotEmpty($PAGE->requires->calls);
        $this->assertSame('tiny_cursive/append_fourm_post', $PAGE->requires->calls[0][0]);
    }

    public function test_hook_callbacks_after_form_definition_adds_cursive_elements(): void {
        global $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $COURSE = $course;

        set_config('disabled', 0, 'tiny_cursive');
        set_config('note_text', 'Note', 'tiny_cursive');
        set_config('note_url', 'https://example.com', 'tiny_cursive');
        set_config('note_url_text', 'More info', 'tiny_cursive');

        $mform = new fake_mform();
        $hook = (object)['mform' => $mform];
        hook_callbacks::after_form_definition($hook);

        $this->assertNotEmpty($mform->elements);
        $this->assertArrayHasKey('cursive_notice', $mform->defaults);
    }

    public function test_forms_user_report_get_modules_and_user_list(): void {
        $course = $this->getDataGenerator()->create_course();
        $student = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($student->id, $course->id, 'student');
        $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $form = new forms\user_report_form(null, ['courseid' => $course->id]);

        $users = $form->get_user($course->id);
        $modules = $form->get_modules($course->id);

        $this->assertArrayHasKey(0, $users);
        $this->assertNotEmpty($modules);
    }

    public function test_visualization_prepare_data_returns_filter_and_fullname(): void {
        global $PAGE;
        $course = $this->getDataGenerator()->create_course();
        $cm1 = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $cm2 = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $PAGE = new fake_page();
        $PAGE->url = new moodle_url('/lib/editor/tiny/plugins/cursive/visualization.php');

        $visualization = new local\page\visualization($course->id, 'forum', $cm1->cmid, 0);
        $method = new \ReflectionMethod(local\page\visualization::class, 'prepare_data');
        $method->setAccessible(true);

        $data = $method->invoke($visualization);
        $this->assertArrayHasKey('filter', $data);
        $this->assertArrayHasKey('fullname', $data);
        $this->assertArrayHasKey('multiple', $data);
    }

    public function test_pdfexport_format_time_and_auth_state(): void {
        global $COURSE;
        $course = $this->getDataGenerator()->create_course();
        $COURSE = $course;
        $page = new local\page\pdfexport($course->id, 0, 0, 0, 0);

        $formatmethod = new \ReflectionMethod(local\page\pdfexport::class, 'format_time');
        $formatmethod->setAccessible(true);
        $this->assertSame('Jan 01, 1970 12:00 AM', $formatmethod->invoke($page, 0, true));

        set_config('confidence_threshold', 0.5, 'tiny_cursive');
        $authmethod = new \ReflectionMethod(local\page\pdfexport::class, 'get_auth_state');
        $authmethod->setAccessible(true);
        $this->assertTrue($authmethod->invoke($page, 0.6));
        $this->assertFalse($authmethod->invoke($page, 0.4));
    }

    public function test_pdfexport_prepare_data_structure_populates_templatecontent(): void {
        global $DB, $COURSE, $USER;
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $cm = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $COURSE = $course;
        $USER = $user;

        $file = new \stdClass();
        $file->id = 1;
        $file->userid = $user->id;
        $file->cmid = $cm->cmid;
        $file->modulename = 'forum';
        $file->resourceid = 0;
        $file->courseid = $course->id;
        $file->filename = 'sample.json';
        $file->content = '{}';
        $file->timemodified = time();
        $file->uploaded = 0;
        $file->questionid = 0;
        $DB->insert_record('tiny_cursive_files', $file);

        $writing = new \stdClass();
        $writing->file_id = 1;
        $writing->total_time_seconds = 65;
        $writing->word_count = 15;
        $writing->words_per_minute = 10;
        $DB->insert_record('tiny_cursive_user_writing', $writing);

        $diff = new \stdClass();
        $diff->file_id = 1;
        $diff->meta = 0.8;
        $diff->submitted_text = base64_encode(json_encode(['text' => 'hello']));
        $DB->insert_record('tiny_cursive_writing_diff', $diff);

        $comment = new \stdClass();
        $comment->userid = $user->id;
        $comment->cmid = $cm->cmid;
        $comment->modulename = 'forum';
        $comment->resourceid = 0;
        $comment->courseid = $course->id;
        $comment->usercomment = 'Test comment';
        $comment->timemodified = time();
        $DB->insert_record('tiny_cursive_comments', $comment);

        $page = new local\page\pdfexport($course->id, $cm->cmid, $user->id, 0, 1);
        $method = new \ReflectionMethod(local\page\pdfexport::class, 'prepare_data_structure');
        $method->setAccessible(true);

        $analytics = [$file->id => (object)[
            'userid' => $user->id,
            'modulename' => 'forum',
            'timemodified' => time(),
            'resourceid' => 0,
            'questionid' => 0,
            'effort' => 0.8,
            'score' => 0.7,
            'submitted_text' => base64_encode(json_encode(['text' => 'hi'])),
            'total_time_seconds' => 65,
            'word_count' => 15,
            'words_per_minute' => 10,
        ]];

        $method->invoke($page, $analytics);
        $property = new \ReflectionProperty(local\page\pdfexport::class, 'templatecontent');
        $property->setAccessible(true);
        $template = $property->getValue($page);

        $this->assertArrayHasKey('analytics', $template);
        $this->assertSame(1, $template['pastecount']);
        $this->assertSame(true, $template['auth_state']);
    }

    public function test_renderer_generate_custom_title_appends_forum_title(): void {
        global $DB;
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $cm = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $post = new \stdClass();
        $post->discussion = 0;
        $post->parent = 0;
        $post->subject = 'Root post';
        $post->message = 'Hello';
        $post->userid = $user->id;
        $post->created = time();
        $post->modified = time();
        $post->mailed = 0;
        $post->attachment = '';
        $post->totalscore = 0;
        $post->mailnow = 0;
        $post->privatereply = 0;
        $post->id = $DB->insert_record('forum_posts', $post);

        $file = new \stdClass();
        $file->id = 1;
        $file->resourceid = $post->id;
        $DB->insert_record('tiny_cursive_files', $file);

        $module = new \stdClass();
        $module->name = 'Forum Module';
        $module->modname = 'forum';

        $userData = new \stdClass();
        $userData->fileid = $file->id;

        $renderer = new \tiny_cursive_renderer($this->output);
        $renderer->generate_custom_title($cm, $userData, $DB, $module);

        $this->assertStringContainsString('Root post', $module->name);
    }

    public function test_lib_upload_multipart_record_returns_empty_on_invalid_json(): void {
        set_config('python_server', 'https://example.com', 'tiny_cursive');
        set_config('secretkey', 'secret', 'tiny_cursive');

        $filerecord = new \stdClass();
        $filerecord->id = 1;
        $filerecord->userid = 1;
        $filerecord->content = '{invalidjson';

        ob_start();
        $result = tiny_cursive_upload_multipart_record($filerecord, 'file.json', 'token', 'answer');
        $output = ob_get_clean();

        $this->assertSame('', $result);
        $this->assertStringContainsString('invalidjson', $output);
    }

    public function test_task_upload_student_json_cron_get_name(): void {
        $task = new task\upload_student_json_cron();
        $this->assertSame(get_string('pluginname', 'tiny_cursive'), $task->get_name());
    }

    public function test_task_post_upgrade_task_get_name(): void {
        $task = new task\post_upgrade_task();
        $this->assertSame(get_string('postupgradetask', 'tiny_cursive'), $task->get_name());
    }

    public function test_settings_file_includes_without_error(): void {
        global $PAGE, $ADMIN, $CFG;
        $PAGE = new fake_page();
        $ADMIN = new class {
            public bool $fulltree = false;
            public function add($name, $node) {
                return $node;
            }
        };

        require $CFG->dirroot . '/lib/editor/tiny/plugins/cursive/settings.php';
        $this->assertTrue(true);
    }
}
