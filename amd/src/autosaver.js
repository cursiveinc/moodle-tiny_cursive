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
 * @module     tiny_cursive/autosaver
 * @category   TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */

import {call} from 'core/ajax';
import SaveCancelModal from 'core/modal_save_cancel';
import {get_string as getString} from 'core/str';
import {save, cancel, hidden} from 'core/modal_events';
import $ from 'jquery';
import {iconUrl, iconGrayUrl, tooltipCss} from 'tiny_cursive/common';
import Autosave from 'tiny_cursive/cursive_autosave';
import DocumentView from 'tiny_cursive/document_view';
import {call as getUser} from "core/ajax";

export const register = (editor, interval, userId, hasApiKey, MODULES, Rubrics,
    submission, quizInfo, pasteSetting, canBypassPaste, intervention) => {

    canBypassPaste = !!canBypassPaste;
    intervention = !!intervention;
    var host = M.cfg.wwwroot;
    var userid = userId;
    var courseid = M.cfg.courseId;
    var editorid = editor?.id;
    var cmid = M.cfg.contextInstanceId;
    var ed = "";
    var event = "";
    var filename = "";
    var questionid = 0;
    var quizSubmit = $('#mod_quiz-next-nav');
    let assignSubmit = $('#id_submitbutton');
    var syncInterval = interval ? interval * 1000 : 10000; // Default: Sync Every 10s.
    var lastCaretPos = 1;
    let aiContents = [];
    var isFullScreen = false;
    var user = null;
    let ur = window.location.href;
    let parm = new URL(ur);
    let modulesInfo = getModulesInfo(ur, parm, MODULES);
    var resourceId = modulesInfo.resourceId;
    var modulename = modulesInfo.name;
    var errorAlert = true;
    let PASTE_SETTING = pasteSetting || 'allow';
    let shouldBlockPaste = false;
    let isPasteAllowed = false;
    let pendingPasteContent = null;
    // Set when a cite-source dialog was dismissed, so the next Redo (which re-applies the paste)
    // asks for the citation again. Ordinary redo is left alone.
    let redoNeedsCite = false;

    if (ur.includes('pdfannotator')) {
        document.addEventListener('click', e => {
            if (e.target.className === "dropdown-item comment-edit-a") {
                let id = e.target.id;
                resourceId = id.replace('editButton', '');
                localStorage.setItem('isEditing', '1');
            }
            if (e.target.id === 'commentSubmit') {
                syncData();
            }
        });
    }

    const postOne = async(methodname, args, filename = "") => {
        try {
            const response = await call([{
                methodname,
                args,
            }])[0];
            if (response) {
                if (filename) {
                    localStorage.removeItem(filename);
                }
                setTimeout(() => {
                    Autosave.updateSavingState('saved', editorid);
                }, 1000);
            }
            return response;
        } catch (error) {
            Autosave.updateSavingState('offline', editorid);
            window.console.error('Error in postOne:', error);
            throw error;
        }
    };

    getUser([{
            methodname: 'core_user_get_users_by_field',
            args: {field: 'id', values: [userid]},
        }])[0].done(response => {
            user = response[0];
        }).fail((ex) => {
            window.console.error('Error fetching user data:', ex);
        });

    assignSubmit.on('click', async function(e) {
        e.preventDefault();
        if (filename) {
            // eslint-disable-next-line
            syncData().then(() => {
                assignSubmit.off('click').click();
            });
        } else {
            assignSubmit.off('click').click();
        }
        localStorage.removeItem('lastCopyCutContent');
    });

    // Diary's "Save and continue editing" button posts and reloads the editor on the same
    // entry; flush captured keystrokes before it navigates, matching the main submit button.
    let diarySaveContinue = $('#id_saveandcontinue');
    diarySaveContinue.on('click', async function(e) {
        e.preventDefault();
        if (filename) {
            // eslint-disable-next-line
            syncData().then(() => {
                diarySaveContinue.off('click').click();
            });
        } else {
            diarySaveContinue.off('click').click();
        }
        localStorage.removeItem('lastCopyCutContent');
    });

    quizSubmit.on('click', async function(e) {
        e.preventDefault();
        if (filename) {
            // eslint-disable-next-line
            syncData().then(() => {
                quizSubmit.off('click').click();
            });
        } else {
            quizSubmit.off('click').click();
        }
        localStorage.removeItem('lastCopyCutContent');
    });

    const getModal = () => {

        Promise.all([
            getString('tiny_cursive_srcurl', 'tiny_cursive'),
            getString('tiny_cursive_srcurl_des', 'tiny_cursive'),
            getString('tiny_cursive_placeholder', 'tiny_cursive')
        ]).then(function([title, titledes, placeholder]) {
            // eslint-disable-next-line promise/no-nesting
            return SaveCancelModal.create({
                title: title,
                body: `<p id="inputUrl_desc" class="tiny-cursive-title-description">${titledes}</p>
                <label for="inputUrl" class="sr-only visually-hidden">${title}</label>
                <textarea class="form-control inputUrl" id="inputUrl" rows="3" placeholder="${placeholder}"
                    aria-describedby="inputUrl_desc"></textarea>
                <div id="inputUrl_error" class="invalid-feedback d-none" role="alert"></div>`,
                removeOnClose: true,
                show: true,
            })
                .then(modal => {
                    modal.getRoot().addClass('tiny-cursive-modal');
                    var lastEvent = '';

                    modal.getRoot().on(save, function(saveEvent) {
                        const field = document.getElementById("inputUrl");
                        var number = field.value.trim();

                        if (number === "") {
                            // Keep the dialog (and the paste) and explain inline instead of undoing.
                            saveEvent.preventDefault();
                            const errorEl = document.getElementById('inputUrl_error');
                            field.classList.add('is-invalid');
                            field.setAttribute('aria-invalid', 'true');
                            field.setAttribute('aria-describedby', 'inputUrl_desc inputUrl_error');
                            // eslint-disable-next-line promise/no-nesting
                            getString('pastewarning', 'tiny_cursive').then(str => {
                                errorEl.textContent = str;
                                errorEl.classList.remove('d-none');
                                errorEl.classList.add('d-block');
                                return str;
                            }).catch(error => window.console.error(error));
                            field.focus();
                            return;
                        }

                        {
                            if (pendingPasteContent) {
                                editor.execCommand('Undo');
                                editor.execCommand('mceInsertContent', false, {
                                    content: pendingPasteContent,
                                    paste: true
                                });

                                sendKeyEvent("Paste", {
                                    key: "v",
                                    keyCode: 86,
                                    caretPosition: editor.caretPosition,
                                    rePosition: editor.rePosition,
                                    pastedContent: pendingPasteContent,
                                    srcElement: {baseURI: window.location.href}
                                });

                                pendingPasteContent = null;
                            }
                        }

                        postOne('tiny_cursive_user_comments', {
                            modulename: modulename,
                            cmid: cmid,
                            resourceid: resourceId,
                            courseid: courseid,
                            usercomment: number,
                            timemodified: Date.now(),
                            editorid: editorid ? editorid : ""
                        });

                        lastEvent = 'save';
                        modal.destroy();
                    });
                    modal.getRoot().on(cancel, function() {
                        editor.execCommand('Undo');
                        lastEvent = 'cancel';
                        redoNeedsCite = true;
                    });

                    modal.getRoot().on(hidden, function() {
                        if (lastEvent != 'cancel' && lastEvent != 'save') {
                            editor.execCommand('Undo');
                            redoNeedsCite = true;
                        }
                    });
                    return modal;
                });
        }).catch(error => window.console.error(error));

    };
    let lastKeyFingerprint = null;
    let lastKeyTimestamp = 0;
    const sendKeyEvent = (events, editor) => {
        ed = editor;
        event = events;

        filename = `${userid}_${resourceId}_${cmid}_${modulename}_attempt`;

        if (modulename === 'quiz') {
            questionid = editorid.split(':')[1].split('_')[0];
            filename = `${userid}_${resourceId}_${cmid}_${questionid}_${modulename}_attempt`;
        }

        // Deduplicate: block same key + event within 100ms (iPhone double-fire)
        const now = Date.now();
        const fingerprint = event + '_' + editor.key + '_' + ed.caretPosition;

        if (fingerprint === lastKeyFingerprint && (now - lastKeyTimestamp) < 100) {
            // Window.console.warn('Duplicate blocked:', fingerprint);
            return;
        }
        const keys = ['Shift', 'Control', 'Alt', 'Meta', 'Delete', 'Backspace', 'Enter'];
        if (editor.key.length > 1 && !keys.includes(editor.key)) {
            return;
        }
        lastKeyFingerprint = fingerprint;
        lastKeyTimestamp = now;

        // Unidentified key guard
        if (editor.key === 'Unidentified') {
            return;
        }

        if (localStorage.getItem(filename)) {
            let data = JSON.parse(localStorage.getItem(filename));
            data.push({
                resourceId: resourceId,
                key: editor.key,
                keyCode: editor.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid,
                position: ed.caretPosition,
                rePosition: ed.rePosition,
                pastedContent: editor.pastedContent,
                aiContent: editor.aiContent,
                userAgent: M.userAgent
            });
            localStorage.setItem(filename, JSON.stringify(data));
        } else {
            let data = [{
                resourceId: resourceId,
                key: editor.key,
                keyCode: editor.keyCode,
                event: event,
                courseId: courseid,
                unixTimestamp: Date.now(),
                clientId: host,
                personId: userid,
                position: ed.caretPosition,
                rePosition: ed.rePosition,
                pastedContent: editor.pastedContent,
                aiContent: editor.aiContent,
                userAgent: M.userAgent
            }];
            localStorage.setItem(filename, JSON.stringify(data));
        }
    };

    editor.on('keyUp', (editor) => {
        customTooltip();
        let position = getCaretPosition(false);
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        // Console.log('KeyUp: ', editor.key);
        sendKeyEvent("keyUp", editor);
    });
    editor.on('Paste', async(e) => {
        customTooltip();
        const pastedContent = (e.clipboardData || e.originalEvent.clipboardData).getData('text');
        if (!pastedContent) {
            return;
        }
        // Trim both values for consistent comparison
        const trimmedPastedContent = pastedContent.trim();
        const lastCopyCutContent = localStorage.getItem('lastCopyCutContent');
        const isFromOwnEditor = lastCopyCutContent && trimmedPastedContent === lastCopyCutContent;

        if (!canBypassPaste && intervention) {

            if (PASTE_SETTING === 'block') {
                if (!isFromOwnEditor) {
                    e.preventDefault();
                    shouldBlockPaste = true;
                    isPasteAllowed = false;
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    getString('paste_blocked', 'tiny_cursive').then(str => {
                        return editor.windowManager.alert(str);
                    }).catch(error => window.console.error(error));
                    setTimeout(() => {
                        isPasteAllowed = true;
                        shouldBlockPaste = false;
                    }, 100);
                    return;
                }
                shouldBlockPaste = false;
                isPasteAllowed = true;
                return;
            }
            if (PASTE_SETTING === 'cite_source') {
                if (!isFromOwnEditor) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    pendingPasteContent = trimmedPastedContent;
                    getModal(e);
                }
                isPasteAllowed = true;
                return;
            }
        }
        isPasteAllowed = true;
    });
    editor.on('Redo', async(e) => {
        customTooltip();
        // Only a redo that re-applies a paste whose citation was dismissed needs the dialog.
        if (!canBypassPaste && intervention && redoNeedsCite) {
            redoNeedsCite = false;
            getModal(e);
        }
    });
    editor.on('keyDown', (editor) => {
        customTooltip();
        const isPasteAttempt = (editor.key === 'v' || editor.key === 'V') &&
        (editor.ctrlKey || editor.metaKey);
        if (isPasteAttempt && !canBypassPaste && intervention && PASTE_SETTING === 'block' && !isPasteAllowed) {
            setTimeout(() => {
                isPasteAllowed = true;
            }, 100);
            return;
        }
        let position = getCaretPosition();
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        // Console.log('KeyDown: ', editor.key);
        sendKeyEvent("keyDown", editor);
    });
    editor.on('Cut', () => {
        const selectedContent = editor.selection.getContent({format: 'text'});
        localStorage.setItem('lastCopyCutContent', selectedContent.trim());
    });
    editor.on('Copy', () => {
        const selectedContent = editor.selection.getContent({format: 'text'});
        localStorage.setItem('lastCopyCutContent', selectedContent.trim());
    });
    editor.on('mouseDown', async(editor) => {
        setTimeout(() => {
            constructMouseEvent(editor);
            sendKeyEvent("mouseDown", editor);
        }, 0);
    });
    editor.on('mouseUp', async(editor) => {
        setTimeout(() => {
            constructMouseEvent(editor);
            sendKeyEvent("mouseUp", editor);
        }, 10);
    });
    editor.on('init', () => {
        customTooltip();
        localStorage.removeItem('lastCopyCutContent');
    });
    editor.on('SetContent', () => {
        customTooltip();
    });
    // The config call usually resolves after the editor's init event has fired, so build the indicator now.
    if (editor.initialized) {
        customTooltip();
    }
    editor.on('FullscreenStateChanged', (e) => {
        let view = new DocumentView(user, Rubrics, submission, modulename, editor, quizInfo);
        isFullScreen = e.state;
        try {
            if (!e.state) {
                view.normalMode();
            } else {
                view.fullPageMode();
            }
            placeIndicator();
        } catch (error) {
            if (errorAlert) {
                errorAlert = false;
                getString('fullmodeerror', 'tiny_cursive').then(str => {
                    return editor.windowManager.alert(str);
                }).catch(error => window.console.error(error));
            }
            view.normalMode();
            window.console.error('Error ResizeEditor event:', error);
        }
    });

    editor.on('execcommand', function(e) {
        if (e.command === "mceInsertContent") {
            const contentObj = e.value;

            const isPaste = contentObj && typeof contentObj === 'object' && contentObj.paste === true;

            let insertedContent = contentObj.content || contentObj;
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = insertedContent;
            let text = tempDiv.textContent || tempDiv.innerText || '';
            let pastedText = tempDiv.textContent || tempDiv.innerText || '';

            let position = getCaretPosition(true);
            editor.caretPosition = position.caretPosition;
            editor.rePosition = position.rePosition;

            if (isPaste) {
                if (shouldBlockPaste) {
                    shouldBlockPaste = false;
                    sendKeyEvent("Paste", {
                        key: "v",
                        keyCode: 86,
                        caretPosition: editor.caretPosition,
                        rePosition: editor.rePosition,
                        pastedContent: pastedText,
                        blocked: true,
                        srcElement: {baseURI: window.location.href}
                    });
                    e.preventDefault();
                    editor.undoManager.undo();
                    return;
                }
                const lastCopyCutContent = localStorage.getItem('lastCopyCutContent');
                const isFromOwnEditor = lastCopyCutContent && pastedText.trim() === lastCopyCutContent;

                if (!canBypassPaste && intervention && PASTE_SETTING === 'block' && !isFromOwnEditor) {
                    isPasteAllowed = false;
                    sendKeyEvent("Paste", {
                        key: "v",
                        keyCode: 86,
                        caretPosition: editor.caretPosition,
                        rePosition: editor.rePosition,
                        pastedContent: pastedText,
                        blocked: true,
                        srcElement: {baseURI: window.location.href}
                    });
                    editor.undoManager.undo();
                    getString('paste_blocked', 'tiny_cursive').then(str => {
                        return editor.windowManager.alert(str);
                    }).catch(error => window.console.error(error));
                    return;
                }

                sendKeyEvent("Paste", {
                    key: "v",
                    keyCode: 86,
                    caretPosition: editor.caretPosition,
                    rePosition: editor.rePosition,
                    pastedContent: pastedText,
                    srcElement: {baseURI: window.location.href}
                });
            } else {
                aiContents.push(text);

                sendKeyEvent("aiInsert", {
                    key: "ai",
                    keyCode: 0,
                    caretPosition: editor.caretPosition,
                    rePosition: editor.rePosition,
                    aiContent: text,
                    srcElement: {baseURI: window.location.href}
                });
            }
        }
    });

