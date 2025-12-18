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
 * @module     tiny_cursive/replay
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author kuldeep singh <mca.kuldeep.sekhon@gmail.com>
 */

import {call as fetchJson} from 'core/ajax';
import templates from 'core/templates';
import $ from 'jquery';
import * as Str from 'core/str';

export default class Replay {
    constructor(elementId, filePath, speed = 1, loop = false, controllerId) {
        // Initialize core properties
        this.controllerId = controllerId || '';
        this.replayInProgress = false;
        this.speed = parseFloat(speed);
        this.loop = loop;
        this.highlightedChars = [];
        this.deletedChars = [];
        this.cursorPosition = 0;
        this.currentEventIndex = 0;
        this.totalEvents = 0;
        this.currentTime = 0;
        this.totalDuration = 0;
        this.usercomments = [];
        this.pasteTimestamps = [];
        this.isPasteEvent = false;
        this.isControlKeyPressed = false;
        this.isShiftKeyPressed = false;
        this.isMetaKeyPressed = false;
        this.text = '';
        this.pastedEvents = [];
        this.currentPasteIndex = 0;
        this.pastedChars = [];
        this.aiEvents = [];
        this.currentAiIndex = 0;
        this.aiChars = [];
        this.undoTimestamps = [];
        this.undoChars = [];

        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with id '${elementId}' not found`);
        }
        this.outputElement = element;

        // Load JSON data and initialize replay
        this.loadJSON(filePath).then(data => {
            if (data.status) {
                this.processData(data);
                this.totalEvents = this.logData.length;
                this.identifyPasteEvents();
                this.identifyUndoEvents();
                if (this.controllerId && this.logData) {
                    this.constructController(this.controllerId);
                }
                this.startReplay();
            } else {
                this.handleNoSubmission();
            }
            return data;
        }).catch(error => {
            this.handleNoSubmission();
            window.console.error('Error loading JSON file:', error.message);
        });
        if (!localStorage.getItem('nopasteevent') || !localStorage.getItem('pasteEvent')) {
            Str.get_string('nopasteevent', 'tiny_cursive').then(str => {
                localStorage.setItem('nopasteevent', str);
                return str;
            }).catch(error => window.console.log(error));
            Str.get_string('pasteEvent', 'tiny_cursive').then(str => {
                localStorage.setItem('pasteEvent', str);
                return str;
            }).catch(error => window.console.log(error));
        }
    }

    // Process JSON data and normalize timestamps
    processData(data) {
        this.logData = JSON.parse(data.data);
        if (data.comments) {
            this.usercomments = Array.isArray(JSON.parse(data.comments)) ? JSON.parse(data.comments) : [];
        }
        if ('data' in this.logData) {
            this.logData = this.logData.data;
        }
        if ('payload' in this.logData) {
            this.logData = this.logData.payload;
        }
        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.event === 'Paste') {
                if (typeof event.pastedContent === 'string' && event.pastedContent.trim() !== '') {
                    this.pastedEvents.push(event.pastedContent);
                }
            }
            if (event.event === 'aiInsert' && event.aiContent) {
                this.aiEvents.push(event.aiContent);
            }
        }
        if (this.logData.length > 0 && this.logData[0].unixTimestamp) {
            const startTime = this.logData[0].unixTimestamp;
            this.logData = this.logData.map(event => ({
                ...event,
                normalizedTime: event.unixTimestamp - startTime
            }));
            this.totalDuration = this.logData[this.logData.length - 1].normalizedTime;
        }
    }

    async handleNoSubmission() {
        try {
            const [html, str] = await Promise.all([
                templates.render('tiny_cursive/no_submission'),
                Str.get_string('warningpayload', 'tiny_cursive')
            ]);
            const newElement = $(html).text(str);
            return $('.tiny_cursive').html(newElement);
        } catch (error) {
            window.console.error(error);
            return false;
        }
    }

    // Stop the replay and update play button icon
    stopReplay() {
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
            this.replayInProgress = false;
            if (this.playButton) {
                const playSvg = document.createElement('img');
                playSvg.src = M.util.image_url('playicon', 'tiny_cursive');
                this.playButton.querySelector('.play-icon').innerHTML = playSvg.outerHTML;
            }
        }
    }

    // Build the replay control UI (play button, scrubber, speed controls)
    constructController(controllerId) {
        this.replayInProgress = false;
        this.currentPosition = 0;
        this.speed = 1;
        if (this.replayIntervalId) {
            clearInterval(this.replayIntervalId);
            this.replayIntervalId = null;
        }

        const container = document.getElementById(controllerId);
        if (!container) {
            window.console.error('Container not found with ID:', controllerId);
            return;
        }

        const controlContainer = container.querySelector('.tiny_cursive_replay_control');
        if (!controlContainer) {
            window.console.error('Replay control container not found in:', controllerId);
            return;
        }
        controlContainer.innerHTML = '<span class="tiny_cursive_loading_spinner"></span>';

        this.buildControllerUI(controlContainer, container);
        controlContainer.querySelector('.tiny_cursive_loading_spinner')?.remove();
    }

    buildControllerUI(controlContainer, container) {
        const topRow = document.createElement('div');
        topRow.classList.add('tiny_cursive_top_row');

        this.playButton = this.createPlayButton();
        topRow.appendChild(this.playButton);

        const scrubberContainer = this.createScrubberContainer();
        topRow.appendChild(scrubberContainer);

        this.timeDisplay = this.createTimeDisplay();
        topRow.appendChild(this.timeDisplay);

        const bottomRow = document.createElement('div');
        bottomRow.classList.add('tiny_cursive_bottom_row');

        const speedContainer = this.createSpeedControls();
        bottomRow.appendChild(speedContainer);

        const pasteEventsToggle = this.createPasteEventsToggle(container);
        bottomRow.appendChild(pasteEventsToggle);

        controlContainer.appendChild(topRow);
        controlContainer.appendChild(bottomRow);
        container.appendChild(this.pasteEventsPanel);
    }

    createPlayButton() {
        const playButton = document.createElement('button');
        playButton.classList.add('tiny_cursive_play_button');
        const playSvg = document.createElement('i');
        playButton.innerHTML = `<span class="play-icon">${playSvg.outerHTML}</span>`;
        playButton.addEventListener('click', () => {
            if (this.replayInProgress) {
                this.stopReplay();
            } else {
                this.startReplay(false);
            }
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
            $('a[id^="rep"]').addClass('active');
        });
        return playButton;
    }

    createScrubberContainer() {
        const scrubberContainer = document.createElement('div');
        scrubberContainer.classList.add('tiny_cursive_scrubber_container');
        this.scrubberElement = document.createElement('input');
        this.scrubberElement.classList.add('tiny_cursive_timeline_scrubber', 'timeline-scrubber');
        this.scrubberElement.type = 'range';
        this.scrubberElement.max = '100';
        this.scrubberElement.min = '0';
        this.scrubberElement.value = '0';
        this.scrubberElement.addEventListener('input', () => {
            this.skipToTime(parseInt(this.scrubberElement.value, 10));
        });
        scrubberContainer.appendChild(this.scrubberElement);
        return scrubberContainer;
    }

    createTimeDisplay() {
        const timeDisplay = document.createElement('div');
        timeDisplay.classList.add('tiny_cursive_time_display');
        timeDisplay.textContent = '00:00 / 00:00';
        return timeDisplay;
    }

    createSpeedControls() {
        const speedContainer = document.createElement('div');
        speedContainer.classList.add('tiny_cursive_speed_controls', 'speed-controls');
        const speedLabel = document.createElement('span');
        speedLabel.classList.add('tiny_cursive_speed_label');
        speedLabel.textContent = 'Speed: ';
        speedContainer.appendChild(speedLabel);

        const speedGroup = document.createElement('div');
        speedGroup.classList.add('tiny_cursive_speed_group');
        [1, 1.5, 2, 5, 10].forEach(speed => {
            const speedBtn = document.createElement('button');
            speedBtn.textContent = `${speed}x`;
            speedBtn.classList.add('tiny_cursive_speed_btn', 'speed-btn');
            if (parseFloat(speed) === this.speed) {
                speedBtn.classList.add('active');
            }
            speedBtn.dataset.speed = speed;
            speedBtn.addEventListener('click', () => {
                document.querySelectorAll('.tiny_cursive_speed_btn').forEach(btn => btn.classList.remove('active'));
                speedBtn.classList.add('active');
                this.speed = parseFloat(speedBtn.dataset.speed);
                if (this.replayInProgress) {
                    this.stopReplay();
                    this.startReplay(false);
                }
            });
            speedGroup.appendChild(speedBtn);
        });
        speedContainer.appendChild(speedGroup);
        return speedContainer;
    }

    createPasteEventsToggle(container) {
        const pasteEventsToggle = document.createElement('div');
        pasteEventsToggle.classList.add('tiny_cursive_paste_events_toggle', 'paste-events-toggle');

        const pasteEventsIcon = document.createElement('span');
        const pasteIcon = document.createElement('img');
        pasteIcon.src = M.util.image_url('pasteicon', 'tiny_cursive');
        pasteEventsIcon.innerHTML = pasteIcon.outerHTML;
        pasteEventsIcon.classList.add('tiny_cursive_paste_events_icon');

        const pasteEventsText = document.createElement('span');
        pasteEventsText.textContent = localStorage.getItem('pasteEvent');

        this.pasteEventCount = document.createElement('span');
        this.pasteEventCount.textContent = `(${this.pasteTimestamps.length})`;
        this.pasteEventCount.className = 'paste-event-count';
        this.pasteEventCount.style.marginLeft = '2px';

        const chevronIcon = document.createElement('span');
        const chevron = document.createElement('i');
        chevron.className = 'fa fa-chevron-down';
        chevronIcon.innerHTML = chevron.outerHTML;
        chevronIcon.style.marginLeft = '5px';
        chevronIcon.style.transition = 'transform 0.3s ease';

        pasteEventsToggle.appendChild(pasteEventsIcon);
        pasteEventsToggle.appendChild(pasteEventsText);
        pasteEventsToggle.appendChild(this.pasteEventCount);
        pasteEventsToggle.appendChild(chevronIcon);

        this.pasteEventsPanel = this.createPasteEventsPanel(container);
        pasteEventsToggle.addEventListener('click', () => {
            const isHidden = this.pasteEventsPanel.style.display === 'none';
            this.pasteEventsPanel.style.display = isHidden ? 'block' : 'none';
            chevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
        });

        return pasteEventsToggle;
    }

    createPasteEventsPanel(container) {
        const existingPanel = container.querySelector('.paste-events-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        const pasteEventsPanel = document.createElement('div');
        pasteEventsPanel.classList.add('tiny_cursive_paste_events_panel', 'paste-events-panel');
        pasteEventsPanel.style.display = 'none';
        this.populatePasteEventsPanel(pasteEventsPanel);
        return pasteEventsPanel;
    }

    // Detect Ctrl+V paste events and sync with user comments
    identifyPasteEvents() {
        this.pasteTimestamps = [];
        let controlPressed = false;
        let metaPressed = false;
        /* eslint-disable no-unused-vars */
        let shiftPressed = false;
        let pasteCount = 0;

        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.event?.toLowerCase() === 'keydown') {
                if (event.key === 'Control') {
                    controlPressed = true;
                } else if (event.key === 'Meta') {
                    metaPressed = true;
                } else if (event.key === 'Shift') {
                    shiftPressed = true;
                } else if ((event.key === 'v' || event.key === 'V') && (controlPressed || metaPressed)) {
                    if (this.pastedEvents[pasteCount]) {
                        const timestamp = event.normalizedTime || 0;
                        this.pasteTimestamps.push({
                            index: pasteCount,
                            time: timestamp,
                            formattedTime: this.formatTime(timestamp),
                            pastedText: this.pastedEvents[pasteCount],
                            timestamp
                        });
                    }
                    pasteCount++;
                    controlPressed = false;
                    shiftPressed = false;
                    metaPressed = false;
                } else {
                    controlPressed = false;
                    shiftPressed = false;
                    metaPressed = false;
                }
            }
        }

        if (this.pasteEventsPanel) {
            this.populatePasteEventsPanel(this.pasteEventsPanel);
        }
    }

    identifyUndoEvents() {
        this.undoTimestamps = [];
        let controlPressed = false;
        let metaPressed = false;
        let undoCount = 0;

        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.event?.toLowerCase() === 'keydown') {
                if (event.key === 'Control') {
                    controlPressed = true;
                } else if (event.key === 'Meta') {
                    metaPressed = true;
                } else if ((event.key === 'z' || event.key === 'Z') && (controlPressed || metaPressed)) {
                    const timestamp = event.normalizedTime || 0;
                    this.undoTimestamps.push({
                        index: undoCount,
                        time: timestamp,
                        formattedTime: this.formatTime(timestamp),
                        timestamp
                    });
                    undoCount++;
                    controlPressed = false;
                    metaPressed = false;
                } else {
                    controlPressed = false;
                    metaPressed = false;
                }
            }
        }
    }

    // Populate the paste events panel with navigation
    populatePasteEventsPanel(panel) {
        panel.innerHTML = '';
        panel.classList.add('tiny_cursive_event_panel');

        if (!this.pasteTimestamps.length) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-paste-events-message p-3';
            noEventsMessage.textContent = localStorage.getItem('nopasteevent');
            panel.appendChild(noEventsMessage);
            return;
        }

        const carouselContainer = document.createElement('div');
        carouselContainer.classList.add('tiny_cursive_paste_events_carousel', 'paste-events-carousel');

        const navigationRow = document.createElement('div');
        navigationRow.classList.add('paste-events-navigation', 'tiny_cursive_navigation_row');

        const counterDisplay = document.createElement('div');
        counterDisplay.classList.add('paste-events-counter', 'tiny_cursive_counter_display');
        counterDisplay.textContent = 'Paste Events';

        const navButtons = document.createElement('div');
        navButtons.classList.add('tiny_cursive_nav_buttons');
        const prevButton = document.createElement('button');
        prevButton.classList.add('paste-event-prev-btn', 'tiny_cursive_nav_button');
        prevButton.innerHTML = '<i class="fa fa-chevron-left"></i>';

        const nextButton = document.createElement('button');
        nextButton.classList.add('paste-event-next-btn', 'tiny_cursive_nav_button');
        nextButton.innerHTML = '<i class="fa fa-chevron-right"></i>';
        nextButton.disabled = this.pasteTimestamps.length <= 1;

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);
        navigationRow.appendChild(counterDisplay);
        navigationRow.appendChild(navButtons);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'paste-events-content tiny_cursive_content_container';
        contentContainer.appendChild(this.createPasteEventDisplay(this.pasteTimestamps[0]));

        carouselContainer.appendChild(navigationRow);
        carouselContainer.appendChild(contentContainer);
        panel.appendChild(carouselContainer);

        let currentIndex = 0;
        const updateDisplay = () => {
            contentContainer.innerHTML = '';
            contentContainer.appendChild(this.createPasteEventDisplay(this.pasteTimestamps[currentIndex]));
            counterDisplay.textContent = 'Paste Events';
            prevButton.disabled = currentIndex === 0;
            prevButton.style.opacity = currentIndex === 0 ? '0.5' : '1';
            nextButton.disabled = currentIndex === this.pasteTimestamps.length - 1;
            nextButton.style.opacity = currentIndex === this.pasteTimestamps.length - 1 ? '0.5' : '1';
        };

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateDisplay();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentIndex < this.pasteTimestamps.length - 1) {
                currentIndex++;
                updateDisplay();
            }
        });
    }

    createPasteEventDisplay(pasteEvent) {
        const eventRow = document.createElement('div');
        eventRow.className = 'tiny_cursive_event_row';

        const headerRow = document.createElement('div');
        headerRow.className = 'tiny_cursive_header_row';

        const textContainer = document.createElement('div');
        textContainer.className = 'tiny_cursive_text_container';

        const timestampContainer = document.createElement('div');
        timestampContainer.className = 'paste-event-timestamp tiny_cursive_paste_event_timestamp';
        timestampContainer.textContent = pasteEvent.formattedTime;

        const pastedTextContainer = document.createElement('div');
        pastedTextContainer.className = 'paste-event-text tiny_cursive_pasted_text_container';
        pastedTextContainer.textContent = pasteEvent.pastedText;

        textContainer.appendChild(timestampContainer);
        textContainer.appendChild(pastedTextContainer);

        const playButton = document.createElement('button');
        playButton.className = 'paste-event-play-btn tiny_cursive_seekplay_button';
        const playIcon = document.createElement('img');
        playIcon.src = M.util.image_url('seekplayicon', 'tiny_cursive');
        playButton.innerHTML = playIcon.outerHTML;
        playButton.addEventListener('click', () => this.jumpToTimestamp(pasteEvent.timestamp));

        headerRow.appendChild(textContainer);
        headerRow.appendChild(playButton);
        eventRow.appendChild(headerRow);

        return eventRow;
    }

    // Jump to a specific timestamp in the replay
    jumpToTimestamp(timestamp) {
        const percentage = this.totalDuration > 0 ? (timestamp / this.totalDuration) * 100 : 0;
        this.skipToTime(percentage);
        if (!this.replayInProgress) {
            this.startReplay(false);
        }
    }

    setScrubberVal(value) {
        if (this.scrubberElement) {
            this.scrubberElement.value = String(value);
            if (this.timeDisplay) {
                const displayTime = Math.min(this.currentTime, this.totalDuration);
                this.timeDisplay.textContent = `${this.formatTime(displayTime)} / ${this.formatTime(this.totalDuration)}`;
            }
        }
    }

    loadJSON(filePath) {
        return fetchJson([{
            methodname: 'cursive_get_reply_json',
            args: {filepath: filePath}
        }])[0].done(response => response).fail(error => {
            throw new Error(`Error loading JSON file: ${error.message}`);
        });
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Start or restart the replay
    startReplay(reset = true) {
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
        }
        const atEnd = (this.totalDuration > 0 && this.currentTime >= this.totalDuration) ||
            (this.currentEventIndex >= this.totalEvents);
        if (atEnd && !reset) {
            reset = true;
        }
        this.replayInProgress = true;
        if (reset) {
            this.outputElement.innerHTML = '';
            this.text = '';
            this.cursorPosition = 0;
            this.currentEventIndex = 0;
            this.currentTime = 0;
            this.highlightedChars = [];
            this.deletedChars = [];
            this.isControlKeyPressed = false;
            this.isMetaKeyPressed = false;
            this.currentPasteIndex = 0;
            this.pastedChars = [];
            this.currentAiIndex = 0;
            this.aiChars = [];
        }
        if (this.playButton) {
            const pauseSvg = document.createElement('i');
            pauseSvg.className = 'fa fa-pause';
            this.playButton.querySelector('.play-icon').innerHTML = pauseSvg.outerHTML;
        }
        this.replayLog();
    }

    // Process events in sequence to simulate typing
    replayLog() {
        if (!this.replayInProgress) {
            this.updateDisplayText(this.text, this.cursorPosition, [], []);
            return;
        }

        while (this.currentEventIndex < this.logData.length) {
            const event = this.logData[this.currentEventIndex];
            if (event.normalizedTime && event.normalizedTime > this.currentTime) {
                break;
            }

            let text = this.text || '';
            let cursor = this.cursorPosition;
            let updatedHighlights = [...this.highlightedChars];
            let updatedDeleted = [...this.deletedChars];

            if (event.rePosition !== undefined && (this.currentEventIndex === 0 ||
                event.event === 'mouseDown' || event.event === 'mouseUp')) {
                cursor = Math.max(0, Math.min(event.rePosition, text.length));
            }

            if (event.event?.toLowerCase() === 'keydown') {
                ({text, cursor, updatedHighlights, updatedDeleted} =
                    this.processKeydownEvent(event, text, cursor, updatedHighlights, updatedDeleted));
            } else if (event.event === 'aiInsert') {
                ({text, cursor, updatedHighlights, updatedDeleted} =
                    this.processAiInsertEvent(event, text, cursor, updatedHighlights, updatedDeleted));
               }

            this.text = text;
            this.cursorPosition = cursor;
            this.highlightedChars = updatedHighlights.filter(h => !h.expiresAt || h.expiresAt > this.currentTime);
            this.deletedChars = updatedDeleted.filter(d => !d.expiresAt || d.expiresAt > this.currentTime);

            this.currentEventIndex++;
        }

        this.updateDisplayText(this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);
        if (this.totalDuration > 0) {
            const percentComplete = Math.min((this.currentTime / this.totalDuration) * 100, 100);
            this.setScrubberVal(percentComplete);
        }

        if (this.replayInProgress) {
            const baseIncrement = 100;
            const incrementTime = baseIncrement / this.speed;
            this.currentTime += baseIncrement;
            if (this.currentEventIndex >= this.totalEvents) {
                if (this.loop) {
                    this.startReplay(true);
                } else {
                    this.stopReplay();
                    this.updateDisplayText(this.text, this.cursorPosition, [], []);
                }
            } else {
                this.replayTimeout = setTimeout(() => this.replayLog(), incrementTime);
            }
        }
    }

    getLineAndColumn(text, pos) {
        const before = text.substring(0, pos);
        const lineIndex = before.split('\n').length - 1;
        const col = before.length - before.lastIndexOf('\n') - 1;
        return {lineIndex, col};
    }

    processAiInsertEvent(event, text, cursor, highlights, deletions) {
        if (this.aiEvents && this.currentAiIndex < this.aiEvents.length) {
            const aiContent = this.aiEvents[this.currentAiIndex];
            // Use event.rePosition which points to where the word to replace is
            const targetPosition = event.rePosition;

            ({text, cursor} = this.handleAiReplacement(aiContent, text, targetPosition, cursor, deletions));
            this.currentAiIndex++;
        }
        return {
            text,
            cursor,
            updatedHighlights: highlights,
            updatedDeleted: deletions
        };
    }

    handleAiReplacement(aiContent, text, targetPosition, currentCursor, deletions) {
        const insertText = aiContent || '';
        const aiWords = insertText.trim().split(/\s+/);
        const isMultiWord = aiWords.length > 1;
        const isNewLineInsertion = insertText.startsWith('\n') || insertText.endsWith('\n');

        const {wordStart, wordEnd} = this.findWordToReplace(
            text,
            targetPosition,
            currentCursor,
            aiWords,
            isMultiWord,
            isNewLineInsertion
        );

        const wordToReplace = text.substring(wordStart, wordEnd);

        // Mark replaced characters as deleted
        this.markCharsAsDeleted(wordToReplace, wordStart, deletions);

        // Perform the replacement
        const replacedLength = wordToReplace.length;
        text = text.substring(0, wordStart) + insertText + text.substring(wordEnd);
        const positionDiff = insertText.length - replacedLength;

        // Calculate new cursor position
        const newCursor = this.calculateNewCursorPosition(
            currentCursor,
            targetPosition,
            wordStart,
            wordEnd,
            insertText,
            isNewLineInsertion
        );

        // Update character tracking arrays
        this.updateCharacterIndices(wordStart, wordEnd, positionDiff, insertText);

        return {text, cursor: newCursor};
    }

    findWordToReplace(text, targetPosition, currentCursor, aiWords, isMultiWord, isNewLineInsertion) {
        if (isNewLineInsertion) {
            return {wordStart: currentCursor, wordEnd: currentCursor};
        }

        const {lineStart, lineEnd} = this.findLineRange(text, targetPosition);
        const lineText = text.substring(lineStart, lineEnd);
        const words = this.extractWordsFromLine(lineText, lineStart);

        if (words.length === 0) {
            return {wordStart: currentCursor, wordEnd: currentCursor};
        }

        if (isMultiWord) {
            return this.findMultiWordMatch(words, aiWords, targetPosition);
        } else {
            return this.findSingleWordMatch(words, aiWords[0], targetPosition);
        }
    }

    findLineRange(text, targetPosition) {
        let lineStart = 0;
        for (let i = targetPosition - 1; i >= 0; i--) {
            if (text[i] === '\n') {
                lineStart = i + 1;
                break;
            }
        }

        let lineEnd = text.length;
        for (let i = targetPosition; i < text.length; i++) {
            if (text[i] === '\n') {
                lineEnd = i;
                break;
            }
        }

        return {lineStart, lineEnd};
    }

    extractWordsFromLine(lineText, lineStart) {
        const words = [];
        let pos = 0;

        while (pos < lineText.length) {
            // Skip spaces
            while (pos < lineText.length && lineText[pos] === ' ') {
                pos++;
            }
            if (pos >= lineText.length) {
                break;
            }

            // Extract word
            const start = pos;
            while (pos < lineText.length && lineText[pos] !== ' ') {
                pos++;
            }

            if (pos > start) {
                words.push({
                    text: lineText.substring(start, pos),
                    start: lineStart + start,
                    end: lineStart + pos
                });
            }
        }

        return words;
    }

    findMultiWordMatch(words, aiWords, targetPosition) {
        let bestMatch = { start: -1, end: -1, score: -1, wordCount: 0, similarityScore: 0 };

        for (let i = 0; i < words.length; i++) {
            const matchResult = this.evaluateMultiWordSequence(words, aiWords, i, targetPosition);

            if (matchResult.totalScore > bestMatch.score ||
                (matchResult.totalScore === bestMatch.score &&
                 matchResult.similarityScore > bestMatch.similarityScore)) {
                bestMatch = matchResult;
            }
        }

        if (bestMatch.score > 10) {
            return {wordStart: bestMatch.start, wordEnd: bestMatch.end};
        } else {
            const closest = this.findClosestWord(words, targetPosition);
            return {wordStart: closest.start, wordEnd: closest.end};
        }
    }

    evaluateMultiWordSequence(words, aiWords, startIndex, targetPosition) {
        const seqWords = [];
        for (let j = 0; j < aiWords.length && startIndex + j < words.length; j++) {
            seqWords.push(words[startIndex + j]);
        }

        if (seqWords.length === 0) {
            return { start: -1, end: -1, score: -1, wordCount: 0, similarityScore: 0 };
        }

        const similarityScore = this.calculateSequenceSimilarity(aiWords, seqWords);
        const positionScore = this.calculatePositionScore(seqWords, targetPosition);
        const totalScore = similarityScore + positionScore + seqWords.length;

        return {
            start: seqWords[0].start,
            end: seqWords[seqWords.length - 1].end,
            score: totalScore,
            wordCount: seqWords.length,
            similarityScore: similarityScore
        };
    }

    calculateSequenceSimilarity(aiWords, seqWords) {
        let similarityScore = 0;
        const compareLength = Math.min(seqWords.length, aiWords.length);

        for (let k = 0; k < compareLength; k++) {
            const ai = aiWords[k].toLowerCase();
            const seq = seqWords[k].text.toLowerCase();

            if (ai === seq) {
                similarityScore += 10;
            } else {
                const similarity = this.calculateSimilarity(ai, seq);
                similarityScore += similarity * 10;
            }
        }

        return similarityScore;
    }

    calculatePositionScore(seqWords, targetPosition) {
        let positionScore = 0;
        const seqStart = seqWords[0].start;
        const seqEndPos = seqWords[seqWords.length - 1].end;

        if (targetPosition >= seqStart && targetPosition <= seqEndPos) {
            positionScore += 10;
            if (targetPosition >= seqWords[0].start && targetPosition <= seqWords[0].end) {
                positionScore += 5;
            }
        }

        return positionScore;
    }

    findSingleWordMatch(words, aiWord, targetPosition) {
        const aiWordLower = aiWord.toLowerCase();
        const bestSimilarityMatch = this.findBestSimilarityMatch(words, aiWordLower);

        if (bestSimilarityMatch.score > 0.5) {
            return {wordStart: bestSimilarityMatch.word.start, wordEnd: bestSimilarityMatch.word.end};
        }

        const bestPositionMatch = this.findBestPositionMatch(words, aiWordLower, targetPosition);

        if (bestPositionMatch.word) {
            return {wordStart: bestPositionMatch.word.start, wordEnd: bestPositionMatch.word.end};
        }

        // Fallback to position-based word boundary
        return this.findWordBoundaryAtPosition(words[0].start, words[words.length - 1].end,
                                                targetPosition, this.text);
    }

    findBestSimilarityMatch(words, aiWordLower) {
        let bestMatch = { word: null, score: 0 };

        for (const word of words) {
            let similarity = this.calculateSimilarity(aiWordLower, word.text.toLowerCase());
            const wordLower = word.text.toLowerCase();

            // Penalize short prefix matches
            if (wordLower.length < aiWordLower.length * 0.5 && aiWordLower.startsWith(wordLower)) {
                similarity = similarity * 0.3;
            }

            if (similarity > bestMatch.score) {
                bestMatch = { word, score: similarity };
            }
        }

        return bestMatch;
    }

    findBestPositionMatch(words, aiWordLower, targetPosition) {
        let bestMatch = { word: null, score: -1 };

        for (const word of words) {
            let score = this.calculateWordScore(word, aiWordLower, targetPosition);

            if (score > bestMatch.score) {
                bestMatch = { word, score };
            }
        }

        return bestMatch;
    }

    calculateWordScore(word, aiWordLower, targetPosition) {
        let score = 0;

        // Position score
        if (targetPosition >= word.start && targetPosition <= word.end) {
            score += 30;
        } else {
            const distance = Math.min(
                Math.abs(targetPosition - word.start),
                Math.abs(targetPosition - word.end)
            );
            score += Math.max(0, 20 - distance);
        }

        // Similarity score with penalty
        let similarity = this.calculateSimilarity(aiWordLower, word.text.toLowerCase());
        const wordLower = word.text.toLowerCase();
        if (wordLower.length < aiWordLower.length * 0.5 && aiWordLower.startsWith(wordLower)) {
            similarity = similarity * 0.3;
        }
        score += similarity * 10;

        return score;
    }

    findWordBoundaryAtPosition(lineStart, lineEnd, targetPosition, text) {
        let wordStart = targetPosition;
        while (wordStart > lineStart && text[wordStart - 1] !== ' ' && text[wordStart - 1] !== '\n') {
            wordStart--;
        }
        let wordEnd = targetPosition;
        while (wordEnd < lineEnd && text[wordEnd] !== ' ' && text[wordEnd] !== '\n') {
            wordEnd++;
        }
        return {wordStart, wordEnd};
    }

    markCharsAsDeleted(wordToReplace, wordStart, deletions) {
        if (wordToReplace.length > 0) {
            for (let i = 0; i < wordToReplace.length; i++) {
                deletions.push({
                    index: wordStart + i,
                    chars: wordToReplace[i],
                    time: this.currentTime,
                    expiresAt: this.currentTime + 2000
                });
            }
        }
    }

    calculateNewCursorPosition(currentCursor, targetPosition, wordStart, wordEnd, insertText, isNewLineInsertion) {
        if (isNewLineInsertion) {
            return wordStart + insertText.length;
        }

        if (targetPosition >= wordStart && targetPosition <= wordEnd) {
            return wordStart + insertText.length;
        }

        const positionDiff = insertText.length - (wordEnd - wordStart);

        if (currentCursor >= wordEnd) {
            return currentCursor + positionDiff;
        } else if (currentCursor > wordStart && currentCursor < wordEnd) {
            return wordStart + insertText.length;
        }

        return currentCursor;
    }

    updateCharacterIndices(wordStart, wordEnd, positionDiff, insertText) {
        // Update pasted character indices
        this.updatePastedCharIndices(wordStart, wordEnd, positionDiff);

        // Mark characters as AI-inserted
        this.markCharsAsAiInserted(wordStart, insertText);

        // Update AI character indices
        this.updateAiCharIndices(wordStart, wordEnd, positionDiff, insertText);
    }

    updatePastedCharIndices(wordStart, wordEnd, positionDiff) {
        if (this.pastedChars) {
            this.pastedChars = this.pastedChars.map(p => {
                if (p.index >= wordEnd) {
                    return { ...p, index: p.index + positionDiff };
                } else if (p.index >= wordStart && p.index < wordEnd) {
                    return null;
                }
                return p;
            }).filter(p => p !== null);
        }
    }

    markCharsAsAiInserted(wordStart, insertText) {
        if (!this.aiChars) {
            this.aiChars = [];
        }

        if (insertText.trim() !== '') {
            for (let i = 0; i < insertText.length; i++) {
                this.aiChars.push({
                    index: wordStart + i,
                    chars: insertText[i]
                });
            }
        }
    }

    updateAiCharIndices(wordStart, wordEnd, positionDiff, insertText) {
        const justAddedIndices = new Set();
        for (let i = 0; i < insertText.length; i++) {
            justAddedIndices.add(wordStart + i);
        }

        this.aiChars = this.aiChars.map(p => {
            if (!justAddedIndices.has(p.index)) {
                if (p.index >= wordEnd) {
                    return { ...p, index: p.index + positionDiff };
                } else if (p.index >= wordStart && p.index < wordEnd) {
                    return null;
                }
            }
            return p;
        }).filter(p => p !== null);
    }

    // Calculate similarity between two strings
    calculateSimilarity(str1, str2) {
        if (str1 === str2) {
            return 1;
        }
        if (str1.length === 0 || str2.length === 0) {
            return 0;
        }

        // Check if one string is a prefix of the other
        if (str1.startsWith(str2) || str2.startsWith(str1)) {
            return 0.8;
        }

        // Levenshtein distance
        const len1 = str1.length;
        const len2 = str2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));

        for (let i = 0; i <= len1; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= len2; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }

        const maxLen = Math.max(len1, len2);
        return 1 - (matrix[len2][len1] / maxLen);
    }

    // Find the word closest to a target position
    findClosestWord(words, targetPosition) {
        if (words.length === 0) {
            return { start: targetPosition, end: targetPosition };
        }

        let closest = words[0];
        let minDistance = Math.min(
            Math.abs(targetPosition - words[0].start),
            Math.abs(targetPosition - words[0].end)
        );

        for (const word of words) {
            if (targetPosition >= word.start && targetPosition <= word.end) {
                return word;
            }

            const distance = Math.min(
                Math.abs(targetPosition - word.start),
                Math.abs(targetPosition - word.end)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closest = word;
            }
        }

        return closest;
    }

    // Handle keydown events (e.g., typing, backspace, Ctrl+V)
    processKeydownEvent(event, text, cursor, highlights, deletions) {
        const key = event.key;
        const charToInsert = this.applyKey(key);

        // Handle copy operation (Ctrl+C)
        if (this.isCopyOperation(key)) {
            return { text, cursor, updatedHighlights: highlights, updatedDeleted: deletions };
        }

        // Handle undo operation (Ctrl+Z)
        if (this.isUndoOperation(key)) {
            return this.handleUndoOperation(event, text, cursor, highlights, deletions);
        }

        // Detect selection for current event
        const currentEventIndex = this.currentEventIndex;
        const selection = this.detectSelection(currentEventIndex);

        // Handle paste operation (Ctrl+V)
        if (this.isPasteOperation(key, event)) {
            return this.handlePasteOperation(event, selection, text, cursor, highlights, deletions);
        }

        // Update modifier key states
        this.updateModifierStates(key);

        // Handle selection deletion with Backspace/Delete
        if (this.isSelectionDeletion(key, selection)) {
            ({text, cursor} = this.handleSelectionDeletion(selection, text, cursor, deletions));
            return { text, cursor, updatedHighlights: highlights, updatedDeleted: deletions };
        }

        // Process various key operations
        return this.processKeyOperation(key, charToInsert, text, cursor, highlights, deletions, selection);
    }

    isCopyOperation(key) {
        return (key === 'c' || key === 'C') && (this.isControlKeyPressed || this.isMetaKeyPressed);
    }

    isUndoOperation(key) {
        return (key === 'z' || key === 'Z') && (this.isControlKeyPressed || this.isMetaKeyPressed);
    }

    handleUndoOperation(event, text, cursor, highlights, deletions) {
        const nextEventIndex = this.currentEventIndex + 1;
        if (nextEventIndex < this.logData.length) {
            const nextEvent = this.logData[nextEventIndex];

            if (nextEvent.event === 'keyUp' && (nextEvent.key === 'z' || nextEvent.key === 'Z')) {
                const newPosition = nextEvent.rePosition;
                if (newPosition < cursor && text.length > 0) {
                    const textBeforeUndo = text;
                    text = text.substring(0, newPosition) + text.substring(cursor);
                    cursor = newPosition;

                    // Mark as deleted for visual effect
                    for (let i = 0; i < textBeforeUndo.length && i < cursor; i++) {
                        deletions.push({
                            index: newPosition,
                            chars: textBeforeUndo[i],
                            time: this.currentTime,
                            expiresAt: this.currentTime + 2000
                        });
                    }
                }
            }
        }

        this.isControlKeyPressed = false;
        this.isMetaKeyPressed = false;

        return { text, cursor, updatedHighlights: highlights, updatedDeleted: deletions };
    }

    isPasteOperation(key, event) {
        if ((key === 'v' || key === 'V') && (this.isControlKeyPressed || this.isMetaKeyPressed)) {
            return (event.pastedContent && event.pastedContent.trim() !== '') ||
                   (this.pastedEvents && this.currentPasteIndex < this.pastedEvents.length);
        }
        return false;
    }

    handlePasteOperation(event, selection, text, cursor, highlights, deletions) {
        const pastedContent = event.pastedContent || this.pastedEvents[this.currentPasteIndex];

        if (selection) {
            ({text, cursor} = this.handleSelectionDeletion(selection, text, cursor, deletions));
        }

        ({text, cursor} = this.handlePasteInsert(pastedContent, text, cursor));
        this.currentPasteIndex++;
        this.resetModifierStates();
        this.isPasteEvent = false;

        return { text, cursor, updatedHighlights: highlights, updatedDeleted: deletions };
    }

    resetModifierStates() {
        this.isControlKeyPressed = false;
        this.isShiftKeyPressed = false;
        this.isMetaKeyPressed = false;
    }

    isSelectionDeletion(key, selection) {
        return (key === 'Backspace' || key === 'Delete') && selection && selection.length > 1;
    }

    processKeyOperation(key, charToInsert, text, cursor, highlights, deletions, selection) {
        if (this.isCtrlBackspace(key, cursor)) {
            ({text, cursor} = this.handleCtrlBackspace(text, cursor, deletions));
        } else if (this.isCtrlDelete(key, cursor, text)) {
            ({text} = this.handleCtrlDelete(text, cursor, deletions));
        } else if (this.isCtrlArrowMove(key)) {
            cursor = this.handleCtrlArrowMove(key, text, cursor);
        } else if (this.isRegularBackspace(key, cursor)) {
            ({text, cursor} = this.handleBackspace(text, cursor, deletions));
        } else if (this.isRegularDelete(key, cursor, text)) {
            ({text} = this.handleDelete(text, cursor, deletions));
        } else if (this.isArrowUp(key)) {
            cursor = this.handleArrowUp(text, cursor);
        } else if (this.isArrowDown(key)) {
            cursor = this.handleArrowDown(text, cursor);
        } else if (this.isRegularArrowMove(key)) {
            cursor = this.handleArrowMove(key, text, cursor);
        } else if (charToInsert && charToInsert.length > 0) {
            if (selection && selection.length > 0) {
                ({text, cursor} = this.handleSelectionDeletion(selection, text, cursor, deletions));
            }
            ({text, cursor} = this.handleCharacterInsert(charToInsert, text, cursor, highlights));
        }

        return { text, cursor, updatedHighlights: highlights, updatedDeleted: deletions };
    }

    detectSelection(eventIndex) {
        const currentEvent = this.logData[eventIndex];

        if (currentEvent.event?.toLowerCase() === 'keydown' &&
            (currentEvent.key === 'Backspace' || currentEvent.key === 'Delete')) {

            const currentPos = currentEvent.rePosition;

            for (let i = eventIndex + 1; i < this.logData.length; i++) {
                const nextEvent = this.logData[i];

                if (nextEvent.event?.toLowerCase() === 'keyup' &&
                    nextEvent.key === currentEvent.key) {

                    const nextPos = nextEvent.rePosition;

                    // Calculate the difference in positions
                    const positionDiff = Math.abs(currentPos - nextPos);

                    if (positionDiff > 1) {
                        return {
                            start: Math.min(currentPos, nextPos),
                            end: Math.max(currentPos, nextPos),
                            length: positionDiff
                        };
                    } else if (positionDiff === 1) {
                        if (currentEvent.key === 'Backspace') {
                            return {
                                start: nextPos,
                                end: currentPos,
                                length: 1
                            };
                        } else {
                            return {
                                start: currentPos,
                                end: nextPos,
                                length: 1
                            };
                        }
                    }
                    break;
                }
            }
        }
        return null;
    }

    handleSelectionDeletion(selection, text, cursor, deletions) {
        const {start, end, length} = selection;

        // Add each character in the selection to the deletions array
        for (let i = start; i < end && i < text.length; i++) {
            deletions.push({
                index: start,
                chars: text[i],
                time: this.currentTime,
                expiresAt: this.currentTime + 2000
            });
        }

        text = text.substring(0, start) + text.substring(end);

        this.shiftPastedCharsIndices(start, length);

        cursor = start;

        return {text, cursor};
    }

    // Handle Paste events to highlight pasted text
    handlePasteInsert(pastedContent, text, cursor) {
        const insertText = pastedContent || '';
        text = text.substring(0, cursor) + insertText + text.substring(cursor);

        // Mark characters as pasted for bold styling
        if (insertText.trim() !== '') {
            for (let i = 0; i < insertText.length; i++) {
                if (!this.pastedChars) {
                    this.pastedChars = [];
                }
                this.pastedChars.push({
                    index: cursor + i,
                    chars: insertText[i]
                });
            }
        }

        return {text, cursor: cursor + insertText.length};
    }

    // Adjusts pasted chars indices after deletion to maintain styling for pasted text
    shiftPastedCharsIndices(startIndex, numDeleted) {
        this.pastedChars = this.pastedChars.map(p => {
            if (p.index >= startIndex + numDeleted) {
                return {...p, index: p.index - numDeleted};
            } else if (p.index >= startIndex && p.index < startIndex + numDeleted) {
                // Remove pasted characters that were deleted
                return null;
            }
            return p;
        }).filter(p => p !== null);

        if (this.aiChars) {
            this.aiChars = this.aiChars.map(p => {
                if (p.index >= startIndex + numDeleted) {
                    return {...p, index: p.index - numDeleted};
                } else if (p.index >= startIndex && p.index < startIndex + numDeleted) {
                    return null;
                }
                return p;
            }).filter(p => p !== null);
        }
    }

    // Update state for modifier keys (Control, paste events)
    updateModifierStates(key) {
        if (key === 'Control') {
            this.isControlKeyPressed = true;
        } else if (key === 'Shift') {
            this.isShiftKeyPressed = true;
        } else if (key === 'Meta') {
            this.isMetaKeyPressed = true;
        } else if ((key === 'v' || key === 'V') && (this.isControlKeyPressed || this.isMetaKeyPressed)) {
            this.isPasteEvent = true;
        } else if (!['Control', 'Meta', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            this.isControlKeyPressed = false;
            this.isShiftKeyPressed = false;
            this.isMetaKeyPressed = false;
            this.isPasteEvent = false;
        }
    }

    isCtrlBackspace(key, cursor) {
        return key === 'Backspace' && this.isControlKeyPressed && cursor > 0;
    }

    isCtrlDelete(key, cursor, text) {
        return key === 'Delete' && this.isControlKeyPressed && cursor < text.length;
    }

    isCtrlArrowMove(key) {
        return this.isControlKeyPressed && (key === 'ArrowLeft' || key === 'ArrowRight');
    }

    isRegularBackspace(key, cursor) {
        return key === 'Backspace' && !this.isPasteEvent && cursor > 0;
    }

    isRegularDelete(key, cursor, text) {
        return key === 'Delete' && !this.isControlKeyPressed && cursor < text.length;
    }

    isRegularArrowMove(key) {
        return !this.isControlKeyPressed && (key === 'ArrowLeft' || key === 'ArrowRight');
    }

    isArrowUp(key) {
        return key === 'ArrowUp';
    }

    isArrowDown(key) {
        return key === 'ArrowDown';
    }

    handleCtrlArrowMove(key, text, cursor) {
        return key === 'ArrowLeft'
            ? this.findPreviousWordBoundary(text, cursor)
            : this.findNextWordBoundary(text, cursor);
    }

    handleBackspace(text, cursor, deletions) {
        deletions.push({
            index: cursor - 1,
            chars: text[cursor - 1],
            time: this.currentTime,
            expiresAt: this.currentTime + 2000
        });
        this.shiftPastedCharsIndices(cursor - 1, 1);
        return {
            text: text.substring(0, cursor - 1) + text.substring(cursor),
            cursor: cursor - 1
        };
    }

    handleDelete(text, cursor, deletions) {
        deletions.push({
            index: cursor,
            chars: text[cursor],
            time: this.currentTime,
            expiresAt: this.currentTime + 2000
        });
        this.shiftPastedCharsIndices(cursor, 1);
        return {
            text: text.substring(0, cursor) + text.substring(cursor + 1),
            cursor
        };
    }

    handleArrowMove(key, text, cursor) {
        return key === 'ArrowLeft'
            ? Math.max(0, cursor - 1)
            : Math.min(text.length, cursor + 1);
    }

    handleCharacterInsert(charToInsert, text, cursor, highlights) {
        text = text.substring(0, cursor) + charToInsert + text.substring(cursor);
        // Shift pasted chars indices after the insertion point
        if (this.pastedChars) {
            this.pastedChars = this.pastedChars.map(p => {
                return p.index >= cursor ? {...p, index: p.index + 1} : p;
            });
        }
        if (this.aiChars) {
            this.aiChars = this.aiChars.map(p => {
                return p.index >= cursor ? {...p, index: p.index + 1} : p;
            });
        }
        if (charToInsert.trim() !== '') {
            highlights.push({
                index: cursor,
                chars: charToInsert,
                time: this.currentTime,
                expiresAt: this.currentTime + 1500
            });
        }
        return {text, cursor: cursor + 1};
    }

    handleCtrlDelete(text, cursor, deletions) {
        const wordEnd = this.findNextWordBoundary(text, cursor);
        const wordToDelete = text.substring(cursor, wordEnd);
        for (let i = 0; i < wordToDelete.length; i++) {
            deletions.push({
                index: cursor + i,
                chars: wordToDelete[i],
                time: this.currentTime,
                expiresAt: this.currentTime + 2000
            });
        }
        this.shiftPastedCharsIndices(cursor, wordToDelete.length);
        return {
            text: text.substring(0, cursor) + text.substring(wordEnd),
            cursor
        };
    }

    handleArrowUp(text, cursor) {
        const lines = text.split('\n');
        const {lineIndex, col} = this.getLineAndColumn(text, cursor);
        if (lineIndex > 0) {
            const prevLine = lines[lineIndex - 1];
            cursor = lines.slice(0, lineIndex - 1).join('\n').length + 1 + Math.min(col, prevLine.length);
        } else {
            cursor = 0;
        }
        return cursor;
    }

    handleArrowDown(text, cursor) {
        const lines = text.split('\n');
        const {lineIndex, col} = this.getLineAndColumn(text, cursor);
        if (lineIndex < lines.length - 1) {
            const nextLine = lines[lineIndex + 1];
            cursor = lines.slice(0, lineIndex + 1).join('\n').length + 1 + Math.min(col, nextLine.length);
        } else {
            cursor = text.length;
        }
        return cursor;
    }

    handleCtrlBackspace(text, cursor, deletions) {
        let wordStart = cursor;
        while (wordStart > 0 && text[wordStart - 1] === ' ') {
            wordStart--;
        }
        while (wordStart > 0 && text[wordStart - 1] !== ' ') {
            wordStart--;
        }
        const wordToDelete = text.substring(wordStart, cursor);
        for (let i = 0; i < wordToDelete.length; i++) {
            deletions.push({
                index: wordStart + i,
                chars: wordToDelete[i],
                time: this.currentTime,
                expiresAt: this.currentTime + 2000
            });
        }
        this.shiftPastedCharsIndices(wordStart, wordToDelete.length);
        return {text: text.substring(0, wordStart) + text.substring(cursor), cursor: wordStart};
    }

    // Finds the index of the next word boundary after the cursor position
    findNextWordBoundary(text, cursor) {
        if (!text || cursor >= text.length) {
            return cursor;
        }
        if (text[cursor] === ' ') {
            while (cursor < text.length && text[cursor] === ' ') {
                 cursor++;
            }
        }
        if (cursor >= text.length) {
            let lastNonSpace = text.length - 1;
            while (lastNonSpace >= 0 && text[lastNonSpace] === ' ') {
                 lastNonSpace--;
            }
            return lastNonSpace + 1;
        }
        let wordEnd = cursor;
        while (wordEnd < text.length && text[wordEnd] !== ' ') {
             wordEnd++;
         }
        return wordEnd;
    }

    // Finds the index of the previous word boundary before the cursor position
    findPreviousWordBoundary(text, cursor) {
        if (cursor <= 0) {
            return 0;
        }
        let pos = cursor - 1;
        while (pos > 0 && (text[pos] === ' ' || text[pos] === '\n')) {
             pos--;
        }
        while (pos > 0 && text[pos - 1] !== ' ' && text[pos - 1] !== '\n') {
             pos--;
        }

        return pos;
    }

    skipToEnd() {
        if (this.replayInProgress) {
            this.replayInProgress = false;
        }
        let textOutput = "";
        this.logData.forEach(event => {
            if (event.event.toLowerCase() === 'keydown') {
                textOutput = this.applyKey(event.key, textOutput);
            }
        });
        this.outputElement.innerHTML = textOutput.slice(0, -1);
        this.setScrubberVal(100);
    }

    // Used by the scrubber to skip to a certain percentage of data
    skipToTime(percentage) {
        const wasPlaying = this.replayInProgress;
        this.stopReplay();

        const targetTime = (this.totalDuration * percentage) / 100;
        this.currentTime = targetTime;
        this.currentEventIndex = 0;
        this.text = '';
        this.cursorPosition = 0;
        this.highlightedChars = [];
        this.deletedChars = [];
        this.isControlKeyPressed = false;
        this.isMetaKeyPressed = false;
        this.isPasteEvent = false;
        this.pastedChars = [];
        this.currentPasteIndex = 0;
        this.currentAiIndex = 0;
        this.aiChars = [];
        let text = '';
        let cursor = 0;
        let highlights = [];
        let deletions = [];
        let pasteIndex = 0;
        let aiIndex = 0;

        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.normalizedTime && event.normalizedTime > targetTime) {
                this.currentEventIndex = i;
                break;
            }
            if (event.rePosition !== undefined && (this.currentEventIndex === 0 ||
                event.event === 'mouseDown' || event.event === 'mouseUp')) {
                cursor = Math.max(0, Math.min(event.rePosition, text.length));
            }
            if (event.event?.toLowerCase() === 'keydown') {
                this.currentPasteIndex = pasteIndex;
                if ((event.key === 'v' || event.key === 'V') && (this.isControlKeyPressed || this.isMetaKeyPressed)) {
                    pasteIndex++;
                }
                ({text, cursor, updatedHighlights: highlights, updatedDeleted: deletions} =
                    this.processKeydownEvent(event, text, cursor, highlights, deletions));
            } else if (event.event === 'aiInsert') {
                this.currentAiIndex = aiIndex;
                ({text, cursor, updatedHighlights: highlights, updatedDeleted: deletions} =
                    this.processAiInsertEvent(event, text, cursor, highlights, deletions));
                aiIndex++;
            }
            this.currentEventIndex = i + 1;
        }

        this.currentPasteIndex = pasteIndex;
        this.currentAiIndex = aiIndex;
        this.text = text;
        this.cursorPosition = cursor;
        this.highlightedChars = highlights.filter(h => !h.expiresAt || h.expiresAt > targetTime);
        this.deletedChars = deletions.filter(d => !d.expiresAt || d.expiresAt > targetTime);
        this.updateDisplayText(this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);
        this.setScrubberVal(percentage);

        if (wasPlaying) {
            this.replayInProgress = true;
            this.replayLog();
        }
    }

    // Update display with text, cursor, highlights and deletions.
    // eslint-disable-next-line complexity
    updateDisplayText(text, cursorPosition, highlights, deletions) {
        let html = '';
        const highlightMap = {};
        const deletionMap = {};
        const pastedMap = {};
        const aiMap = {};
        const currentTime = this.currentTime;

        highlights.forEach(h => {
            let opacity = 1;
            if (h.expiresAt && h.expiresAt - currentTime < 500) {
                opacity = Math.max(0, (h.expiresAt - currentTime) / 500);
            }
            highlightMap[h.index] = {chars: h.chars, opacity};
        });

        deletions.forEach(d => {
            let opacity = 0.5;
            if (d.expiresAt && d.expiresAt - currentTime < 500) {
                opacity = Math.max(0, ((d.expiresAt - currentTime) / 500) * 0.5);
            }
            deletionMap[d.index] = {chars: d.chars, opacity};
        });

        // Process pasted characters for bold styling
        if (this.pastedChars) {
            this.pastedChars.forEach(p => {
                if (p.index < text.length) {
                    pastedMap[p.index] = true;
                }
            });
        }

        // Process AI characters for styling
        if (this.aiChars) {
            this.aiChars.forEach(p => {
                if (p.index < text.length) {
                    aiMap[p.index] = true;
                }
            });
        }

        // Find if we have out-of-bounds deletions (from Control+Backspace)
        const outOfRangeDeletions = deletions.filter(d => d.index >= text.length);
        const textLines = text.split('\n');
        let currentPosition = 0;

        for (let lineIndex = 0; lineIndex < textLines.length; lineIndex++) {
            const line = textLines[lineIndex];
            for (let i = 0; i < line.length; i++) {
                if (currentPosition === cursorPosition) {
                    html += '<span class="tiny_cursive-cursor"></span>';
                }
                const char = line[i];
                if (deletionMap[currentPosition]) {
                    html += `<span class="tiny_cursive-deleted-char" style="opacity:
                        ${deletionMap[currentPosition].opacity};">${deletionMap[currentPosition].chars}</span>`;
                }
                const isPasted = pastedMap[currentPosition];
                const isAi = aiMap[currentPosition];
                const isHighlighted = highlightMap[currentPosition] && char !== ' ';

