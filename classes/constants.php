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
    public const NAMES = ["assign", "forum", "quiz", "lesson", "oublog"];


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
            'page-mod-oublog-viewpost'      => ['append_oublogs_post', 'oublog'],
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

        $secret   = get_config('tiny_cursive', 'secretkey');
        $interval = get_config('tiny_cursive', 'ApiSyncInterval') > time();
        $apikey   = get_config('tiny_cursive', 'apiKey');

        if (!$interval && !empty($secret) ) {
            $key = cursive_approve_token();
            $key = json_decode($key);
            $apikey = $key->status ?? false;
            set_config('apiKey', $apikey, 'tiny_cursive');
            set_config('ApiSyncInterval', strtotime('+5 minutes'), 'tiny_cursive');
        }

        return boolval($apikey);
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
}