let isComposing = false;
let previousContent = '';

editor.on('compositionstart', function() {
    isComposing = true;
    previousContent = '';
});

editor.on('compositionupdate', function(e) {
    const current = e.data;
    const prev = previousContent;

    if (current.length > prev.length) {
        // Only send the NEW character added
        const newChar = current.slice(prev.length);
        sentMobileInput(newChar);

    } else if (current.length < prev.length) {
        sentMobileInput('Backspace');
    }

    previousContent = current;
});

editor.on('compositionend', function() {
    // DO NOT send anything here — compositionupdate already sent each char
    isComposing = false;
    previousContent = '';
});

editor.on('input', function(e) {
    if (isComposing) {
        return;
    }

    // Block whole words from autocomplete/swipe keyboard
    if (e.data && e.data.length > 1 && e.inputType === 'insertText') {
        // Word was autocompleted — send each char individually
        for (const char of e.data) {
            sentMobileInput(char);
        }
        return;
    }

    if (e.inputType === 'deleteContentBackward') {
        sentMobileInput('Backspace');

    } else if (e.inputType === 'deleteContentForward') {
        sentMobileInput('Delete');

    } else if (e.inputType === 'insertLineBreak' || e.inputType === 'insertParagraph') {
        sentMobileInput('Enter');

    } else if (e.inputType === 'insertText' && e.data) {
        sentMobileInput(e.data);
    }
});

