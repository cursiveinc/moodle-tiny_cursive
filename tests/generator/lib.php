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

use tiny_cursive\notice;

/**
 * Data generator for tiny_cursive.
 *
 * @package    tiny_cursive
 * @category   test
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class tiny_cursive_generator extends component_generator_base {
    /**
     * Create a notice acknowledgement record directly, bypassing the gate.
     *
     * @param array|stdClass $record Keys: userid (required), noticeversion, lang, timecreated, noticetext.
     * @return stdClass The tiny_cursive_notice record.
     */
    public function create_acknowledgement($record): stdClass {
        global $DB;

        $record = (object) $record;
        if (empty($record->userid)) {
            throw new coding_exception('userid is required');
        }

        $version = (int) ($record->noticeversion ?? notice::VERSION);
        $lang = $record->lang ?? 'en';
        $text = $record->noticetext ?? notice::get_text($lang);
        $hash = notice::hash($text);
        $now = (int) ($record->timecreated ?? time());

        if (!$DB->record_exists('tiny_cursive_notice_text', ['noticetexthash' => $hash])) {
            $DB->insert_record('tiny_cursive_notice_text', (object) [
                'noticetexthash' => $hash,
                'noticetext' => $text,
                'lang' => $lang,
                'noticeversion' => $version,
                'timecreated' => $now,
            ]);
        }

        $ack = (object) [
            'userid' => (int) $record->userid,
            'noticeversion' => $version,
            'noticetexthash' => $hash,
            'timecreated' => $now,
        ];
        $ack->id = $DB->insert_record('tiny_cursive_notice', $ack);

        if ($version === notice::VERSION) {
            set_user_preference(notice::PREFERENCE, $version, $ack->userid);
        }

        return $ack;
    }
}
