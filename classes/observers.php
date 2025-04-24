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
 * Tiny cursive plugin observer.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_cursive;
defined('MOODLE_INTERNAL') || die();

/**
 * Tiny cursive plugin observer class.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author eLearningstack
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class observers {
    /**
     * Tiny cursive plugin update comment observer.
     *
     * @param $event
     * @return void
     * @throws \dml_exception
     */
    public static function update_comment($event) {
        global $DB;
        $eventdata = $event->get_data();
        $table = 'tiny_cursive_comments';
        $conditions = [
            "userid" => $eventdata['userid'],
            "modulename" => 'forum',
            'resourceid' => 0,
            'courseid' => $eventdata['courseid'],
            'cmid' => $eventdata['contextinstanceid']
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $dataobj = new \stdClass();
                $dataobj->userid = $eventdata['userid'];
                $dataobj->id = $rec->id;
                $dataobj->cmid = $eventdata['contextinstanceid'];
                $dataobj->courseid = $eventdata['courseid'];
                $dataobj->resourceid = $eventdata['objectid'];
                $DB->update_record($table, $dataobj, true);
            }
        }
    }

    /**
     * Tiny cursive plugin update cursive files observer.
     *
     * @param $event
     * @return void
     * @throws \dml_exception
     */
    public static function update_cursive_files($event) {

        global $DB, $CFG;
        $eventdata = $event->get_data();
        if ($eventdata['target'] === "discussion") {
            $discussid = $eventdata['objectid'];
            $postdata = $DB->get_record('forum_posts', ['discussion' => $discussid]);
            if ($postdata) {
                $eventdata['objectid'] = $postdata->id;
            }
        }

        $table = 'tiny_cursive_files';
        $conditions = [
            "userid" => $eventdata['userid'],
            "modulename" => 'forum',
            'resourceid' => 0,
            'courseid' => $eventdata['courseid'],
            'cmid' => $eventdata['contextinstanceid']
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $userid = $eventdata['userid'];
                $cmid = $eventdata['contextinstanceid'];
                $resourceid = $eventdata['objectid'];
                $fname = $userid . '_' . $resourceid . '_' . $cmid . '_attempt' . '.json';

                $dataobj = new \stdClass();
                $dataobj->userid = $userid;
                $dataobj->id = $rec->id;
                $dataobj->cmid = $cmid;
                $dataobj->courseid = $eventdata['courseid'];
                $dataobj->resourceid = $resourceid;
                $dataobj->filename = $fname;
                $DB->update_record($table, $dataobj, true);
            }
        }
    }

    /**
     * Tiny cursive plugin login observer.
     *
     * @param \mod_forum\event\post_created $event
     * @return void
     * @throws \dml_exception
     */
    public static function observer_login(\mod_forum\event\post_created $event) {
        self::update_comment($event);
        self::update_cursive_files($event);
    }

    /**
     * Tiny cursive plugin post updated observer.
     *
     * @param \mod_forum\event\post_updated $event
     * @return void
     * @throws \dml_exception
     */
    public static function post_updated(\mod_forum\event\post_updated $event) {
        self::update_comment($event);
        self::update_cursive_files($event);
    }

    /**
     * Tiny cursive plugin discussion created observer.
     *
     * @param \mod_forum\event\discussion_created $event
     * @return void
     * @throws \dml_exception
     */
    public static function discussion_created(\mod_forum\event\discussion_created $event) {

        global $DB;
        $eventdata = $event->get_data();
        $objectid = $eventdata['objectid'];
        $discussionstable = 'forum_discussions';
        $discussionsrec = $DB->get_record($discussionstable, ['id' => $objectid]);
        $table = 'tiny_cursive_comments';
        $conditions = [
            "userid" => $eventdata['userid'],
            "modulename" => 'forum',
            'resourceid' => 0,
            'courseid' => $eventdata['courseid'],
            'cmid' => $eventdata['contextinstanceid']
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $dataobj = new \stdClass();
                $dataobj->userid = $eventdata['userid'];
                $dataobj->id = $rec->id;
                $dataobj->cmid = $eventdata['contextinstanceid'];
                $dataobj->courseid = $eventdata['courseid'];
                $dataobj->resourceid = $discussionsrec->firstpost;
                $DB->update_record($table, $dataobj, true);
            }
        }

        self::update_cursive_files($event);

    }

    /**
     * Reset tracking data.
     *
     * @param \core\event\course_reset_ended $event
     * @return void
     * @throws \dml_exception
     */
    public static function reset_tracking_data(\core\event\course_reset_ended $event) {
        global $DB, $CFG;

        // Get the course ID from the event data.
        $data = (object) $event->get_data();
        $courseid = $data->courseid;

        // Retrieve all file records related to the course.
        $fileids = $DB->get_records('tiny_cursive_files', ['courseid' => $courseid], '', 'id, filename');

        // Delete records from 'tiny_cursive_files' and 'tiny_cursive_comments' tables.
        $DB->delete_records('tiny_cursive_files', ['courseid' => $courseid]);
        $DB->delete_records('tiny_cursive_comments', ['courseid' => $courseid]);

        // Delete associated user writing records and files.
        foreach ($fileids as $file) {
            $DB->delete_records('tiny_cursive_user_writing', ['file_id' => $file->id]);
            $DB->delete_records('tiny_cursive_writing_diff', ['file_id' => $file->id]);
        }
    }
}
