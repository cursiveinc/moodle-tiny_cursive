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
 * Cursive autosave module for TinyMCE editor integration
 *
 * @module     tiny_cursive/cursive_autosave
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import templates from 'core/templates';
import {call} from 'core/ajax';
import Icons from 'tiny_cursive/svg_repo';
import {get_string as getString, get_strings as getStrings} from 'core/str';

export default class CursiveAutosave {

    /** @type {Map<string, CursiveAutosave>} One instance per editor on the page, keyed by editor id. */
    static instances = new Map();

    /** @type {Object<string, string>} Translated labels shared by every instance on the page. */
    static strings = {};

    /**
     * Fallbacks used until the strings have loaded (and if loading fails).
     *
     * @type {Object<string, string>}
     */
    static defaults = {
        savedcontent: 'Saved content',
        nosavedcontent: 'No saved content yet',
        'autosave_saving': 'Saving…',
        'autosave_saved': 'Saved',
        'autosave_offline': 'Offline. Changes will be saved when you reconnect.',
    };

    constructor(editor, rightWrapper, modules, isFullScreen) {
        this.editor = editor;
        this.module = modules;
        this.savingState = '';
        this.rightWrapper = rightWrapper;
        this.isFullScreen = isFullScreen;
        this.ids = CursiveAutosave.elementIds(editor, modules);
        // Bind methods that will be used as event listener
        this.fetchSavedContent = this.fetchSavedContent.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.repositionSavedDropdown = this.repositionSavedDropdown.bind(this);
        this._savingTimer = null;
        CursiveAutosave.instances.set(CursiveAutosave.keyFor(editor), this);
        this.fetchStrings();
    }

    /**
     * Map key for an editor.
     *
     * @param {Object|string} editor TinyMCE editor or its id.
     * @returns {string}
     */
    static keyFor(editor) {
        return String((editor && editor.id) || editor || 'editor');
    }

    /**
     * Element ids for one editor, so two Cursive editors on a page never share an id.
     *
     * @param {Object} editor TinyMCE editor.
     * @param {Object} modules Module ids (modulename, questionid, ...).
     * @returns {{button: string, icon: string, text: string, dropdown: string}}
     */
    static elementIds(editor, modules) {
        const raw = modules?.modulename === 'quiz' && modules.questionid
            ? `q${modules.questionid}`
            : (editor?.id || 'editor');
        const suffix = String(raw).replace(/[^a-zA-Z0-9_-]/g, '_');
        return {
            button: `tiny_cursive_savingState_${suffix}`,
            icon: `CursiveCloudIcon_${suffix}`,
            text: `CursiveStateText_${suffix}`,
            dropdown: `tiny_cursive_savedDropdown_${suffix}`,
        };
    }

    /**
     * Get (or create) the instance for an editor and make sure its control is in the given wrapper.
     *
     * @param {Object} editor TinyMCE editor.
     * @param {HTMLElement} rightWrapper Container the control is prepended to.
     * @param {Object} modules Module ids.
     * @param {boolean} isFullScreen Document mode flag.
     * @returns {CursiveAutosave}
     */
    static getInstance(editor, rightWrapper, modules, isFullScreen) {
        let instance = this.instances.get(this.keyFor(editor));
        if (!instance) {
            instance = new CursiveAutosave(editor, rightWrapper, modules, isFullScreen);
        }
        instance.isFullScreen = isFullScreen;
        instance.rightWrapper = rightWrapper;
        if (!document.getElementById(instance.ids.button)) {
            instance.init();
        }

        return instance;
    }

    init() {
        const stateWrapper = this.cursiveSavingState(this.savingState);
        this.rightWrapper.prepend(stateWrapper);
        stateWrapper.querySelector('button').addEventListener('click', this.fetchSavedContent);
    }

    destroy() {
        this.closeSavedDropdown(false);
        document.getElementById(this.ids.button)?.closest('.tiny_cursive_savingState_wrapper')?.remove();
        CursiveAutosave.instances.delete(CursiveAutosave.keyFor(this.editor));
    }

    /**
     * Destroy one editor's instance, or every instance when no editor is given.
     *
     * @param {Object|string} [editor] TinyMCE editor or its id.
     */
    static destroyInstance(editor) {
        if (editor) {
            this.instances.get(this.keyFor(editor))?.destroy();
            return;
        }
        Array.from(this.instances.values()).forEach(instance => instance.destroy());
    }