let lastKey = null;
let lastKeyTime = 0;

/**
 * Capture mobile device input and emit synthetic key events.
 * @param {string} key - The character or named key produced by the mobile input.
 */
function sentMobileInput(key) {
    const now = Date.now();

    // Deduplicate iPhone double-fire (same key within 100ms)
    if (key === lastKey && (now - lastKeyTime) < 100) {
        return;
    }

    lastKey = key;
    lastKeyTime = now;

    const keyCodeMap = {Backspace: 8, Delete: 46, Enter: 13, ' ': 32};
    const keyCode = key in keyCodeMap ? keyCodeMap[key] : key.charCodeAt(0);

    const event = {
        key:     key,
        keyCode: keyCode,
        data:    key,
    };

    let position = getCaretPosition(true);
    event.caretPosition = position.caretPosition;
    event.rePosition = position.rePosition;

    sendKeyEvent("keyDown", event);
    sendKeyEvent("keyUp", event);
}

    /**
     * Constructs a mouse event object with caret position and button information
     * @param {Object} editor - The TinyMCE editor instance
     * @function constructMouseEvent
     * @description Sets caret position, reposition, key and keyCode properties on the editor object based on current mouse state
     */
    function constructMouseEvent(editor) {
        let position = getCaretPosition(false);
        editor.caretPosition = position.caretPosition;
        editor.rePosition = position.rePosition;
        editor.key = getMouseButton(editor);
        editor.keyCode = editor.button;
    }

    /**
     * Gets the string representation of a mouse button based on its numeric value
     * @param {Object} editor - The editor object containing button information
     * @returns {string} The string representation of the mouse button ('left', 'middle', or 'right')
     */
    function getMouseButton(editor) {

        switch (editor.button) {
            case 0:
                return 'left';
            case 1:
                return 'middle';
            case 2:
                return 'right';
        }
        return null;
    }

    /**
     * Gets the current caret position in the editor
     * @param {boolean} skip - If true, returns the last known caret position instead of calculating a new one
     * @returns {Object} Object containing:
     *   - caretPosition: Sequential position number stored in session
     *   - rePosition: Absolute character offset from start of content
     * @throws {Error} Logs warning to console if error occurs during calculation
     */
    function getCaretPosition(skip = false) {
        try {
            if (!editor || !editor.selection) {
            return {caretPosition: 0, rePosition: 0};
            }

            const range = editor.selection.getRng();
            const body = editor.getBody();

            // Create a range from start of document to current caret
            const preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(body);
            preCaretRange.setEnd(range.endContainer, range.endOffset);

            const fragment = preCaretRange.cloneContents();
            const tempDiv = document.createElement('div');
            tempDiv.appendChild(fragment);
            let textBeforeCursor = tempDiv.innerText || '';

            const endContainer = range.endContainer;
            const endOffset = range.endOffset;

            if (endOffset === 0 &&
                endContainer.nodeType === Node.ELEMENT_NODE &&
                editor.dom.isBlock(endContainer) &&
                endContainer.previousSibling) {
                textBeforeCursor += '\n';
            }
            const blockElements = tempDiv.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
            let emptyBlockCount = 0;
            blockElements.forEach(block => {
            const text = block.innerText || block.textContent || '';
            if (text.trim() === '' && block.childNodes.length === 1 &&
                block.childNodes[0].nodeName === 'BR') {
                emptyBlockCount++;
            }
            });

            // Add newlines for empty blocks (these represent Enter presses that created empty lines)
            if (emptyBlockCount > 0) {
            textBeforeCursor += '\n'.repeat(emptyBlockCount);
            }

            const absolutePosition = textBeforeCursor.length;

            if (skip) {
            return {
                caretPosition: lastCaretPos,
                rePosition: absolutePosition
            };
            }
            // Increment sequential caretPosition
            const storageKey = `${userid}_${resourceId}_${cmid}_position`;
            let storedPos = parseInt(sessionStorage.getItem(storageKey), 10);
            if (isNaN(storedPos)) {
            storedPos = 0;
            }
            storedPos++;
            lastCaretPos = storedPos;
            sessionStorage.setItem(storageKey, storedPos);

            return {
            caretPosition: storedPos,
            rePosition: absolutePosition
            };

        } catch (e) {
            window.console.warn('Error getting caret position:', e);
            return {caretPosition: lastCaretPos || 1, rePosition: 0};
        }
    }


    /**
     * Synchronizes data from localStorage to server
     * @async
     * @function SyncData
     * @description Retrieves stored keypress data from localStorage and sends it to server
     * @returns {Promise} Returns response from server if data exists and is successfully sent
     * @throws {Error} Logs error to console if data submission fails
     */
    async function syncData() {
        checkIsPdfAnnotator();
        let data = localStorage.getItem(filename);

        if (!data || data.length === 0 || !navigator.onLine) {
            if (!navigator.onLine) {
                Autosave.updateSavingState('offline', editorid);
            }
            return;
        } else {
            let originalText = editor.getContent({format: 'text'});
            if (!originalText) {
                originalText = getRawText(editor);
            }
            try {
                Autosave.updateSavingState('saving', editorid);
                // eslint-disable-next-line
                return await postOne('tiny_cursive_write_local_to_json', {
                    key: ed.key,
                    event: event,
                    keyCode: ed.keyCode,
                    resourceId: resourceId,
                    cmid: cmid,
                    modulename: modulename,
                    editorid: editorid,
                    "json_data": data,
                    originalText: originalText
                }, filename);
            } catch (error) {
                window.console.error('Error submitting data:', error);
            }
        }
    }

    /**
     * Gets the raw text content from a TinyMCE editor iframe
     * @param {Object} editor - The TinyMCE editor instance
     * @returns {string} The raw text content of the editor body, or empty string if not found
     * @description Attempts to get the raw text content from the editor's iframe body by:
     * 1. Getting the editor ID
     * 2. Finding the associated iframe element
     * 3. Accessing the iframe's document body
     * 4. Returning the text content
     * Returns empty string if any step fails
     */
    function getRawText(editor) {
        let editorId = editor?.id;
        if (editorId) {
            // Quiz editor ids contain colons, which a selector cannot carry unescaped.
            let iframe = document.getElementById(`${editorId}_ifr`);
            let iframeBody = iframe.contentDocument?.body || iframe.contentWindow?.document?.body;
            return iframeBody?.textContent;
        }
        return "";
    }

    /**
     * Sets up custom tooltip functionality for the Cursive icon
     * Initializes tooltip text, positions the icon in the menubar,
     * and sets up mouse event handlers for showing/hiding the tooltip
     * @function customTooltip
     */
    function customTooltip() {
        try {
            // One indicator per editor, keyed by the editor id so two editors on a page never clash.
            const safeId = String(editorid || 'editor').replace(/[^a-zA-Z0-9_-]/g, '_');
            const elementId = `tiny_cursive_StateIcon_${safeId}`;
            const tooltipId = `tiny_cursive_tooltip_${safeId}`;

            // Bail out once the indicator exists (customTooltip runs on every keystroke); otherwise
            // it would be torn down and rebuilt empty, making the saved icon flicker while typing.
            if (document.getElementById(elementId)) {
                return;
            }
            const menubar = editor?.container?.querySelector('div[role="menubar"].tox-menubar');
            if (!menubar) {
                return;
            }
            menubar.classList.add(`cursive-menu-${safeId}`);
            const tooltipText = getTooltipText();

            const cursiveIcon = document.createElement('img');
            cursiveIcon.src = hasApiKey ? iconUrl : iconGrayUrl;
            // Decorative: the surrounding button carries the name.
            cursiveIcon.alt = '';
            cursiveIcon.setAttribute('class', 'tiny_cursive_StateButton');
            cursiveIcon.style.display = 'inline-block';

            cursiveState(cursiveIcon, menubar, elementId, tooltipId);

            tooltipText.then((text) => {
                return setTooltip(text, document.getElementById(elementId), tooltipId);
            }).catch(error => window.console.error(error));

            // The disclosure shows on hover and on keyboard focus, and Escape dismisses it (1.4.13).
            const disclosure = document.getElementById(elementId);
            if (disclosure) {
                const show = () => {
                    $(`#${tooltipId}`).css(tooltipCss);
                    disclosure.setAttribute('aria-expanded', 'true');
                };
                const hide = () => {
                    $(`#${tooltipId}`).css('display', 'none');
                    disclosure.setAttribute('aria-expanded', 'false');
                };
                disclosure.addEventListener('mouseenter', show);
                disclosure.addEventListener('mouseleave', hide);
                disclosure.addEventListener('focus', show);
                disclosure.addEventListener('blur', hide);
                disclosure.addEventListener('click', show);
                disclosure.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        hide();
                        e.stopPropagation();
                    }
                });
            }
        } catch (error) {
            window.console.error('Error setting up custom tooltip:', error);
        }
    }

    /**
     * Retrieves tooltip text strings from language files
     * @async
     * @function getTooltipText
     * @returns {Promise<Object>} Object containing buttonTitle and buttonDes strings
     */
    async function getTooltipText() {
        const [
            buttonTitle,
            buttonDes,
            noApiKey,
        ] = await Promise.all([
            getString('cursive:state:active', 'tiny_cursive'),
            getString('cursive:state:active:des', 'tiny_cursive'),
            getString('cursive:state:noapikey', 'tiny_cursive'),
        ]);
        return {buttonTitle, buttonDes, noApiKey};
    }

    /**
     * Move this editor's existing indicator to where the current mode shows it: the document-mode
     * sidebar when fullscreen, otherwise back beside the editor's menubar.
     */
    function placeIndicator() {
        const safeId = String(editorid || 'editor').replace(/[^a-zA-Z0-9_-]/g, '_');
        const wrapper = document.getElementById(`tiny_cursive_StateIcon_${safeId}`)?.closest('.tiny_cursive_state_wrapper');
        if (!wrapper) {
            // Leaving document mode tears the sidebar (and the indicator in it) down: rebuild it.
            customTooltip();
            return;
        }
        const fullpage = isFullScreen ? document.querySelector('#tiny_cursive-fullpage-right-wrapper') : null;
        if (fullpage) {
            wrapper.style.height = '';
            wrapper.style.marginTop = '3px';
            fullpage.prepend(wrapper);
            return;
        }
        const menubar = editor?.container?.querySelector('div[role="menubar"].tox-menubar');
        if (menubar && wrapper.previousElementSibling !== menubar) {
            wrapper.style.marginTop = '';
            if (menubar.offsetHeight > 0) {
                wrapper.style.height = `${menubar.offsetHeight}px`;
            }
            menubar.parentElement?.classList.add('tiny_cursive_has_state');
            menubar.insertAdjacentElement('afterend', wrapper);
        }
    }

    /**
     * Builds this editor's indicator (capture disclosure + Saved Content control) and places it
     * beside the menubar, or in the document-mode sidebar when the editor is fullscreen.
     *
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to clone into the disclosure
     * @param {HTMLElement} menubar - This editor's menubar
     * @param {string} elementId - Id for the disclosure button
     * @param {string} tooltipId - Id for the tooltip it describes itself with
     */
    function cursiveState(cursiveIcon, menubar, elementId, tooltipId) {
        const rightWrapper = document.createElement('div');
        // The capture disclosure is a real button: focusable, named, with the tooltip as its description.
        const imgWrapper = document.createElement('button');
        const iconClone = cursiveIcon.cloneNode(true);

        rightWrapper.className = 'tiny_cursive_state_wrapper';
        rightWrapper.style.cssText = `
                    margin-inline-start: auto;
                    display: flex;
                    align-items: center;
                `;

        imgWrapper.type = 'button';
        imgWrapper.id = elementId;
        imgWrapper.className = 'tiny_cursive_StateButtonWrap';
        imgWrapper.setAttribute('aria-describedby', tooltipId);
        imgWrapper.setAttribute('aria-expanded', 'false');
        imgWrapper.appendChild(iconClone);
        rightWrapper.appendChild(imgWrapper);

        const moduleIds = {
            resourceId: resourceId,
            cmid: cmid,
            modulename: modulename,
            questionid: questionid,
            userid: userid,
            courseid: courseid};

        const fullpage = isFullScreen ? document.querySelector('#tiny_cursive-fullpage-right-wrapper') : null;
        if (fullpage) {
            // Document mode: the indicator lives in the sidebar, not the editor header.
            editor.container?.querySelector('.tiny_cursive_state_wrapper')?.remove();
            if (!document.getElementById(elementId)) {
                rightWrapper.style.marginTop = '3px';
                fullpage.prepend(rightWrapper);
            }
            Autosave.getInstance(editor, rightWrapper, moduleIds, isFullScreen);
            return;
        }

        // Regular view: beside the menubar, not inside it (a menubar may only own menu items).
        const header = menubar.parentElement;
        if (header && !header.querySelector(`#${elementId}`)) {
            header.classList.add('tiny_cursive_has_state');
            if (menubar.offsetHeight > 0) {
                rightWrapper.style.height = `${menubar.offsetHeight}px`;
            }
            menubar.insertAdjacentElement('afterend', rightWrapper);
        }
        Autosave.getInstance(editor, rightWrapper, moduleIds, isFullScreen);
    }

    /**
     * Sets up tooltip content and styling for the Cursive icon
     * @param {Object} text - Object containing tooltip text strings
     * @param {string} text.buttonTitle - Title text for the tooltip
     * @param {string} text.buttonDes - Description text for the tooltip
     * @param {HTMLElement} cursiveIcon - The Cursive icon element to attach tooltip to
     * @param {string} tooltipId - ID for the tooltip element
     */
    function setTooltip(text, cursiveIcon, tooltipId) {

        if (document.querySelector(`#${tooltipId}`)) {
            return;
        }
        if (cursiveIcon) {
            // Name the disclosure button; the tooltip body becomes its description via aria-describedby.
            const name = text.buttonTitle.replace(/[:\s]+$/, '');
            cursiveIcon.setAttribute('aria-label', hasApiKey ? name : `${name}. ${text.noApiKey}`);

            const tooltipSpan = document.createElement('span');
            const description = document.createElement('span');
            const linebreak = document.createElement('br');
            const tooltipTitle = document.createElement('strong');

            tooltipSpan.style.display = 'none';
            tooltipTitle.textContent = text.buttonTitle;
            description.textContent = text.buttonDes;

            tooltipSpan.id = tooltipId;
            tooltipSpan.setAttribute('role', 'tooltip');
            tooltipSpan.classList.add(`shadow`, 'tiny_cursive_state_tooltip');
            tooltipSpan.appendChild(tooltipTitle);
            tooltipSpan.appendChild(linebreak);
            tooltipSpan.appendChild(description);
            // A sibling of the button, not a child: the button's tight line-height would collapse the lines,
            // and button children are presentational for assistive technology.
            (cursiveIcon.parentElement || cursiveIcon).appendChild(tooltipSpan);
        }
    }

    /**
     * Extracts module information from URL parameters
     * @param {string} ur - The base URL to analyze
     * @param {URL} parm - URL object containing search parameters
     * @param {Array} MODULES - Array of valid module names to check against
     * @returns {Object|boolean} Object containing resourceId and module name if found, false if no valid module
     */
    function getModulesInfo(ur, parm, MODULES) {
        fetchStrings();

        if (!MODULES.some(module => ur.includes(module))) {
            return false;
        }

        if (ur.includes("forum") && !ur.includes("assign")) {
            resourceId = parm.searchParams.get('edit');
        } else {
            resourceId = parm.searchParams.get('attempt');
        }

        if (ur.includes("workshop") && ur.includes("assessment")) {
            resourceId = parm.searchParams.get('asid');
        }

        if (resourceId === null) {
            resourceId = 0;
        }

        for (const module of MODULES) {
            if (ur.includes(module)) {
                modulename = module;
                if (module === "lesson" || module === "assign") {
                    resourceId = cmid;
                } else if (module === "oublog") {
                    resourceId = 0;
                } else if (module === "diary") {
                    // Diary stores multiple entries per (cmid, userid); key capture on the
                    // diary_entries id. The edit form exposes it as a hidden "entryid" field
                    // (populated when editing/continuing an existing entry). A brand-new entry
                    // has no id yet, so capture under 0 and let the entry_created observer
                    // reattribute the records to the real entry id on save.
                    const entryField = document.querySelector('input[name="entryid"]');
                    resourceId = entryField && entryField.value ? parseInt(entryField.value, 10) : 0;
                }
                break;
            }
        }

        checkIsPdfAnnotator();

        return {resourceId: resourceId, name: modulename};
    }

    /**
     * Fetches and caches localized strings used in the UI
     * @function fetchStrings
     * @description Retrieves strings for sidebar titles and document sidebar elements if not already cached in localStorage
     * Uses Promise.all to fetch multiple strings in parallel for better performance
     * Stores the fetched strings in localStorage under 'sbTitle' and 'docSideBar' keys
     */
    function fetchStrings() {
        if (!localStorage.getItem('sbTitle')) {
            Promise.all([
                getString('assignment', 'tiny_cursive'),
                getString('discussion', 'tiny_cursive'),
                getString('pluginname', 'mod_quiz'),
                getString('pluginname', 'mod_lesson'),
                getString('pluginname', 'mod_workshop'),
                getString('description', 'tiny_cursive'),
            ]).then(function(strings) {
                return localStorage.setItem('sbTitle', JSON.stringify(strings));
            }).catch(error => window.console.error(error));
        }
        if (!localStorage.getItem('docSideBar')) {
            Promise.all([
                getString('details', 'tiny_cursive'),
                getString('student_info', 'tiny_cursive'),
                getString('progress', 'tiny_cursive'),
                getString('description', 'tiny_cursive'),
                getString('replyingto', 'tiny_cursive'),
                getString('answeringto', 'tiny_cursive'),
                getString('importantdates', 'tiny_cursive'),
                getString('rubrics', 'tiny_cursive'),
                getString('submission_status', 'tiny_cursive'),
                getString('status', 'tiny_cursive'),
                getString('draft', 'tiny_cursive'),
                getString('draftnot', 'tiny_cursive'),
                getString('last_modified', 'tiny_cursive'),
                getString('gradings', 'tiny_cursive'),
                getString('gradenot', 'tiny_cursive'),
                getString('word_count', 'tiny_cursive'),
                getString('timeleft', 'tiny_cursive'),
                getString('nolimit', 'tiny_cursive'),
                getString('name', 'tiny_cursive'),
                getString('userename', 'tiny_cursive'),
                getString('course', 'tiny_cursive'),
                getString('opened', 'tiny_cursive'),
                getString('due', 'tiny_cursive'),
                getString('overdue', 'tiny_cursive'),
                getString('remaining', 'tiny_cursive'),
                getString('savechanges', 'tiny_cursive'),
                getString('subjectnot', 'tiny_cursive'),
                getString('remaining', 'tiny_cursive'),
            ]).then(function(strings) {
                return localStorage.setItem('docSideBar', JSON.stringify(strings));
            }).catch(error => window.console.error(error));
        }

    }

    /**
     * Checks if the current page is a PDF annotator and updates the resourceId accordingly
     * @function checkIsPdfAnnotator
     * @description Checks if URL contains 'pdfannotator' and sets resourceId based on editor ID and editing state:
     * - If editing an existing annotation (editor.id !== 'id_pdfannotator_content' and isEditing is true):
     *   Sets resourceId to the annotation ID extracted from editor.id
     * - Otherwise: Sets resourceId to 0
     */
    function checkIsPdfAnnotator() {
        if (ur.includes('pdfannotator')) {
            if (editor.id !== 'id_pdfannotator_content' && parseInt(localStorage.getItem('isEditing'))) {
                resourceId = parseInt(editor?.id.replace('editarea', ''));
            } else {
                resourceId = 0;
            }
        }
    }

    window.addEventListener('unload', () => {
        syncData();
    });

    setInterval(syncData, syncInterval);
};
