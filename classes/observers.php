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
     * @param \core\event\base $event The event object
     * @return void
     * @throws \dml_exception
     */
    public static function update_comment($event) {
        global $DB;

        $eventdata  = $event->get_data();
        $table      = 'tiny_cursive_comments';
        $modulename = self::get_modules_name($eventdata);
        $conditions = [
            "userid"     => $eventdata['userid'],
            "modulename" => $modulename,
            'resourceid' => 0,
            'courseid'   => $eventdata['courseid'],
            'cmid'       => $eventdata['contextinstanceid'],
        ];

        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $dataobj             = new \stdClass();
                $dataobj->userid     = $eventdata['userid'];
                $dataobj->id         = $rec->id;
                $dataobj->cmid       = $eventdata['contextinstanceid'];
                $dataobj->courseid   = $eventdata['courseid'];
                $dataobj->resourceid = $eventdata['objectid'];

                $DB->update_record($table, $dataobj, true);
            }
        }
        // Update autosave content as well.
        $conditions['modulename'] = $modulename . "_autosave";
        self::update_autosaved_content($conditions, $table, $eventdata, $eventdata['objectid']);
    }

    /**
     * Tiny cursive plugin update cursive files observer.
     *
     * @param \core\event\base $event The event object
     * @return void
     * @throws \dml_exception
     */
    public static function update_cursive_files($event) {

        global $DB;

        $eventdata     = $event->get_data();
        if ($eventdata['target'] === "discussion") {
            $discussid = $eventdata['objectid'];
            $postdata  = $DB->get_record('forum_posts', ['discussion' => $discussid]);
            if ($postdata) {
                $eventdata['objectid'] = $postdata->id;
            }
        }

        $table      = 'tiny_cursive_files';
        $modulename = self::get_modules_name($eventdata);
        $conditions = [
            "userid"     => $eventdata['userid'],
            "modulename" => $modulename,
            'resourceid' => 0,
            'courseid'   => $eventdata['courseid'],
            'cmid'       => $eventdata['contextinstanceid'],
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $userid              = $eventdata['userid'];
                $cmid                = $eventdata['contextinstanceid'];
                $resourceid          = $eventdata['objectid'];
                $fname               = $userid . '_' . $resourceid . '_' . $cmid . '_attempt' . '.json';

                $dataobj             = new \stdClass();
                $dataobj->userid     = $userid;
                $dataobj->id         = $rec->id;
                $dataobj->cmid       = $cmid;
                $dataobj->courseid   = $eventdata['courseid'];
                $dataobj->resourceid = $resourceid;
                $dataobj->filename   = $fname;

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
        $eventdata        = $event->get_data();
        $objectid         = $eventdata['objectid'];
        $discussionstable = 'forum_discussions';
        $discussionsrec   = $DB->get_record($discussionstable, ['id' => $objectid]);
        $table            = 'tiny_cursive_comments';

        $conditions       = [
            "userid"     => $eventdata['userid'],
            "modulename" => 'forum',
            'resourceid' => 0,
            'courseid'   => $eventdata['courseid'],
            'cmid'       => $eventdata['contextinstanceid'],
        ];
        $recs = $DB->get_records($table, $conditions);

        if ($recs) {
            foreach ($recs as $rec) {
                $dataobj             = new \stdClass();
                $dataobj->userid     = $eventdata['userid'];
                $dataobj->id         = $rec->id;
                $dataobj->cmid       = $eventdata['contextinstanceid'];
                $dataobj->courseid   = $eventdata['courseid'];
                $dataobj->resourceid = $discussionsrec->firstpost;

                $DB->update_record($table, $dataobj, true);
            }
        }
        $conditions['modulename'] = 'forum_autosave';

        self::update_autosaved_content($conditions, $table, $eventdata, $discussionsrec->firstpost);
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
        global $DB;

        // Get the course ID from the event data.
        $data     = (object) $event->get_data();
        $courseid = $data->courseid;

        // Retrieve all file records related to the course.
        $fileids  = $DB->get_records('tiny_cursive_files', ['courseid' => $courseid], '', 'id, filename');

        // Delete records from 'tiny_cursive_files' and 'tiny_cursive_comments' tables.
        $DB->delete_records('tiny_cursive_files', ['courseid' => $courseid]);
        $DB->delete_records('tiny_cursive_comments', ['courseid' => $courseid]);

        // Delete associated user writing records and files.
        foreach ($fileids as $file) {
            $DB->delete_records('tiny_cursive_user_writing', ['file_id' => $file->id]);
            $DB->delete_records('tiny_cursive_writing_diff', ['file_id' => $file->id]);
        }
    }

    /**
     * Copy Cursive configuration settings after a course restore.
     *
     * This observer handles both same-site and cross-site restores.
     * For same-site: originalcourseid is available directly from the event.
     * For cross-site: we attempt to extract the original course id from the
     * backup controller info stored in the backup_controllers table.
     *
     * Note: The backup_ids_temp table is a temporary table that is dropped
     * before this event fires, so we use course_modules position matching
     * to map old cmids to new cmids instead.
     *
     * @param \core\event\course_restored $event The course restored event.
     * @return void
     */
    public static function course_restored(\core\event\course_restored $event) {
        global $DB;

        $eventdata   = $event->get_data();
        $newcourseid = (int) $eventdata['courseid'];
        $oldcourseid = null;

        // 1. Try to get the original course id from the event (same-site only).
        if (!empty($eventdata['other']['originalcourseid'])) {
            $oldcourseid = (int) $eventdata['other']['originalcourseid'];
        }

        // 2. Fallback: extract from backup_controllers table (works for cross-site too).
        if (!$oldcourseid) {
            $oldcourseid = self::get_original_courseid_from_controller($newcourseid);
        }

        if (!$oldcourseid || $oldcourseid === $newcourseid) {
            return;
        }

        // Check if the old course has any Cursive settings at all.
        $oldcourseenabled = get_config('tiny_cursive', "cursive-{$oldcourseid}");
        if ($oldcourseenabled === false) {
            return;
        }

        // Copy course-level setting.
        self::copy_restored_course_settings($oldcourseid, $newcourseid);

        // Build old→new cmid mapping and copy module-level settings.
        $cmidmap = self::build_cmid_mapping($oldcourseid, $newcourseid);
        if (!empty($cmidmap)) {
            self::copy_restored_module_settings($oldcourseid, $newcourseid, $cmidmap);
        }
    }

    /**
     * Extract the original course id from the backup controller record.
     *
     * The backup_controllers table persists after restore completes and stores
     * the serialized controller object which contains original_course_id in its info.
     *
     * @param int $newcourseid The restored (new) course id.
     * @return int|null The original course id or null if not found.
     */
    protected static function get_original_courseid_from_controller(int $newcourseid): ?int {
        global $DB;

        try {
            // Find the most recent restore controller for this course.
            $sql = 'SELECT id, backupid, controller FROM {backup_controllers}
                     WHERE operation = ? AND itemid = ? AND controller != ?
                     ORDER BY timemodified DESC';
            $records = $DB->get_records_sql($sql, ['restore', $newcourseid, ''], 0, 1);
            $record = reset($records);

            if (!$record || empty($record->controller)) {
                return null;
            }

            // The controller is serialized. Try to extract original_course_id
            // from the info object without full unserialization if possible.
            $controller = @unserialize(base64_decode($record->controller));
            if ($controller && method_exists($controller, 'get_info')) {
                $info = $controller->get_info();
                if (!empty($info->original_course_id)) {
                    return (int) $info->original_course_id;
                }
            }
        } catch (\Exception $e) {
            debugging('tiny_cursive: Failed to extract original course id from controller: ' .
                      $e->getMessage(), DEBUG_DEVELOPER);
        }

        return null;
    }

    /**
     * Build a mapping of old course module ids to new course module ids.
     *
     * Since the backup_ids_temp table is dropped before the course_restored event
     * fires, we build the mapping by matching course modules between the old and
     * new courses based on module type and position within each section.
     *
     * Moodle restore preserves the module ordering within sections, so matching
     * by (module type, section position, module position within section) is reliable.
     *
     * @param int $oldcourseid The original course id.
     * @param int $newcourseid The restored course id.
     * @return array Associative array of old cmid => new cmid.
     */
    protected static function build_cmid_mapping(int $oldcourseid, int $newcourseid): array {
        global $DB;

        $mapping = [];

        // Get old course modules ordered by section number and position within section.
        $sql = 'SELECT cm.id, cm.module, cm.instance, cs.section AS sectionnumber
                  FROM {course_modules} cm
                  JOIN {course_sections} cs ON cs.id = cm.section
                 WHERE cm.course = ? AND cm.deletioninprogress = 0
              ORDER BY cs.section ASC, cm.id ASC';

        $oldmodules = $DB->get_records_sql($sql, [$oldcourseid]);
        $newmodules = $DB->get_records_sql($sql, [$newcourseid]);

        if (empty($oldmodules) || empty($newmodules)) {
            return $mapping;
        }

        // Group modules by (section number, module type) to create position-based mapping.
        $oldgrouped = [];
        foreach ($oldmodules as $cm) {
            $key = $cm->sectionnumber . '_' . $cm->module;
            $oldgrouped[$key][] = $cm->id;
        }

        $newgrouped = [];
        foreach ($newmodules as $cm) {
            $key = $cm->sectionnumber . '_' . $cm->module;
            $newgrouped[$key][] = $cm->id;
        }

        // Match by position within each (section, module type) group.
        foreach ($oldgrouped as $key => $oldids) {
            if (!isset($newgrouped[$key])) {
                continue;
            }
            $newids = $newgrouped[$key];
            $count = min(count($oldids), count($newids));
            for ($i = 0; $i < $count; $i++) {
                $mapping[$oldids[$i]] = $newids[$i];
            }
        }

        return $mapping;
    }

    /**
     * Copy course-level Cursive settings from the old course to the restored course.
     *
     * @param int $oldcourseid Original course id.
     * @param int $newcourseid Restored course id.
     * @return void
     */
    protected static function copy_restored_course_settings(int $oldcourseid, int $newcourseid): void {
        $oldkey = "cursive-{$oldcourseid}";
        $value  = get_config('tiny_cursive', $oldkey);

        if ($value !== false) {
            $newkey = "cursive-{$newcourseid}";
            set_config($newkey, $value, 'tiny_cursive');
        }
    }

    /**
     * Copy module-level Cursive settings from the old course to the restored course.
     *
     * Handles three setting types:
     * - CUR{courseid}{cmid}      — per-activity Cursive enable
     * - STD{courseid}{cmid}      — per-activity Student View
     * - PASTE{courseid}_{cmid}   — per-activity paste behavior
     *
     * @param int $oldcourseid Original course id.
     * @param int $newcourseid Restored course id.
     * @param array $cmidmap Mapping of old cmid => new cmid.
     * @return void
     */
    protected static function copy_restored_module_settings(int $oldcourseid, int $newcourseid, array $cmidmap): void {
        global $DB;

        // Find all Cursive config entries for the old course.
        $oldcourseidstr = (string) $oldcourseid;
        $sql = 'SELECT id, name, value FROM {config_plugins}
                 WHERE plugin = ?
                   AND (name LIKE ? OR name LIKE ? OR name LIKE ?)';
        $params = [
            'tiny_cursive',
            "CUR{$oldcourseidstr}%",
            "STD{$oldcourseidstr}%",
            "PASTE{$oldcourseidstr}_%",
        ];
        $records = $DB->get_records_sql($sql, $params);

        $quotedid = preg_quote($oldcourseidstr, '/');

        foreach ($records as $record) {
            $oldname = $record->name;
            $newname = null;

            if (preg_match('/^CUR' . $quotedid . '(\d+)$/', $oldname, $matches)) {
                // CUR{courseid}{cmid} — no separator between courseid and cmid.
                $oldcmid = (int) $matches[1];
                if (isset($cmidmap[$oldcmid])) {
                    $newname = "CUR{$newcourseid}{$cmidmap[$oldcmid]}";
                }
            } else if (preg_match('/^STD' . $quotedid . '(\d+)$/', $oldname, $matches)) {
                // STD{courseid}{cmid} — no separator between courseid and cmid.
                $oldcmid = (int) $matches[1];
                if (isset($cmidmap[$oldcmid])) {
                    $newname = "STD{$newcourseid}{$cmidmap[$oldcmid]}";
                }
            } else if (preg_match('/^PASTE' . $quotedid . '_(\d+)$/', $oldname, $matches)) {
                // PASTE{courseid}_{cmid} — has underscore separator.
                $oldcmid = (int) $matches[1];
                if (isset($cmidmap[$oldcmid])) {
                    $newname = "PASTE{$newcourseid}_{$cmidmap[$oldcmid]}";
                }
            }

            if ($newname !== null) {
                set_config($newname, $record->value, 'tiny_cursive');
            }
        }
    }

    /**
     * Get the module name from event data.
     *
     * @param array $eventdata The event data containing component information
     * @return string The module name extracted from the component
     */
    public static function get_modules_name($eventdata) {
        // Use array destructuring to get module name directly from component.
        [, $modulename] = explode('_', $eventdata['component'], 2);
        return $modulename;
    }

    /**
     * Update autosaved content records.
     *
     * @param array $conditions The conditions to find records to update
     * @param string $table The database table name
     * @param array $eventdata The event data containing user, course and context info
     * @param int $postid The post ID to update the records with
     * @return void
     * @throws \dml_exception
     */
    public static function update_autosaved_content($conditions, $table, $eventdata, $postid) {
        global $DB;
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            foreach ($recs as $rec) {
                $dataobj             = new \stdClass();
                $dataobj->userid     = $eventdata['userid'];
                $dataobj->id         = $rec->id;
                $dataobj->cmid       = $eventdata['contextinstanceid'];
                $dataobj->courseid   = $eventdata['courseid'];
                $dataobj->resourceid = $postid;

                $DB->update_record($table, $dataobj, true);
            }
        }
    }
}