    /**
     * Translated label with a fallback.
     *
     * @param {string} key String key.
     * @returns {string}
     */
    str(key) {
        return CursiveAutosave.strings[key] || CursiveAutosave.defaults[key] || key;
    }

    /**
     * Builds the Saved Content control: a named button (icon only) and, beside it, a status
     * region that announces Saving / Saved / Offline without being part of the button's name.
     *
     * @param {string} state - The current saving state ('saving', 'saved', or 'offline')
     * @returns {HTMLElement} Wrapper containing the button and the status text
     */
    cursiveSavingState(state) {
        const wrapper = document.createElement('span');
        wrapper.className = 'tiny_cursive_savingState_wrapper';

        const button = document.createElement('button');
        button.type = 'button';
        button.id = this.ids.button;
        button.classList.add('tiny_cursive_savingState', 'btn');
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', this.ids.dropdown);
        button.setAttribute('aria-label', this.str('savedcontent'));
        button.title = this.str('savedcontent');

        const iconSpan = document.createElement('span');
        iconSpan.id = this.ids.icon;
        iconSpan.setAttribute('aria-hidden', 'true');
        button.appendChild(iconSpan);

        const textSpan = document.createElement('span');
        textSpan.id = this.ids.text;
        textSpan.className = 'tiny_cursive_savingState_text';
        textSpan.setAttribute('role', 'status');
        textSpan.setAttribute('aria-live', 'polite');

        // The cloud is always drawn, so the Saved Content button is visible before the first save too.
        iconSpan.innerHTML = this.getStateIcon(state || 'saved');
        if (state) {
            textSpan.textContent = this.getStateText(state);
        }

        wrapper.appendChild(button);
        wrapper.appendChild(textSpan);

        return wrapper;
    }

    /**
     * Updates the saving state icon and text of one editor's indicator.
     *
     * @param {string} state - The state to update to ('saving', 'saved', or 'offline')
     * @param {Object|string} [editor] - TinyMCE editor or its id; defaults to the first instance.
     */
    static updateSavingState(state, editor) {
        const instance = editor
            ? this.instances.get(this.keyFor(editor))
            : this.instances.values().next().value;
        if (!instance) {
            return;
        }
        instance.savingState = state;

        const iconSpan = document.getElementById(instance.ids.icon);
        const stateTextEl = document.getElementById(instance.ids.text);

        if (stateTextEl && iconSpan) {
            stateTextEl.textContent = instance.getStateText(state);
            stateTextEl.dataset.state = state;
            iconSpan.innerHTML = instance.getStateIcon(state);
        }

        if (instance._savingTimer) {
            clearTimeout(instance._savingTimer);
        }

        // "Saved" fades after a while; "Offline" stays until the next save attempt replaces it.
        if (state === 'saved' && stateTextEl) {
            instance._savingTimer = setTimeout(() => {
                stateTextEl.textContent = '';
            }, 5000);
        }
    }

    /**
     * Gets the display text for a given saving state
     * @param {string} state - The state to get text for ('saving', 'saved', or 'offline')
     * @returns {string} The text to display for the given state
     */
    getStateText(state) {
        switch (state) {
            case 'saving': return this.str('autosave_saving');
            case 'saved': return this.str('autosave_saved');
            case 'offline': return this.str('autosave_offline');
            default: return '';
        }
    }

    /**
     * Gets the icon markup for a given saving state (each state has its own shape, not just a colour)
     * @param {string} state - The state to get icon for ('saving', 'saved', or 'offline')
     * @returns {string} Inline SVG for the state
     */
    getStateIcon(state) {
        switch (state) {
            case 'saving': return Icons.saving;
            case 'saved': return Icons.cloudSave;
            case 'offline': return Icons.offline;
            default: return '';
        }
    }

