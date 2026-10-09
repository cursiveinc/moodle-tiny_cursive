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

namespace tiny_cursive\local\page;

/**
 * Tests for the PDF export page data.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \tiny_cursive\local\page\pdfexport
 */
final class pdfexport_test extends \advanced_testcase {
    /**
     * Builds the export data for a capture whose stored diff is the given HTML.
     *
     * @param string $html The diff HTML, as the remote API would send it before encoding
     * @return array The data the page hands to the export template
     */
    private function export_data_for(string $html): array {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $forum = $this->getDataGenerator()->create_module('forum', ['course' => $course->id]);
        $student = $this->getDataGenerator()->create_user();

        $fileid = $DB->insert_record('tiny_cursive_files', (object) [
            'userid' => $student->id,
            'cmid' => (int) $forum->cmid,
            'modulename' => 'forum',
            'resourceid' => 1,
            'courseid' => $course->id,
            'filename' => "{$student->id}_1_{$forum->cmid}_attempt.json",
            'timemodified' => time(),
            'uploaded' => time(),
            'questionid' => 0,
        ]);
        $DB->insert_record('tiny_cursive_user_writing', (object) [
            'file_id' => $fileid,
            'total_time_seconds' => 65,
            'key_count' => 100,
            'keys_per_minute' => 100,
            'character_count' => 100,
            'characters_per_minute' => 100,
            'word_count' => 20,
            'words_per_minute' => 20,
            'backspace_percent' => 1,
            'score' => 1,
            'copy_behavior' => 0,
        ]);
        $DB->insert_record('tiny_cursive_writing_diff', (object) [
            'file_id' => $fileid,
            'reconstructed_text' => 'plain text',
            'submitted_text' => base64_encode(json_encode($html)),
            'meta' => '0.5',
        ]);

        $page = new pdfexport((int) $course->id, (int) $forum->cmid, (int) $student->id, 0, $fileid);
        $prepare = new \ReflectionMethod($page, 'prepare_data');
        $prepare->invoke($page, (int) $student->id, $fileid);
        $content = new \ReflectionProperty($page, 'templatecontent');

        return $content->getValue($page);
    }

    /**
     * HTML from the remote API cannot carry script into the export page.
     */
    public function test_submitted_text_is_cleaned(): void {
        $this->resetAfterTest();

        $data = $this->export_data_for(
            'Typed text <span class="tiny_cursive_added">pasted</span>'
            . '<img src="x" onerror="alert(1)">'
            . '<svg onload="alert(2)"></svg>'
            . '<script>alert(3)</script>'
            . '<a href="javascript:alert(4)">link</a>'
            . '<iframe srcdoc="&lt;script&gt;alert(5)&lt;/script&gt;"></iframe>'
            . '<span class="tiny_cursive_added" onmouseover="alert(6)">hover</span>'
        );

        $submitted = $data['submitted'];
        $this->assertStringContainsString('Typed text', $submitted);
        $this->assertStringContainsString('<span class="tiny_cursive_added">pasted</span>', $submitted);
        foreach (['<script', 'onerror', 'onload', 'onmouseover', 'javascript:', '<iframe', '<svg', 'alert('] as $unsafe) {
            $this->assertStringNotContainsStringIgnoringCase($unsafe, $submitted);
        }
    }

    /**
     * The uncleaned text is not sent to the page alongside the cleaned copy.
     */
    public function test_raw_submitted_text_is_not_exposed(): void {
        $this->resetAfterTest();

        $data = $this->export_data_for('Safe <img src="x" onerror="alert(1)">');

        $this->assertFalse(property_exists($data['analytics'], 'submitted_text'));
        $this->assertStringNotContainsString('onerror', json_encode($data));
        $this->assertSame(50.0, (float) $data['analytics']->effort);
    }
}
