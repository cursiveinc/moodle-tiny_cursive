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

    // Define the SVG element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.setAttribute("fill", "none");

    // Create the path element
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute(
      "d",
      "M5.32742 16.3022L5.32725 16.3024L3.64053 17.9889C3.64052 17.9889 3.64051 17.9889" +
        " 3.6405 17.9889C3.19086 18.4385 2.46114 18.4388 2.01139 17.989C2.01129 17.9889 2.01119 17.9888 2.01109" +
        " 17.9887M5.32742 16.3022L2.3648 16.7132C2.11023 16.9677 2.11023 17.381 2.3648 17.6353L2.01109 17.9887M5.32742" +
        " 16.3022C5.77683 15.8524 5.77683 15.1228 5.32742 14.673L5.32712 14.6727C4.87733 14.2233 4.14771 14.2233" +
        " 3.69792 14.6727L3.69775 14.6729L2.01124 16.3596L2.35764 16.706L2.01122 16.3596M5.32742 16.3022L2.01122" +
        " 16.3596M2.01109 17.9887C1.56129 17.539 1.5616 16.8093 2.01122 16.3596M2.01109 17.9887L2.01122 16.3596M6.79811" +
        " 12.9869L7.12112 12.664L6.82863 12.3132C5.86305 11.155 5.28263 9.66711 5.28263 8.04356C5.28263 4.36035 8.27335" +
        " 1.36963 11.9566 1.36963C15.6398 1.36963 18.6305 4.36035 18.6305 8.04356C18.6305 11.7268 15.6398 14.7175 11.9566" +
        " 14.7175C10.333 14.7175 8.84512 14.1371 7.68695 13.1715L7.33612 12.879L7.01318 13.202L5.9247 14.2907L5.67485" +
        " 14.5406L5.82702 14.8595C6.08573 15.4018 5.9897 16.0703 5.54234 16.5176L3.85581 18.2042C3.28735 18.7726 2.36419" +
        " 18.7726 1.79601 18.2042L1.79591 18.2041C1.22756 17.6359 1.22749 16.7128 1.79596 16.1443L1.4424 15.7908L1.79596" +
        " 16.1443L3.48248 14.4578C3.92985 14.0104 4.59836 13.9144 5.14058 14.1731L5.45951 14.3253L5.70941 14.0754L6.79811" +
        " 12.9869ZM13.9964 7.09277L14.85 6.23921H13.6429H13.2609C13.1771 6.23921 13.1087 6.1709 13.1087 6.08704C13.1087" +
        " 6.00318 13.1771 5.93486 13.2609 5.93486H15.2174C15.3015 5.93486 15.3696 6.00296 15.3696 6.08704V8.04356C15.3696" +
        " 8.12742 15.3013 8.19574 15.2174 8.19574C15.1336 8.19574 15.0653 8.12742 15.0653 8.04356V7.66161V6.45459L14.2117" +
        " 7.30803L12.0641 9.45543L12.0639 9.4556C12.0047 9.51492 11.9085 9.51492 11.8492 " +
        "9.4556L11.849 9.45541L11.0057 8.61236L10.6522" +
        " 8.25892L10.2987 8.61238L8.80325 10.1076L8.80307 10.1078C8.74402 10.1669 " +
        "8.64735 10.1669 8.5883 10.1078L8.588 10.1075C8.5289" +
        " 10.0484 8.5289 9.95176 8.588 9.89271L8.58815 9.89256L10.5447 7.93603L10." +
        "5448 7.93588C10.6041 7.87656 10.7003 7.87656" +
        " 10.7596 7.93588L10.7598 7.93607L11.6031 8.77912L11.9566 9.13258L12.3101 " +
        "8.77907L13.9964 7.09277ZM18.3261 8.04356C18.3261" +
        " 4.52785 15.4723 1.67398 11.9566 1.67398C8.44085 1.67398 5.58698 4.52785 " +
        "5.58698 8.04356C5.58698 11.5593 8.44085 14.4131" +
        " 11.9566 14.4131C15.4723 14.4131 18.3261 11.5593 18.3261 8.04356Z"
    );
    path.setAttribute("fill", "#306BB2");
    path.setAttribute("stroke", "#306BB2");

    // Append the path to the SVG.
    svg.appendChild(path);

    const icon = document.createElement("i");
    icon.appendChild(svg);
    icon.classList.add("tiny_cursive-analytics-icon");

    const textNode = document.createElement("span");
    Str.get_string("analytics", "tiny_cursive")
      .then((analyticsString) => {
        textNode.textContent = analyticsString;
        return true;
      })
      .catch((error) => {
        window.console.error("Error fetching string:", error);
      });

    anchor.appendChild(icon);
    anchor.appendChild(textNode);

    return anchor;
  };

  return analyticButton;
});
