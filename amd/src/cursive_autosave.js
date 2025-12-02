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
 * TODO describe module cursive_autosave
 *
 * @module     tiny_cursive/cursive_autosave
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import templates from 'core/templates';
import {call} from 'core/ajax';
import Icons from 'tiny_cursive/svg_repo';
import {get_string as getString} from 'core/str';

export default class CursiveAutosave {

    static instance = null;


    constructor(editor, rightWrapper, modules, isFullScreen) {
        if (CursiveAutosave.instance) {
            return CursiveAutosave.instance;
        }

        this.editor = editor;
        this.module = modules;
        this.savingState = '';
        this.rightWrapper = rightWrapper;
        this.isFullScreen = isFullScreen;
        // Bind methods that will be used as event listener
        this.fetchSavedContent = this.fetchSavedContent.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this._savingTimer = null;
        CursiveAutosave.instance = this;
        this.fetchStrings();
    }

    static getInstance(editor, rightWrapper, modules, isFullScreen) {
        if (!this.instance) {
            this.instance = new CursiveAutosave(editor, rightWrapper, modules, isFullScreen);
        }
        this.instance.isFullScreen = isFullScreen;
        const hasState = modules.modulename === 'quiz'
            ? document.querySelector(`#tiny_cursive_savingState${modules.questionid}`)
            : document.querySelector('#tiny_cursive_savingState');
        if (!hasState) {
            this.instance.init();
        }

        return this.instance;
    }

    init() {
        const stateWrapper = this.cursiveSavingState(this.savingState);
        stateWrapper.classList.add('tiny_cursive_savingState', 'btn');
        if (this.module.modulename === 'quiz') {
            stateWrapper.id = `tiny_cursive_savingState${this.module.questionid}`;
        } else {
            stateWrapper.id = 'tiny_cursive_savingState';
        }

        this.rightWrapper.prepend(stateWrapper);
        stateWrapper.addEventListener('click', this.fetchSavedContent);
    }

    destroy() {
        CursiveAutosave.instance = null;
    }

    static destroyInstance() {
        if (this.instance) {
            this.instance.destroy();
            this.instance = null;
        }
    }

    /**
 * Creates a wrapper div containing an icon and text to display the saving state
 * @param {string} state - The current saving state ('saving', 'saved', or 'offline')
 * @returns {HTMLElement} A div element containing the state icon and text
 * @description Creates and returns a div element with an icon and text span to show the current saving state.
 * The icon and text are updated based on the provided state parameter.
 */
    cursiveSavingState(state) {
        let wrapperDiv = document.createElement('div');
        let textSpan = document.createElement('span');
        let button = document.createElement('button');
        let iconSpan = document.createElement('span');

        button.style.padding = '.3rem';
        textSpan.style.fontSize = '0.75rem';
        textSpan.style.color = 'gray';

        if (this.module.modulename === 'quiz') {
            iconSpan.id = `CursiveCloudIcon${this.module.questionid}`;
            textSpan.id = `CursiveStateText${this.module.questionid}`;
        } else {
            iconSpan.id = 'CursiveCloudIcon';
            textSpan.id = 'CursiveStateText';
        }
        if (state) {
            textSpan.textContent = this.getStateText(state);
            iconSpan.innerHTML = this.getStateIcon(state);
        }

        wrapperDiv.style.verticalAlign = 'middle';

        wrapperDiv.appendChild(iconSpan);
        wrapperDiv.appendChild(textSpan);
        button.appendChild(wrapperDiv);

        return button;
    }