                if (isPasted && isHighlighted) {
                    html += `<span class="tiny_cursive-pasted-char tiny_cursive-highlighted-char" style="opacity:
                        ${highlightMap[currentPosition].opacity};">${char}</span>`;
                } else if (isAi && isHighlighted) {
                    html += `<span class="tiny_cursive-ai-char tiny_cursive-highlighted-char" style="opacity:
                        ${highlightMap[currentPosition].opacity};">${char}</span>`;
                } else if (isPasted) {
                    html += `<span class="tiny_cursive-pasted-char">${char === ' ' ? ' ' : this.escapeHtml(char)}</span>`;
                } else if (isAi) {
                    html += `<span class="tiny_cursive-ai-char">${char === ' ' ? ' ' : this.escapeHtml(char)}</span>`;
                } else if (isHighlighted) {
                    html += `<span class="tiny_cursive-highlighted-char" style="opacity:
                        ${highlightMap[currentPosition].opacity};">${char}</span>`;
                } else {
                    html += char === ' ' ? ' ' : this.escapeHtml(char);
                }
                currentPosition++;
            }
            if (currentPosition === cursorPosition) {
                html += '<span class="tiny_cursive-cursor"></span>';
            }
            if (lineIndex < textLines.length - 1) {
                html += '<br>';
                currentPosition++;
            }
        }

        if (cursorPosition === text.length && !html.endsWith('<span class="tiny_cursive-cursor"></span>')) {
            html += '<span class="tiny_cursive-cursor"></span>';
        }

        if (outOfRangeDeletions.length > 0) {
            outOfRangeDeletions.sort((a, b) => a.index - b.index);
            const cursorHTML = '<span class="tiny_cursive-cursor"></span>';
            const cursorPos = html.lastIndexOf(cursorHTML);
            if (cursorPos !== -1) {
                let deletedWordHTML = '<span class="tiny_cursive-deleted-char" style="opacity: 0.5;">';
                outOfRangeDeletions.forEach(d => {
                    deletedWordHTML += d.chars;
                });
                deletedWordHTML += '</span>';
                html = html.substring(0, cursorPos) + deletedWordHTML + html.substring(cursorPos);
            }
        }

        const wasScrolledToBottom = this.outputElement.scrollHeight -
            this.outputElement.clientHeight <= this.outputElement.scrollTop + 1;
        this.outputElement.innerHTML = html;

        if (wasScrolledToBottom || this.isCursorBelowViewport()) {
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
    }

    // Check if cursor is below visible viewport
    isCursorBelowViewport() {
        const cursorElement = this.outputElement.querySelector('.tiny_cursive-cursor:last-of-type');
        if (!cursorElement) {
            return false;
        }

        const cursorRect = cursorElement.getBoundingClientRect();
        const outputRect = this.outputElement.getBoundingClientRect();

        return cursorRect.bottom > outputRect.bottom;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Used in various places to add a keydown, backspace, etc. to the output
    applyKey(key) {
        switch (key) {
            case 'Enter':
                return '\n';
            case 'Backspace':
            case 'Delete':
            case 'ControlBackspace':
                return '';
            case ' ':
                 return ' ';
            default:
                return !['Shift', 'Ctrl', 'Alt', 'ArrowDown', 'ArrowUp', 'Control', 'ArrowRight',
                    'ArrowLeft', 'Meta', 'CapsLock', 'Tab', 'Escape', 'Delete', 'PageUp', 'PageDown',
                    'Insert', 'Home', 'End', 'NumLock', 'AudioVolumeUp', 'AudioVolumeDown',
                    'MediaPlayPause', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10',
                    'F11', 'F12', 'PrintScreen', 'UnIdentified'].includes(key) ? key : '';
        }
    }
}
