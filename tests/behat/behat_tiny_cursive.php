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

// phpcs:disable moodle.NamingConventions.ValidVariableName.VariableNameLowerCase

require_once(__DIR__ . '/../../../../../../../lib/behat/behat_base.php');

use Behat\Gherkin\Node\TableNode;
use Behat\Mink\Exception\ExpectationException;

/**
 * Behat steps for tiny_cursive.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_tiny_cursive extends behat_base {
    /**
     * Enable Cursive capture for a course, as the course settings form would.
     *
     * @Given Cursive is enabled for course :shortname
     * @param string $shortname
     */
    public function cursive_is_enabled_for_course(string $shortname): void {
        global $DB;

        $courseid = $DB->get_field('course', 'id', ['shortname' => $shortname], MUST_EXIST);
        set_config("cursive-{$courseid}", 1, 'tiny_cursive');
    }

    /**
     * Create notice acknowledgements directly.
     *
     * @Given the following Cursive notice acknowledgements exist:
     * @param TableNode $table Columns: user (username), optionally noticeversion and lang.
     */
    public function the_following_cursive_notice_acknowledgements_exist(TableNode $table): void {
        global $DB;

        $generator = testing_util::get_data_generator()->get_plugin_generator('tiny_cursive');
        foreach ($table->getHash() as $row) {
            $record = ['userid' => $DB->get_field('user', 'id', ['username' => $row['user']], MUST_EXIST)];
            if (!empty($row['noticeversion'])) {
                $record['noticeversion'] = (int) $row['noticeversion'];
            }
            if (!empty($row['lang'])) {
                $record['lang'] = $row['lang'];
            }
            $generator->create_acknowledgement($record);
        }
    }

    /**
     * Give the site a verified API key without contacting the Cursive server.
     *
     * @Given Cursive has an API key
     */
    public function cursive_has_an_api_key(): void {
        set_config('secretkey', 'behat-test-key', 'tiny_cursive');
        set_config('apiKey', 1, 'tiny_cursive');
        // A sync time in the future keeps constants::has_api_key() from calling the verification server.
        set_config('ApiSyncInterval', time() + YEARSECS, 'tiny_cursive');
    }

    /**
     * Create captured submissions (files row, analytics and diff) directly.
     *
     * @Given the following Cursive submissions exist:
     * @param TableNode $table Columns: user (username), module (e.g. assign), activity (its name);
     *     optionally effort, score, total_time_seconds and word_count.
     */
    public function the_following_cursive_submissions_exist(TableNode $table): void {
        global $DB;

        $generator = testing_util::get_data_generator()->get_plugin_generator('tiny_cursive');
        foreach ($table->getHash() as $row) {
            $cm = $this->get_cm_by_activity_name($row['module'], $row['activity']);
            $record = [
                'userid' => $DB->get_field('user', 'id', ['username' => $row['user']], MUST_EXIST),
                'cmid' => $cm->id,
            ];
            foreach (['effort', 'score', 'total_time_seconds', 'word_count'] as $key) {
                if (isset($row[$key]) && $row[$key] !== '') {
                    $record[$key] = $row[$key];
                }
            }
            $generator->create_submission($record);
        }
    }

    /**
     * Render the PDF export template into the page so its markup can be inspected.
     *
     * The export page hands the rendered HTML straight to html2pdf and never shows it, so the
     * accessibility scan needs the template in the document.
     *
     * @When I render the Cursive PDF export template into the page
     */
    public function i_render_the_cursive_pdf_export_template_into_the_page(): void {
        $js = <<<JS
require(['core/templates'], function(templates) {
    var holder = document.getElementById('CursiveStudentData');
    var data = JSON.parse((holder && holder.dataset.submission) || '{}');
    templates.render('tiny_cursive/export_pdf', data).then(function(html) {
        var preview = document.createElement('div');
        preview.id = 'tiny_cursive-pdf-preview';
        preview.innerHTML = html;
        document.getElementById('region-main').appendChild(preview);
        return html;
    }).catch(function(e) {
        window.console.error(e);
    });
});
JS;
        $this->getSession()->executeScript($js);
        $this->ensure_element_exists('#tiny_cursive-pdf-preview', 'css_element');
    }

    /**
     * Run axe-core on the PDF export page's status region and rendered template.
     *
     * Core's accessibility step polls for a result for only a few seconds, and a scan on this page
     * takes longer once html2pdf has run. This step uses the same bundled axe-core and the same
     * rule set as core (WCAG 2.2 A and AA, Section 508, ARIA, best practice) and waits for the result.
     *
     * @Then the Cursive PDF export should meet accessibility standards
     */
    public function the_cursive_pdf_export_should_meet_accessibility_standards(): void {
        if (!behat_config_manager::get_behat_run_config_value('axe')) {
            return;
        }

        $tags = [
            'wcag2a', 'wcag21a', 'wcag22a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'section508',
            'cat.aria', 'cat.sensory-and-visual-cues', 'wcag134', 'best-practice',
        ];
        $config = json_encode(['runOnly' => ['type' => 'tag', 'values' => $tags]]);
        $axeurl = (new moodle_url('/lib/behat/axe/axe.min.js'))->out(false);

        $js = <<<JS
(function(axeurl) {
    window.tinyCursiveAxe = null;
    var run = function() {
        var targets = ['#pdfexportLoader', '#tiny_cursive-pdf-preview'].map(function(selector) {
            return document.querySelector(selector);
        }).filter(Boolean);
        window.axe.run(targets, {$config}).then(function(results) {
            window.tinyCursiveAxe = JSON.stringify({violations: results.violations, error: null});
            return results;
        }).catch(function(e) {
            window.tinyCursiveAxe = JSON.stringify({violations: [], error: String((e && e.message) || e)});
        });
    };
    if (window.axe) {
        run();
        return;
    }
    var tag = document.createElement('script');
    tag.src = axeurl;
    tag.onload = run;
    document.head.append(tag);
})('{$axeurl}');
JS;
        $this->execute_script($js);

        $results = $this->spin(function () {
            $json = $this->evaluate_script('return window.tinyCursiveAxe;');
            return $json ? json_decode($json) : false;
        }, false, self::get_extended_timeout() * 3);

        if (!empty($results->error)) {
            throw new ExpectationException($results->error, $this->getSession());
        }
        if (empty($results->violations)) {
            return;
        }

        $message = "Accessibility violations found:\n";
        foreach ($results->violations as $violation) {
            $message .= sprintf(
                "  %d violations of rule '%s' found (severity: %s)\n  %s\n  %s\n",
                count($violation->nodes),
                $violation->id,
                $violation->impact,
                $violation->help,
                $violation->helpUrl
            );
            foreach ($violation->nodes as $node) {
                $message .= '    - ' . implode(' ', $node->target) . "\n";
            }
        }
        throw new ExpectationException($message, $this->getSession());
    }

    /**
     * Convert page names to URLs for the "I am on the ... page" steps.
     *
     * Recognised names: "Settings" (the plugin's admin settings).
     *
     * @param string $page Page name
     * @return moodle_url
     */
    protected function resolve_page_url(string $page): moodle_url {
        switch (strtolower($page)) {
            case 'settings':
                return new moodle_url('/admin/settings.php', ['section' => 'tiny_cursive_settings']);
            default:
                throw new Exception("Unrecognised tiny_cursive page type '{$page}'.");
        }
    }

    /**
     * Convert page names plus an identifier to URLs for the "I am on the ... page" steps.
     *
     * Recognised types: "Grading" (an assignment name: its submissions table), "Course report" (a course
     * shortname), "Writing report" (the username of a user with a Cursive submission) and "PDF export"
     * (the same username, for that user's latest submission).
     *
     * @param string $type Page type
     * @param string $identifier Course shortname or username
     * @return moodle_url
     */
    protected function resolve_page_instance_url(string $type, string $identifier): moodle_url {
        global $DB;

        $base = '/lib/editor/tiny/plugins/cursive/';
        switch (strtolower($type)) {
            case 'grading':
                $cm = $this->get_cm_by_activity_name('assign', $identifier);
                return new moodle_url('/mod/assign/view.php', ['id' => $cm->id, 'action' => 'grading']);
            case 'course report':
                $courseid = $DB->get_field('course', 'id', ['shortname' => $identifier], MUST_EXIST);
                return new moodle_url($base . 'tiny_cursive_report.php', ['courseid' => $courseid]);
            case 'writing report':
                $file = $this->get_latest_cursive_file($identifier);
                return new moodle_url($base . 'writing_report.php', ['userid' => $file->userid, 'courseid' => $file->courseid]);
            case 'pdf export':
                $file = $this->get_latest_cursive_file($identifier);
                return new moodle_url($base . 'pdfexport.php', [
                    'id' => $file->userid,
                    'file' => $file->id,
                    'cmid' => $file->cmid,
                    'course' => $file->courseid,
                ]);
            default:
                throw new Exception("Unrecognised tiny_cursive page type '{$type}'.");
        }
    }

    /**
     * The most recent Cursive files row for a user.
     *
     * @param string $username
     * @return stdClass
     */
    private function get_latest_cursive_file(string $username): stdClass {
        global $DB;

        $userid = $DB->get_field('user', 'id', ['username' => $username], MUST_EXIST);
        $files = $DB->get_records('tiny_cursive_files', ['userid' => $userid], 'id DESC', '*', 0, 1);
        if (!$files) {
            throw new Exception("User '{$username}' has no Cursive submission.");
        }
        return reset($files);
    }
}
