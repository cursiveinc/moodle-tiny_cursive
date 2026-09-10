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
 * In-place data transparency notice gate.
 *
 * When the server says the current user must acknowledge the notice, the Cursive-enabled
 * editor is hidden and put into read-only mode before it is ever shown, and the notice
 * panel is rendered in its place. Nothing Cursive-related is registered on the editor
 * until the acknowledgement has been recorded server-side. Acknowledging once releases
 * every gated editor on the page.
 *
 * @module     tiny_cursive/notice_gate
 * @copyright  2026 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getPluginOptionName} from 'editor_tiny/options';
import {pluginName} from './common';
import Templates from 'core/templates';
import Ajax from 'core/ajax';
import {getString} from 'core/str';
import {add as addToast} from 'core/toast';

const requiredName = getPluginOptionName(pluginName, 'noticerequired');
const textName = getPluginOptionName(pluginName, 'noticetext');
const versionName = getPluginOptionName(pluginName, 'noticeversion');
const preferencesUrlName = getPluginOptionName(pluginName, 'preferencesurl');

/** @type {Set<Object>} Gates currently displayed on this page. */
const gates = new Set();

/** @type {Promise|null} The in-flight acknowledgement request, shared by every gate. */
let submission = null;

/**
 * Register the plugin options carrying the gate configuration.
 *
 * @param {TinyMCE} editor
 */
export const register = (editor) => {
    const registerOption = editor.options.register;

    registerOption(requiredName, {processor: 'boolean', "default": false});
    registerOption(textName, {processor: 'string', "default": ''});
    registerOption(versionName, {processor: 'number', "default": 0});
    registerOption(preferencesUrlName, {processor: 'string', "default": ''});
};

/**
 * Whether this editor instance must be gated.
 *
 * @param {TinyMCE} editor
 * @returns {boolean}
 */
export const isRequired = (editor) => editor.options.get(requiredName) === true;

/**
 * Hide the editor UI so the gate can stand in its place.
 *
 * The container carries display:flex from the TinyMCE skin, so the hidden attribute
 * alone would not take effect.
 *
 * @param {TinyMCE} editor
 */
const hideEditor = (editor) => {
    const container = editor.getContainer();
    if (container) {
        container.style.display = 'none';
    }
};

/**
 * Show the editor UI again and make it editable.
 *
 * @param {TinyMCE} editor
 */
const showEditor = (editor) => {
    const container = editor.getContainer();
    if (container) {
        container.style.display = '';
    }
    editor.mode.set('design');
};

/**
 * Gate the editor until the notice is acknowledged.
 *
 * @param {TinyMCE} editor
 * @returns {Promise<void>} Resolves once an acknowledgement has been recorded.
 */
export const gate = (editor) => new Promise((resolve, reject) => {
    const entry = {editor, element: null, resolve, reject};
    gates.add(entry);

    editor.on('PreInit', () => hideEditor(editor));
    editor.on('init', () => {
        hideEditor(editor);
        editor.mode.set('readonly');
        renderGate(entry).catch(reject);
    });
});

/**
 * Render the notice panel immediately after the (hidden) editor container.
 *
 * @param {Object} entry
 * @returns {Promise<void>}
 */
const renderGate = async(entry) => {
    const {editor} = entry;

    // TinyMCE sanitises content on the way in, so this is the same HTML the editor
    // itself would display; it is shown read-only so a draft never looks lost.
    const content = editor.getContent().trim();

    const {html, js} = await Templates.renderForPromise('tiny_cursive/notice_gate', {
        editorid: editor.id,
        noticetext: editor.options.get(textName),
        noticeversion: editor.options.get(versionName),
        preferencesurl: editor.options.get(preferencesUrlName),
        hascontent: content !== '',
        content,
    });

    const wrapper = document.createElement('div');
    wrapper.dataset.region = 'tiny_cursive-notice-gate-wrapper';
    editor.getContainer().insertAdjacentElement('afterend', wrapper);
    Templates.replaceNodeContents(wrapper, html, js);
    entry.element = wrapper;

    wrapper.querySelector('[data-action="acknowledge"]').addEventListener('click', (e) => {
        e.preventDefault();
        acknowledge(entry);
    });
};

/**
 * Record the acknowledgement and release every gate on the page.
 *
 * @param {Object} entry The gate whose button was activated.
 */
const acknowledge = (entry) => {
    const button = entry.element.querySelector('[data-action="acknowledge"]');
    const error = entry.element.querySelector('[data-region="error"]');
    const noticeversion = entry.editor.options.get(versionName);

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    error.hidden = true;

    if (!submission) {
        submission = Ajax.call([{
            methodname: 'tiny_cursive_record_acknowledgement',
            args: {noticeversion},
        }])[0];
    }

    submission
        .then(async() => {
            gates.forEach(release);
            gates.clear();
            entry.editor.focus();
            addToast(await getString('notice_recorded', 'tiny_cursive'), {type: 'success'});
            return;
        })
        .catch(async(exception) => {
            submission = null;
            error.textContent = exception.message || await getString('notice_error', 'tiny_cursive');
            error.hidden = false;
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.focus();
        });
};

/**
 * Remove a gate and hand its editor back to the user.
 *
 * @param {Object} entry
 */
const release = (entry) => {
    if (entry.element) {
        entry.element.remove();
        entry.element = null;
    }
    showEditor(entry.editor);
    entry.resolve();
};
