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
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

define(["jquery", "core/config", "core/str", "core_table/local/dynamic/events"], function($, mdlcfg, Str, tableEvents) {
    // The header and body cell after which the Stats column is inserted (same index keeps them aligned).
    const INSERT_AFTER = 6;
    let listening = false;

    var usersTable = {
        init: async function() {
            await usersTable.appendTable();

            // Re-inject after the dynamic table reloads (pagination, sort, filter) instead of a fixed timer.
            if (!listening) {
                listening = true;
                document.addEventListener(tableEvents.eventTypes.tableContentRefreshed, () => {
                    usersTable.appendTable();
                });
            }
        },
        appendTable: async function() {
            const hTr = $('thead').find('tr').get()[0];
            if (!hTr) {
                return;
            }
            const courseid = M.cfg.courseId;
            const statsString = await Str.get_string('stats', 'tiny_cursive');

            if (!$(hTr).find('#stats').length) {
                $(hTr).find('th').eq(INSERT_AFTER).after(
                    '<th class="header c7" id="stats" scope="col">' + statsString + '</th>'
                );
            }

            const rows = $('tbody').find("tr").get();
            for (const tr of rows) {
                const tdUser = $(tr).find("td").get()[0];
                let userid = $(tdUser).find("input").get()[0]?.id;
                userid = userid?.slice(4); // Extract userid from the checkbox id ("user123").

                if (!userid || $(tr).find('.tiny_cursive-participant-stats').length) {
                    continue;
                }

                // The participant's name gives each control a distinct accessible name.
                const nameCell = $(tr).find('th, td').eq(1);
                const fullname = (nameCell.find('a').first().text() || nameCell.text()).trim() || userid;
                const statsFor = await Str.get_string('statsfor', 'tiny_cursive', fullname);

                const link = document.createElement('a');
                link.href = mdlcfg.wwwroot + "/lib/editor/tiny/plugins/cursive/writing_report.php?userid="
                    + userid + "&courseid=" + courseid;
                link.dataset.id = userid;
                link.className = 'tiny_cursive-participant-stats text-decoration-none';
                link.setAttribute('aria-label', statsFor);

                const icon = document.createElement('i');
                icon.className = 'fa fa-area-chart';
                icon.setAttribute('aria-hidden', 'true');

                const text = document.createElement('span');
                text.className = 'ml-1 ms-1';
                text.textContent = statsString;

                link.appendChild(icon);
                link.appendChild(text);

                const cell = document.createElement('td');
                cell.className = 'cell c7';
                cell.appendChild(link);

                $(tr).find('td').eq(INSERT_AFTER).after(cell);
            }
        }
    };
    return usersTable;
});