    /**
     * Fetches and displays saved content in a dropdown
     * @async
     * @param {Event} e - The event object
     * @description Handles fetching and displaying saved content when the save state button is clicked.
     * If the dropdown is already visible, it will be closed. Otherwise it will fetch saved content
     * from the server and display it in a panel.
     */
    async fetchSavedContent(e) {
        e.preventDefault();

        const dropdown = document.getElementById(this.ids.dropdown);
        const isVisible = dropdown?.classList?.contains('show');

        if (isVisible) {
            this.closeSavedDropdown(true);
            return;
        }
        const trigger = e.currentTarget;

        let args = {
            id: this.module.resourceId,
            cmid: this.module.cmid,
            modulename: `${this.module.modulename}_autosave`,
            editorid: this.editor?.id,
            userid: this.module.userid,
            courseid: this.module.courseid
        };

        call([{
            methodname: "tiny_cursive_get_autosave_content",
            args: args
        }])[0].done((data) => {
            const comments = Object.values(JSON.parse(data) || {});
            comments.forEach(content => {
                const formatted = this.formatTime(content.timemodified);
                content.time = formatted.relative;
                content.absolutetime = formatted.absolute;
                content.isotime = formatted.iso;
            });
            this.renderCommentList({comments, hascomments: comments.length > 0}, trigger);

        }).fail((error) => {
            this.throwWarning('fullmodeerrorr', this.editor);
            window.console.error('Error fetching saved content:', error);
        });
    }

    /**
     * Toggles the visibility of the saved content dropdown
     */
    toggleSavedDropdown() {
        const dropdown = document.getElementById(this.ids.dropdown);
        const isVisible = dropdown?.classList?.contains('show');

        if (isVisible) {
            this.closeSavedDropdown(true);
        } else {
            this.openSavedDropdown();
        }
    }

    /**
     * Opens the saved content panel, marks the trigger expanded and moves focus to its heading.
     */
    openSavedDropdown() {
        const dropdown = document.getElementById(this.ids.dropdown);
        if (!dropdown) {
            return;
        }
        dropdown.classList.add('show');
        this.savedDropdownAnchor?.setAttribute('aria-expanded', 'true');

        // Add event listeners for keyboard, outside-click, and viewport changes.
        document.removeEventListener('keydown', this.handleEscapeKey);
        document.addEventListener('keydown', this.handleEscapeKey);
        document.removeEventListener('click', this.handleDocumentClick);
        document.addEventListener('click', this.handleDocumentClick);
        window.addEventListener('resize', this.repositionSavedDropdown);
        window.addEventListener('scroll', this.repositionSavedDropdown, true);

        const heading = dropdown.querySelector('.tiny_cursive-dropdown-title');
        if (heading) {
            heading.focus();
        }
    }

    /**
     * Closes the saved content panel and removes it from the DOM.
     *
     * @param {boolean} restoreFocus Move focus back to the control that opened the panel.
     */
    closeSavedDropdown(restoreFocus = true) {
        const dropdown = document.getElementById(this.ids.dropdown);
        if (dropdown) {
            const hadFocus = dropdown.contains(document.activeElement);
            dropdown.classList.remove('show');
            dropdown.remove();
            document.removeEventListener('keydown', this.handleEscapeKey);
            document.removeEventListener('click', this.handleDocumentClick);
            window.removeEventListener('resize', this.repositionSavedDropdown);
            window.removeEventListener('scroll', this.repositionSavedDropdown, true);
            const anchor = this.savedDropdownAnchor;
            if (anchor) {
                anchor.setAttribute('aria-expanded', 'false');
                if (restoreFocus && hadFocus && document.contains(anchor)) {
                    anchor.focus();
                }
            }
            this.savedDropdownAnchor = null;
        }
    }

    /**
     * Handles the Escape key press event for closing the saved content dropdown
     * @param {KeyboardEvent} event - The keyboard event object
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            this.closeSavedDropdown(true);
        }
    }

    /**
     * Closes the saved content panel when the user clicks outside it.
     *
     * @param {MouseEvent} event Click event.
     */
    handleDocumentClick(event) {
        const dropdown = document.getElementById(this.ids.dropdown);
        if (dropdown && !dropdown.contains(event.target) && !this.savedDropdownAnchor?.contains(event.target)) {
            this.closeSavedDropdown(false);
        }
    }

