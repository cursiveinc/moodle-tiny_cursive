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
  const analyticButton = (effort, userid, questionid = "") => {
    const anchor = document.createElement("a");
    anchor.href = "#";
    anchor.id = "analytics" + userid + questionid;
    anchor.classList.add(
      "d-inline-flex",
      "justify-content-center",
      'text-decoration-none'
    );

    const button = document.createElement('div');
    button.className = 'tiny_cursive-analytics-button';

    // Left side (icon + label)
    const left = document.createElement('div');
    left.className = 'tiny_cursive-analytics-left';

    const icon = document.createElement('img');
    icon.src = M.util.image_url('chart-column', 'tiny_cursive');
    icon.alt = 'Analytics Icon';
    icon.className = 'tiny_cursive-analytics-bar-icon';

    const label = document.createElement('span');
    label.className = 'tiny_cursive-analytics-label';
    label.textContent = 'Analytics';
    Str.get_string("analytics", "tiny_cursive")
      .then((analyticsString) => {
        label.textContent = analyticsString;
        return analyticsString;
      })
      .catch((error) => {
        window.console.error("Error fetching string:", error);
      });

    left.appendChild(icon);
    left.appendChild(label);
    button.appendChild(left);

    if (effort) {
      const right = document.createElement('div');
      right.className = 'tiny_cursive-analytics-right';
      right.textContent = effort+"%";
      right.title = "Effort";

      if(effort < 90) {
        right.style.backgroundColor = '#EAB308';
      }

      button.appendChild(right);
    }
    // Compose full button
    anchor.appendChild(button);

    return anchor;
  };

  return analyticButton;
});
