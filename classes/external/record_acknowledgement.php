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

namespace tiny_cursive\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use moodle_exception;
use require_login_exception;
use tiny_cursive\notice;

/**
 * External function recording that the calling user acknowledged the transparency notice.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class record_acknowledgement extends external_api {
    /**
     * Parameters definition.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'noticeversion' => new external_value(PARAM_INT, 'Version of the notice the user was shown'),
        ]);
    }

    /**
     * Record the acknowledgement for the calling user.
     *
     * The wording hash is derived server-side from the language strings in the user's
     * current language; the client only tells us which version it displayed, and that
     * must match the version currently in force.
     *
     * @param int $noticeversion
     * @return array
     * @throws moodle_exception When gating is disabled or the version does not match.
     */
    public static function execute(int $noticeversion): array {
        global $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['noticeversion' => $noticeversion]);

        $context = context_system::instance();
        self::validate_context($context);

        if (!isloggedin() || isguestuser()) {
            throw new require_login_exception('Guests may not acknowledge the notice');
        }
        if (!notice::is_enabled()) {
            throw new moodle_exception('notice_disabled', 'tiny_cursive');
        }
        if ($params['noticeversion'] !== notice::VERSION) {
            throw new moodle_exception('notice_versionmismatch', 'tiny_cursive');
        }

        $record = notice::record_acknowledgement((int) $USER->id);

        return [
            'acknowledged' => true,
            'noticeversion' => (int) $record->noticeversion,
            'timecreated' => (int) $record->timecreated,
        ];
    }

    /**
     * Return value definition.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'acknowledged' => new external_value(PARAM_BOOL, 'Whether an acknowledgement is now on record'),
            'noticeversion' => new external_value(PARAM_INT, 'Notice version that was acknowledged'),
            'timecreated' => new external_value(PARAM_INT, 'Server timestamp of the acknowledgement'),
        ]);
    }
}
