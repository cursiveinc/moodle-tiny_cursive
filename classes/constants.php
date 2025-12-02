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

use question_engine;
defined('MOODLE_INTERNAL') || die();
require_once($CFG->libdir . '/externallib.php');
require_once($CFG->dirroot . '/grade/grading/lib.php');
require_once($CFG->dirroot . '/grade/grading/form/rubric/lib.php');

/**
 * Class constants
 *
 * @package    tiny_cursive
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class constants {
    /**
     * Array of supported activity module names.
     * const array NAMES List of module names where cursive can be used
     */
    public const NAMES = ["assign", "forum", "quiz", "lesson"]; // Excluded oublog.
    /**
     * Array mapping module names to their corresponding rubric areas.
     * Used to identify the correct rubric area for different module types.
     * const array RUBRIC_AREA Mapping of module names to rubric areas
     */
    public const RUBRIC_AREA = ['assign' => 'submissions', 'forum' => 'forum', 'quiz' => 'quiz', 'lesson' =>
                               'lesson'];

    /**
     * Array mapping page body IDs to their corresponding handler functions and module types.
     * Each entry consists of:
     * - Key: The page body ID string
     * - Value: Array containing [handler function name, module type]
     * const array BODY_IDS Mapping of page IDs to handlers
     */
    public const BODY_IDS = [
            'page-mod-forum-discuss'        => ['append_fourm_post', 'forum'],
            'page-mod-forum-view'           => ['append_fourm_post', 'forum'],
            'page-mod-assign-grader'        => ['show_url_in_submission_grade', 'assign'],
            'page-mod-assign-grading'       => ['append_submissions_table', 'assign'],
            'page-mod-quiz-review'          => ['show_url_in_quiz_detail', 'quiz'],
            'page-course-view-participants' => ['append_participants_table', 'course'],
            'page-mod-lesson-essay'         => ['append_lesson_grade_table', 'lesson'],
        ];


    /**
     * Default confidence threshold value for cursive validation.
     * Uses configured value from settings or defaults to 0.65 if not set.
     * @return float Minimum confidence score required
     */
    public static function confidence_threshold() {
        $value = get_config('tiny_cursive', 'confidence_threshold');
        return !empty($value) ? floatval($value) : 0.65;
    }
    /**
     * Flag indicating whether to display cursive validation comments.
     * Controlled via plugin configuration setting.
     * @return bool Whether to show validation comments
     */
    public static function show_comments() {
        return get_config('tiny_cursive', 'showcomments');
    }


    /**
     * Check if the cursive functionality is active for the current page/context
     *
     * @return bool True if cursive is active, false otherwise
     */
    public static function is_active() {
        global $PAGE;
        $instance = $PAGE->cm->id ?? 0;
        $courseid = $PAGE->cm->course ?? $PAGE->course->id;
        $key      = "CUR$courseid$instance";
        $state    = get_config('tiny_cursive', $key);

        if ($state === "1" || $state === false) {
            $state = true;
        }
        // Condition changed for course participants list.
        if ($PAGE->bodyid === array_keys(self::BODY_IDS)[5] && get_config('tiny_cursive', "cursive-$courseid")) {
            $state = true;
        }

        return $state ? true : false;
    }

    /**
     * Check if a valid API key exists for cursive functionality
     *
     * @return bool True if valid API key exists, false otherwise
     */
    public static function has_api_key() {
        global $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');

        $secret       = get_config('tiny_cursive', 'secretkey');
        $apikey       = get_config('tiny_cursive', 'apiKey');
        $syncinterval = get_config('tiny_cursive', 'ApiSyncInterval') ?: 0;
        $now          = time();
        $nextsync     = strtotime('+5 minutes');

        if (empty($secret)) {
            if ($apikey !== false || $apikey !== "0") {
                set_config('apiKey', false, 'tiny_cursive');
            }
            if ($syncinterval < $now) {
                set_config('ApiSyncInterval', $nextsync, 'tiny_cursive');
            }
            return false;
        }

        if ($syncinterval <= $now) {
            $response = cursive_approve_token();
            $data      = json_decode($response);
            $newkey = (!empty($data->status) && $data->status) ? $data->status : false;

            if ($newkey != boolval($apikey)) {
                set_config('apiKey', $newkey, 'tiny_cursive');
            }
            set_config('ApiSyncInterval', $nextsync, 'tiny_cursive');
            $apikey = $newkey;
        }

        return boolval($apikey);
    }


    /**
     * Determines if a submission is resubmittable based on upload and analytics data
     *
     * @param array|object $data Data containing uploaded, effort_ratio and total_time_seconds fields
     * @param int $fileid ID of the file record to check upload status
     * @return bool True if resubmittable, false otherwise
     */
    public static function is_resubmitable($data, $fileid) {
        global $DB;

        if (!self::has_api_key()) {
            return false;
        }

        $data = (object) $data;

        $upload = $DB->get_record('tiny_cursive_files', ['id' => $fileid], 'uploaded', IGNORE_MISSING);
        $upload = $upload ? intval($upload->uploaded) : 0;

        $effort = intval($data->effort_ratio ?? 9999999); // Default to high value if not set, it is possible to get effort 0.
        $analytics = intval($data->total_time_seconds ?? 0);

        return ($upload > 0 && ($effort === 9999999 || $analytics === 0));
    }

    /**
     * Check if the current user is a teacher or admin in the given context
     *
     * @param \context $context The context to check roles in
     * @return bool True if user is teacher/admin, false otherwise
     */
    public static function is_teacher_admin($context) {

        global $USER;

        if (is_siteadmin($USER)) {
                return true;
        }
        // Get roles for user in given context.
        if (has_capability('tiny/cursive:view', $context, $USER->id, false)) {
            return true;
        }

        return false;
    }

    /**
     * Saves an auto-save record for cursive content
     *
     * @param array $params Parameters containing:
     *                      - cmid: Course module ID
     *                      - resourceid: Resource identifier
     *                      - courseid: Course ID
     *                      - original_content: Content to save
     *                      - questionid: Optional question ID
     * @return int|bool The new record ID or false on failure
     */
    public static function cursive_auto_save($params) {
        global $DB, $USER;
        if (self::no_difference($params) || empty(self::normalize_string($params['originalText']))) {
            return false;
        }
        try {
            $autosave = new \stdClass();
            $autosave->userid = $USER->id;
            $autosave->cmid = $params['cmid'];
            $autosave->modulename = $params['modulename'] . "_autosave";
            $autosave->resourceid = $params['resourceId'];
            $autosave->courseid = $params['courseId'];
            $autosave->usercomment = trim($params['originalText']);
            $autosave->questionid = $params['questionid'];
            $autosave->timemodified = time();
            return $DB->insert_record('tiny_cursive_comments', $autosave);
        } catch (\dml_exception $e) {
            return false;
        }
    }

    /**
     * Checks if there is a difference between the current content and previously saved content
     *
     * @param array $params Parameters containing:
     *                      - originalText: Current content to compare
     *                      - cmid: Course module ID
     *                      - resourceId: Resource identifier
     *                      - modulename: Module name
     *                      - questionid: Optional question ID
     * @return bool True if content has changed, false if same
     */
    public static function no_difference($params) {
        global $DB, $USER;
        $record = null;
        if ($params['questionid']) {
            $record = $DB->get_records('tiny_cursive_comments', [
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'] . "_autosave",
                'resourceid' => $params['resourceId'],
                'userid' => $USER->id,
                'questionid' => $params['questionid'],
                'courseid' => $params['courseId'],
            ], 'timemodified DESC', 'usercomment', 0, 1);
            $record = reset($record);
        } else {
            $record = $DB->get_records('tiny_cursive_comments', [
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'] . "_autosave",
                'resourceid' => $params['resourceId'],
                'userid' => $USER->id,
                'courseid' => $params['courseId'],
            ], 'timemodified DESC', 'usercomment', 0, 1);
            $record = reset($record);
        }

        if ($record) {
            $a = self::normalize_string($record->usercomment);
            $b = self::normalize_string($params['originalText']);
            return strcasecmp($a, $b) === 0;
        }

        return false;
    }

    /**
     * Normalizes a string by converting HTML entities, removing non-breaking spaces,
     * and standardizing whitespace
     *
     * @param string $str The string to normalize
     * @return string The normalized string
     */
    public static function normalize_string($str) {
        $str = html_entity_decode($str, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $str = preg_replace('/[\xC2\xA0]/', ' ', $str); // Replace NBSP with normal space.
        $str = preg_replace('/\s+/', ' ', $str); // Normalize multiple spaces.
        return trim($str);
    }

    /**
     * Get rubrics associated with a course module and course
     *
     * @param string $component The course module ID
     * @param \stdClass $context The course ID
     * @return array Array of rubric records containing id and name
     */
    public static function get_rubrics($component, $context, $area) {

        $gradingmanager = get_grading_manager($context, $component, self::RUBRIC_AREA[$area]);
        $controller = $gradingmanager->get_active_controller();

        if (!$controller) {
            return [];
        }
        $definition = $controller->get_definition();

        return array_values($definition->rubric_criteria ?? []);
    }

    /**
     * Extracts the question ID from an editor ID string
     *
     * @param string $editorid The editor ID containing question information
     * @return int|null The question ID if found, null otherwise
     */
    public static function get_question_id($editorid) {
        $editoridarr = explode(':', $editorid);
        if (count($editoridarr) > 1) {
            $uniqueid = substr($editoridarr[0] . "\n", 1);
            $slot = substr($editoridarr[1] . "\n", 0, -11);
            $quba = question_engine::load_questions_usage_by_activity($uniqueid);
            $question = $quba->get_question($slot, false);
            return $question->id;
        }
        return 0;
    }
}
