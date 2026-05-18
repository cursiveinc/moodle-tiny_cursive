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

require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

class lib_test_fake_mform {
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

class lib_test_fake_formwrapper {
    private object $current;

    public function __construct(object $current) {
        $this->current = $current;
    }

    public function get_current(): object {
        return $this->current;
    }
}

/**
 * Unit tests for the tiny_cursive plugin library functions.
 *
 * @package    tiny_cursive
 * @category   test
 */
final class lib_test extends \advanced_testcase {
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    public function test_get_path_from_pluginfile_root(): void {
        $path = tiny_cursive_get_path_from_pluginfile(['0', 'myfile.txt']);
        $this->assertSame(0, $path['itemid']);
        $this->assertSame('/myfile.txt/', $path['filepath']);
    }

    public function test_get_path_from_pluginfile_nested(): void {
        $path = tiny_cursive_get_path_from_pluginfile(['0', 'uploads', 'images', 'picture.jpg']);
        $this->assertSame(0, $path['itemid']);
        $this->assertSame('/uploads/images/picture.jpg/', $path['filepath']);
    }

    public function test_tiny_cursive_status_returns_false_when_disabled(): void {
        set_config('disabled', 1, 'tiny_cursive');
        $this->assertFalse(tiny_cursive_status(999));
    }

    public function test_tiny_cursive_status_returns_configured_course_state(): void {
        set_config('disabled', 0, 'tiny_cursive');
        set_config('cursive-42', 1, 'tiny_cursive');
        $this->assertSame(1, tiny_cursive_status(42));
    }

    public function test_get_cmid_returns_zero_when_no_course_module(): void {
        $this->assertSame(0, tiny_cursive_get_cmid(999999));
    }

    public function test_get_cmid_returns_course_module_id(): void {
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);

        $this->assertSame($module->cmid, tiny_cursive_get_cmid($course->id));
    }

    public function test_check_subscriptions_no_token_returns_false(): void {
        set_config('secretkey', '', 'tiny_cursive');
        $result = tiny_cursive_check_subscriptions();
        $this->assertIsArray($result);
        $this->assertArrayHasKey('status', $result);
        $this->assertFalse($result['status']);
    }

    public function test_file_urlcreate_returns_pluginfile_url(): void {
        $course = $this->getDataGenerator()->create_course();
        $context = \context_course::instance($course->id);
        $fs = get_file_storage();
        $filerecord = [
            'contextid' => $context->id,
            'component' => 'tiny_cursive',
            'filearea'  => 'attachment',
            'itemid'    => 0,
            'filepath'  => '/test/',
            'filename'  => 'sample.txt',
            'mimetype'  => 'text/plain',
            'timecreated' => time(),
            'timemodified' => time(),
        ];
        $fs->create_file_from_string($filerecord, 'hello world');

        $url = tiny_cursive_file_urlcreate($context, (object)['fileid' => 0]);
        $this->assertIsString($url);
        $this->assertStringContainsString('/pluginfile.php', $url);
        $this->assertStringContainsString('sample.txt', $url);
    }

    public function test_coursemodule_standard_elements_adds_settings_when_enabled(): void {
        global $PAGE;
        $course = $this->getDataGenerator()->create_course();
        $module = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $PAGE = new \stdClass();
        $PAGE->bodyid = 'page-mod-forum-mod';

        set_config('cursive-' . $course->id, 1, 'tiny_cursive');
        set_config('CUR' . $course->id . $module->cmid, 1, 'tiny_cursive');

        $formdata = new \stdClass();
        $formdata->modulename = 'forum';
        $formdata->course = $course->id;
        $formdata->coursemodule = $module->cmid;
        $formdata->cursive = 1;
        $formdata->student_view = 1;

        $mform = new lib_test_fake_mform();
        $wrapper = new lib_test_fake_formwrapper($formdata);
        tiny_cursive_coursemodule_standard_elements($wrapper, $mform);

        $this->assertNotEmpty($mform->elements);
        $this->assertArrayHasKey('cursive', $mform->types);
    }

    public function test_coursemodule_edit_post_actions_sets_configurations(): void {
        $course = $this->getDataGenerator()->create_course();
        $formdata = new \stdClass();
        $formdata->modulename = 'forum';
        $formdata->course = $course->id;
        $formdata->coursemodule = 123;
        $formdata->cursive = 1;
        $formdata->paste_setting = 'allow';
        $formdata->student_view = 1;

        $result = tiny_cursive_coursemodule_edit_post_actions($formdata, $course);
        $this->assertSame($formdata, $result);
        $this->assertSame(1, get_config('tiny_cursive', 'CUR' . $course->id . '123'));
        $this->assertSame('allow', get_config('tiny_cursive', 'PASTE' . $course->id . '123'));
    }

    public function test_cursive_approve_token_returns_empty_with_no_secret(): void {
        set_config('secretkey', '', 'tiny_cursive');
        $this->assertSame('', cursive_approve_token());
    }
}
