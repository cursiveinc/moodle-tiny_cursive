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
 * Tiny cursive plugin hooks.
 *
 * @package tiny_cursive
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$callbacks = [
    [
        'hook' => \core\hook\output\before_footer_html_generation::class,
        'callback' => \tiny_cursive\hook_callbacks::class . '::before_footer_html_generation',
        'priority' => 0,
    ],
    [
        'hook' => \core_course\hook\after_form_definition::class,
        'callback' => \tiny_cursive\hook_callbacks::class . '::after_form_definition',
        'priority' => 0,
    ],
    [
        'hook' => \core_course\hook\after_form_submission::class,
        'callback' => \tiny_cursive\hook_callbacks::class . '::after_form_submission',
        'priority' => 0,
    ],
];