    /**
     * Positions the saved-content panel beside its toolbar control without clipping.
     */
    repositionSavedDropdown() {
        const dropdown = document.getElementById(this.ids.dropdown);
        const anchor = this.savedDropdownAnchor;
        if (!dropdown || !anchor) {
            return;
        }

        const gap = 8;
        const edge = 8;
        const anchorRect = anchor.getBoundingClientRect();
        const dropdownRect = dropdown.getBoundingClientRect();
        const width = dropdownRect.width || 320;
        const height = dropdownRect.height;
        let left = anchorRect.right - width;
        let top = anchorRect.bottom + gap;

        left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
        if (top + height > window.innerHeight - edge && anchorRect.top > height + gap) {
            top = anchorRect.top - height - gap;
            dropdown.classList.add('tiny_cursive-saved-dropdown--above');
        } else {
            dropdown.classList.remove('tiny_cursive-saved-dropdown--above');
        }

        dropdown.style.left = `${left}px`;
        dropdown.style.top = `${Math.max(edge, top)}px`;
    }

    /**
     * Relative and absolute wording for a draft's save time, in the page language.
     *
     * Uses the browser's Intl formatters, so there are no hardcoded English units or plurals.
     *
     * @param {number} unixTime Seconds since the epoch.
     * @returns {{relative: string, absolute: string, iso: string}}
     */
    formatTime(unixTime) {
        const lang = (document.documentElement.lang || 'en').replace('_', '-');
        const date = new Date(unixTime * 1000);
        const iso = date.toISOString();
        let absolute = iso;
        let relative = '';
        try {
            absolute = new Intl.DateTimeFormat(lang, {dateStyle: 'medium', timeStyle: 'short'}).format(date);
        } catch (e) {
            absolute = date.toLocaleString();
        }
        try {
            const rtf = new Intl.RelativeTimeFormat(lang, {numeric: 'auto'});
            const seconds = Math.round(unixTime - Date.now() / 1000);
            const units = [
                ['year', 31536000], ['month', 2592000], ['week', 604800],
                ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
            ];
            const [unit, size] = units.find(([, s]) => Math.abs(seconds) >= s) || ['second', 1];
            relative = rtf.format(Math.round(seconds / size), unit);
        } catch (e) {
            relative = absolute;
        }
        return {relative, absolute, iso};
    }

    /**
     * Renders the saved content panel from the template, positions it and moves focus into it.
     *
     * @param {Object} context - Template context ({comments, hascomments})
     * @param {HTMLElement} trigger - The control that opened the panel (focus returns here on close)
     */
    renderCommentList(context, trigger) {
        templates.render('tiny_cursive/saved_content', context).then(html => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.trim();
            tempDiv.id = this.ids.dropdown;
            tempDiv.classList.add('tiny_cursive-saved-dropdown');

            let existingPanel = document.getElementById(this.ids.dropdown);
            if (!existingPanel) {
                document.body.appendChild(tempDiv);
                existingPanel = tempDiv;
            }

            this.savedDropdownAnchor = trigger;
            this.openSavedDropdown();
            this.repositionSavedDropdown();

            existingPanel.querySelector('.tiny_cursive-close-btn')?.addEventListener('click', event => {
                event.preventDefault();
                event.stopPropagation();
                this.closeSavedDropdown(true);
            });

            this.insertSavedItems(this.editor, existingPanel);

            return true;

        }).catch(error => window.console.error(error));
    }

    /**
     * Load the labels once per page through core/str (cached per language by core).
     */
    fetchStrings() {
        const keys = Object.keys(CursiveAutosave.defaults);
        getStrings(keys.map(key => ({key, component: 'tiny_cursive'}))).then(values => {
            keys.forEach((key, i) => {
                CursiveAutosave.strings[key] = values[i];
            });
            const button = document.getElementById(this.ids.button);
            if (button) {
                button.setAttribute('aria-label', this.str('savedcontent'));
                button.title = this.str('savedcontent');
            }
            return true;
        }).catch(error => window.console.error(error));
    }

    throwWarning(str, editor) {
        getString(str, 'tiny_cursive').then(str => {
            return editor.windowManager.alert(str);
        }).catch(error => window.console.error(error));
    }

    /**
     * Adds click event listeners to saved content items to insert them into the editor
     * @param {Object} editor - The TinyMCE editor instance
     * @param {HTMLElement} dropdown - Saved content dropdown element.
     * @returns {void}
     */
    insertSavedItems(editor, dropdown) {
        const items = dropdown.querySelectorAll('.tiny_cursive-saved-item');
        items.forEach(element => {
            element.addEventListener('click', () => {
                const content = element.querySelector('.tiny_cursive-item-preview')?.textContent ?? '';
                editor.insertContent(' ' + content);
                this.closeSavedDropdown(false);
                editor.focus();
            });
        });
    }

}
