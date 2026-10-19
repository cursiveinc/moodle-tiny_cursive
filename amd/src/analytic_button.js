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
  /**
   * Build the Analytics pill that opens the analytics modal.
   *
   * @param {number|string} effort Effort ratio percentage; falsy hides the badge.
   * @param {number|string} userid User (or entry) id used to build the element id.
   * @param {number|string} questionid Optional question id for quiz contexts.
   * @param {string} label Optional accessible name carrying row context, e.g. "Analytics: Jane Doe".
   * @returns {HTMLButtonElement}
   */
  const analyticButton = (effort, userid, questionid = "", label = "") => {
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
    pill.className = "tiny_cursive-analytics-button";

    // Left side (icon + label).
    const left = document.createElement("div");
    left.className = "tiny_cursive-analytics-left";

    // Decorative: the visible label carries the name.
    const icon = document.createElement("img");
    icon.src = M.util.image_url("chart-column", "tiny_cursive");
    icon.alt = "";
    icon.className = "tiny_cursive-analytics-bar-icon";

    const text = document.createElement("span");
    text.className = "tiny_cursive-analytics-label";
    text.textContent = "Analytics";

    left.appendChild(icon);
    left.appendChild(text);
    pill.appendChild(left);

    const stringRequests = [{key: "analytics", component: "tiny_cursive"}];
    let prefix = null;
    let low = null;
    let right = null;

    if (effort) {
      right = document.createElement("div");
      right.className = "tiny_cursive-analytics-right";

      // Visually hidden prefix so the badge reads "Effort: 95%" rather than a bare number.
      prefix = document.createElement("span");
      prefix.className = "sr-only visually-hidden";
      right.appendChild(prefix);

      if (effort < 90) {
        // Non-colour cue for the below-threshold state.
        right.classList.add("tiny_cursive-analytics-right-low");
        const warn = document.createElement("i");
        warn.className = "fa fa-exclamation-circle";
        warn.setAttribute("aria-hidden", "true");
        right.appendChild(warn);
      }

      const value = document.createElement("span");
      value.textContent = effort + "%";
      right.appendChild(value);

      if (effort < 90) {
        low = document.createElement("span");
        low.className = "sr-only visually-hidden";
        right.appendChild(low);
      }

      pill.appendChild(right);
      stringRequests.push(
        {key: "effort_ratio", component: "tiny_cursive"},
        {key: "loweffort", component: "tiny_cursive"}
      );
    }

    Str.get_strings(stringRequests)
      .then(([analyticsString, effortString, lowString]) => {
        text.textContent = analyticsString;
        if (right) {
          right.title = effortString;
          prefix.textContent = effortString + ": ";
          if (low) {
            low.textContent = ", " + lowString;
          }
        }
        return analyticsString;
      })
      .catch((error) => {
        window.console.error("Error fetching string:", error);
      });

    button.appendChild(pill);

    return button;
  };

  return analyticButton;
});
