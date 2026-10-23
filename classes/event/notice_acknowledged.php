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

namespace tiny_cursive\event;

use context_system;
use core\event\base;
use moodle_url;
use stdClass;

/**
 * Event fired when a user acknowledges the biometric data transparency notice.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class notice_acknowledged extends base {
    /**
     * Initialise the event data.
     */
    protected function init(): void {
        $this->data['crud'] = 'c';
        $this->data['edulevel'] = self::LEVEL_PARTICIPATING;
        $this->data['objecttable'] = 'tiny_cursive_notice';
    }

    /**
     * Create the event from an acknowledgement record.
     *
     * @param stdClass $record A tiny_cursive_notice record.
     * @return static
     */
    public static function create_from_record(stdClass $record): self {
        $event = self::create([
            'objectid' => $record->id,
            'relateduserid' => $record->userid,
            'context' => context_system::instance(),
            'other' => [
                'noticeversion' => (int) $record->noticeversion,
                'noticetexthash' => $record->noticetexthash,
            ],
        ]);
        $event->add_record_snapshot('tiny_cursive_notice', $record);
        return $event;
    }

    /**
     * Localised event name.
     *
     * @return string
     */
    public static function get_name(): string {
        return get_string('event_notice_acknowledged', 'tiny_cursive');
    }

    /**
     * Non-localised event description.
     *
     * @return string
     */
    public function get_description(): string {
        return "The user with id '{$this->relateduserid}' acknowledged version '{$this->other['noticeversion']}' " .
            "of the Cursive data transparency notice (wording hash '{$this->other['noticetexthash']}').";
    }

    /**
     * URL of the acknowledgement report.
     *
     * @return moodle_url
     */
    public function get_url(): moodle_url {
        return new moodle_url('/lib/editor/tiny/plugins/cursive/notice_report.php');
    }

    /**
     * Validate the event data.
     *
     * @throws \coding_exception
     */
    protected function validate_data(): void {
        parent::validate_data();

        if (!isset($this->relateduserid)) {
            throw new \coding_exception('The \'relateduserid\' must be set.');
        }
        if (!isset($this->other['noticeversion'])) {
            throw new \coding_exception('The \'noticeversion\' value must be set in other.');
        }
        if (!isset($this->other['noticetexthash'])) {
            throw new \coding_exception('The \'noticetexthash\' value must be set in other.');
        }
    }

    /**
     * Mapping of the object id for backup and restore.
     *
     * @return array
     */
    public static function get_objectid_mapping(): array {
        return ['db' => 'tiny_cursive_notice', 'restore' => base::NOT_MAPPED];
    }

    /**
     * Mapping of the other fields for backup and restore.
     *
     * @return bool
     */
    public static function get_other_mapping(): bool {
        return false;
    }
}
