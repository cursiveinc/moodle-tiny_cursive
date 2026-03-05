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
 * Tiny cursive plugin event.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Enable web services in Moodle
 *
 * @package tiny_cursive
 */
function xmldb_tiny_cursive_install() {

    tiny_cursive_enable_webservice();
    tiny_cursive_enable_webservice_protocol();
}
/**
 * Enable web services in Moodle
 *
 * @package tiny_cursive
 */
function tiny_cursive_enable_webservice() {
    set_config('enablewebservices', 1);
}

/**
 * Enable a specific web service protocol
 *
 * @package tiny_cursive
 */
function tiny_cursive_enable_webservice_protocol() {
    set_config('webserviceprotocols', 'rest');
}
