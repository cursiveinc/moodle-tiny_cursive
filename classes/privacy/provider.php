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
namespace tiny_cursive\privacy;

use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\writer;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\userlist;
use core_privacy\local\request\approved_userlist;
use stdClass;
use core_privacy\local\request\transform;
use context;


/**
 * Privacy Subsystem implementation for tiny_cursive.
 *
 * @copyright  Cursive Technology, Inc. <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
    // The tiny editor stores user provided data.
    \core_privacy\local\metadata\provider,

    // The tiny editor provides data directly to core.
    \core_privacy\local\request\plugin\provider,

    // The tiny editor is capable of determining which users have data within it.
    \core_privacy\local\request\core_userlist_provider {

    /**
     * Returns information about how tiny_cursive stores its data.
     *
     * @param collection $collection The initialised collection to add items to.
     * @return collection A listing of user data stored through this system.
     */
    public static function get_metadata(collection $collection): collection {
        // There isn't much point giving details about the pageid, etc.
        $collection->add_database_table('tiny_cursive_files', [
            'userid' => 'privacy:metadata:database:tiny_cursive:userid',
            'content' => 'privacy:metadata:database:tiny_cursive:content',
            'original_content' => 'privacy:metadata:database:tiny_cursive:original_content',
            'timemodified' => 'privacy:metadata:database:tiny_cursive:timemodified',
        ], 'privacy:metadata:database:tiny_cursive');

        $collection->add_database_table('tiny_cursive_comments', [
            'userid' => 'privacy:metadata:database:tiny_cursive_comments:userid',
            'usercomment' => 'privacy:metadata:database:tiny_cursive_comments:commenttext',
            'timemodified' => 'privacy:metadata:database:tiny_cursive_comments:timemodified',
        ], 'privacy:metadata:database:tiny_cursive_comments');

        $collection->add_external_location_link('tiny_cursive_files', [
            'userid' => 'privacy:metadata:database:tiny_cursive:userid',
            'content' => 'privacy:metadata:database:tiny_cursive:content',
            'original_content' => 'privacy:metadata:database:tiny_cursive:original_content',
            'timemodified' => 'privacy:metadata:database:tiny_cursive:timemodified',
        ], 'privacy:metadata:database:tiny_cursive');

        return $collection;
    }

    /**
     * Get the list of contexts that contain user information for the specified user.
     *
     * @param int $userid The user to search.
     * @return contextlist $contextlist The contextlist containing the list of contexts used in this plugin.
     */
    public static function get_contexts_for_userid(int $userid): \core_privacy\local\request\contextlist {
        $contextlist = new \core_privacy\local\request\contextlist();

        // Data may be saved in the user context.
        $sql = "SELECT
                    c.id
                  FROM {tiny_cursive_files} eas
                  JOIN {context} c ON c.id = eas.cmid
                 WHERE contextlevel = :contextuser AND c.instanceid = :userid";
        $contextlist->add_from_sql($sql, ['contextuser' => CONTEXT_USER, 'userid' => $userid]);

        // Data may be saved against the userid.
        $sql = "SELECT cmid
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid";
        $contextlist->add_from_sql($sql, ['userid' => $userid]);

        return $contextlist;
    }

    /**
     * Get the list of users within a specific context.
     *
     * @param userlist $userlist The userlist containing the list of users who have data in this context/plugin combination.
     */
    public static function get_users_in_context(userlist $userlist) {
        $context = $userlist->get_context();

        $params = [
            'cmid' => $context->id,
        ];

        $sql = "SELECT userid
                  FROM {tiny_cursive_files}
                 WHERE cmid = :cmid";

        $userlist->add_from_sql('userid', $sql, $params);
    }

    /**
     * Export all user data for the specified user, in the specified contexts.
     *
     * @param   approved_contextlist    $contextlist    The approved contexts to export information for.
     */
    public static function export_user_data(approved_contextlist $contextlist) {
        global $DB;

        $user = $contextlist->get_user();

        // Firstly export all autosave records from all contexts in the list owned by the given user.
        list($contextsql, $contextparams) = $DB->get_in_or_equal($contextlist->get_contextids(), SQL_PARAMS_NAMED);
        $contextparams['userid'] = $user->id;

        $sql = "SELECT *
                  FROM {tiny_cursive_files}
                 WHERE userid = :userid AND contextid {$contextsql}";

        $userfiledata = $DB->get_recordset_sql($sql, $contextparams);
        self::export_autosaves($user, $userfiledata);

        // Additionally export all eventual records in the given user's context regardless the actual owner.
        // We still consider them to be the user's personal data even when edited by someone else.
        [$contextsql, $contextparams] = $DB->get_in_or_equal($contextlist->get_contextids(), SQL_PARAMS_NAMED);
        $contextparams['userid'] = $user->id;
        $contextparams['contextuser'] = CONTEXT_USER;

        $sql = "SELECT eas.*
                  FROM {tiny_cursive_files} eas
                  JOIN {context} c ON c.id = eas.cmid
                 WHERE c.id {$contextsql} AND c.contextlevel = :contextuser AND c.instanceid = :userid";

        $autosaves = $DB->get_recordset_sql($sql, $contextparams);
        self::export_autosaves($user, $autosaves);

        $sql = "SELECT eas.*
                  FROM {tiny_cursive_user_writing} eas
                  JOIN {tiny_cursive_files} tcf ON tcf.id = eas.file_id
                  JOIN {context} c ON c.id = tcf.cmid
                 WHERE c.id {$contextsql} AND c.contextlevel = :contextuser AND c.instanceid = :userid";

        $writingdata = $DB->get_recordset_sql($sql, $contextparams);
        self::export_autosaves($user, $writingdata);
    }

    /**
     * Delete all data for all users in the specified context.
     *
     * @param \context $context The specific context to delete data for.
     */
    public static function delete_data_for_all_users_in_context(context $context) {
        global $DB;

        $filesrecords = $DB->get_records('tiny_cursive_files', ['cmid' => $context->instanceid]);

        foreach ($filesrecords as $record) {
            $DB->delete_records('tiny_cursive_user_writing', [
                'file_id' => $record->id,
            ]);
            $DB->delete_records('tiny_cursive_writing_diff', [
                'file_id' => $record->id,
            ]);
        }

        $DB->delete_records('tiny_cursive_comments', [
            'cmid' => $context->instanceid,
        ]);
        $DB->delete_records('tiny_cursive_files', [
            'cmid' => $context->instanceid,
        ]);
    }

    /**
     * Delete multiple users within a single context.
     *
     * @param approved_userlist $userlist The approved context and user information to delete information for.
     */
    public static function delete_data_for_users(approved_userlist $userlist) {
        global $DB;

        $context = $userlist->get_context();
        $userids = $userlist->get_userids();

        [$useridsql, $useridsqlparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED);
        $params = ['cmid' => $context->id] + $useridsqlparams;

        $DB->delete_records_select('tiny_autosave', "cmid = :contextid AND userid {$useridsql}",
            $params);
    }

    /**
     * Delete all user data for the specified user, in the specified contexts.
     *
     * @param approved_contextlist $contextlist The approved contexts and user information to delete information for.
     */
    public static function delete_data_for_user(approved_contextlist $contextlist) {
        global $DB;

        $user = $contextlist->get_user();

        [$contextsql, $contextparams] = $DB->get_in_or_equal($contextlist->get_contextids(), SQL_PARAMS_NAMED);
        $contextparams['userid'] = $user->id;

        // Fetch all records from tiny_cursive_files for this user and context.
        $filerecords = $DB->get_records_select(
            'tiny_cursive_files',
            "userid = :userid AND cmid {$contextsql}",
            $contextparams
        );

        if ($filerecords) {
            // Collect file ids for deletion in related tables.
            $fileids = array_keys($filerecords);

            // Delete from tiny_cursive_user_writing using file_id.
            $DB->delete_records_list('tiny_cursive_user_writing', 'file_id', $fileids);

            // Delete from tiny_cursive_writing_diff using file_id.
            $DB->delete_records_list('tiny_cursive_writing_diff', 'file_id', $fileids);
        }

        // Delete from tiny_cursive_files, tiny_cursive_comments using the context and user.
        $DB->delete_records_select('tiny_cursive_files', "userid = :userid AND cmid {$contextsql}", $contextparams);
        $DB->delete_records_select('tiny_cursive_comments', "userid = :userid AND cmid {$contextsql}", $contextparams);
    }

    /**
     * Get the filter options.
     *
     * This is shared to allow unit testing too.
     *
     * @return stdClass
     */
    public static function get_filter_options() {
        return (object) [
            'overflowdiv' => true,
            'noclean' => true,
        ];
    }

    /**
     * Export autosave records for a user.
     *
     * @param stdClass $user The user whose data is being exported.
     * @param \moodle_recordset $autosaves The recordset of autosave data to export.
     */
    protected static function export_autosaves(stdClass $user, \moodle_recordset $autosaves) {
        foreach ($autosaves as $autosave) {
            $data = (object)[
                'contextid' => $autosave->contextid,
                'userid' => $autosave->userid,
                'content' => $autosave->content,
                'timemodified' => transform::datetime($autosave->timemodified),
            ];

            // Write the data to the export location.
            writer::with_context(context::instance_by_id($autosave->contextid))
                ->export_data([
                    get_string('privacy:metadata:tiny_cursive', 'tiny_cursive'),
                ], $data);
        }
        $autosaves->close();
    }

}
