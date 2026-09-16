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
namespace tiny_cursive\privacy;

use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\writer;
use core_privacy\local\metadata\collection;
use core_privacy\local\request\userlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\metadata\provider as meta_provider;
use core_privacy\local\request\core_userlist_provider;
use core_privacy\local\request\plugin\provider as plugin_provider;
use core_privacy\local\request\user_preference_provider;
use stdClass;
use core_privacy\local\request\transform;
use context;
use context_system;
use tiny_cursive\notice;


/**
 * Privacy Subsystem implementation for tiny_cursive.
 *
 * Retention note. The notice acknowledgement log (tiny_cursive_notice, with its wording
 * snapshots in tiny_cursive_notice_text) is deliberately NOT removed by any of the delete
 * methods below. Each row is the institution's evidence that a specific person was shown a
 * specific wording on a specific date before biometric processing began. Removing it on an
 * erasure request would destroy the only proof that the processing was properly notified,
 * which is precisely what the institution needs if that person later disputes it. GDPR
 * Art. 17(3)(b) and (e) provide for retention where processing is necessary for compliance
 * with a legal obligation or for the establishment, exercise or defence of legal claims;
 * that is the ground relied on. Records are kept indefinitely unless the administrator sets
 * tiny_cursive/notice_retentionperiod, in which case the purge_old_records task removes
 * them once they are older than that period. Every other tiny_cursive table is cleared.
 *
 * @copyright  Cursive Technology, Inc. <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements core_userlist_provider, meta_provider, plugin_provider, user_preference_provider {
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

        $collection->add_database_table('tiny_cursive_user_writing', [
            'file_id' => 'privacy:metadata:database:tiny_cursive_user_writing:file_id',
            'total_time_seconds' => 'privacy:metadata:database:tiny_cursive_user_writing:total_time_seconds',
            'word_count' => 'privacy:metadata:database:tiny_cursive_user_writing:word_count',
            'score' => 'privacy:metadata:database:tiny_cursive_user_writing:score',
            'user_agent' => 'privacy:metadata:database:tiny_cursive_user_writing:user_agent',
        ], 'privacy:metadata:database:tiny_cursive_user_writing');

        $collection->add_database_table('tiny_cursive_writing_diff', [
            'file_id' => 'privacy:metadata:database:tiny_cursive_writing_diff:file_id',
            'reconstructed_text' => 'privacy:metadata:database:tiny_cursive_writing_diff:reconstructed_text',
            'submitted_text' => 'privacy:metadata:database:tiny_cursive_writing_diff:submitted_text',
        ], 'privacy:metadata:database:tiny_cursive_writing_diff');

        // Retained on erasure; see the class docblock and the summary string.
        $collection->add_database_table('tiny_cursive_notice', [
            'userid' => 'privacy:metadata:database:tiny_cursive_notice:userid',
            'noticeversion' => 'privacy:metadata:database:tiny_cursive_notice:noticeversion',
            'noticetexthash' => 'privacy:metadata:database:tiny_cursive_notice:noticetexthash',
            'timecreated' => 'privacy:metadata:database:tiny_cursive_notice:timecreated',
        ], 'privacy:metadata:database:tiny_cursive_notice');

        $collection->add_database_table('tiny_cursive_notice_text', [
            'noticetexthash' => 'privacy:metadata:database:tiny_cursive_notice_text:noticetexthash',
            'noticetext' => 'privacy:metadata:database:tiny_cursive_notice_text:noticetext',
            'lang' => 'privacy:metadata:database:tiny_cursive_notice_text:lang',
            'noticeversion' => 'privacy:metadata:database:tiny_cursive_notice_text:noticeversion',
            'timecreated' => 'privacy:metadata:database:tiny_cursive_notice_text:timecreated',
        ], 'privacy:metadata:database:tiny_cursive_notice_text');

        $collection->add_user_preference(notice::PREFERENCE, 'privacy:metadata:preference:tiny_cursive_noticeversion');
        $collection->add_user_preference('tiny_cursive_showguidance', 'privacy:metadata:preference:tiny_cursive_showguidance');

        $collection->add_external_location_link('api.cursivetechnology.net', [
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

        // Notice acknowledgements live in the system context.
        $sql = "SELECT c.id
                  FROM {tiny_cursive_notice} n
                  JOIN {context} c ON c.contextlevel = :contextsystem
                 WHERE n.userid = :userid";
        $contextlist->add_from_sql($sql, ['contextsystem' => CONTEXT_SYSTEM, 'userid' => $userid]);

        return $contextlist;
    }

    /**
     * Get the list of users within a specific context.
     *
     * @param userlist $userlist The userlist containing the list of users who have data in this context/plugin combination.
     */
    public static function get_users_in_context(userlist $userlist) {
        $context = $userlist->get_context();

        if ($context->contextlevel == CONTEXT_SYSTEM) {
            $userlist->add_from_sql('userid', "SELECT userid FROM {tiny_cursive_notice}", []);
        }

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
        [$contextsql, $contextparams] = $DB->get_in_or_equal($contextlist->get_contextids(), SQL_PARAMS_NAMED);
        $contextparams['userid'] = $user->id;

        $sql = "SELECT eas.*, eas.cmid AS contextid
                FROM {tiny_cursive_files} eas
                WHERE eas.userid = :userid AND eas.cmid {$contextsql}";

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

        // Notice acknowledgements, with the full wording the user was shown.
        $systemcontext = context_system::instance();
        if (in_array($systemcontext->id, $contextlist->get_contextids())) {
            self::export_notice_acknowledgements((int) $user->id, $systemcontext);
        }
    }

    /**
     * Export the user's notice acknowledgements under the system context.
     *
     * @param int $userid
     * @param context $context The system context.
     */
    protected static function export_notice_acknowledgements(int $userid, context $context): void {
        global $DB;

        $sql = "SELECT n.id, n.noticeversion, n.noticetexthash, n.timecreated, t.lang, t.noticetext
                  FROM {tiny_cursive_notice} n
             LEFT JOIN {tiny_cursive_notice_text} t ON t.noticetexthash = n.noticetexthash
                 WHERE n.userid = :userid
              ORDER BY n.timecreated ASC";
        $records = $DB->get_records_sql($sql, ['userid' => $userid]);
        if (!$records) {
            return;
        }

        $data = [];
        foreach ($records as $record) {
            $data[] = (object) [
                'noticeversion' => (int) $record->noticeversion,
                'lang' => $record->lang,
                'noticetext' => $record->noticetext,
                'noticetexthash' => $record->noticetexthash,
                'timecreated' => transform::datetime($record->timecreated),
            ];
        }

        writer::with_context($context)->export_data([
            get_string('pluginname', 'tiny_cursive'),
            get_string('privacy:noticeacknowledgements', 'tiny_cursive'),
        ], (object) ['acknowledgements' => $data]);
    }

    /**
     * Export the user's preferences held by this plugin.
     *
     * @param int $userid
     */
    public static function export_user_preferences(int $userid) {
        $noticeversion = get_user_preferences(notice::PREFERENCE, null, $userid);
        if ($noticeversion !== null) {
            writer::export_user_preference(
                'tiny_cursive',
                notice::PREFERENCE,
                $noticeversion,
                get_string('privacy:metadata:preference:tiny_cursive_noticeversion', 'tiny_cursive')
            );
        }

        $showguidance = get_user_preferences('tiny_cursive_showguidance', null, $userid);
        if ($showguidance !== null) {
            writer::export_user_preference(
                'tiny_cursive',
                'tiny_cursive_showguidance',
                transform::yesno($showguidance),
                get_string('privacy:metadata:preference:tiny_cursive_showguidance', 'tiny_cursive')
            );
        }
    }

    /**
     * Delete all data for all users in the specified context.
     *
     * Notice acknowledgements (tiny_cursive_notice / tiny_cursive_notice_text) are retained
     * on purpose; see the class docblock for the rationale.
     *
     * @param \context $context The specific context to delete data for.
     */
    public static function delete_data_for_all_users_in_context(context $context) {
        global $DB;

        $filesrecords = $DB->get_records('tiny_cursive_files', ['cmid' => $context->instanceid], '', 'id');

        if ($filesrecords) {
            $fileids = array_keys($filesrecords);
            $DB->delete_records_list('tiny_cursive_user_writing', 'file_id', $fileids);
            $DB->delete_records_list('tiny_cursive_writing_diff', 'file_id', $fileids);
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
     * Notice acknowledgements (tiny_cursive_notice / tiny_cursive_notice_text) are retained
     * on purpose; see the class docblock for the rationale.
     *
     * @param approved_userlist $userlist The approved context and user information to delete information for.
     */
    public static function delete_data_for_users(approved_userlist $userlist) {
        global $DB;

        $context = $userlist->get_context();
        $userids = $userlist->get_userids();
        if (!$userids) {
            return;
        }

        [$useridsql, $useridsqlparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED);
        $params = ['cmid' => $context->id] + $useridsqlparams;
        $select = "cmid = :cmid AND userid {$useridsql}";

        $filerecords = $DB->get_records_select('tiny_cursive_files', $select, $params, '', 'id');
        if ($filerecords) {
            $fileids = array_keys($filerecords);
            $DB->delete_records_list('tiny_cursive_user_writing', 'file_id', $fileids);
            $DB->delete_records_list('tiny_cursive_writing_diff', 'file_id', $fileids);
        }

        $DB->delete_records_select('tiny_cursive_files', $select, $params);
        $DB->delete_records_select('tiny_cursive_comments', $select, $params);
    }

    /**
     * Delete all user data for the specified user, in the specified contexts.
     *
     * Notice acknowledgements (tiny_cursive_notice / tiny_cursive_notice_text) are retained
     * on purpose; see the class docblock for the rationale. The user preference caching the
     * acknowledged version is likewise left in place, since it mirrors the retained record.
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
