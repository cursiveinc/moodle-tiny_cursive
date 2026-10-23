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

namespace tiny_cursive\local\admin;

use admin_setting_configduration;

defined('MOODLE_INTERNAL') || die();

require_once($CFG->libdir . '/adminlib.php');

/**
 * Duration setting offering only days, weeks and years, for the acknowledgement retention period.
 *
 * The core widget resolves its unit list with self:: rather than static::, so the methods
 * that consult it are overridden here as well.
 *
 * @package    tiny_cursive
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class setting_retentionperiod extends admin_setting_configduration {
    /** Seconds in a (non-leap) year. */
    public const YEARSECS = 365 * DAYSECS;

    /**
     * Selectable units.
     *
     * @return array
     */
    protected static function get_units() {
        return [
            self::YEARSECS => get_string('years'),
            WEEKSECS => get_string('weeks'),
            DAYSECS => get_string('days'),
        ];
    }

    /**
     * Find the largest unit that divides the duration exactly.
     *
     * @param int $seconds
     * @return array
     */
    protected static function parse_seconds($seconds) {
        foreach (self::get_units() as $unit => $unused) {
            if ($seconds % $unit === 0) {
                return ['v' => (int) ($seconds / $unit), 'u' => $unit];
            }
        }
        return ['v' => (int) round($seconds / DAYSECS), 'u' => DAYSECS];
    }

    /**
     * Current value as value/unit pair.
     *
     * @return array|null
     */
    public function get_setting() {
        $seconds = $this->config_read($this->name);
        if (is_null($seconds)) {
            return null;
        }
        return self::parse_seconds((int) $seconds);
    }

    /**
     * Render the value input and the unit select.
     *
     * @param array $data Current value as value/unit pair.
     * @param string $query
     * @return string
     */
    public function output_html($data, $query = '') {
        global $OUTPUT;

        $units = self::get_units();
        $defaultunit = $this->defaultunit;
        $inputid = $this->get_id() . 'v';

        $context = (object) [
            'id' => $this->get_id(),
            'name' => $this->get_full_name(),
            'value' => $data['v'] ?? '',
            'readonly' => $this->is_readonly(),
            'options' => array_map(function ($unit) use ($units, $data, $defaultunit) {
                return [
                    'value' => $unit,
                    'name' => $units[$unit],
                    'selected' => isset($data) && (($data['v'] == 0 && $unit == $defaultunit) || $unit == $data['u']),
                ];
            }, array_keys($units)),
        ];

        $element = $OUTPUT->render_from_template('core_admin/setting_configduration', $context);

        return format_admin_setting(
            $this,
            $this->visiblename,
            $element,
            $this->description,
            $inputid,
            '',
            get_string('notice_retentionperiod_default', 'tiny_cursive'),
            $query
        );
    }
}
