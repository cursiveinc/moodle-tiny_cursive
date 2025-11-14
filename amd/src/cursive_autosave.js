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

import { iconSaving, iconSaved, iconOffline } from 'tiny_cursive/common';
import templates from 'core/templates';
import { call } from 'core/ajax';

export default class CursiveAutosave {

    static instance = null;


    constructor(editor, rightWrapper, modules) {
        if (CursiveAutosave.instance) {
            return CursiveAutosave.instance;
        }

        this.editor = editor;
        this.module = modules;
        this.savingState = '';
        // Bind methods that will be used as event listener
        this.fetchSavedContent = this.fetchSavedContent.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);

        CursiveAutosave.instance = this;
    }

    static getInstance(editor, rightWrapper, modules) {
        if (!this.instance) {
            this.instance = new CursiveAutosave(editor, rightWrapper, modules);
        }
        this.instance.init(rightWrapper);
        return this.instance;
    }

    init(rightWrapper) {
        const stateWrapper = this.cursiveSavingState(this.savingState);
        stateWrapper.classList.add('tiny_cursive_savingState', 'btn');
        stateWrapper.id = 'tiny_cursive_savingState';
        rightWrapper.appendChild(stateWrapper);
        stateWrapper.addEventListener('click', this.fetchSavedContent);
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
        let icon = document.createElement('img');
        let textSpan = document.createElement('span');
        let button = document.createElement('button');

        if (state) {
            textSpan.textContent = this.getStateText(state);
            icon.src = this.getStateIcon(state);
        }
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.marginRight = '5px';
        icon.style.display = 'none';
        wrapperDiv.style.marginRight = '0.5rem';
        wrapperDiv.style.verticalAlign = 'middle';

        wrapperDiv.appendChild(icon);
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
        let stateWrapper = document.querySelector('.tiny_cursive_savingState');

        if (!stateWrapper) {
            return;
        }

        let img = stateWrapper.querySelector('img');
        let span = stateWrapper.querySelector('span');

        img.style.display = 'inline';
        span.textContent = instance.getStateText(state);
        img.src = instance.getStateIcon(state);
    }

    /**
     * Gets the display text for a given saving state
     * @param {string} state - The state to get text for ('saving', 'saved', or 'offline')
     * @returns {string} The text to display for the given state
     * @description Returns appropriate text label based on the current saving state
     */
    getStateText(state) {
        switch (state) {
            case 'saving': return 'Saving';
            case 'saved': return 'Saved';
            case 'offline': return 'Offline';
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
            case 'saving': return iconSaving;
            case 'saved': return iconSaved;
            case 'offline': return iconOffline;
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
        const editorWrapper = document.querySelector('#tiny_cursive_savingState');

        let args = {
            id: this.module.resourceId,
            cmid: this.module.cmid,
            modulename: `${this.module.modulename}_autosave`,
            questionid: this.module.questionid,
            userid: this.module.userid,
            courseid: this.module.courseid
        };

        call([{
            methodname: "cursive_get_autosave_content",
            args: args
        }])[0].done((data) => {
            let context = { comments: JSON.parse(data) };
            this.renderCommentList(context, editorWrapper);

        }).fail((error) => {
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
        dropdown.classList.remove('show');
        dropdown.remove();

        // Remove event listener
        document.removeEventListener('keydown', this.handleEscapeKey);
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
            tempDiv.classList.add('saved-dropdown');

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
            this.toggleSavedDropdown();

            this.insertSavedItems(this.editor);

            return true;

        }).catch(error => window.console.error(error));
    }

    /**
     * Adds click event listeners to saved content items to insert them into the editor
     * @description Finds all elements with class 'item-preview' and adds click handlers that will
     * insert the element's text content into the editor when clicked. The text is inserted with
     * a leading space.
     * @param {Object} editor - The TinyMCE editor instance
     * @returns {void}
     */
    insertSavedItems(editor) {
        const items = document.querySelectorAll('.item-preview');
        items.forEach(element => {
            element.addEventListener('click', function () {
                editor.insertContent(" " + this.textContent);
            });
        });
    }

}