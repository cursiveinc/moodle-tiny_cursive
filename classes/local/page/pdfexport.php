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
use context_course;
use context_module;
use html_writer;
use moodle_exception;
use moodle_url;
use context_system;
use tiny_cursive\constants;

/**
 * Class pdfexport
 *
 * @package    tiny_cursive
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class pdfexport {
    /**
     * @var array $templatecontent Template content for PDF export
     */
    protected $templatecontent;

    /**
     * @var int $questionid Question ID
     */
    protected $questionid;
    /**
     * @var int $courseid Course ID
     */
    protected $courseid;

    /**
     * @var int $cmid Course module ID
     */
    protected $cmid;

    /**
     * @var moodle_url $url URL for PDF export page
     */
    protected $url;

    /**
     * @var int $id User ID
     */
    protected $id; // Userid.

    /**
     * @var int $id User ID
     */
    protected $fileid; // Cursive fileid.

    /**
     * Constructor for pdfexport class
     *
     * @param int $courseid The ID of the course
     * @param int $cmid The course module ID
     * @param int $id The user ID
     * @param int $questionid The ID of the question
     * @param int $file The ID of the cursive file
     * @throws moodle_exception If the user does not have permission to access the page
     */
    public function __construct(int $courseid, int $cmid, $id, $questionid, $file) {
        $this->id         = $id;
        $this->cmid       = $cmid;
        $this->fileid     = $file;
        $this->courseid   = $courseid;
        $this->questionid = $questionid;
        $this->url        = new moodle_url('/lib/editor/tiny/plugins/cursive/pdfexport.php');
    }

    /**
     * Downloads and displays the PDF export page
     *
     * This method performs the following steps:
     * 1. Checks user access permissions
     * 2. Prepares the data for display
     * 3. Sets up the page with required JS
     * 4. Displays the page content
     */
    public function download() {

        $this->check_access();
        $this->prepare_data($this->id, $this->fileid);
        $this->page_setup($this->templatecontent);
        $this->page();
    }

    /**
     * Sets up the page with required JavaScript and other settings
     *
     * @param mixed|null $data Optional data to pass to the JavaScript initialization
     * @return void
     */
    private function page_setup($data = null) {
        global $PAGE;

        $PAGE->set_url($this->url);
        $PAGE->set_context(context_system::instance());
        $PAGE->set_title(get_string('analytics', 'tiny_cursive'));
        $PAGE->requires->js("/lib/editor/tiny/plugins/cursive/amd/js/html2pdf.js", true);
        $PAGE->requires->js_call_amd('tiny_cursive/pdfexport', 'init', [$data ? true : false]);
    }

    /**
     * Outputs the page content including header, loading message and footer
     *
     * This method:
     * - Outputs the page header
     * - Creates a loading message div
     * - Creates a loading icon
     * - Wraps the loading content in a centered div
     * - Outputs the wrapped content in a box
     * - Outputs the page footer
     *
     * @return void
     */
    private function page() {
        global $OUTPUT;

        echo   $OUTPUT->header();
        $content = html_writer::div(get_string('pleasewait', 'tiny_cursive'), '', ['id' => "loadermessage"]);
        $loader  = html_writer::div($OUTPUT->pix_icon('i/loading', 'core'), 'text-center');
        $data    = html_writer::start_span('', ['id' => 'CursiveStudentData', 'data-submission' =>
                   json_encode($this->templatecontent)]);
        $wrapper = html_writer::div($data . $loader . $content, 'text-center', ['id' => 'pdfexportLoader']);
        echo   $OUTPUT->box($wrapper);
        echo   $OUTPUT->footer();
    }

    /**
     * Prepares data for PDF export by fetching analytics records from the database
     *
     * @param int $userid The user ID
     * @param int $fileid The curisve file ID
     * @return void
     */
    private function prepare_data($userid, $fileid) {
        global $DB;

        $sql = "SELECT CONCAT(u.firstname,' ',u.lastname) AS username, f.userid,
                       f.modulename, f.timemodified, f.resourceid, f.questionid, w.*, d.meta as effort, d.submitted_text
                  FROM {tiny_cursive_files} f
                  JOIN {tiny_cursive_user_writing} w ON f.id = w.file_id
                  JOIN {tiny_cursive_writing_diff} d ON f.id = d.file_id
                  JOIN {user} u ON f.userid = u.id
                 WHERE f.id = :fileid AND f.userid = :userid";

        $params    = ['fileid' => $fileid, 'userid' => $userid];

        $analytics = $DB->get_records_sql($sql, $params);
        $this->prepare_data_structure($analytics);
    }

    /**
     * Formats a timestamp into a human readable date/time string
     *
     * @param int $time Unix timestamp to format
     * @param bool $report Whether to include time in the formatted string
     * @return string Formatted date/time string
     */
    private function format_time($time, $report = false) {
        // Get current timezone abbreviation (e.g., "GMT", "BST", "EST").
        $timezone = date('T', $time);

        if ($report) {
            return date('M d, Y h:i A', $time);
        }

        return date('M d, Y h:i A', $time) . " " . $timezone;
    }


    /**
     * Prepares and structures analytics data for template rendering
     *
     * This method processes raw analytics data and formats it for display by:
     * - Extracting the first analytics record
     * - Decoding submitted text from base64
     * - Formatting time duration
     * - Retrieving and counting comments
     * - Converting effort to percentage
     * - Building a structured template content array
     *
     * @param array $analytics Raw analytics data from database
     * @return void
     */
    private function prepare_data_structure($analytics) {
        global $DB;

        $analytics = array_values($analytics)[0] ?? [];

        if ($analytics) {
            $modname                       = get_coursemodule_from_id($analytics->modulename, $this->cmid, $this->courseid);
            $analytics->submitted_text     = base64_decode($analytics->submitted_text);
            $time                          = $analytics->total_time_seconds;
            $analytics->total_time_seconds = sprintf("%dm %ds", floor($time / 60), $time % 60);
            $comments                      = $this->get_comments($analytics);
            $pastecount                    = count($comments);
            $analytics->effort             = ceil($analytics->effort * 100);
            $this->templatecontent = [
                "analytics"  => $analytics,
                "modulename" => $modname->name,
                "fullname"   => $analytics->username,
                "filename"   => "Analytics Report of $analytics->username",
                "date"       => $this->format_time(time(), true),
                "sub_date"   => $this->format_time($analytics->timemodified),
                "reportdate" => $this->format_time(time(), true),
                "comments"   => $pastecount > 0 ? array_values($comments) : false,
                "pastecount" => $pastecount,
                "submitted"  => json_decode($analytics->submitted_text), // Submitted Text.
                "auth_state" => $this->get_auth_state($analytics->score),
            ];
        } else {
            $this->templatecontent = [];
        }
    }

    /**
     * Checks if the current user has access to view the PDF export
     *
     * This method performs several access control checks:
     * 1. Verifies that an API key is configured
     * 2. Validates that the user is either viewing their own report or is a site admin
     * 3. Checks if the user has the required capability in the course module context
     *
     * @throws moodle_exception If the user does not have required access
     * @return void
     */
    private function check_access() {
        global $USER;

        if (!constants::has_api_key()) {
            throw new moodle_exception(get_string('warning', 'tiny_cursive'));
        }

        if (intval($USER->id) !== $this->id && !constants::is_teacher_admin(context_course::instance($this->courseid))) {
            throw new moodle_exception(get_string('warning', 'tiny_cursive'));
        }

        $context    = context_module::instance($this->cmid);
        require_capability('tiny/cursive:writingreport', $context);
    }

    /**
     * Retrieves user comments from the database for the current analytics record
     *
     * @param object $analytics The analytics record containing modulename, resourceid and questionid
     * @return array Array of comment records containing only the usercomment field
     */
    private function get_comments($analytics) {
        global $DB;

        $params    = [
                'userid' => $this->id,
                'cmid'   => $this->cmid,
                'modulename' => $analytics->modulename,
                'resourceid' => $analytics->resourceid,
                'courseid'   => $this->courseid,
                'questionid' => $analytics->questionid,
            ];

        return $DB->get_records('tiny_cursive_comments', $params, '', 'usercomment');
    }

    /**
     * Determines the authentication state based on the confidence score
     *
     * @param float $score The confidence score to evaluate
     * @return bool True if score meets or exceeds threshold, false otherwise
     */
    private function get_auth_state($score) {
        $threshould = floatval(get_config('tiny_cursive', 'confidence_threshold')) ?? 0.65;

        if ($score >= $threshould) {
            return true;
        }
        return false;
    }
}
