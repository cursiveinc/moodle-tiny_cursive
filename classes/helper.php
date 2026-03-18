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

namespace tiny_authory_tech;

/**
 * Class helper
 *
 * @package    tiny_authory_tech
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class helper {
    /**
     * Updates resource IDs for both comments and authory_tech files
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @return void
     * @throws \dml_exception
     */
    public static function update_resource_id($data) {
        self::update_comment($data);
        self::update_authory_tech_files($data);
    }

    /**
     * Updates comments in the tiny_cursive_comments table.
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
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
     * Updates authory_tech file in the tiny_cursive_files table.
     *
     * @param array $data Array containing userid, modulename, courseid, cmid and resourceid
     * @throws \dml_exception
     */
    public static function update_authory_tech_files($data) {
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
