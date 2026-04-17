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
 * Module for handling submission removal in Cursive integration with Moodle
 * This module intercepts form submissions to remove Cursive data before proceeding with the original form submission
 * @module     tiny_cursive/remove_submission
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {call} from 'core/ajax';
export const init = () => {
    let formElement = document.querySelector('#modal-footer form > input[name="userid"]');
    let form = formElement?.parentElement;
    let userid = formElement.value;
    let cmid = M.cfg.contextInstanceId;
    let courseid = M.cfg.courseId;

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            call([{
                methodname: 'cursive_remove_submission',
                args: {
                    courseid: courseid,
                    userid: userid,
                    cmid: cmid,
                }
            }])[0].done((response) => {
                if (response) {
                    form.submit();
                }
            }).fail(function(error) {
                window.console.error('AJAX request failed:', error);
            });
        });
    }
};
