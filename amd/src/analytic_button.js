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
 * Module that creates an analytics button with an icon and text.
 * The button displays analytics information for a specific user and question.
 *
 * @module     tiny_cursive/analytic_button
 * @copyright  2024 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

define(["core/str"], function(Str) {
  const analyticButton = (userid, questionid = "") => {
    const anchor = document.createElement("a");
    anchor.href = "#";
    anchor.id = "analytics" + userid + questionid;
    anchor.classList.add(
      "d-inline-flex",
      "align-items-center",
      "text-white",
      "tiny_cursive-analytics-btn"
    );

    const analyticIcon = document.createElement('img');
    analyticIcon.src = M.util.image_url('analytics', 'tiny_cursive');

    const icon = document.createElement("i");
    icon.appendChild(analyticIcon);
    icon.classList.add("tiny_cursive-analytics-icon");

    const textNode = document.createElement("span");
    Str.get_string("analytics", "tiny_cursive")
      .then((analyticsString) => {
        textNode.textContent = analyticsString;
        return true;
      })
      .catch((error) => {
        window.console.error(error);
      });

    anchor.appendChild(icon);
    anchor.appendChild(textNode);

    return anchor;
  };

  return analyticButton;
});
