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
 * Class helper
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {
    /**
     * Updates resource IDs for both comments and cursive files
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @return void
     * @throws \dml_exception
     */
    public static function update_resource_id($data) {
        self::update_comment($data);
        self::update_cursive_files($data);
    }

    /**
     * Tiny cursive plugin update comment observer.
     *
     * @param \core\event\base $event The event object
     * @throws \dml_exception
     */
    public static function update_comment($data) {
        global $DB;

        $table      = 'tiny_cursive_comments';
        $conditions = [
            "userid"     => $data['userid'],
            "modulename" => $data['modulename'],
            'resourceid' => 0,
            'courseid'   => $data['courseid'],
            'cmid'       => $data['cmid'],
        ];

        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            self::update_records($recs, $table, $data['resourceid']);
        }
        // Update autosave content as well.
        $conditions['modulename'] = $data['modulename'] . "_autosave";
        self::update_autosaved_content($conditions, $table, $data['resourceid']);
    }

    /**
     * Tiny cursive plugin update cursive files observer.
     *
     * @param \core\event\base $event The event object
     * @return void
     * @throws \dml_exception
     */
    public static function update_cursive_files($data) {
        global $DB;

        $table      = 'tiny_cursive_files';
        $conditions = [
            "userid"     => $data['userid'],
            "modulename" => $data['modulename'],
            'resourceid' => 0,
            'courseid'   => $data['courseid'],
            'cmid'       => $data['cmid'],
        ];
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            $fname               = $data['userid'] . '_' . $data['resourceid'] . '_' . $data['cmid'] . '_attempt' . '.json';
            self::update_records($recs, $table, $data['resourceid'], $fname);
        }
    }

    /**
     * Update autosaved content records.
     *
     * @param array $conditions The conditions to find records to update
     * @param string $table The database table name
     * @param array $data The event data containing user, course and context info
     * @param int $postid The post ID to update the records with
     * @return void
     * @throws \dml_exception
     */
    public static function update_autosaved_content($conditions, $table, $postid) {
        global $DB;
        $recs = $DB->get_records($table, $conditions);
        if ($recs) {
            self::update_records($recs, $table, $postid);
        }
    }

    /**
     * Updates records in the database with new resource ID and optionally a new filename
     *
     * @param array $recs Array of records to update
     * @param string $table Database table name
     * @param int $id New resource ID to set
     * @param string|null $name Optional new filename to set
     * @return void
     * @throws \dml_exception
     */
    private static function update_records($recs, $table, $id, $name = null) {
        global $DB;

        foreach ($recs as $rec) {
            $rec->resourceid = $id;
            if ($name) {
                $rec->filename = $name;
            }
            $DB->update_record($table, $rec, true);
        }
    }
}
