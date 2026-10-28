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
 * Remove submission handler.
 * This module intercepts form submissions to remove Cursive data before proceeding with the original form submission.
 * A failed removal is reported in the confirmation dialog instead of silently doing nothing.
 *
 * @module     tiny_cursive/remove_submission
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {call} from 'core/ajax';
import {getString} from 'core/str';

export const init = () => {
    let formElement = document.querySelector('#modal-footer form > input[name="userid"]');
    let form = formElement?.parentElement;
    let userid = formElement?.value;
    let cmid = M.cfg.contextInstanceId;
    let courseid = M.cfg.courseId;

    if (!form) {
        return;
    }

    // Present from the start so the first failure is announced as a change (3.3.1 / 4.1.3).
    const error = document.createElement('div');
    error.className = 'alert alert-danger mt-2';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    form.insertAdjacentElement('beforebegin', error);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        error.hidden = true;
        call([{
            methodname: 'tiny_cursive_remove_submission',
            args: {
                courseid: courseid,
                userid: userid,
                cmid: cmid,
            }
        }])[0].done((response) => {
            if (response) {
                form.submit();
            }
        }).fail(async(failure) => {
            window.console.error('AJAX request failed:', failure);
            error.textContent = await getString('remove_submission_failed', 'tiny_cursive');
            error.hidden = false;
        });
    });
};
