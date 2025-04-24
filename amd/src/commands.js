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
 * Tiny cursive commands
 *
 * @module     tiny_cursive/commands
 * @copyright  2025 CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */


import {buttonName, icon, iconUrl, iconGrayUrl} from 'tiny_cursive/common';

export const getSetup = async() => {

    return (editor, hasApiKey) => {

        const cursiveIcon = document.createElement('img');

        cursiveIcon.src = hasApiKey ? iconUrl : iconGrayUrl;
        cursiveIcon.id = "tiny_cursive_StateIcon";

        editor.ui.registry.addIcon(icon, cursiveIcon.outerHTML);
        editor.ui.registry.addButton(buttonName, {
            icon,
            onAction: () => {
            },
        });
    };
};
