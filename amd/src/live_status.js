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
 * Announce state changes through the analytics modal's persistent live region.
 *
 * The region (`[data-region="tiny_cursive-status"]`, role="status") is rendered with the
 * modal before any content is swapped, so screen readers announce updates reliably
 * without focus moving.
 *
 * @module     tiny_cursive/live_status
 * @copyright  2026 CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const REGION = '[data-region="tiny_cursive-status"]';

/**
 * Find the live region that belongs to the modal containing an element.
 *
 * @param {Element|null} element Any element inside the analytics modal.
 * @returns {Element|null}
 */
export const findRegion = (element) => {
    const scope = element && element.closest ? element.closest('.modal') : null;
    return scope ? scope.querySelector(REGION) : null;
};

/**
 * Announce a message near an element (polite, non-interrupting).
 *
 * Clearing then re-setting the text makes repeated identical messages re-announce.
 *
 * @param {Element|null} element Any element inside the analytics modal.
 * @param {string} message Translated text to announce.
 * @returns {boolean} Whether a region was found.
 */
export const announceNear = (element, message) => {
    const region = findRegion(element);
    if (!region) {
        return false;
    }
    region.textContent = '';
    window.setTimeout(() => {
        region.textContent = message;
    }, 50);
    return true;
};