    /**
     * Updates the saving state icon and text in the editor
     * @param {string} state - The state to update to ('saving', 'saved', or 'offline')
     * @description Updates the global saving state and modifies the UI elements to reflect the new state
     */
    static updateSavingState(state) {
        const instance = this.instance;
        instance.savingState = state;
        let stateWrapper = null;
        if (instance.module.modulename === 'quiz') {
            stateWrapper = document.querySelector(`#tiny_cursive_savingState${instance.module.questionid}`);
        } else {
            stateWrapper = document.querySelector('#tiny_cursive_savingState');
        }

        let iconSpan = '';
        let stateTextEl = '';

        if (!stateWrapper) {
            return;
        }

        if (instance.module.modulename === 'quiz') {
            iconSpan = stateWrapper.querySelector(`#CursiveCloudIcon${instance.module.questionid}`);
            stateTextEl = stateWrapper.querySelector(`#CursiveStateText${instance.module.questionid}`);
        } else {
            iconSpan = stateWrapper.querySelector('#CursiveCloudIcon');
            stateTextEl = stateWrapper.querySelector('#CursiveStateText');
        }



        if (stateTextEl && iconSpan) {
            stateTextEl.textContent = instance.getStateText(state);
            iconSpan.innerHTML = instance.getStateIcon(state);
        }


        if (instance._savingTimer) {
            clearTimeout(instance._savingTimer);
        }

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
     * @description Returns appropriate text label based on the current saving state
     */
    getStateText(state) {
        const [saving, saved, offline] = this.getText('state');
        switch (state) {
            case 'saving': return saving;
            case 'saved': return saved;
            case 'offline': return offline;
            default: return '';
        }
    }
    /**
     * Gets the icon URL for a given saving state
     * @param {string} state - The state to get icon for ('saving', 'saved', or 'offline')
     * @returns {string} The URL of the icon image for the given state
     * @description Returns appropriate icon URL based on the current saving state
     */
    getStateIcon(state) {
        switch (state) {
            case 'saving': return Icons.cloudSave;
            case 'saved': return Icons.cloudSave;
            case 'offline': return 'data:image/svg+xml;base64,' + btoa(Icons.offline);
            default: return '';
        }
    }

    /**
     * Fetches and displays saved content in a dropdown
     * @async
     * @param {Event} e - The event object
     * @description Handles fetching and displaying saved content when the save state button is clicked.
     * If the dropdown is already visible, it will be closed. Otherwise it will fetch saved content
     * from the server (or use cached content if available) and display it in a dropdown panel.
     * @throws {Error} Logs error to console if fetching content fails
     */
    async fetchSavedContent(e) {
        e.preventDefault();

        let dropdown = document.querySelector('#savedDropdown');
        let isVisible = dropdown?.classList?.contains('show');

        if (isVisible) {
            this.closeSavedDropdown();
            return;
        }
        let editorWrapper = null;
        if (this.module.modulename === 'quiz') {
            editorWrapper = document.querySelector(`#tiny_cursive_savingState${this.module.questionid}`);
        } else {
            editorWrapper = document.querySelector('#tiny_cursive_savingState');
        }

        let args = {
            id: this.module.resourceId,
            cmid: this.module.cmid,
            modulename: `${this.module.modulename}_autosave`,
            editorid: this.editor?.id,
            userid: this.module.userid,
            courseid: this.module.courseid
        };

        call([{
            methodname: "cursive_get_autosave_content",
            args: args
        }])[0].done((data) => {
            let context = { comments: JSON.parse(data) };
            Object.values(context.comments).forEach(content => {
                content.time = this.timeAgo(content.timemodified);
            });
            this.renderCommentList(context, editorWrapper);

        }).fail((error) => {
            getString('fullmodeerrorr', 'tiny_cursive').then(str => {
                this.editor.windowManager.alert(str);
            });
            window.console.error('Error fetching saved content:', error);
        });
    }

    /**
     * Toggles the visibility of the saved content dropdown
     * @description Checks if the saved content dropdown is currently visible and either closes or opens it accordingly.
     * If visible, calls closeSavedDropdown(). If hidden, calls openSavedDropdown().
     */
    toggleSavedDropdown() {
        const dropdown = document.querySelector('#savedDropdown');
        const isVisible = dropdown?.classList?.contains('show');

        if (isVisible) {
            this.closeSavedDropdown();
        } else {
            this.openSavedDropdown();
        }
    }

    /**
     * Opens the saved content dropdown panel
     * @description Shows the saved content dropdown by adding the 'show' class and sets up an event listener
     * for the Escape key to allow closing the dropdown. This  is called when toggling the dropdown open.
     */
    openSavedDropdown() {
        const dropdown = document.querySelector('#savedDropdown');
        dropdown.classList.add('show');

        // Add event listener to close on Escape key
        document.removeEventListener('keydown', this.handleEscapeKey);
        document.addEventListener('keydown', this.handleEscapeKey);
    }

    /**
     * Closes the saved content dropdown panel
     * @description Removes the 'show' class from the dropdown to hide it, removes the dropdown element from the DOM,
     * and removes the Escape key event listener. This  is called when toggling the dropdown closed or when
     * clicking outside the dropdown.
     */
    closeSavedDropdown() {
        const dropdown = document.querySelector('#savedDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
            dropdown.remove();
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    }

    /**
     * Handles the Escape key press event for closing the saved content dropdown
     * @param {KeyboardEvent} event - The keyboard event object
     * @description Event handler that checks if the Escape key was pressed and closes the saved content dropdown if it was
     */
    handleEscapeKey(event) {
        if (event.key === 'Escape') {
            this.closeSavedDropdown();
        }
    }

    timeAgo(unixTime) {
        const seconds = Math.floor(Date.now() / 1000) - unixTime;

        if (seconds < 5) {
            return "just now";
        }
        if (seconds < 60) {
            return `${seconds} sec ago`;
        }

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) {
            return `${minutes} min ago`;
        }

        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        }

        const days = Math.floor(hours / 24);
        if (days < 7) {
            return `${days} day${days > 1 ? "s" : ""} ago`;
        }

        const weeks = Math.floor(days / 7);
        if (weeks < 4) {
            return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
        }

        const months = Math.floor(days / 30);
        if (months < 12) {
            return `${months} month${months > 1 ? "s" : ""} ago`;
        }

        const years = Math.floor(days / 365);
        return `${years} year${years > 1 ? "s" : ""} ago`;
    }


