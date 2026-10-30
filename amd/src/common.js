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
 * @module     tiny_cursive/common
 * @category   TinyMCE Editor
 * @copyright  2025 CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */


export const component = 'tiny_cursive';
export const pluginName = `${component}/plugin`;

/**
 * Key in localStorage for a cached string list: per language and versioned, so a language
 * switch or a new string never reads a stale array.
 *
 * @param {string} name - Cache name, e.g. 'sbTitle'.
 * @returns {string}
 */
export const stringCacheKey = (name) => `tiny_cursive_${name}_v2_${document.documentElement.lang || 'en'}`;

/**
 * Level of the last heading before an element that assistive technology can reach.
 *
 * Headings inside hidden, aria-hidden or inert containers (Moodle's sticky activity header, closed
 * drawers) are skipped: counting them would put a heading after them one level too deep.
 *
 * @param {Node} anchor - Element the new heading will precede or sit in.
 * @param {number} fallback - Level to use when no exposed heading comes first.
 * @returns {number}
 */
export const precedingHeadingLevel = (anchor, fallback = 2) => {
    let level = fallback;
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"][aria-level]').forEach((heading) => {
        if (!heading.getClientRects().length || heading.closest('[hidden], [aria-hidden="true"], [inert]')) {
            return;
        }
        // eslint-disable-next-line no-bitwise
        if (heading.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING) {
            level = Number(heading.getAttribute('aria-level')) || Number(heading.tagName.slice(1)) || level;
        }
    });
    return level;
};

// Moodle's AMD build hands importers this object, so every named export must also live here.
export default {
    component,
    pluginName,
    stringCacheKey,
    precedingHeadingLevel,
    iconUrl: M.util.image_url('cursive', 'tiny_cursive'),
    iconSaving: M.util.image_url('rotate', 'tiny_cursive'),
    iconGrayUrl: M.util.image_url('cursive_gray', 'tiny_cursive'),
    // Placement, size and colours live in styles.css (.tiny_cursive_state_tooltip); this only reveals it.
    tooltipCss: {
        display: 'block'
    },
    Color: {
        white: 'rgba(252, 252, 252, 1)',
        lineBlue: 'rgb(75, 192, 192)',
        black: 'rgba(0, 0, 0, 1)',
        tpGray: '#cccccc',
        lightCyan: 'rgba(75, 192, 192, 0.3)',
        lineOrange: 'rgba(255, 165, 0)',
        lightOrange: 'rgba(255, 165, 0, 0.3)',
        Purple: 'rgb(139, 92, 246)',
        lineRed: 'rgb(255, 0, 0)',
        lightPurple: 'rgb(139, 92, 246, 0.4)',
    }
};
