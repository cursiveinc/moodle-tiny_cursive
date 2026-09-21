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
 * Uninstallation cleanup script for tiny_cursive plugin.
 *
 * @package    tiny_cursive
 * @copyright  2026 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Custom uninstall procedure for the tiny_cursive plugin.
 *
 * @return bool True on success.
 */
function xmldb_tiny_cursive_uninstall(): bool {
    // Delete all plugin config settings.
    unset_all_config_for_plugin('tiny_cursive');

    return true;
}
