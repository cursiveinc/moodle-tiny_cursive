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
 * Collapsible sections on the Cursive admin settings page.
 *
 * Every titled heading on the page gets a toggle button; the settings that follow it,
 * up to the next titled heading, can be hidden. The choice is remembered per browser.
 *
 * @module     tiny_cursive/settings_collapse
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getStrings} from 'core/str';

const PAGE_ID = 'page-admin-setting-tiny_cursive_settings';
const STORAGE_PREFIX = 'tiny_cursive/settings-collapsed:';

/**
 * Whether an element is a titled section heading.
 *
 * @param {Element} element
 * @returns {boolean}
 */
const isSectionHeading = (element) =>
    element.matches('h3.main') && element.textContent.trim() !== '';

/**
 * Read the remembered state for a section.
 *
 * @param {string} key
 * @returns {boolean}
 */
const isRemembered = (key) => {
    try {
        return window.localStorage.getItem(STORAGE_PREFIX + key) === '1';
    } catch (e) {
        return false;
    }
};

/**
 * Remember the state for a section.
 *
 * @param {string} key
 * @param {boolean} collapsed
 */
const remember = (key, collapsed) => {
    try {
        if (collapsed) {
            window.localStorage.setItem(STORAGE_PREFIX + key, '1');
        } else {
            window.localStorage.removeItem(STORAGE_PREFIX + key);
        }
    } catch (e) {
        // Storage unavailable: the toggle still works for this page view.
    }
};

/**
 * Wrap the siblings following a heading, until the next titled heading, in a container.
 *
 * @param {Element} heading
 * @param {number} index
 * @returns {Element}
 */
const wrapSection = (heading, index) => {
    const container = document.createElement('div');
    container.id = `tiny_cursive-settings-section-${index}`;
    container.dataset.region = 'tiny_cursive-settings-section';

    let sibling = heading.nextElementSibling;
    while (sibling && !isSectionHeading(sibling)) {
        const next = sibling.nextElementSibling;
        container.appendChild(sibling);
        sibling = next;
    }
    heading.insertAdjacentElement('afterend', container);

    return container;
};

/**
 * Add a toggle button to a heading and wire it to its section.
 *
 * @param {Element} heading
 * @param {number} index
 * @param {Object} labels Localised "collapse" and "expand" strings.
 */
const makeCollapsible = (heading, index, labels) => {
    const container = wrapSection(heading, index);
    const key = heading.textContent.trim().toLowerCase().replace(/\s+/g, '-');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-link btn-sm p-0 ml-2 ms-2 align-baseline';
    button.dataset.action = 'toggle-section';
    button.setAttribute('aria-controls', container.id);
    heading.appendChild(button);

    const apply = (collapsed) => {
        container.hidden = collapsed;
        button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        button.textContent = collapsed ? labels.expand : labels.collapse;
    };

    apply(isRemembered(key));

    button.addEventListener('click', () => {
        const collapsed = !container.hidden;
        apply(collapsed);
        remember(key, collapsed);
    });
};

/**
 * Initialise on the Cursive settings page.
 */
export const init = async() => {
    if (document.body.id !== PAGE_ID) {
        return;
    }
    const form = document.getElementById('adminsettings');
    if (!form) {
        return;
    }

    const headings = Array.from(form.querySelectorAll('h3.main')).filter(isSectionHeading);
    if (!headings.length) {
        return;
    }

    const [collapse, expand] = await getStrings([
        {key: 'collapse', component: 'core'},
        {key: 'expand', component: 'core'},
    ]);

    headings.forEach((heading, index) => makeCollapsible(heading, index, {collapse, expand}));
};
