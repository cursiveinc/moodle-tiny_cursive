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
 * @module     tiny_cursive/append_participants_table
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/config", "core/str"], function(mdlcfg, Str) {
    var usersTable = {
        init: async function(page) {
            await usersTable.appendTable(page);
        },
        appendTable: async function() {
            let h_tr = document.querySelector('thead tr');
            let courseid = M.cfg.courseId;

            // Fetch string for stats header.
            let statsString = await Str.get_string('stats', 'tiny_cursive');

            // Add the stats header if it doesn't already exist.
            if (!h_tr.querySelector('#stats')) {
                const sixthHeader = h_tr.querySelector('th:nth-child(7)'); // Adjust index if needed
                const newHeader = document.createElement('th');
                newHeader.className = 'header c7';
                newHeader.setAttribute('scope', 'col');
                newHeader.id = 'stats';
                newHeader.textContent = statsString;
                sixthHeader.after(newHeader);
            }

            // Iterate over each row in the table body
            const tbody = document.querySelector('tbody');
            const rows = tbody.querySelectorAll('tr');

            rows.forEach((row) => {
                const tdUser = row.querySelector('td');
                const input = tdUser.querySelector('input');

                if (input) {
                    const userId = input.id.slice(4);

                    if (userId) {
                        const sixthTd = row.querySelector('td:last-child');

                        const color = 'font-size:24px;color:black;text-decoration:none';
                        const link = mdlcfg.wwwroot + "/lib/editor/tiny/plugins/cursive/writing_report.php?userid="
                            + userId + "&courseid=" + courseid;
                        const icon = 'fa fa-area-chart';

                        const thunderIcon = document.createElement('td');
                        const anchor = document.createElement('a');
                        const iconElement = document.createElement('i');

                        anchor.href = link;
                        anchor.dataset.id = userId;
                        iconElement.className = icon;
                        iconElement.style = color;

                        anchor.appendChild(iconElement);
                        thunderIcon.appendChild(anchor);

                        sixthTd.after(thunderIcon);
                        // }
                    }
                }
            });

            // Add event listener for page change or other events triggering table update
            const pageItems = document.querySelectorAll('.page-item, .header');

            pageItems.forEach((element) => {
                element.addEventListener('click', () => {
                    setTimeout(() => {
                        if (!document.querySelector('#stats')) {
                            usersTable.init();
                        }
                    }, 1800);
                });
            });
            // });
        }
    };
    return usersTable;
});
