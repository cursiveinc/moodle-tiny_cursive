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
 * Module that creates a replay button.
 * The button displays replay functionality for a specific user.
 *
 * @module     tiny_cursive/replay_button
 * @copyright  2024 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(["core/str"], function(Str) {
    const replayButton = (userid, questionid = "") => {
        const anchor = document.createElement("a");
        anchor.href = "#";
        anchor.id = "analytics" + userid + questionid;
        anchor.classList.add(
          "d-inline-flex",
          "justify-content-center",
          'text-decoration-none'
        );

        const button = document.createElement('div');
        button.className = 'tiny_cursive-replay-button';

        // Left side (icon + label)
        const left = document.createElement('div');
        left.className = 'tiny_cursive-replay-left';

        const icon = document.createElement('img');
        icon.src = M.util.image_url('playicon', 'tiny_cursive');
        icon.alt = 'Replay Icon';
        icon.className = 'tiny_cursive-replay-bar-icon';

        const label = document.createElement('span');
        label.className = 'tiny_cursive-replay-label';
        label.textContent = 'Replay';

        Str.get_string("replay", "tiny_cursive")
            .then((replayString) => {
                label.textContent = replayString;
                return replayString;
            })
            .catch((error) => {
                window.console.error("Error fetching string:", error);
            });

        left.appendChild(icon);
        left.appendChild(label);
        button.appendChild(left);

        anchor.appendChild(button);
        return anchor;
    };

    return replayButton;
});