    /**
     * Renders the saved content dropdown list using a template
     * @param {Object} context - The context object containing saved comments data to render
     * @param {HTMLElement} editorWrapper - The wrapper element to attach the dropdown to
     * @description Renders the saved content dropdown using the tiny_cursive/saved_content template.
     * Creates and positions the dropdown relative to the editor wrapper element.
     * Handles toggling visibility and caching of the saved content.
     * @throws {Error} Logs error to console if template rendering fails
     */
    renderCommentList(context, editorWrapper) {
        templates.render('tiny_cursive/saved_content', context).then(html => {
            editorWrapper.style.position = 'relative';

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.trim();
            tempDiv.id = 'savedDropdown';
            tempDiv.classList.add('tiny_cursive-saved-dropdown');

            if (!tempDiv) {
                window.console.error("Saved content template rendered empty or invalid HTML.");
                return false;
            }

            // Add to DOM if not already added
            let existingPanel = document.querySelector('#savedDropdown');

            if (!existingPanel) {
                editorWrapper.appendChild(tempDiv);
                existingPanel = tempDiv;
            }

            // Toggle visibility
            existingPanel.classList.toggle('active');
            this.openSavedDropdown();

            this.insertSavedItems(this.editor);

            return true;

        }).catch(error => window.console.error(error));
    }

    fetchStrings() {
        if (!localStorage.getItem('state')) {

            Promise.all([
                getString('saving', 'tiny_cursive'),
                getString('saved', 'tiny_cursive'),
                getString('offline', 'tiny_cursive')
            ]).then(function (strings) {
                localStorage.setItem('state', JSON.stringify(strings));
            });
        }
    }

    getText(key) {
        return JSON.parse(localStorage.getItem(key));
    }

    /**
     * Adds click event listeners to saved content items to insert them into the editor
     * @description Finds all elements with class 'tiny_cursive-item-preview' and adds click handlers that will
     * insert the element's text content into the editor when clicked. The text is inserted with
     * a leading space.
     * @param {Object} editor - The TinyMCE editor instance
     * @returns {void}
     */
    insertSavedItems(editor) {
        const items = document.querySelectorAll('.tiny_cursive-item-preview');
        items.forEach(element => {
            element.addEventListener('click', function () {
                editor.insertContent(" " + this.textContent);
            });
        });
    }

}