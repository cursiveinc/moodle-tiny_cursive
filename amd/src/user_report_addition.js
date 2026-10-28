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
 * Course name display in the writing report filter for non-admin users.
 * The course is fixed for them, so the select is replaced by a read-only name/value pair.
 *
 * @module     tiny_cursive/user_report_addition
 * @copyright  2024 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import {get_strings as getStrings} from 'core/str';

export const init = () => {
    const courseNameElement = document.querySelector('#id_courseid option[selected]');
    const moduleIdElement = document.getElementById('fitem_id_moduleid');
    const courseItem = document.getElementById('fitem_id_courseid');

    getStrings([
        {key: 'coursename', component: 'tiny_cursive'},
        {key: 'selectcrs', component: 'tiny_cursive'},
    ]).then(([courseName, selectCourse]) => {
        if (!courseNameElement) {
            // No course in the request: say so where the filter is, instead of navigating away.
            const notice = document.createElement('div');
            notice.className = 'alert alert-warning';
            notice.setAttribute('role', 'status');
            notice.textContent = selectCourse;
            (moduleIdElement || courseItem)?.insertAdjacentElement('beforebegin', notice);
            return notice;
        }

        // A description list, not labels without controls (1.3.1).
        const list = document.createElement('dl');
        list.classList.add('row', 'align-items-center', 'pb-4', 'mb-0');

        const term = document.createElement('dt');
        term.textContent = courseName;
        term.classList.add('col-md-3', 'col-form-label', 'pb-0');
        list.appendChild(term);

        const value = document.createElement('dd');
        value.textContent = courseNameElement.textContent.trim();
        value.classList.add('col-md-9', 'col-form-label', 'pb-0', 'mb-0');
        list.appendChild(value);

        if (moduleIdElement) {
            moduleIdElement.insertAdjacentElement('beforebegin', list);
        }
        if (courseItem) {
            courseItem.hidden = true;
        }
        return list;
    }).catch(error => {
        window.console.error(error);
    });
};
