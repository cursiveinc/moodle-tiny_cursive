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
    /**
     * Build the Replay pill that opens the analytics modal on the Replay tab.
     *
     * @param {number|string} userid User (or entry) id used to build the element id.
     * @param {number|string} questionid Optional question id for quiz contexts.
     * @param {string} label Optional accessible name carrying row context, e.g. "Replay: Jane Doe".
     * @returns {HTMLButtonElement}
     */
    const replayButton = (userid, questionid = "", label = "") => {
        const button = document.createElement("button");
        button.type = "button";
        button.id = "analytics" + userid + questionid;
        button.classList.add(
          "tiny_cursive-pill-button",
          "d-inline-flex",
          "justify-content-center",
          "text-decoration-none"
        );
        button.setAttribute("aria-haspopup", "dialog");
        if (label) {
            button.setAttribute("aria-label", label);
        }

        const pill = document.createElement("div");
        pill.className = "tiny_cursive-replay-button";

        // Left side (icon + label).
        const left = document.createElement("div");
        left.className = "tiny_cursive-replay-left";

        // Decorative: the visible label carries the name.
        const icon = document.createElement("img");
        icon.src = M.util.image_url("playicon", "tiny_cursive");
        icon.alt = "";
        icon.className = "tiny_cursive-replay-bar-icon";

        const text = document.createElement("span");
        text.className = "tiny_cursive-replay-label";
        text.textContent = "Replay";

        Str.get_string("replay", "tiny_cursive")
            .then((replayString) => {
                text.textContent = replayString;
                return replayString;
            })
            .catch((error) => {
                window.console.error("Error fetching string:", error);
            });

        left.appendChild(icon);
        left.appendChild(text);
        pill.appendChild(left);

        button.appendChild(pill);
        return button;
    };

    return replayButton;
});
