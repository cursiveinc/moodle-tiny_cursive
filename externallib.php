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

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_cursive\tiny_cursive_data;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die;

require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once(__DIR__ . '/locallib.php');

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class cursive_json_func_data extends external_api {
    /**
     * get_user_list_parameters.
     *
     * @return external_function_parameters
     */
    public static function get_user_list_parameters() {
        return new external_function_parameters(
            [
                'page' => new external_value(PARAM_INT, '', VALUE_DEFAULT, null),
                'courseid' => new external_value(PARAM_INT, 'Course id', VALUE_DEFAULT, null),
            ],
        );
    }

    /**
     * Get list of users
     *
     * @param int|null $page Page number
     * @param int|null $courseid ID of the course
     * @return false|string JSON encoded list of users or false on failure
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_user_list($page, $courseid) {

        global $DB;

        // Validate parameters.
        $params = self::validate_parameters(
            self::get_user_list_parameters(),
            [
                'page' => $page,
                'courseid' => $courseid,
            ],
        );

        // Get course context.
        $cm = $DB->get_record('course_modules', ['course' => $params['courseid']], '*', MUST_EXIST);
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);
        // Get the list of users in the course.
        $users = tiny_cursive_data::get_courses_users($params);

        // Return the user list as JSON.
        return json_encode($users);
    }


    /**
     * get_user_list_returns
     *
     * @return external_value
     */
    public static function get_user_list_returns() {
        return new external_value(PARAM_TEXT, 'All quizzes');
    }

    /**
     * get_module_list_parameters
     *
     * @return external_function_parameters
     */
    public static function get_module_list_parameters() {
        return new external_function_parameters(
            [
                'page' => new external_value(PARAM_INT, 'pagenumber', VALUE_DEFAULT, null),
                'courseid' => new external_value(PARAM_INT, 'Course id', VALUE_DEFAULT, null),
            ],
        );
    }

    /**
     * Get list of modules in a course
     *
     * @param int|null $page Page number
     * @param int|null $courseid ID of the course
     * @return false|string JSON encoded list of modules or false on failure
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_module_list($page, $courseid) {

        global $CFG, $DB;
        require_once($CFG->libdir . '/accesslib.php');

        // Validate parameters.
        $params = self::validate_parameters(
            self::get_user_list_parameters(), // This should probably be self::get_module_list_parameters() if it exists.
            [
                'page' => $page,
                'courseid' => $courseid,
            ],
        );

        // Get course context.
        $cm = $DB->get_record('course_modules', ['course' => $params['courseid']], '*', MUST_EXIST);
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);
        // Get the list of modules in the course.
        $modules = tiny_cursive_data::get_courses_modules($params);

        // Return the module list as JSON.
        return json_encode($modules);
    }



     /**
      * Returns description of get_module_list() result value
      *
      * @return external_value The return value definition for module list response
      */
    public static function get_module_list_returns() {
        return new external_value(PARAM_TEXT, 'All quizzes');
    }

     /**
      * Returns the parameters definition for cursive_user_comments_func
      *
      * @return external_function_parameters Parameters definition for storing user comments
      */
    public static function cursive_user_comments_func_parameters() {
        return new external_function_parameters(
            [
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
                'resourceid' => new external_value(PARAM_INT, 'resourceid', VALUE_DEFAULT, 0),
                'courseid' => new external_value(PARAM_INT, 'courseid', VALUE_DEFAULT, 0),
                'usercomment' => new external_value(PARAM_TEXT, 'usercomment', VALUE_DEFAULT, null),
                'timemodified' => new external_value(PARAM_INT, 'timemodified', VALUE_DEFAULT, 0),
                'editorid' => new external_value(PARAM_TEXT, 'editorid', VALUE_DEFAULT, ''),
            ],
        );
    }

    /**
     * Store user comments for cursive writing
     *
     * @param string $modulename The name of the module
     * @param int $cmid Course module ID
     * @param int $resourceid Resource ID
     * @param int $courseid Course ID
     * @param string $usercomment The user's comment text
     * @param int $timemodified Time when comment was modified
     * @param string $editorid Editor instance ID
     * @return bool True if comment saved successfully, false otherwise
     * @throws coding_exception If parameters are invalid
     * @throws moodle_exception If user lacks required capabilities
     */
    public static function cursive_user_comments_func(
        $modulename,
        $cmid,
        $resourceid,
        $courseid,
        $usercomment,
        $timemodified,
        $editorid,
    ) {
        global $DB, $USER, $CFG;

        $params = self::validate_parameters(
            self::cursive_user_comments_func_parameters(),
            [
                'modulename' => $modulename,
                'cmid' => $cmid,
                'resourceid' => $resourceid,
                'courseid' => $courseid,
                'usercomment' => $usercomment,
                'timemodified' => $timemodified,
                'editorid' => $editorid,
            ],
        );
        require_once($CFG->libdir . '/accesslib.php');
        // Capability check.
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability("tiny/cursive:write", $context);

        $userid = $USER->id;
        $editoridarr = explode(':', $params['editorid']);
        if (count($editoridarr) > 1) {
            $uniqueid = substr($editoridarr[0] . "\n", 1);
            $slot = substr($editoridarr[1] . "\n", 0, -11);
            $quba = question_engine::load_questions_usage_by_activity($uniqueid);
            $question = $quba->get_question($slot, false);
            $questionid = $question->id;
        }
        $dataobject = new stdClass();
        $dataobject->userid = $userid;
        $dataobject->cmid = $params['cmid'];
        $dataobject->modulename = $params['modulename'];
        $dataobject->resourceid = $params['resourceid'];
        $dataobject->courseid = $params['courseid'];
        $dataobject->questionid = $questionid ?? 0;
        $dataobject->usercomment = $params['usercomment'];
        $dataobject->timemodified = $params['timemodified'];

        try {
            $DB->insert_record('tiny_cursive_comments', $dataobject);
            return true;
        } catch (moodle_exception $e) {
            echo $e;
            return false;
        }
    }

    /**
     * Returns the expected return value for the user comments function
     *
     * @return external_value The return value definition for user comments response
     */
    public static function cursive_user_comments_func_returns() {
        return new external_value(PARAM_BOOL, 'All User Comments');
    }


    /**
     * cursive_approve_token_func_parameters
     *
     * @return external_function_parameters
     */
    public static function cursive_approve_token_func_parameters() {
        return new external_function_parameters(
            [
                'token' => new external_value(PARAM_TEXT, 'usertoken', VALUE_DEFAULT, ''),
            ],
        );
    }

    /**
     * Verifies and approves a token by sending it to a remote server for validation
     *
     * @param string $token The token to verify and approve
     * @return bool|string Returns the server response if successful, false on failure
     * @throws coding_exception If parameters are invalid
     * @throws dml_exception If there is a database error
     * @throws moodle_exception If token verification fails or there are other errors
     */
    public static function cursive_approve_token_func($token) {
        global $CFG;
        require_once("$CFG->libdir/filelib.php");
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');
        $params = self::validate_parameters(
            self::cursive_approve_token_func_parameters(),
            [
                'token' => $token,
            ],
        );
        // Check if the user has the required capability.
        $context = context_system::instance(); // Assuming a system-wide capability check.
        self::validate_context($context);
        require_capability('tiny/cursive:editsettings', $context);

        $remoteurl = get_config('tiny_cursive', 'python_server') . '/verify-token';
        $moodleurl = $CFG->wwwroot;

        $result = cursive_approve_token($params['token'], $moodleurl, $remoteurl);

        return $result;
    }


    /**
     * Returns the expected return value for the token approval function
     *
     * @return external_value The return value definition for token approval response
     */
    public static function cursive_approve_token_func_returns() {
        return new external_value(PARAM_TEXT, 'Token Approved');
    }

    /**
     * Returns the parameters definition for get_comment_link function
     *
     * @return external_function_parameters Parameters definition for get_comment_link
     */
    public static function get_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'questionid' => new external_value(PARAM_INT, 'questionid', VALUE_DEFAULT, null),
                'userid' => new external_value(PARAM_INT, 'userid', VALUE_DEFAULT, null),
            ],
        );
    }

    /**
     * Retrieves comment links and associated data for a given resource
     *
     * @param int $id The resource ID
     * @param string $modulename The name of the module (e.g. 'quiz')
     * @param int $cmid The course module ID
     * @param int $questionid The question ID
     * @param int $userid The user ID
     * @return string JSON encoded array containing comment data and user writing metrics
     * @throws coding_exception If parameters are invalid
     * @throws dml_exception If there is a database error
     * @throws invalid_parameter_exception If parameters fail validation
     * @throws moodle_exception If capability check fails
     */
    public static function get_comment_link($id, $modulename, $cmid, $questionid, $userid) {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/accesslib.php');
        require_once($CFG->dirroot . '/question/lib.php');
        $params = self::validate_parameters(
            self::get_comment_link_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
                'questionid' => $questionid,
                'userid' => $userid,
            ],
        );

        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability("tiny/cursive:view", $context);

        if ($params['modulename'] == 'quiz') {
            $data['filename'] = '';
            $conditions = [
                "resourceid" => $params['id'],
                "cmid" => $params['cmid'],
                "questionid" => $params['questionid'],
                'userid' => $params['userid'],
            ];
            $table = 'tiny_cursive_comments';
            $recs = $DB->get_records($table, $conditions);
            $sql = 'SELECT filename, content, userid, id AS file_id
                      FROM {tiny_cursive_files}
                     WHERE resourceid = :resourceid AND cmid = :cmid
                           AND modulename = :modulename AND questionid=:questionid AND userid = :userid ';
            $filename = $DB->get_record_sql(
                $sql,
                [
                    'resourceid' => $params['id'],
                    'cmid' => $params['cmid'],
                    'modulename' => $params['modulename'],
                    'questionid' => $params['questionid'],
                    "userid" => $params['userid'],
                ],
            );

            $data['filename'] = $filename->filename;
            $data['questionid'] = $params['questionid'];

            if ($data['filename']) {
                $sql = 'SELECT id AS fileid
                          FROM {tiny_cursive_files}
                         WHERE userid = :userid ORDER BY id ASC LIMIT 1';
                $ffile = $DB->get_record_sql($sql, ['userid' => $filename->userid]);

                if ($ffile->fileid == $filename->file_id) {
                    $data['first_file'] = 1;
                } else {
                    $data['first_file'] = 0;
                }
            }

            if ($filename->file_id) {
                $sql = 'SELECT uwr.*, diff.meta as effort_ratio
                          FROM {tiny_cursive_user_writing} uwr
                     LEFT JOIN {tiny_cursive_writing_diff} diff ON uwr.file_id = diff.file_id
                         WHERE uwr.file_id = :fileid';
                $report = $DB->get_record_sql($sql, ['fileid' => $filename->file_id]);
                if (isset($report->effort_ratio)) {
                    $report->effort_ratio = intval(floatval($report->effort_ratio) * 100);
                }
                $data['score'] = $report->score;
                $data['total_time_seconds'] = $report->total_time_seconds;
                $data['word_count'] = $report->word_count;
                $data['words_per_minute'] = $report->words_per_minute;
                $data['backspace_percent'] = $report->backspace_percent;
                $data['copy_behavior'] = $report->copy_behavior;
                $data['key_count'] = $report->key_count;
                $data['file_id'] = $filename->file_id;
                $data['character_count'] = $report->character_count;
                $data['characters_per_minute'] = $report->characters_per_minute;
                $data['keys_per_minute'] = $report->keys_per_minute;
                $data['effort_ratio'] = $report->effort_ratio ?? 0;
            }
            $usercomment = [];
            if ($recs) {
                foreach ($recs as $key => $rec) {
                    array_push($usercomment, $rec);
                }
                return json_encode(['usercomment' => $usercomment, 'data' => $data]);

            } else {
                return json_encode(['usercomment' => 'comments', 'data' => $data]);
            }
        } else {
            $conditions = ["resourceid" => $params['id']];
            $table = 'tiny_cursive_comments';
            $recs = $DB->get_records($table, $conditions);

            $attempts = "SELECT  uw.total_time_seconds ,uw.word_count ,uw.words_per_minute,
                                 uw.backspace_percent,uw.score,uw.copy_behavior,uf.resourceid,
                                 uf.modulename,uf.userid, uf.filename,
                           FROM {tiny_cursive_user_writing} uw
                           JOIN {tiny_cursive_files} uf ON uw.file_id = uf.id
                          WHERE uf.resourceid = :id
                                AND uf.cmid = :cmid
                                AND uf.modulename = :modulename";
            $data = $DB->get_record_sql($attempts, [
                'id' => $params['id'],
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'],
            ]);

            if (!isset($data->filename)) {
                $sql = 'SELECT filename from {tiny_cursive_files}
                         WHERE resourceid = :resourceid
                               AND cmid = :cmid
                               AND modulename = :modulename';
                $filename = $DB->get_record_sql($sql, [
                    'resourceid' => $params['id'],
                    'cmid' => $params['cmid'],
                    'modulename' => $params['modulename'],
                ]);

                $data['filename'] = $filename->filename;

            }

            $usercomment = [];
            if ($recs) {
                foreach ($recs as $key => $rec) {
                    array_push($usercomment, $rec);
                }
                return json_encode(['usercomment' => $usercomment, 'data' => $data]);

            } else {
                return json_encode(['usercomment' => 'comments', 'data' => $data]);
            }
        }
    }


    /**
     * get_comment_link_returns
     *
     * @return external_value
     */
    public static function get_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * get_forum_comment_link_parameters
     *
     * @return external_function_parameters
     */
    public static function get_forum_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
            ],
        );
    }


    /**
     * Get forum comment link data
     *
     * @param int $id The resource ID
     * @param string $modulename The name of the module
     * @param int|null $cmid The course module ID
     * @return string JSON encoded comment and data
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_forum_comment_link($id, $modulename, $cmid = null) {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/accesslib.php');
        require_once($CFG->dirroot . '/question/lib.php');

        $params = self::validate_parameters(
            self::get_forum_comment_link_parameters(),
            [
                'id' => (int) $id,
                'modulename' => $modulename,
                'cmid' => (int) $cmid,
            ],
        );

        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        $conditions = ["resourceid" => $params['id'], 'modulename' => "forum"];
        $recs = $DB->get_records('tiny_cursive_comments', $conditions);

        $attempts = "SELECT uw.total_time_seconds, uw.word_count, uw.words_per_minute,
                            uw.backspace_percent, uw.score, uw.copy_behavior, uf.resourceid,
                            uf.modulename, uf.userid, uf.filename, uw.file_id,
                            diff.meta AS effort_ratio
                      FROM {tiny_cursive_user_writing} uw
                      JOIN {tiny_cursive_files} uf ON uw.file_id = uf.id
                 LEFT JOIN {tiny_cursive_writing_diff} diff ON uw.file_id = diff.file_id
                     WHERE uf.resourceid = :id
                           AND uf.cmid = :cmid
                           AND uf.modulename = :modulename";

        $data =
            $DB->get_record_sql(
                $attempts,
                ['id' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
            );
        if (isset($data->effort_ratio)) {
            $data->effort_ratio = intval(floatval($data->effort_ratio) * 100);
        }
        $data = (array) $data;
        $data['first_file'] = 0;

        if (!isset($data['filename'])) {
            $sql = 'SELECT id as file_id, filename,userid, content
                      FROM {tiny_cursive_files}
                     WHERE resourceid = :resourceid
                            AND cmid = :cmid
                            AND modulename = :modulename';
            $filename = $DB->get_record_sql(
                $sql,
                ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
            );

            $data['filename'] = $filename->filename;
            $data['file_id'] = $filename->file_id;

            $sql = 'SELECT *
                      FROM {tiny_cursive_files}
                     WHERE userid = :userid ORDER BY id ASC LIMIT 1';
            $firstfile = $DB->get_record_sql($sql, ['userid' => $filename->userid]);
            if ($firstfile->id == $filename->file_id) {
                $data['first_file'] = 1;
            }
        }

        $sql = 'SELECT *
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid ORDER BY id ASC LIMIT 1';
        $firstfile = $DB->get_record_sql($sql, ['userid' => $data['userid']]);

        if ($firstfile->id == $filename->file_id) {
            $data['first_file'] = 1;
        }

        $usercomment = [];
        if ($recs) {
            foreach ($recs as $key => $rec) {
                array_push($usercomment, $rec);
            }
            return json_encode(['usercomment' => $usercomment, 'data' => $data]);
        } else {
            return json_encode(['usercomment' => 'comments', 'data' => $data]);
        }

    }

    /**
     * Returns description of get_forum_comment_link() result value
     *
     * @return external_value The return value definition for forum comment link response
     */
    public static function get_forum_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns description of get_quiz_comment_link() parameters
     *
     * @return external_function_parameters Parameters definition for quiz comment link
     */
    public static function get_quiz_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'questionid' => new external_value(PARAM_INT, 'questionid', VALUE_DEFAULT, null),
            ],
        );
    }

    /**
     * Get quiz comment link data including user comments and writing analytics
     *
     * @param int $id The resource ID
     * @param string $modulename The module name (e.g. 'quiz')
     * @param int|null $cmid The course module ID
     * @param int|null $questionid The question ID for quiz questions
     * @return string JSON encoded array containing user comments and analytics data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_quiz_comment_link(
        $id,
        $modulename,
        $cmid = null,
        $questionid = null,
    ) {
        global $DB, $CFG;
        require_once($CFG->dirroot . '/lib/accesslib.php');
        require_once($CFG->dirroot . '/question/lib.php');
        $params = self::validate_parameters(
            self::get_comment_link_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
                'questionid' => $questionid,
            ],
        );

        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        if ($modulename == 'quiz') {
            $conditions = ["resourceid" => $params['id'], "cmid" => $params['cmid'], "questionid" => $params['questionid']];
            $table = 'tiny_cursive_comments';
            $recs = $DB->get_records($table, $conditions);

            $attempts = "SELECT uw.total_time_seconds ,uw.word_count ,uw.words_per_minute,
                                uw.backspace_percent,uw.score,uw.copy_behavior,uf.resourceid ,
                                uf.modulename,uf.userid, uf.filename
                           FROM {tiny_cursive_user_writing} uw
                           JOIN {tiny_cursive_files} uf ON uw.file_id =uf.id
                          WHERE uf.resourceid = :id
                                AND uf.cmid = :cmid
                                AND uf.modulename = :modulename";
            $data = $DB->get_record_sql(
                $attempts,
                ['id' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
            );

            if (!isset($data->filename)) {
                $sql = 'SELECT filename
                          FROM {tiny_cursive_files}
                         WHERE resourceid = :resourceid
                               AND cmid = :cmid
                               AND modulename = :modulename';
                $filename = $DB->get_record_sql(
                    $sql,
                    ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
                );

                $data['filename'] = $filename->filename;
            }

        } else {
            $conditions = ["resourceid" => $params['id']];
            $table = 'tiny_cursive_comments';
            $recs = $DB->get_records($table, $conditions);

            $attempts = "SELECT uw.total_time_seconds ,uw.word_count ,uw.words_per_minute,
                                uw.backspace_percent,uw.score,uw.copy_behavior,uf.resourceid ,
                                uf.modulename,uf.userid, uf.filename
                           FROM {tiny_cursive_user_writing} uw
                           JOIN {tiny_cursive_files} uf ON uw.file_id =uf.id
                          WHERE uf.resourceid = :id
                                AND uf.cmid = :cmid
                                AND uf.modulename = :modulename ";
            $data = $DB->get_record_sql(
                $attempts,
                ['id' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
            );

            if (!isset($data->filename)) {
                $sql = 'SELECT filename
                          FROM {tiny_cursive_files}
                         WHERE resourceid = :resourceid
                               AND cmid = :cmid
                               AND modulename = :modulename';
                $filename = $DB->get_record_sql(
                    $sql,
                    ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
                );

                $data['filename'] = $filename->filename;
            }
        }
        $usercomment = [];
        if ($recs) {
            foreach ($recs as $key => $rec) {
                array_push($usercomment, $rec);
            }
            return json_encode(['usercomment' => $usercomment, 'data' => $data]);

        } else {
            return json_encode(['usercomment' => 'comments', 'data' => $data]);
        }
    }

    /**
     * Returns description of get_quiz_comment_link() result value
     *
     * @return external_value The return value definition for quiz comment link response
     */
    public static function get_quiz_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns the parameters definition for get_assign_comment_link function
     *
     * @return external_function_parameters Parameters definition for assignment comment link
     */
    public static function get_assign_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_REQUIRED),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_REQUIRED),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED),
            ],
        );
    }

    /**
     * Get assignment comment link
     *
     * @param int $id The assignment submission ID
     * @param string $modulename The module name
     * @param int $cmid The course module ID
     * @return false|string JSON encoded comment data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_assign_comment_link($id, $modulename, $cmid) {
        global $DB;

        $params = self::validate_parameters(
            self::get_assign_comment_link_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ],
        );

        // Check if user has capability to view assignment comments.
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        $recassignsubmission = $DB->get_record('assign_submission', ['id' => $params['id']], '*', false);
        $userid = $recassignsubmission->userid;
        $conditions = ["userid" => $userid, 'modulename' => $params['modulename'], 'cmid' => $params['cmid']];
        $recs = $DB->get_records('tiny_cursive_comments', $conditions);
        $usercomment = [];
        if ($recs) {
            foreach ($recs as $rec) {
                array_push($usercomment, $rec);
            }
            return json_encode($usercomment);

        } else {
            return json_encode([['usercomment' => 'comments']]);
        }
    }

    /**
     * Returns description of get_assign_comment_link() result value
     *
     * @return external_value The return value definition for assignment comment link response
     */
    public static function get_assign_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns the parameters definition for get_assign_grade_comment function
     *
     * @return external_function_parameters Parameters definition for assignment grade comment
     */
    public static function get_assign_grade_comment_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_REQUIRED),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_REQUIRED),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED),
            ],
        );
    }

    /**
     * Get assignment grade comment data
     *
     * @param int $id The user ID
     * @param string $modulename The module name
     * @param int $cmid The course module ID
     * @return false|string JSON encoded comment and data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_assign_grade_comment($id, $modulename, $cmid) {
        global $DB;

        $params = self::validate_parameters(
            self::get_assign_grade_comment_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ],
        );

        // Check if user has capability to view assignment comments.
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        $conditions = ["userid" => $params['id'], 'modulename' => $params['modulename'], 'cmid' => $params['cmid']];
        $table = 'tiny_cursive_comments';
        $recs = $DB->get_records($table, $conditions);

        $attempts = "SELECT uw.total_time_seconds, uw.word_count, uw.words_per_minute,
                            uw.backspace_percent, uw.score, uw.copy_behavior, uf.resourceid,
                            uf.modulename, uf.userid, uw.file_id, uf.filename,
                            diff.meta AS effort_ratio
                       FROM {tiny_cursive_user_writing} uw
                       JOIN {tiny_cursive_files} uf ON uw.file_id = uf.id
                  LEFT JOIN {tiny_cursive_writing_diff} diff ON uw.file_id = diff.file_id
                      WHERE uf.userid = :id
                            AND uf.cmid = :cmid
                            AND uf.modulename = :modulename";

        $data =
            $DB->get_record_sql(
                $attempts,
                [
                    'id' => $params['id'],
                    'cmid' => $params['cmid'],
                    'modulename' => $params['modulename'],
                ],
            );
        if (isset($data->effort_ratio)) {
            $data->effort_ratio = intval(floatval($data->effort_ratio) * 100);
        }
        $data = (array) $data;
        if (!isset($data['filename'])) {
            $sql = 'SELECT filename, content, id, userid
                      FROM {tiny_cursive_files}
                     WHERE userid = :userid
                            AND cmid = :cmid
                            AND modulename = :modulename';
            $filename = $DB->get_record_sql(
                $sql,
                ['userid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']],
            );

            $data['filename'] = $filename->filename;
            $data['file_id'] = $filename->id;
            $data['userid'] = $filename->userid;
        }
        if ($data['filename']) {

            $sql = 'SELECT id AS fileid
                      FROM {tiny_cursive_files}
                     WHERE userid = :userid ORDER BY id ASC LIMIT 1';
            $ffile = $DB->get_record_sql($sql, ['userid' => $data['userid']]);

            if ($ffile->fileid == $data['file_id']) {
                $data['first_file'] = 1;
            } else {
                $data['first_file'] = 0;
            }
        }

        $usercomment = [];
        if ($recs) {
            foreach ($recs as $key => $rec) {
                array_push($usercomment, $rec);
            }
            return json_encode(['usercomment' => $usercomment, 'data' => $data]);

        } else {
            return json_encode(['usercomment' => 'comments', 'data' => $data]);
        }
    }

    /**
     * Returns description of get_assign_grade_comment() result value
     *
     * @return external_value The return value definition for assignment grade comment response
     */
    public static function get_assign_grade_comment_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns parameters for getting user list submission statistics
     *
     * @return external_function_parameters Parameters definition for submission stats
     */
    public static function get_user_list_submission_stats_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'filename' => new external_value(PARAM_TEXT, 'filename', VALUE_DEFAULT, ''),
            ],
        );
    }

    /**
     * Get user list submission statistics
     *
     * @param int $id The user ID
     * @param string $modulename The module name
     * @param int $cmid The course module ID
     * @return false|string JSON encoded submission statistics
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function get_user_list_submission_stats($id, $modulename, $cmid) {

        $params = self::validate_parameters(
            self::get_user_list_submission_stats_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ],
        );
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability("tiny/cursive:view", $context);

        $rec = tiny_cursive_get_user_submissions_data($params['id'], $params['modulename'], $params['cmid']);

        return json_encode($rec);
    }

    /**
     * Returns description of get_user_list_submission_stats() result value
     *
     * @return external_value The return value definition for submission stats response
     */
    public static function get_user_list_submission_stats_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns parameters for filtering writing data
     *
     * @return external_function_parameters Parameters definition for filtering writing data
     */
    public static function cursive_filtered_writing_func_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_TEXT, 'id', VALUE_REQUIRED, 0),
            ],
        );
    }

    /**
     * Get filtered writing data for a course
     *
     * @param int $id Course ID
     * @return string|false JSON encoded data containing filtered writing statistics
     * @throws coding_exception If parameters are invalid
     * @throws dml_exception If database query fails
     * @throws invalid_parameter_exception If parameters validation fails
     * @throws moodle_exception If context validation fails
     */
    public static function cursive_filtered_writing_func($id) {
        global $DB, $USER;

        $vparams = self::validate_parameters(
            self::cursive_filtered_writing_func_parameters(),
            [
                'id' => $id,
            ],
        );

        $userid = $USER->id;
        $params = [];

        $cm = $DB->get_record('course_modules', ['course' => $vparams['id']], '*', IGNORE_MULTIPLE);
        $context = context_module::instance($cm->id);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        $attempts = "SELECT qa.resourceid AS attemptid,qa.timemodified,uw.score,uw.copy_behavior, u.id AS userid,
                            u.firstname, u.lastname, u.email,  qa.cmid AS cmid ,qa.courseid,qa.filename,uw.word_count,
                            uw.words_per_minute , uw.total_time_seconds ,uw.backspace_percent
                       FROM {user} u
                       JOIN {tiny_cursive_files} qa ON u.id = qa.userid
                  LEFT JOIN {tiny_cursive_user_writing} uw ON qa.id = uw.file_id
                      WHERE qa.userid! = 1";

        if ($userid != 0) {
            $attempts .= " AND  qa.userid = :userid";
            $params['userid'] = $userid;
        }
        if ($vparams['id'] != 0) {
            $attempts .= "  AND qa.courseid = :id";
            $params['id'] = $vparams['id'];
        }
        $res = $DB->get_records_sql($attempts, $params);
        $recs = [];
        foreach ($res as $key => $value) {
            $value->timemodified = date("l jS \of F Y h:i:s A", $value->timemodified);
            $value->icon = 'fa fa-circle-o';
            $value->color = 'grey';
            array_push($recs, $value);
        }
        $resncount = ['count' => count($res), 'data' => $recs];
        return json_encode($resncount);
    }

    /**
     * Returns description of method result value for cursive_filtered_writing_func
     *
     * @return external_value The return value definition for filtered writing data
     */
    public static function cursive_filtered_writing_func_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * Returns parameters for store_user_writing method
     *
     * @return external_function_parameters Parameters definition for storing user writing data
     */
    public static function store_user_writing_parameters() {
        return new external_function_parameters(self::storing_user_writing_param());
    }

    /**
     * Stores user writing data in the database
     *
     * @param int $personid User ID
     * @param int $fileid File ID to store data for
     * @param int $charactercount Total number of characters typed
     * @param int $totaltimeseconds Total time spent writing in seconds
     * @param float $charactersperminute Characters typed per minute
     * @param int $keycount Total number of keystrokes
     * @param float $keysperminute Keystrokes per minute
     * @param int $wordcount Total number of words written
     * @param float $wordsperminute Words written per minute
     * @param float $backspacepercent Percentage of backspace usage
     * @param string $copybehavior Copy/paste behavior flag
     * @param float $score Writing score
     * @param  int $qualityaccess Quality access flag
     * @return array Array containing status and message
     */
    public static function store_user_writing(
        $personid,
        $fileid,
        $charactercount,
        $totaltimeseconds,
        $charactersperminute,
        $keycount,
        $keysperminute,
        $wordcount,
        $wordsperminute,
        $backspacepercent,
        $copybehavior,
        $score,
        $qualityaccess,
    ) {
        global $DB;

        $params = self::validate_parameters(
            self::store_user_writing_parameters(),
            [
                'person_id' => $personid,
                'file_id' => $fileid,
                'character_count' => $charactercount,
                'total_time_seconds' => $totaltimeseconds,
                'characters_per_minute' => $charactersperminute,
                'key_count' => $keycount,
                'keys_per_minute' => $keysperminute,
                'word_count' => $wordcount,
                'words_per_minute' => $wordsperminute,
                'backspace_percent' => $backspacepercent,
                'copy_behavior' => $copybehavior,
                'score' => $score,
                'quality_access' => $qualityaccess,
            ],
        );

        try {

            $context = context_system::instance();
            // Assuming a system-wide capability check.
            self::validate_context($context);
            require_capability('tiny/cursive:editsettings', $context);

            $backspacepercent = round($params['backspace_percent'], 4);

            // Check if the record exists.
            $recordexists = $DB->record_exists('tiny_cursive_user_writing', ['file_id' => $params['file_id']]);
            // Retrieve existing data or initialize a new stdClass object.
            $data =
                $recordexists ? $DB->get_record('tiny_cursive_user_writing', ['file_id' => $params['file_id']]) : new stdClass();

            // Populate data attributes.
            $data->file_id = $params['file_id'];
            $data->total_time_seconds = $params['total_time_seconds'];
            $data->key_count = $params['key_count'];
            $data->keys_per_minute = $params['keys_per_minute'];
            $data->character_count = $params['character_count'];
            $data->characters_per_minute = $params['characters_per_minute'];
            $data->word_count = $params['word_count'];
            $data->words_per_minute = $params['words_per_minute'];
            $data->backspace_percent = $params['backspace_percent'];
            $data->score = $params['score'];
            $data->copy_behavior = $params['copy_behavior'];
            $data->quality_access = $params['quality_access'];

            // Update or insert the record.
            if ($recordexists) {
                $DB->update_record('tiny_cursive_user_writing', $data);
            } else {
                $DB->insert_record('tiny_cursive_user_writing', $data);
            }

            // Return success status.
            return [
                'status' => get_string('success', 'tiny_cursive'),
                'message' => get_string('data_save', 'tiny_cursive'),
            ];
        } catch (dml_exception $e) {
            // Return failure status with error message.
            return [
                'status' => get_string('failed', 'tiny_cursive'),
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Returns description of method result value for store_user_writing
     *
     * @return external_single_structure Returns structure containing status and message
     */
    public static function store_user_writing_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'status message'),
            'message' => new external_value(PARAM_TEXT, 'message'),
        ]);
    }


    /**
     * Returns parameters for getting reply JSON
     *
     * @return external_function_parameters Parameters definition for getting reply JSON
     */
    public static function cursive_get_reply_json_parameters() {
        return new external_function_parameters([
            'filepath' => new external_value(PARAM_TEXT, 'filepath', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Get reply JSON data for a file
     *
     * @param string $filepath Path to the file to get reply JSON for
     * @return stdClass Object containing status and data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function cursive_get_reply_json($filepath) {
        global $DB;

        $params = self::validate_parameters(
            self::cursive_get_reply_json_parameters(),
            [
                'filepath' => $filepath,
            ],
        );
        $parts = explode('_', $params['filepath']);
        $cmid = $parts[2];

        $context = context_module::instance($cmid);
        self::validate_context($context);
        require_capability("tiny/cursive:writingreport", $context);

        $data = new stdClass;
        try {

            $filedata = $DB->get_record('tiny_cursive_files', ['filename' => $params['filepath']]);
            $content = $filedata->content ? $filedata->content : $content = false;
            $data->status = true;

            if ($content === false) {
                $data->status = false;
                $content = 'File not found! or Failed to read file';
            }

            $data->data = $content;
        } catch (moodle_exception $e) {
            $data->data = $e->getMessage();
        }
        return $data;
    }

    /**
     * Returns description of method result value for cursive_get_reply_json
     *
     * @return external_single_structure Returns structure containing status and data
     */
    public static function cursive_get_reply_json_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, "file status"),
            'data' => new external_value(PARAM_TEXT, 'Reply Json'),
        ]);
    }

    /**
     * Method storing_user_writing_param
     *
     * @return array array of parameters for storing data
     */
    public static function storing_user_writing_param() {
        return [
            'person_id' => new external_value(PARAM_INT, 'person or user id', VALUE_REQUIRED),
            'file_id' => new external_value(PARAM_INT, 'file_id', VALUE_REQUIRED),
            'character_count' => new external_value(PARAM_INT, 'character_count', VALUE_REQUIRED),
            'total_time_seconds' => new external_value(PARAM_INT, 'total_time_seconds', VALUE_REQUIRED),
            'characters_per_minute' => new external_value(PARAM_INT, 'characters_per_minute', VALUE_REQUIRED),
            'key_count' => new external_value(PARAM_INT, 'key_count', VALUE_REQUIRED),
            'keys_per_minute' => new external_value(PARAM_INT, 'keys per minutes', VALUE_REQUIRED),
            'word_count' => new external_value(PARAM_INT, 'word_count', VALUE_REQUIRED),
            'words_per_minute' => new external_value(PARAM_INT, 'words_per_minute', VALUE_REQUIRED),
            'backspace_percent' => new external_value(PARAM_FLOAT, 'backspace_percent', VALUE_REQUIRED),
            'copy_behavior' => new external_value(PARAM_FLOAT, 'copy_behavior', VALUE_REQUIRED),
            'score' => new external_value(PARAM_FLOAT, 'score', VALUE_DEFAULT, 0),
            'quality_access' => new external_value(PARAM_INT, 'quality_access', VALUE_DEFAULT, 0),
        ];

    }
    /**
     * Returns parameters for store_user_writing method
     *
     * @return external_function_parameters Parameters definition for storing user writing data
     */
    public static function cursive_get_analytics_parameters() {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED, 0, true),
            'fileid' => new external_value(PARAM_INT, 'file id', VALUE_REQUIRED, 0, true),
        ]);
    }

    /**
     * Get analytics data for a user submission
     *
     * @param int $cmid Course module ID
     * @param int $fileid File ID
     * @return array Analytics data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function cursive_get_analytics($cmid, $fileid) {
        global $DB;

        $vparams = self::validate_parameters(
            self::cursive_get_analytics_parameters(),
            [
                'cmid' => $cmid,
                'fileid' => $fileid,
            ],
        );

        $context = context_module::instance($vparams['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:writingreport', $context);

        $sql = "SELECT u.*, d.meta as effort_ratio, cf.userid userid
                  FROM {tiny_cursive_user_writing} u
             LEFT JOIN {tiny_cursive_writing_diff} d ON u.file_id = d.file_id
             LEFT JOIN {tiny_cursive_files} cf ON u.file_id = cf.id
                 WHERE u.file_id = :fileid";

        $params = ['fileid' => $vparams['fileid']];
        $rec = $DB->get_record_sql($sql, $params);
        if (isset($rec->effort_ratio)) {
            $rec->effort_ratio = intval(floatval($rec->effort_ratio) * 100);
        }

        $sql = 'SELECT id AS fileid
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid ORDER BY id ASC LIMIT 1';
        $ffile = $DB->get_record_sql($sql, ['userid' => $rec->userid]);
        if ($rec) {
            if ($ffile->fileid == $rec->file_id) {
                $rec->first_file = 1;
            } else {
                $rec->first_file = 0;
            }
        }

        return ['data' => json_encode($rec)];
    }

    /**
     * Returns parameters for store_quality_metrics method
     *
     * @return external_function_parameters Parameters definition for storing quality metrics data
     */
    public static function cursive_get_analytics_returns() {
        return new external_single_structure([
            'data' => new external_value(PARAM_TEXT, 'Record object'),
        ]);
    }

    /**
     * Returns parameters for store_user_writing method
     *
     * @return external_function_parameters Parameters definition for storing user writing data
     */
    public static function cursive_store_writing_differencs_parameters() {
        return new external_function_parameters([
            'fileid' => new external_value(PARAM_INT, 'file id', VALUE_REQUIRED, 0, true),
            'reconstructed_text' => new external_value(PARAM_TEXT, 'original writing contents', VALUE_REQUIRED, "", true),
            'submitted_text' => new external_value(PARAM_TEXT, 'writing html contents', VALUE_REQUIRED, "", true),
            'meta' => new external_value(PARAM_TEXT, 'meta data', VALUE_DEFAULT, null, true),
        ]);
    }

    /**
     * Store writing differences between reconstructed and submitted text
     *
     * @param int $fileid File identifier
     * @param string $reconstructedtext Original reconstructed text
     * @param string $submittedtext Final submitted text
     * @param string|null $meta Optional metadata
     */
    public static function cursive_store_writing_differencs($fileid, $reconstructedtext, $submittedtext, $meta = null) {
        global $DB;

        $params = self::validate_parameters(
            self::cursive_store_writing_differencs_parameters(),
            [
                'fileid' => $fileid,
                'reconstructed_text' => $reconstructedtext,
                'submitted_text' => $submittedtext,
                'meta' => $meta,
            ],
        );

        $context = context_system::instance(); // Assuming a system-wide capability check.
        self::validate_context($context);
        require_capability('tiny/cursive:editsettings', $context);

        $recordexists = $DB->record_exists('tiny_cursive_writing_diff', ['file_id' => $params['fileid']]);
        $record = $recordexists ? $DB->get_record('tiny_cursive_writing_diff', ['file_id' => $params['fileid']]) : new stdClass();
        $record->file_id = $params['fileid'];
        $record->reconstructed_text = $params['reconstructed_text'];
        $record->submitted_text = $params['submitted_text'];
        $record->meta = $params['meta']; // Add the meta field.

        try {

            if ($recordexists) {
                $DB->update_record('tiny_cursive_writing_diff', $record);
            } else {
                $DB->insert_record('tiny_cursive_writing_diff', $record);
            }

            return [
                'status' => get_string('success', 'tiny_cursive'),
                'message' => get_string('data_save', 'tiny_cursive'),
            ];
        } catch (moodle_exception $e) {
            // Handle the exception.
            return [
                'status' => get_string('failed', 'tiny_cursive'),
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Returns parameters for store_user_writing method
     *
     * @return external_function_parameters Parameters definition for storing user writing data
     */
    public static function cursive_store_writing_differencs_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status message'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }


    /**
     * Returns parameters for store_quality_metrics method
     *
     * @return external_single_structure Returns structure containing status and message
     */
    public static function cursive_get_writing_differencs_parameters() {
        return new external_function_parameters([
            'fileid' => new external_value(PARAM_INT, 'file id', VALUE_REQUIRED, 0, true),
        ]);
    }

    /**
     * Get writing differences for a user submission
     *
     * @param int $fileid File identifier
     * @return array Writing differences data
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     */
    public static function cursive_get_writing_differencs($fileid) {
        global $DB;

        $vparams = self::validate_parameters(
            self::cursive_get_writing_differencs_parameters(),
            [
                'fileid' => $fileid,
            ],
        );

        $filename = $DB->get_record(
            'tiny_cursive_files',
            ['id' => $vparams['fileid']],
            'filename',
        );
        $parts = explode('_', $filename->filename);
        $cmid = $parts[2];

        $context = context_module::instance($cmid);
        self::validate_context($context);
        require_capability("tiny/cursive:writingreport", $context);

        $sql = "SELECT WD.*, CF.cmid, CF.resourceid, CF.modulename, COUNT(CC.id) AS commentscount, CF.userid, CF.questionid
                  FROM {tiny_cursive_writing_diff} WD
                  JOIN {tiny_cursive_files} CF ON CF.id = WD.file_id
             LEFT JOIN {tiny_cursive_comments} CC ON CC.resourceid = CF.resourceid
                                                AND CC.modulename = CF.modulename
                                                AND CC.cmid = CF.cmid
                                                AND CC.userid = CF.userid
                                                AND CC.questionid = CF.questionid
                 WHERE WD.file_id = :fileid
              GROUP BY WD.id, CF.cmid, CF.resourceid, CF.modulename";

        $params = ['fileid' => $vparams['fileid']];
        $data = $DB->get_record_sql($sql, $params);
        if ($data) {
            $comments = $DB->get_records(
                'tiny_cursive_comments',
                [
                    'resourceid' => $data->resourceid,
                    'modulename' => $data->modulename,
                    'cmid' => $data->cmid,
                    'userid' => $data->userid,
                    'questionid' => $data->questionid,
                ],
            );
            $data->comments = $comments;
        }

        return ['data' => json_encode($data)];
    }

    /**
     * Returns description of method result value for cursive_get_writing_differencs
     *
     * @return external_single_structure Returns structure containing content data
     */
    public static function cursive_get_writing_differencs_returns() {
        return new external_single_structure([
            'data' => new external_value(PARAM_TEXT, 'content data'),
        ]);
    }

    /**
     * Returns parameters for generate_webtoken method
     *
     * @return external_function_parameters Parameters definition for generating web token
     */
    public static function generate_webtoken_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Generates a web token for authentication
     *
     * @return array Array containing the generated token
     */
    public static function generate_webtoken() {
        $token = tiny_cursive_create_token_for_user();
        if ($token) {
            set_config('cursivetoken', $token, 'tiny_cursive');
        }
        return ['token' => $token];
    }

    /**
     * Returns description of method result value for generate_webtoken
     *
     * @return external_single_structure Returns structure containing the generated token
     */
    public static function generate_webtoken_returns() {
        return new external_single_structure([
            'token' => new external_value(PARAM_TEXT, 'token'),
        ]);
    }

    /**
     * Returns parameters for write_local_to_json method
     *
     * @return external_function_parameters Parameters definition for writing local data to JSON
     */
    public static function write_local_to_json_parameters() {
        return new external_function_parameters(
            [
                'resourceId' => new external_value(PARAM_INT, 'resourceId', VALUE_DEFAULT, 0),
                'key' => new external_value(PARAM_TEXT, 'key detail', VALUE_DEFAULT, ""),
                'keyCode' => new external_value(PARAM_INT, 'key code ', VALUE_DEFAULT, 0),
                'event' => new external_value(PARAM_TEXT, 'event', VALUE_DEFAULT, 0),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
                'modulename' => new external_value(PARAM_TEXT, 'Modulename', VALUE_DEFAULT, ""),
                'editorid' => new external_value(PARAM_TEXT, 'editorid', VALUE_DEFAULT, ""),
                'json_data' => new external_value(PARAM_TEXT, 'JSON Data', VALUE_DEFAULT, ""),
                "originalText" => new external_value(PARAM_TEXT, 'original submission Text', VALUE_DEFAULT, ""),
            ],
        );
    }

    /**
     * Write localstorage jsonObject data to database
     *
     * @param int $resourceid Resource identifier
     * @param string|null $key Key detail
     * @param int|null $keycode Key code
     * @param string $event Event type
     * @param int $cmid Course module ID
     * @param string $modulename Module name
     * @param string|null $editorid Editor identifier
     * @param array $jsondata JSON data to write
     * @param string $originaltext Original submission text
     * @return string name of the saved record.
     */
    public static function write_local_to_json(
        $resourceid = 0,
        $key = null,
        $keycode = null,
        $event = 'keyUp',
        $cmid = 0,
        $modulename = 'quiz',
        $editorid = null,
        $jsondata = [],
        $originaltext = ""
    ) {
        global $USER, $DB, $CFG;

        $params = self::validate_parameters(
            self::write_local_to_json_parameters(),
            [
                'resourceId' => $resourceid,
                'key' => $key,
                'keyCode' => $keycode,
                'event' => $event,
                'cmid' => $cmid,
                'modulename' => $modulename,
                'editorid' => $editorid,
                'json_data' => $jsondata,
                'originalText' => $originaltext,
            ],
        );

        if ($params['resourceId'] == 0 && $params['modulename'] !== 'forum') {
            // For Quiz and Assignment there is no resourceid that's why cmid is resourceid.
            $params['resourceId'] = $params['cmid'];
        }

        $courseid = 0;

        $userdata = [];
        if ($params['cmid']) {
            $cm = $DB->get_record('course_modules', ['id' => $params['cmid']]);
            $courseid = $cm->course;
            $userdata["courseId"] = $courseid;

            // Get course context.
            $context = context_module::instance($params['cmid']);
            self::validate_context($context);
            require_capability('tiny/cursive:write', $context);

        } else {
            $userdata["courseId"] = 0;
        }

        $userdata["clientId"] = $CFG->wwwroot;
        $userdata["personId"] = $USER->id;
        $editoridarr = explode(':', $params['editorid']);
        $questionid = "";
        if (count($editoridarr) > 1) {
            $uniqueid = substr($editoridarr[0] . "\n", 1);
            $slot = substr($editoridarr[1] . "\n", 0, -11);
            $quba = question_engine::load_questions_usage_by_activity($uniqueid);
            $question = $quba->get_question($slot, false);
            $questionid = $question->id;
        }

        $fname = $USER->id . '_' . $params['resourceId'] . '_' . $params['cmid'] . '_attempt' . '.json';
        if ($questionid) {
            $fname = $USER->id . '_' . $params['resourceId'] . '_' . $params['cmid'] . '_' . $questionid . '_attempt' . '.json';
        }

        $table = 'tiny_cursive_files';
        $inp = '';

        if ($questionid) {
            $inp = $DB->get_record($table, [
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'],
                'resourceid' => $params['resourceId'],
                'userid' => $USER->id,
                'questionid' => $questionid,
            ]);
        } else {
            $inp = $DB->get_record($table, [
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'],
                'resourceid' => $params['resourceId'],
                'userid' => $USER->id,
            ]);
        }
        $temparray = [];
        if ($inp) {

            $temparray = json_decode($inp->content, true);
            $jsondata = json_decode($params['json_data'], true);
            foreach ($jsondata as $value) {
                $userdata = $value;
                array_push($temparray, $userdata);
            }
            $inp->content = json_encode($temparray);
            $inp->original_content = $params['originalText'];
            $inp->uploaded = 0;
            $DB->update_record($table, $inp);
            return 'true';
        } else {
            $dataobj = new stdClass();
            $dataobj->userid = $USER->id;
            $dataobj->resourceid = $params['resourceId'];
            $dataobj->cmid = $params['cmid'];
            $dataobj->modulename = $params['modulename'];
            $dataobj->courseid = $courseid;
            $dataobj->timemodified = time();
            $dataobj->filename = $fname;
            $dataobj->content = $params['json_data'];
            $dataobj->original_content = $params['originalText'];
            $dataobj->questionid = $questionid ?? 0;
            $dataobj->uploaded = 0;
            $DB->insert_record($table, $dataobj);
            return $fname;
        }

    }

     /**
      * Method write_local_to_json_returns
      * @return external_value Returns the filename as a text parameter
      *
      */
    public static function write_local_to_json_returns() {
        return new external_value(PARAM_TEXT, 'filename');
    }

    /**
     * Returns the parameters for the cursive_get_config function
     *
     * @return external_function_parameters Parameters definition for the external function
     */
    public static function cursive_get_config_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'course id', VALUE_DEFAULT, 0),
            'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Get cursive configuration settings for a course and course module
     *
     * @param int $courseid The course ID to get config for
     * @param int $cmid The course module ID to get config for
     * @return array Array containing config status and sync interval
     */
    public static function cursive_get_config($courseid, $cmid) {
        global $PAGE, $USER, $CFG;
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/cursive/lib.php');
        $params = self::validate_parameters(
            self::cursive_get_config_parameters(),
            [
                'courseid' => $courseid,
                'cmid' => $cmid,
            ],
        );

        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability("tiny/cursive:writingreport", $context);

        $remoteurl = get_config('tiny_cursive', 'python_server') . '/verify-token';
        $moodleurl = $CFG->wwwroot;

        $config = tiny_cursive_status($params['courseid']);
        $syncinterval = get_config('tiny_cursive', "syncinterval");
        $apikey = cursive_approve_token(get_config( 'tiny_cursive', 'secretkey'), $moodleurl, $remoteurl);
        $apikey = json_decode($apikey);
        return ['status' => $config, 'sync_interval' => $syncinterval, 'userid' => $USER->id, 'apikey_status' =>
                                                                                isset($apikey->status) ? true : false];
    }

    /**
     * Returns description of method result value for cursive_get_config
     *
     * @return external_single_structure Returns a structure containing config status and sync interval
     */
    public static function cursive_get_config_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, 'config'),
            'sync_interval' => new external_value(PARAM_INT, 'Data Sync interval'),
            'userid' => new external_value(PARAM_INT, 'userid'),
            'apikey_status' => new external_value(PARAM_BOOL, 'api key status'),
        ]);
    }

    /**
     * Returns parameters for store_quality_metrics method
     *
     * @return external_function_parameters Parameters definition for storing quality metrics data
     */
    public static function store_quality_metrics_parameters() {
        return new external_function_parameters([
            'file_id' => new external_value(PARAM_INT, 'File identifier', VALUE_REQUIRED),
            'total_active_time' => new external_value(PARAM_FLOAT, 'Total active writing time in seconds', VALUE_REQUIRED),
            'total_active_time_static' => new external_value(PARAM_FLOAT, 'Total active writing time in seconds', VALUE_REQUIRED),
            'edits' => new external_value(PARAM_FLOAT, 'Number of edits made', VALUE_REQUIRED),
            'edits_static' => new external_value(PARAM_FLOAT, 'Number of edits made', VALUE_REQUIRED),
            'verbosity' => new external_value(PARAM_FLOAT, 'Verbosity score', VALUE_REQUIRED),
            'verbosity_static' => new external_value(PARAM_FLOAT, 'Verbosity score', VALUE_REQUIRED),
            'word_count' => new external_value(PARAM_FLOAT, 'Total number of words', VALUE_REQUIRED),
            'word_count_static' => new external_value(PARAM_FLOAT, 'Total number of words', VALUE_REQUIRED),
            'sentence_count' => new external_value(PARAM_FLOAT, 'Total number of sentences', VALUE_REQUIRED),
            'sentence_count_static' => new external_value(PARAM_FLOAT, 'Total number of sentences', VALUE_REQUIRED),
            'q_count' => new external_value(PARAM_FLOAT, 'Number of questions', VALUE_REQUIRED),
            'q_count_static' => new external_value(PARAM_FLOAT, 'Number of questions', VALUE_REQUIRED),
            'word_len_mean' => new external_value(PARAM_FLOAT, 'Average word length', VALUE_REQUIRED),
            'word_len_mean_static' => new external_value(PARAM_FLOAT, 'Average word length', VALUE_REQUIRED),
            'sent_word_count_mean' => new external_value(PARAM_FLOAT, 'Average words per sentence', VALUE_REQUIRED),
            'sent_word_count_mean_static' => new external_value(PARAM_FLOAT, 'Average words per sentence', VALUE_REQUIRED),
            'p_burst_mean' => new external_value(PARAM_FLOAT, 'Average pause burst duration', VALUE_REQUIRED),
            'p_burst_mean_static' => new external_value(PARAM_FLOAT, 'Average pause burst duration', VALUE_REQUIRED),
            'p_burst_cnt' => new external_value(PARAM_FLOAT, 'Number of pause bursts', VALUE_DEFAULT, 0),
            'p_burst_cnt_static' => new external_value(PARAM_FLOAT, 'Number of pause bursts', VALUE_DEFAULT, 0),
        ]);
    }

    /**
     * Store quality metrics data for a file
     *
     * @param int $fileid File identifier
     * @param float $totalactivetime Total active writing time in seconds
     * @param float $totalactivetimestatic Total active writing time in seconds (static)
     * @param float $edits Number of edits made
     * @param float $editsstatic Number of edits made (static)
     * @param float $verbosity Verbosity score
     * @param float $verbositystatic Verbosity score (static)
     * @param float $wordcount Total number of words
     * @param float $wordcountstatic Total number of words (static)
     * @param float $sentencecount Total number of sentences
     * @param float $sentencecountstatic Total number of sentences (static)
     * @param float $qcount Number of questions
     * @param float $qcountstatic Number of questions (static)
     * @param float $wordlenmean Average word length
     * @param float $wordlenmeanstatic Average word length (static)
     * @param float $sentwordcountmean Average words per sentence
     * @param float $sentwordcountmeanstatic Average words per sentence (static)
     * @param float $pburstmean Average pause burst duration
     * @param float $pburstmeanstatic Average pause burst duration (static)
     * @param float $pburstcnt Number of pause bursts
     * @param float $pburstcntstatic Number of pause bursts (static)
     * @return array Array containing status and message
     */
    public static function store_quality_metrics(
        $fileid,
        $totalactivetime,
        $totalactivetimestatic,
        $edits,
        $editsstatic,
        $verbosity,
        $verbositystatic,
        $wordcount,
        $wordcountstatic,
        $sentencecount,
        $sentencecountstatic,
        $qcount,
        $qcountstatic,
        $wordlenmean,
        $wordlenmeanstatic,
        $sentwordcountmean,
        $sentwordcountmeanstatic,
        $pburstmean,
        $pburstmeanstatic,
        $pburstcnt,
        $pburstcntstatic,
    ) {
        global $DB;

        $params = self::validate_parameters(
            self::store_quality_metrics_parameters(),
            [
                'file_id' => $fileid,
                'total_active_time' => $totalactivetime,
                'total_active_time_static' => $totalactivetimestatic,
                'edits' => $edits,
                'edits_static' => $editsstatic,
                'verbosity' => $verbosity,
                'verbosity_static' => $verbositystatic,
                'word_count' => $wordcount,
                'word_count_static' => $wordcountstatic,
                'sentence_count' => $sentencecount,
                'sentence_count_static' => $sentencecountstatic,
                'q_count' => $qcount,
                'q_count_static' => $qcountstatic,
                'word_len_mean' => $wordlenmean,
                'word_len_mean_static' => $wordlenmeanstatic,
                'sent_word_count_mean' => $sentwordcountmean,
                'sent_word_count_mean_static' => $sentwordcountmeanstatic,
                'p_burst_mean' => $pburstmean,
                'p_burst_mean_static' => $pburstmeanstatic,
                'p_burst_cnt' => $pburstcnt,
                'p_burst_cnt_static' => $pburstcntstatic,
            ],
        );

        try {

            $context = context_system::instance();
            self::validate_context($context);
            require_capability('tiny/cursive:editsettings', $context);

            // Check if the record exists.
            $recordexists = $DB->record_exists('tiny_cursive_quality_metrics', ['file_id' => $params['file_id']]);
            // Retrieve existing data or initialize a new stdClass object.
            $data =
                $recordexists ? $DB->get_record('tiny_cursive_quality_metrics', ['file_id' => $params['file_id']]) : new stdClass();

            // Populate data attributes.
            $data->file_id = $params['file_id'];
            $data->total_active_time = $params['total_active_time'];
            $data->total_active_time_static = $params['total_active_time_static'];
            $data->edits = $params['edits'];
            $data->edits_static = $params['edits_static'];
            $data->verbosity = $params['verbosity'];
            $data->verbosity_static = $params['verbosity_static'];
            $data->word_count = $params['word_count'];
            $data->word_count_static = $params['word_count_static'];
            $data->sentence_count = $params['sentence_count'];
            $data->sentence_count_static = $params['sentence_count_static'];
            $data->q_count = $params['q_count'];
            $data->q_count_static = $params['q_count_static'];
            $data->word_len_mean = $params['word_len_mean'];
            $data->word_len_mean_static = $params['word_len_mean_static'];
            $data->sent_word_count_mean = $params['sent_word_count_mean'];
            $data->sent_word_count_mean_static = $params['sent_word_count_mean_static'];
            $data->p_burst_mean = $params['p_burst_mean'];
            $data->p_burst_mean_static = $params['p_burst_mean_static'];
            $data->p_burst_cnt = $params['p_burst_cnt'];
            $data->p_burst_cnt_static = $params['p_burst_cnt_static'];
            // Update or insert the record.
            if ($recordexists) {
                $DB->update_record('tiny_cursive_quality_metrics', $data);
            } else {
                $DB->insert_record('tiny_cursive_quality_metrics', $data);
            }

            // Return success status.
            return [
                'status' => get_string('success', 'tiny_cursive'),
                'message' => get_string('data_save', 'tiny_cursive'),
            ];
        } catch (dml_exception $e) {
            // Return failure status with error message.
            return [
                'status' => get_string('failed', 'tiny_cursive'),
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Method store_quality_metrics_returns
     *
     * @return external_single_structure Returns structure containing status and message
     */
    public static function store_quality_metrics_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'status message'),
            'message' => new external_value(PARAM_TEXT, 'message'),
        ]);
    }

    /**
     * Returns the parameter structure for the get_quality_metrics function
     *
     * @return external_function_parameters The parameters structure containing:
     *         - file_id (int): Required file identifier parameter
     *         - cmid (int): Required course module ID parameter
     */
    public static function get_quality_metrics_parameters() {
        return new external_function_parameters([
            'file_id' => new external_value(PARAM_INT, 'File identifier', VALUE_REQUIRED),
            'cmid' => new external_value(PARAM_INT, 'Course Module ID', VALUE_REQUIRED),
        ]);
    }

    /**
     * Retrieves quality metrics data for a specific file
     *
     * @param int $fileid The ID of the file to get metrics for
     * @param int $cmid The course module ID
     * @return array Returns an array containing:
     *               - status (bool): Whether the operation was successful
     *               - data (object): The quality metrics data object
     */
    public static function get_quality_metrics($fileid, $cmid) {
        global $DB;

        $params = self::validate_parameters(
            self::get_quality_metrics_parameters(),
            [
                'file_id' => $fileid,
                'cmid' => $cmid,
            ],
        );

        try {

            $context = context_module::instance($params['cmid']);
            self::validate_context($context);
            require_capability('tiny/cursive:writingreport', $context);

            $subscription = get_config('tiny_cursive', 'has_subscription');
            $customsettings = get_config('tiny_cursive', 'qualityaccess');
            $data = new stdClass;

            $defaults = [
                'word_len_mean' => 4.66,
                'edits' => 178.13,
                'p_burst_cnt' => 22.7,
                'p_burst_mean' => 82.14,
                'q_count' => 1043.92,
                'sentence_count' => 13.66,
                'total_active_time' => 21.58,
                'verbosity' => 1617.83,
                'word_count' => 190.67,
                'sent_word_count_mean' => 14.27170659,
            ];

            if ($subscription) {
                $sql = "SELECT qm.*, uw.quality_access
                          FROM {tiny_cursive_quality_metrics} qm
                     LEFT JOIN {tiny_cursive_user_writing} uw ON qm.file_id = uw.file_id
                         WHERE qm.file_id = :fileid";
                $data = $DB->get_record_sql($sql, ['fileid' => $params['file_id']]);

                foreach ($defaults as $key => &$default) {
                    $default = floatval(get_config('tiny_cursive', $key) ?: $default);

                    if ($customsettings) {

                        $data->{$key} = round(floatval(floatval($data->{$key}) / $default) * 100, 2);
                    } else {
                        $data->{$key} = round(floatval(floatval($data->{$key}) / floatval($data->{$key . "_static"})) * 100, 2);
                    }

                }
            } else {
                $data->id = 0;
                $data->file_id = $params['file_id'];
                $data->quality_access = 0;
                foreach ($defaults as $key => &$default) {
                    $data->{$key} = 0.0;
                }
            }

            return [
                'status' => true,
                'data' => $data,
            ];
        } catch (dml_exception $e) {
            // Return failure status with error message.
            return [
            'status' => false,
            'data' => $e->getMessage(),
            ];
        }
    }

    /**
     * Returns the structure of the get_quality_metrics function's return value
     *
     * @return external_single_structure The return value structure containing:
     *         - status (bool): Whether the operation was successful
     *         - data (object): Object containing quality metrics data with fields:
     *           - id (int): Record ID
     *           - file_id (int): File identifier
     *           - total_active_time (float): Total active writing time in seconds
     *           - edits (float): Number of edits made
     *           - verbosity (float): Verbosity score
     *           - word_count (float): Total word count
     *           - sentence_count (float): Total sentence count
     *           - q_count (float): Question count
     *           - word_len_mean (float): Mean word length
     *           - sent_word_count_mean (float): Mean words per sentence
     *           - p_burst_mean (float): Mean pause burst duration
     *           - p_burst_cnt (float): Pause burst count
     *           - quality_access (int): Quality access level
     */
    public static function get_quality_metrics_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, 'status message'),
            'data' => new external_single_structure([
                'id' => new external_value(PARAM_INT, 'ID'),
                'file_id' => new external_value(PARAM_INT, 'File ID'),
                'total_active_time' => new external_value(PARAM_FLOAT, 'Total active writing time in seconds'),
                'edits' => new external_value(PARAM_FLOAT, 'Number of edits made'),
                'verbosity' => new external_value(PARAM_FLOAT, 'Verbosity score'),
                'word_count' => new external_value(PARAM_FLOAT, 'Total number of words'),
                'sentence_count' => new external_value(PARAM_FLOAT, 'Total number of sentences'),
                'q_count' => new external_value(PARAM_FLOAT, 'Number of questions'),
                'word_len_mean' => new external_value(PARAM_FLOAT, 'Average word length'),
                'sent_word_count_mean' => new external_value(PARAM_FLOAT, 'Average words per sentence'),
                'p_burst_mean' => new external_value(PARAM_FLOAT, 'Average pause burst duration'),
                'p_burst_cnt' => new external_value(PARAM_FLOAT, 'Number of pause bursts'),
                'quality_access' => new external_value(PARAM_INT, 'Quality access'),
            ]),

        ]);
    }

    /**
     * Returns the parameters for the get_lesson_submission_data function
     *
     * @return external_function_parameters The parameters structure containing:
     *         - id (int): Optional lesson ID parameter
     *         - modulename (string): Optional module name parameter
     *         - cmid (int): Optional course module ID parameter
     */
    public static function get_lesson_submission_data_parameters() {
        return new external_function_parameters(
                [
                    'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                    'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                    'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
                ],
            );
    }

    /**
     * Gets submission data for a lesson
     *
     * @param int $id The lesson ID
     * @param string $modulename The name of the module
     * @param int $cmid The course module ID
     * @return string JSON encoded submission data
     */
    public static function get_lesson_submission_data($id, $modulename, $cmid) {
            $params = self::validate_parameters(
                    self::get_user_list_submission_stats_parameters(),
                    [
                        'id' => $id,
                        'modulename' => $modulename,
                        'cmid' => $cmid,
                    ],
            );

            $context = context_module::instance($params['cmid']);
            self::validate_context($context);
            require_capability("tiny/cursive:view", $context);

            $rec = tiny_cursive_get_user_submissions_data($params['id'], $params['modulename'], $params['cmid']);

            return json_encode($rec);
    }

    /**
     * Returns description of get_lesson_submission_data return value
     *
     * @return external_value Returns a text parameter containing lesson submission data
     */
    public static function get_lesson_submission_data_returns() {
        return new external_value(PARAM_TEXT, 'Lesson data');
    }

    /**
     * Returns the parameters for the disable_cursive function
     *
     * @return external_function_parameters The parameters structure containing:
     *         - disable (bool): Optional boolean parameter to disable cursive
     */
    public static function disable_cursive_parameters() {
        return new external_function_parameters(
            [
                'disable' => new external_value(PARAM_BOOL, 'status', VALUE_DEFAULT, null),
            ]
        );

    }
    /**
     * Disables cursive functionality for all courses
     *
     * @param bool $disable Whether to disable cursive
     * @return bool True if cursive was successfully disabled for all courses
     */
    public static function disable_cursive($disable) {

        try {
            $courses = get_courses();
            $value = !$disable;
            foreach ($courses as $course) {
                set_config("cursive-{$course->id}", $value, 'tiny_cursive');
            }
            return true;
        } catch (moodle_exception $e) {
                // Log error and return false if config update fails.
                debugging('Error disabling cursive: ' . $e->getMessage(), DEBUG_DEVELOPER);
                return false;
        }
    }
    /**
     * Returns description of disable_cursive return value
     *
     * @return external_value Returns a boolean parameter indicating if cursive was disabled
     */
    public static function disable_cursive_returns() {
        return new external_value(PARAM_BOOL, 'cursive disable message');
    }

}
