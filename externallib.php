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
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use tiny_cursive\tiny_cursive_data;

defined('MOODLE_INTERNAL') || die;

require_once("$CFG->libdir/externallib.php");
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once(__DIR__ . '/locallib.php');

/**
 * Tiny cursive plugin.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
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
            ]
        );
    }

    /**
     * get_user_list
     *
     * @param $page
     * @param $courseid
     * @return false|string
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_user_list($page, $courseid) {

        global $CFG, $DB;

        // Validate parameters.
        $params = self::validate_parameters(
            self::get_user_list_parameters(),
            [
                'page' => $page,
                'courseid' => $courseid,
            ]
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
            ]
        );
    }

    /**
     * get_module_list
     *
     * @param $page
     * @param $courseid
     * @return false|string
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
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
            ]
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
     * get_module_list_returns
     *
     * @return external_value
     */
    public static function get_module_list_returns() {
        return new external_value(PARAM_TEXT, 'All quizzes');
    }


    /**
     * cursive_json_func_parameters
     *
     * @return external_function_parameters
     */
    public static function cursive_json_func_parameters() {
        return new external_function_parameters(
            [
                'resourceId' => new external_value(PARAM_INT, 'resourceid', VALUE_DEFAULT, 0),
                'key' => new external_value(PARAM_TEXT, 'key detail', VALUE_DEFAULT, null),
                'keyCode' => new external_value(PARAM_INT, 'key code ', VALUE_DEFAULT, null),
                'event' => new external_value(PARAM_TEXT, 'event', VALUE_DEFAULT, null),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'editorid' => new external_value(PARAM_TEXT, 'editorid', VALUE_DEFAULT, ''),
            ]
        );
    }


    /**
     * cursive_json_func
     *
     * @param $resourceid
     * @param $key
     * @param $keycode
     * @param $event
     * @param $cmid
     * @param $modulename
     * @param $editorid
     * @return string
     * @throws coding_exception
     * @throws dml_exception
     * @throws file_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     * @throws stored_file_creation_exception
     */
    public static function cursive_json_func(
        $resourceid = 0,
        $key = null,
        $keycode = null,
        $event = 'keyUp',
        $cmid = 0,
        $modulename = 'quiz',
        $editorid = null
    ) {

        global $USER, $DB, $CFG;

        $params = self::validate_parameters(
            self::cursive_json_func_parameters(),
            [
                'resourceId' => $resourceid,
                'key' => $key,
                'keyCode' => $keycode,
                'event' => $event,
                'cmid' => $cmid,
                'modulename' => $modulename,
                'editorid' => $editorid,
            ]
        );

        if ($params['resourceId'] == 0 && $params['modulename'] !== 'forum') {
            $params['resourceId'] = $params['cmid'];
            // For Quiz and Assignment there is no resourceid that's why cmid is resourceid.
        }

        $courseid = 0;

        $userdata = [
            'resourceId' => $params['resourceId'],
            'key' => $params['key'],
            'keyCode' => $params['keyCode'],
            'event' => $params['event'],
        ];
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

        $timearr = explode('.', microtime("now") * 1000);
        $timestampinmilliseconds = $timearr[0];
        $userdata['unixTimestamp'] = $timestampinmilliseconds;
        $userdata["clientId"] = $CFG->wwwroot;
        $userdata["personId"] = $USER->id;
        $questionid = '';
        $editoridarr = explode(':', $params['editorid']);
        $questionid = '';
        if (count($editoridarr) > 1) {
            $uniqueid = substr($editoridarr[0] . "\n", 1);
            $slot = substr($editoridarr[1] . "\n", 0, -11);
            $quba = question_engine::load_questions_usage_by_activity($uniqueid);
            $question = $quba->get_question($slot, false);
            $questionid = $question->id;
        }
        $dirname = make_temp_directory('userdata');

        $fname = $USER->id . '_' . $params['resourceId'] . '_' . $params['cmid'] . '_attempt' . '.json';
        if ($questionid) {
            $fname = $USER->id . '_' . $params['resourceId'] . '_' . $params['cmid'] . '_' . $questionid . '_attempt' . '.json';
        }
        // File path.
        $filename = $dirname . '/' . $fname;

        $table = 'tiny_cursive_files';
        $inp = file_get_contents($filename);

        $temparray = null;
        if ($inp && $DB->record_exists($table, ['cmid' => $params['cmid'],
        'modulename' => $params['modulename'], 'userid' => $USER->id])) {

            $temparray = json_decode($inp, true);
            array_push($temparray, $userdata);
            $filerec = $DB->get_record($table, [
                'cmid' => $params['cmid'],
                'modulename' => $params['modulename'],
                'userid' => $USER->id,
            ]);
            if ($questionid) {
                $filerec = $DB->get_record($table, [
                    'cmid' => $params['cmid'],
                    'modulename' => $params['modulename'],
                    'userid' => $USER->id,
                    'questionid' => $questionid,
                ]);
            }
            $filerec->uploaded = 0;
            $DB->update_record($table, $filerec);
        } else {

            $temparray[] = $userdata;
            $dataobj = new stdClass();
            $dataobj->userid = $USER->id;
            $dataobj->resourceid = $params['resourceId'];
            $dataobj->cmid = $params['cmid'];
            $dataobj->modulename = $params['modulename'];
            $dataobj->courseid = $courseid;
            $dataobj->timemodified = time();
            $dataobj->filename = $fname;
            $dataobj->questionid = $questionid ?? 0;
            $dataobj->uploaded = 0;
            $DB->insert_record($table, $dataobj);
        }

        $jsondata = json_encode($temparray);

        if (is_array($temparray)) {
            file_put_contents($filename, $jsondata);
        }

        return $filename;
    }

    /**
     * cursive_json_func_returns
     *
     * @return external_value
     */
    public static function cursive_json_func_returns() {
        return new external_value(PARAM_TEXT, 'result');
    }


    /**
     * cursive_reports_func_parameters
     *
     * @return external_function_parameters
     */
    public static function cursive_reports_func_parameters() {
        return new external_function_parameters(
            [
                'coursename' => new external_value(PARAM_INT, 'Course Name', VALUE_DEFAULT, null),
                'quizname' => new external_value(PARAM_TEXT, 'quizname detail', VALUE_DEFAULT, null),
                'username' => new external_value(PARAM_TEXT, 'username detail ', VALUE_DEFAULT, null),
            ]
        );
    }

    /**
     * cursive_reports_func
     *
     * @param $coursename
     * @param $quizname
     * @param $username
     * @return string
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function cursive_reports_func(
        $courseid = 0,
        $quizname = null,
        $username = 'keyUp'
    ) {

        global $DB, $CFG;
        require_once($CFG->libdir . '/accesslib.php');
        // Include accesslib.php for capability checks.
        $params = self::validate_parameters(
            self::cursive_reports_func_parameters(),
            [
                'courseid' => $courseid,
                'quizname' => $quizname,
                'username' => $username,
            ]
        );

        // Ensure the user has the capability to view the cursive reports.
        if ($params['courseid']) {
            $course = $DB->get_record('course', [
                'id' => $params['courseid'],
            ], '*', MUST_EXIST);
            $cm = $DB->get_record('course_modules', ['course' => $params['courseid']]);
            $context = context_module::instance($cm->id);
            self::validate_context($context);
            require_capability("tiny/cursive:write", $context);

        }

        // You can add additional logic here if needed.

        return "cursive reports";
    }



    /**
     * cursive_reports_func_returns
     *
     * @return external_value
     */
    public static function cursive_reports_func_returns() {
        return new external_value(PARAM_TEXT, 'result');
    }

    // User comments store.

    /**
     * cursive_user_comments_func_parameters
     *
     * @return external_function_parameters
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
            ]
        );
    }

    /**
     * cursive_user_comments_func
     *
     * @param $modulename
     * @param $cmid
     * @param $resourceid
     * @param $courseid
     * @param $usercomment
     * @param $timemodified
     * @param $editorid
     * @return bool
     * @throws coding_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function cursive_user_comments_func(
        $modulename,
        $cmid,
        $resourceid,
        $courseid,
        $usercomment,
        $timemodified,
        $editorid
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
            ]
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
        } catch (Exception $e) {
            echo $e;
            return false;
        }
    }

    /**
     * cursive_user_comments_func_returns
     *
     * @return external_value
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
            ]
        );
    }

    /**
     * cursive_approve_token_func
     *
     * @param $token
     * @return bool|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function cursive_approve_token_func($token) {
        global $CFG;
        require_once("$CFG->libdir/filelib.php");
        $params = self::validate_parameters(
            self::cursive_approve_token_func_parameters(),
            [
                'token' => $token,
            ]
        );
        // Check if the user has the required capability.
        $context = context_system::instance(); // Assuming a system-wide capability check.
        self::validate_context($context);
        require_capability('tiny/cursive:editsettings', $context);

        $remoteurl = get_config('tiny_cursive', 'python_server') . '/verify-token';
        $moodleurl = $CFG->wwwroot;

        try {
            // Use Moodle's cURL library.
            $curl = new curl();
            $options = [
                'CURLOPT_RETURNTRANSFER' => true,
                'CURLOPT_HTTPHEADER' => [
                    'Authorization: Bearer ' . $params['token'],
                    'X-Moodle-Url: ' . $moodleurl,
                    'Content-Type: multipart/form-data',
                    'Accept: application/json',
                ],
            ];

            // Prepare POST fields.
            $postfields = [
                'token' => $params['token'],
                'moodle_url' => $moodleurl,
            ];

            // Execute the request.
            $result = $curl->post($remoteurl, $postfields, $options);

            // Check for cURL errors.
            if ($result === false) {
                throw new moodle_exception('curlerror', 'tiny_cursive', '', null, $curl->error);
            }
        } catch (Exception $e) {
            // Log the exception.
            debugging("Error in cursive_approve_token_func: " . $e->getMessage());

            // Return a Moodle exception.
            throw new moodle_exception('errorverifyingtoken', 'tiny_cursive', '', null, $e->getMessage());
        }

        return $result;
    }


    /**
     * cursive_approve_token_func_returns
     *
     * @return external_value
     */
    public static function cursive_approve_token_func_returns() {
        return new external_value(PARAM_TEXT, 'Token Approved');
    }



    // Service for assignment comment list.


    /**
     * get_comment_link_parameters
     *
     * @return external_function_parameters
     */
    public static function get_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'questionid' => new external_value(PARAM_INT, 'questionid', VALUE_DEFAULT, null),
                'userid' => new external_value(PARAM_INT, 'userid', VALUE_DEFAULT, null),
            ]
        );
    }

    /**
     * get_comment_link
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @param $questionid
     * @param $userid
     * @return false|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_comment_link($id, $modulename, $cmid , $questionid , $userid ) {
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
            ]
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
                ]
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
                                 uf.modulename,uf.userid, uf.filename
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
            ]
        );
    }


    /**
     * get_forum_comment_link
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @return string
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
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
            ]
        );

        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);
        
        $conditions = ["resourceid" => $params['id'], 'modulename' => "forum"];
        $table = 'tiny_cursive_comments';
        $recs = $DB->get_records($table, $conditions);

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

        $data = $DB->get_record_sql($attempts, ['id' => $params['id'], 'cmid' => $params['cmid'],
                                    'modulename' => $params['modulename']]);
        if (isset($data->effort_ratio)) {
            $data->effort_ratio = intval(floatval($data->effort_ratio) * 100);
        }
        $data = (array) $data;
        $data['first_file'] = 0;

        if (!isset($data['filename'])) {
            $sql = 'SELECT id as file_id, filename, userid, content
                      FROM {tiny_cursive_files}
                     WHERE resourceid = :resourceid
                            AND cmid = :cmid
                            AND modulename = :modulename';
            $filename = $DB->get_record_sql(
                $sql,
                ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
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
     * get_forum_comment_link_returns
     *
     * @return external_value
     */
    public static function get_forum_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * get_quiz_comment_link_parameters
     *
     * @return external_function_parameters
     */
    public static function get_quiz_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'questionid' => new external_value(PARAM_INT, 'questionid', VALUE_DEFAULT, null),
            ]
        );
    }

    /**
     * get_quiz_comment_link
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @param $questionid
     * @return false|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_quiz_comment_link(
        $id,
        $modulename,
        $cmid = null,
        $questionid = null
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
            ]
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
                                AND uf.modulenam e= :modulename";
            $data = $DB->get_record_sql(
                $attempts,
                ['id' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
            );

            if (!isset($data->filename)) {
                $sql = 'SELECT filename
                          FROM {tiny_cursive_files}
                         WHERE resourceid = :resourceid
                               AND cmid = :cmid
                               AND modulename = :modulename';
                $filename = $DB->get_record_sql(
                    $sql,
                    ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
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
                ['id' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
            );

            if (!isset($data->filename)) {
                $sql = 'SELECT filename
                          FROM {tiny_cursive_files}
                         WHERE resourceid = :resourceid
                               AND cmid = :cmid
                               AND modulename = :modulename';
                $filename = $DB->get_record_sql(
                    $sql,
                    ['resourceid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
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
     * get_quiz_comment_link_returns
     *
     * @return external_value
     */
    public static function get_quiz_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * get_assign_comment_link_parameters
     *
     * @return external_function_parameters
     */
    public static function get_assign_comment_link_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_REQUIRED),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_REQUIRED),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED ),
            ]
        );
    }

    /**
     * get_assign_comment_link
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @return false|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_assign_comment_link($id, $modulename, $cmid) {
        global $DB;

        $params = self::validate_parameters(
            self::get_assign_comment_link_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ]
        );

        // Check if user has capability to view assignment comments.
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability('tiny/cursive:view', $context);

        $recassignsubmission = $DB->get_record('assign_submission', ['id' => $params['id']], '*', false);
        $userid = $recassignsubmission->userid;
        $conditions = ["userid" => $userid, 'modulename' => $params['modulename'], 'cmid' => $params['cmid']];
        $table = 'tiny_cursive_comments';
        $recs = $DB->get_records($table, $conditions);
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
     * get_assign_comment_link_returns
     *
     * @return external_value
     */
    public static function get_assign_comment_link_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * get_assign_grade_comment_parameters
     *
     * @return external_function_parameters
     */
    public static function get_assign_grade_comment_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_REQUIRED ),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_REQUIRED),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED),
            ]
        );
    }

    /**
     * get_assign_grade_comment
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @return false|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_assign_grade_comment($id, $modulename, $cmid) {
        global $DB, $CFG;

        $params = self::validate_parameters(
            self::get_assign_grade_comment_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ]
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
            $DB->get_record_sql($attempts,
                [
                    'id' => $params['id'],
                    'cmid' => $params['cmid'],
                    'modulename' => $params['modulename'],
                ]
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
                ['userid' => $params['id'], 'cmid' => $params['cmid'], 'modulename' => $params['modulename']]
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
     * get_assign_grade_comment_returns
     *
     * @return external_value
     */
    public static function get_assign_grade_comment_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * get_user_list_submission_stats_parameters
     *
     * @return external_function_parameters
     */
    public static function get_user_list_submission_stats_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_INT, 'id', VALUE_DEFAULT, null),
                'modulename' => new external_value(PARAM_TEXT, 'modulename', VALUE_DEFAULT, ''),
                'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, null),
                'filename' => new external_value(PARAM_TEXT, 'filename', VALUE_DEFAULT, ''),
            ]
        );
    }

    /**
     * get_user_list_submission_stats
     *
     * @param $id
     * @param $modulename
     * @param $cmid
     * @return false|string
     * @throws coding_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function get_user_list_submission_stats($id, $modulename, $cmid) {
        global $DB;

        $params = self::validate_parameters(
            self::get_user_list_submission_stats_parameters(),
            [
                'id' => $id,
                'modulename' => $modulename,
                'cmid' => $cmid,
            ]
        );
        $context = context_module::instance($params['cmid']);
        self::validate_context($context);
        require_capability("tiny/cursive:view", $context);

        $rec = get_user_submissions_data($params['id'], $params['modulename'], $params['cmid']);

        return json_encode($rec);
    }

    /**
     * get_user_list_submission_stats_returns
     *
     * @return external_value
     */
    public static function get_user_list_submission_stats_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }

    /**
     * cursive_filtered_writing_func_parameters
     *
     * @return external_function_parameters
     */
    public static function cursive_filtered_writing_func_parameters() {
        return new external_function_parameters(
            [
                'id' => new external_value(PARAM_TEXT, 'id', VALUE_REQUIRED, 0),
            ]
        );
    }

    /**
     * cursive_filtered_writing_func
     *
     * @param $id
     * @return false|string
     * @throws coding_exception
     * @throws dml_exception
     * @throws invalid_parameter_exception
     * @throws moodle_exception
     * @throws require_login_exception
     */
    public static function cursive_filtered_writing_func($id) {
        global $DB, $USER;

        $vparams = self::validate_parameters(
            self::cursive_filtered_writing_func_parameters(),
            [
                'id' => $id,
            ]
        );

        $userid = $USER->id;
        $params = [];

        $sql = "SELECT *
                  FROM {course_modules}
                 WHERE course = :course LIMIT 1";
        $cm = $DB->get_record_sql($sql, ['course' => $vparams['id']]);
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
     * cursive_filtered_writing_func_returns
     *
     * @return external_value
     */
    public static function cursive_filtered_writing_func_returns() {
        return new external_value(PARAM_TEXT, 'Comment Link');
    }



    /**
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
     */
    public static function store_user_writing_parameters() {
        return new external_function_parameters(self::storing_user_writing_param());
    }

    /**
     * Method store_user_writing
     *
     * @param $personid $person_id [explicite description]
     * @param $fileid $file_id [explicite description]
     * @param $charactercount $character_count [explicite description]
     * @param $totaltimeseconds $total_time_seconds [explicite description]
     * @param $charactersperminute $characters_per_minute [explicite description]
     * @param $keycount $key_count [explicite description]
     * @param $keysperminute $keys_per_minute [explicite description]
     * @param $wordcount $word_count [explicite description]
     * @param $wordsperminute $words_per_minute [explicite description]
     * @param $backspacepercent $backspace_percent [explicite description]
     * @param $copybehaviour $copy_behaviour [explicite description]
     * @param $copybehavior $copy_behavior [explicite description]
     * @param $score $score [explicite description]
     *
     * @return array [explicite description]
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
        $qualityaccess
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
            ]
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
     * Method store_user_writing_returns
     *
     * @return external_single_structure [explicite description]
     */
    public static function store_user_writing_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'status message'),
            'message' => new external_value(PARAM_TEXT, 'message'),
        ]);
    }


    /**
     * Method cursive_get_reply_json_parameters
     *
     * @return  external_single_structure [explicite description]
     */
    public static function cursive_get_reply_json_parameters() {
        return new external_function_parameters([
            'filepath' => new external_value(PARAM_TEXT, 'filepath', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Method cursive_get_reply_json
     *
     * @param $filepath $filepath [explicite description]
     *
     * @return object [explicite description]
     */
    public static function cursive_get_reply_json($filepath) {
        global $DB;

        $params = self::validate_parameters(
            self::cursive_get_reply_json_parameters(),
            [
                'filepath' => $filepath,
            ]
        );
        $parts = explode('_', $params['filepath']);
        $cmid = $parts[2];

        $context = context_module::instance($cmid);
        self::validate_context($context);
        require_capability("tiny/cursive:writingreport", $context);

        $data = new stdClass;
        try {
            $filedata = $DB->get_record('tiny_cursive_files', ['filename' => $params['filepath']]);
            $content = $filedata->content ? base64_decode($filedata->content) : $content = false;
            $data->status = true;

            if ($content === false) {
                $data->status = false;
                $content = 'File not found! or Failed to read file';
            }

            $data->data = $content;
        } catch (Exception $e) {
            $data->data = $e->getMessage();
        }
        return $data;
    }

    /**
     * Method cursive_get_reply_json_returns
     *
     * @return external_single_structure [explicite description]
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
     * @return array [explicite description]
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
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
     */
    public static function cursive_get_analytics_parameters() {
        return new external_function_parameters([
            'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_REQUIRED, 0, true),
            'fileid' => new external_value(PARAM_INT, 'file id', VALUE_REQUIRED, 0, true),
        ]);
    }

    /**
     * Method cursive_get_analytics
     * @param $cmid $cmid
     * @param $fileid $fileid
     */
    public static function cursive_get_analytics($cmid, $fileid) {
        global $DB;

        $vparams = self::validate_parameters(
            self::cursive_get_analytics_parameters(),
            [
                'cmid' => $cmid,
                'fileid' => $fileid,
            ]
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
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
     */
    public static function cursive_get_analytics_returns() {
        return new external_single_structure([
            'data' => new external_value(PARAM_TEXT, 'Record object'),
        ]);
    }

    /**
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
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
     * Method store_user_writing_parameters
     *
     * @param string $fileid
     * @param string $reconstructedtext
     * @param string $submittedtext
     * @param string $meta
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
            ]
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
        } catch (Exception $e) {
            // Handle the exception.
            return [
                'status' => get_string('failed', 'tiny_cursive'),
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
     */
    public static function cursive_store_writing_differencs_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_TEXT, 'Status message'),
            'message' => new external_value(PARAM_TEXT, 'Message'),
        ]);
    }


    /**
     * Method store_user_writing_parameters
     *
     * @return object [explicite description]
     */
    public static function cursive_get_writing_differencs_parameters() {
        return new external_function_parameters([
            'fileid' => new external_value(PARAM_INT, 'file id', VALUE_REQUIRED, 0, true),
        ]);
    }

    /**
     * Method cursive_get_writing_differencs
     *
     * @param array $fileid
     */
    public static function cursive_get_writing_differencs($fileid) {
        global $DB;

        $vparams = self::validate_parameters(
            self::cursive_get_writing_differencs_parameters(),
            [
                'fileid' => $fileid,
            ]
        );

        $filename = $DB->get_record('tiny_cursive_files',
            ['id' => $vparams['fileid']], 'filename');
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
                    'questionid' => $data->questionid
                ],
            );
            $data->comments = $comments;
        }

        return ['data' => json_encode($data)];
    }

    /**
     * Method cursive_get_writing_differencs_returns
     *
     * @return object [explicite description]
     */
    public static function cursive_get_writing_differencs_returns() {
        return new external_single_structure([
            'data' => new external_value(PARAM_TEXT, 'content data'),
        ]);
    }

        /**
         * Method generate_webtoken_parameters
         *
         * @return external_function_parameters
         */
    public static function generate_webtoken_parameters() {
        return new external_function_parameters([]);
    }

    /**
     * Method generate_webtoken
     *
     * @return array
     */
    public static function generate_webtoken() {
        $token = create_token_for_user();
        if ($token) {
            set_config('cursivetoken', $token, 'tiny_cursive');
        }
        return ['token' => $token];
    }

    /**
     * Method generate_webtoken_returns
     *
     * @return external_single_structure
     */
    public static function generate_webtoken_returns() {
        return new external_single_structure([
            'token' => new external_value(PARAM_TEXT, 'token'),
        ]);
    }

    /**
     * Method write_local_to_json_parameters
     *
     * @return external_function_parameters
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
            ]
        );
    }

    /**
     * Method write_local_to_json
     *
     * @param $resourceid $resourceid [explicite description]
     * @param $key $key [explicite description]
     * @param $keycode $keycode [explicite description]
     * @param $event $event [explicite description]
     * @param $cmid $cmid [explicite description]
     * @param $modulename $modulename [explicite description]
     * @param $editorid $editorid [explicite description]
     * @param $jsondata $jsondata [explicite description]
     *
     * @return string
     */
    public static function write_local_to_json($resourceid, $key, $keycode , $event,
                                                $cmid, $modulename, $editorid, $jsondata, $originaltext) {

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
                'originalText' => $originaltext
            ]
        );

        if ($params['resourceId'] == 0 && $params['modulename'] !== 'forum') {
            // For Quiz and Assignment there is no resourceid that's why cmid is resourceid.
            $params['resourceId'] = $params['cmid'];
        }

        $courseid = 0;

        if ($params['cmid']) {
            $cm = $DB->get_record('course_modules', ['id' => $params['cmid']]);
            $courseid = $cm->course;

            $context = context_module::instance($params['cmid']);
            self::validate_context($context);
            require_capability('tiny/cursive:write', $context);

        }

        $editoridarr = explode(':', $params['editorid']);
        $questionid = 0;
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

        $conditions = [
            'cmid' => $params['cmid'],
            'modulename' => $params['modulename'],
            'resourceid' => $params['resourceId'],
            'userid' => $USER->id,
        ];

        if ($questionid) {
            $conditions['questionid'] = $questionid;
        }
        $record = $DB->get_record($table, $conditions, 'id, content');
        $jsondata = json_decode($params['json_data'], true);

        if ($record) {

            $temparray = json_decode(base64_decode($record->content), true);
            $mergecontent = array_merge($temparray, $jsondata);
            $DB->set_field('tiny_cursive_files', 'content', base64_encode(json_encode($mergecontent)), ['id' => $record->id]);
            $DB->set_field('tiny_cursive_files', 'original_content', $params['originalText'], ['id' => $record->id]);
            $DB->set_field('tiny_cursive_files', 'uploaded', 0, ['id' => $record->id]);

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
            $dataobj->content = base64_encode($params['json_data']);
            $dataobj->original_content = $params['originalText'];
            $dataobj->questionid = $questionid ?? 0;
            $dataobj->uploaded = 0;
            $DB->insert_record($table, $dataobj);
            return $fname;
        }
    }

    /**
     * Method write_local_to_json_returns
     *
     * @return external_value
     */
    public static function write_local_to_json_returns() {
        return new external_value(PARAM_TEXT, 'filename');
    }

    public static function cursive_get_config_parameters() {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'course id', VALUE_DEFAULT, 0),
            'cmid' => new external_value(PARAM_INT, 'cmid', VALUE_DEFAULT, 0),
        ]);
    }

    public static function cursive_get_config($courseid, $cmid) {
        global $PAGE, $USER;
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

        $config = get_config('tiny_cursive', "cursive-" . $params['courseid']);
        $syncinterval = get_config('tiny_cursive', "syncinterval");
        return ['status' => $config, 'sync_interval' => $syncinterval, 'userid' => $USER->id];
    }

    public static function cursive_get_config_returns() {
        return new external_single_structure([
            'status' => new external_value(PARAM_BOOL, 'config'),
            'sync_interval' => new external_value(PARAM_TEXT, 'Data Sync interval'),
            'userid' => new external_value(PARAM_INT, 'userid'),
        ]);
    }
}
