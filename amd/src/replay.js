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
    controllerId = '';

    constructor(elementId, filePath, speed = 1, loop = false, controllerId) {
        this.controllerId = controllerId;
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

        const element = document.getElementById(elementId);
        if (element) {
            this.outputElement = element;
        } else {
            throw new Error(`Element with id '${elementId}' not found`);
        }

        this.loadJSON(filePath)
            .then((data) => {
                if (data.status) {
                    var val = JSON.parse(data.data);
                    this.logData = val;
                    if (data.comments) {
                        var comments = JSON.parse(data.comments);
                        this.usercomments = Array.isArray(comments) ? [...comments] : [];
                    }

                    if ("data" in this.logData) {
                        this.logData = this.logData.data;
                    }
                    if ("payload" in this.logData) {
                        this.logData = this.logData.payload;
                    }

                    if (this.logData.length > 0 && this.logData[0].unixTimestamp) {
                        const startTime = this.logData[0].unixTimestamp;
                        this.logData = this.logData.map(event => ({
                            ...event,
                            normalizedTime: event.unixTimestamp - startTime
                        }));
                        this.totalDuration = this.logData[this.logData.length - 1].normalizedTime;
                    }

                    this.totalEvents = this.logData.length;
                    this.identifyPasteEvents();
                    if (controllerId && this.logData) {
                        this.constructController(controllerId);
                    }
                    this.startReplay();
                } else {
                    try {
                        // eslint-disable-next-line
                        Promise.all([
                            templates.render('tiny_cursive/no_submission'),
                            Str.get_string('warningpayload', 'tiny_cursive')
                        ])
                            .then(function(results) {
                                var html = results[0];
                                var str = results[1];
                                var newElement = $(html);
                                newElement.text(str);
                                $('.tiny_cursive').html(newElement);
                                return true;
                            })
                            .catch(function(error) {
                                window.console.error(error);
                            });
                    } catch (error) {
                        window.console.error(error);
                    }
                }
                return data;
            })
            .catch(error => {
                try {
                    // eslint-disable-next-line
                    Promise.all([
                        templates.render('tiny_cursive/no_submission'),
                        Str.get_string('warningpayload', 'tiny_cursive')
                    ])
                        .then(function(results) {
                            var html = results[0];
                            var str = results[1];
                            var newElement = $(html);
                            newElement.text(str);
                            return $('.tiny_cursive').html(newElement);
                        })
                        .catch(function(error) {
                            window.console.error(error);
                        });
                } catch (error) {
                    window.console.error(error);
                }
                window.console.error('Error loading JSON file: ' + error.message);
            });
    }

    stopReplay() {
        if (this.replayInProgress) {
            clearTimeout(this.replayTimeout);
            this.replayInProgress = false;
            var playSvg = document.createElement('img');
            playSvg.src = M.util.image_url('playicon', 'tiny_cursive');

            if (this.playButton) {
                this.playButton.querySelector('.play-icon').innerHTML = playSvg.outerHTML;
            }
        }
    }

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
            window.console.error("Container not found with ID:", controllerId);
            return;
        }

        const controlContainer = container.querySelector('.tiny_cursive_replay_control');
        if (!controlContainer) {
            window.console.error("Replay control container not found in:", controllerId);
            return;
        }
        controlContainer.innerHTML = '<span class="tiny_cursive_loading_spinner"></span>';

        const topRow = document.createElement('div');
        topRow.classList.add('tiny_cursive_top_row');

        // Play button
        this.playButton = document.createElement('button');
        this.playButton.classList.add('tiny_cursive_play_button');
        const playSvg = document.createElement('i');
        playSvg.className = '';
        this.playButton.innerHTML = `<span class="play-icon">${playSvg.outerHTML}</span>`;

        this.playButton.addEventListener('click', () => {
            if (this.replayInProgress) {
                this.stopReplay();
                const playImg = document.createElement('img');
                playImg.src = M.util.image_url('playicon', 'tiny_cursive');
                this.playButton.querySelector('.play-icon').innerHTML = playImg.outerHTML;
            } else {
                this.startReplay(false);
            }
            $('.tiny_cursive-nav-tab').find('.active').removeClass('active');
            $('a[id^="rep"]').addClass('active');
        });
        topRow.appendChild(this.playButton);

        // Scrubber
        const scrubberContainer = document.createElement('div');
        scrubberContainer.classList.add('tiny_cursive_scrubber_container');

        this.scrubberElement = document.createElement('input');
        this.scrubberElement.classList.add('tiny_cursive_timeline_scrubber', 'timeline-scrubber');
        this.scrubberElement.type = 'range';
        this.scrubberElement.max = '100';
        this.scrubberElement.min = '0';
        this.scrubberElement.value = '0';

        this.scrubberElement.addEventListener('input', () => {
            const scrubberValue = parseInt(this.scrubberElement.value, 10);
            this.skipToTime(scrubberValue);
        });

        scrubberContainer.appendChild(this.scrubberElement);
        topRow.appendChild(scrubberContainer);

        // Time display
        this.timeDisplay = document.createElement('div');
        this.timeDisplay.classList.add('tiny_cursive_time_display');
        this.timeDisplay.textContent = '00:00 / 00:00';
        topRow.appendChild(this.timeDisplay);

        const bottomRow = document.createElement('div');
        bottomRow.classList.add('tiny_cursive_bottom_row');

        // Speed controls
        const speedContainer = document.createElement('div');
        speedContainer.classList.add('tiny_cursive_speed_controls', 'speed-controls');

        const speedLabel = document.createElement('span');
        speedLabel.classList.add('tiny_cursive_speed_label');
        speedLabel.textContent = 'Speed: ';
        speedContainer.appendChild(speedLabel);

        const speedGroup = document.createElement('div');
        speedGroup.classList.add('tiny_cursive_speed_group');

        [1, 1.5, 2, 5, 10].forEach(speedValue => {
            const speedBtn = document.createElement('button');
            speedBtn.textContent = `${speedValue}x`;
            speedBtn.classList.add('tiny_cursive_speed_btn', 'speed-btn');
            if (parseFloat(speedValue) === parseFloat(this.speed)) {
                speedBtn.classList.add('active');
            }
            speedBtn.dataset.speed = speedValue;

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
        bottomRow.appendChild(speedContainer);

        const existingPanel = container.querySelector('.paste-events-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // Paste Events Toggle
        const pasteEventsToggle = document.createElement('div');
        pasteEventsToggle.classList.add('tiny_cursive_paste_events_toggle', 'paste-events-toggle');

        const pasteEventsIcon = document.createElement('span');
        const pasteIcon = document.createElement('img');
        pasteIcon.src = M.util.image_url('pasteicon', 'tiny_cursive');
        pasteEventsIcon.innerHTML = pasteIcon.outerHTML;
        pasteEventsIcon.classList.add('tiny_cursive_paste_events_icon');

        const pasteEventsText = document.createElement('span');
        pasteEventsText.textContent = 'Paste Events';

        const pasteEventCount = document.createElement('span');
        pasteEventCount.textContent = `(${this.usercomments.length})`;
        pasteEventCount.className = 'paste-event-count';
        pasteEventCount.style.marginLeft = '2px';

        const chevronIcon = document.createElement('span');
        const chevron = document.createElement('i');
        chevron.className = 'fa fa-chevron-down';
        chevronIcon.innerHTML = chevron.outerHTML;
        chevronIcon.style.marginLeft = '5px';
        chevronIcon.style.transition = 'transform 0.3s ease';

        pasteEventsToggle.appendChild(pasteEventsIcon);
        pasteEventsToggle.appendChild(pasteEventsText);
        pasteEventsToggle.appendChild(pasteEventCount);
        pasteEventsToggle.appendChild(chevronIcon);

        // Create Paste Events Panel
        const pasteEventsPanel = document.createElement('div');
        pasteEventsPanel.classList.add('tiny_cursive_paste_events_panel', 'paste-events-panel');
        pasteEventsPanel.style.display = 'none';

        this.populatePasteEventsPanel(pasteEventsPanel);

        pasteEventsToggle.addEventListener('click', () => {
            const isHidden = pasteEventsPanel.style.display === 'none';
            pasteEventsPanel.style.display = isHidden ? 'block' : 'none';
            chevronIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0)';
        });

        bottomRow.appendChild(pasteEventsToggle);

        this.pasteEventsPanel = pasteEventsPanel;
        this.pasteEventCount = pasteEventCount;

        controlContainer.appendChild(topRow);
        controlContainer.appendChild(bottomRow);
        container.appendChild(pasteEventsPanel);

        controlContainer.querySelector('.tiny_cursive_loading_spinner')?.remove();
    }

    identifyPasteEvents() {
        this.pasteTimestamps = [];
        let controlPressed = false;
        let pasteCount = 0;

        // Check for finding Control+V combinations
        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.event && event.event.toLowerCase() === "keydown") {
                if (event.key === "Control") {
                    controlPressed = true;
                } else if (event.key === "v" && controlPressed) {
                    const timestamp = event.normalizedTime || 0;

                    let userComment = "";
                    if (this.usercomments && this.usercomments[pasteCount]) {
                        userComment = this.usercomments[pasteCount];
                    }

                    this.pasteTimestamps.push({
                        index: pasteCount,
                        time: timestamp,
                        formattedTime: this.formatTime(timestamp),
                        pastedText: userComment,
                        timestamp: timestamp
                    });
                    pasteCount++;

                    controlPressed = false;
                } else {
                    controlPressed = false;
                }
            }
        }

        if (this.usercomments.length > 0 && this.pasteTimestamps.length === 0) {
            for (let i = 0; i < this.usercomments.length; i++) {
                this.pasteTimestamps.push({
                    index: i,
                    time: 0,
                    formattedTime: this.formatTime(0),
                    pastedText: this.usercomments[i],
                    timestamp: 0
                });
            }
        }

        while (this.pasteTimestamps.length < this.usercomments.length) {
            const lastIndex = this.pasteTimestamps.length;
            this.pasteTimestamps.push({
                index: lastIndex,
                time: 0,
                formattedTime: this.formatTime(0),
                pastedText: this.usercomments[lastIndex],
                timestamp: 0
            });
        }

        if (this.pasteEventsPanel) {
            this.populatePasteEventsPanel(this.pasteEventsPanel);
        }
    }

    populatePasteEventsPanel(panel) {
        panel.innerHTML = '';

        while (panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }
        panel.classList.add('tiny_cursive_event_panel');

        const pasteEvents = this.pasteTimestamps && this.pasteTimestamps.length ?
            this.pasteTimestamps : [];

        if (!pasteEvents || pasteEvents.length === 0) {
            const noEventsMessage = document.createElement('div');
            noEventsMessage.className = 'no-paste-events-message p-3';
            noEventsMessage.textContent = 'No paste events detected for this submission.';
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
        navButtons.classList.add('tiny_cursive_nav_buttons', 'tiny_cursive_nav_buttons');

        const prevButton = document.createElement('button');
        prevButton.classList.add('paste-event-prev-btn', 'tiny_cursive_nav_button');
        const leftChevron = document.createElement('i');
        leftChevron.className = 'fa fa-chevron-left';
        prevButton.innerHTML = leftChevron.outerHTML;

        const nextButton = document.createElement('button');
        nextButton.className = 'paste-event-next-btn tiny_cursive_nav_button';
        const rightChevron = document.createElement('i');
        rightChevron.className = 'fa fa-chevron-right';
        nextButton.innerHTML = rightChevron.outerHTML;
        nextButton.disabled = pasteEvents.length <= 1;

        navButtons.appendChild(prevButton);
        navButtons.appendChild(nextButton);

        navigationRow.appendChild(counterDisplay);
        navigationRow.appendChild(navButtons);

        const contentContainer = document.createElement('div');
        contentContainer.className = 'paste-events-content tiny_cursive_content_container';

        // Create initial content with first paste event
        const createPasteEventDisplay = (pasteEvent) => {
            const eventRow = document.createElement('div');
            eventRow.className = 'tiny_cursive_event_row';

            // Header row with timestamp and play button
            const headerRow = document.createElement('div');
            headerRow.className = 'tiny_cursive_header_row';

            // Timestamp and text container
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

            playButton.addEventListener('click', () => {
                this.jumpToTimestamp(pasteEvent.timestamp);
            });

            headerRow.appendChild(textContainer);
            headerRow.appendChild(playButton);

            eventRow.appendChild(headerRow);

            return eventRow;
        };

        contentContainer.appendChild(createPasteEventDisplay(pasteEvents[0]));

        carouselContainer.appendChild(navigationRow);
        carouselContainer.appendChild(contentContainer);

        panel.appendChild(carouselContainer);

        let currentIndex = 0;

        prevButton.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updatePasteEventDisplay();
            }
        });

        nextButton.addEventListener('click', () => {
            if (currentIndex < pasteEvents.length - 1) {
                currentIndex++;
                updatePasteEventDisplay();
            }
        });

        const updatePasteEventDisplay = () => {
            contentContainer.innerHTML = '';
            contentContainer.appendChild(createPasteEventDisplay(pasteEvents[currentIndex]));

            counterDisplay.textContent = 'Paste Events';

            prevButton.disabled = currentIndex === 0;
            prevButton.style.opacity = currentIndex === 0 ? '0.5' : '1';
            nextButton.disabled = currentIndex === pasteEvents.length - 1;
            nextButton.style.opacity = currentIndex === pasteEvents.length - 1 ? '0.5' : '1';
        };
    }

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
                const currentTimeFormatted = this.formatTime(displayTime);
                const totalTimeFormatted = this.formatTime(this.totalDuration);
                this.timeDisplay.textContent = `${currentTimeFormatted} / ${totalTimeFormatted}`;
            }
        }
    }

    loadJSON(filePath) {
        return fetchJson([{
            methodname: 'cursive_get_reply_json',
            args: {
                filepath: filePath,
            },
        }])[0].done(response => {
            return response;
        }).fail(error => {
            throw new Error('Error loading JSON file: ' + error.message);
        });
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // Call this to make a "start" or "start over" function
    startReplay(reset = true) {
        // Clear previous instances of timeout to prevent multiple running at once
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
        }
        if (this.playButton) {
            const pauseSvg = document.createElement('i');
            pauseSvg.className = 'fa fa-pause';
            this.playButton.querySelector('.play-icon').innerHTML = pauseSvg.outerHTML;
        }
        this.replayLog();
    }

    // Called by startReplay() to recursively call through keydown events
    // Refactored replayLog and helpers
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

            const {updatedText, updatedCursor, updatedHighlights, updatedDeleted} =
                this.processEvent(event, this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);

            this.text = updatedText;
            this.cursorPosition = updatedCursor;
            this.highlightedChars = updatedHighlights;
            this.deletedChars = updatedDeleted;

            this.currentEventIndex++;
        }

        this.updateDisplayText(this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);
        this.updateReplayStatus();
    }

    processEvent(event, text, cursor, highlights, deletions) {
        let updatedHighlights = [...highlights];
        let updatedDeleted = [...deletions];

        if (event.rePosition !== undefined && (this.currentEventIndex === 0
            || event.event === 'mouseDown' || event.event === 'mouseUp')) {
            cursor = Math.max(0, Math.min(event.rePosition, text.length));
        }

        if (event.event?.toLowerCase() === "keydown") {
            ({text, cursor, updatedHighlights, updatedDeleted} =
                this.handleKeydown(event, text, cursor, updatedHighlights, updatedDeleted));
        }

        updatedHighlights = updatedHighlights.filter(h => !h.expiresAt || h.expiresAt > this.currentTime);
        updatedDeleted = updatedDeleted.filter(d => !d.expiresAt || d.expiresAt > this.currentTime);

        return {updatedText: text, updatedCursor: cursor, updatedHighlights, updatedDeleted};
    }

    handleKeydown(event, text, cursor, highlights, deletions) {
        const key = event.key;
        const charToInsert = this.applyKey(key);

        // Update Control and Paste states
        if (key === "Control") {
            this.isControlKeyPressed = true;
        } else if (key === "v" && this.isControlKeyPressed) {
            this.isPasteEvent = true;
            this.isControlKeyPressed = false;
        } else if (key !== "v") {
            this.isControlKeyPressed = false;
        }

        // Helper to update highlights when inserting a char
        const insertChar = (char) => {
            text = text.slice(0, cursor) + char + text.slice(cursor);
            if (char.trim()) {
                highlights.push({
                    index: cursor,
                    "char": char,
                    time: this.currentTime,
                    expiresAt: this.currentTime + 1500
                });
            }
            cursor++;
        };

        if (this.isControlKeyPressed) {
            switch (key) {
                case "Backspace":
                    ({text, cursor, deletions} = this.handleCtrlBackspace(text, cursor, deletions));
                    this.isControlKeyPressed = false;
                    break;
                case "Delete":
                    ({text, deletions} = this.handleCtrlDelete(text, cursor, deletions));
                    this.isControlKeyPressed = false;
                    break;
                case "ArrowLeft":
                    cursor = this.findPreviousWordBoundary(text, cursor);
                    break;
                case "ArrowRight":
                    cursor = this.findNextWordBoundary(text, cursor);
                    break;
                default:
                    break;
            }
        } else {
            switch (key) {
                case "Backspace":
                    if (!this.isPasteEvent) {
                        ({text, cursor, deletions} = this.handleBackspace(text, cursor, deletions));
                    }
                    break;
                case "Delete":
                    ({text, deletions} = this.handleDelete(text, cursor, deletions));
                    break;
                case "ArrowLeft":
                    cursor = Math.max(0, cursor - 1);
                    break;
                case "ArrowRight":
                    cursor = Math.min(text.length, cursor + 1);
                    break;
                default:
                    if (charToInsert) {
                        insertChar(charToInsert);
                    }
                    break;
            }
        }

        return {text, cursor, updatedHighlights: highlights, updatedDeleted: deletions};
    }

    handleCtrlBackspace(text, cursor, deletions) {
        if (cursor === 0) {
            return {text, cursor, deletions};
        }

        let wordStart = cursor;
        while (wordStart > 0 && text[wordStart - 1] === ' ') {
            wordStart--;
        }
        while (wordStart > 0 && text[wordStart - 1] !== ' ') {
            wordStart--;
        }

        const word = text.slice(wordStart, cursor);
        for (let i = 0; i < word.length; i++) {
            deletions.push({
                index: wordStart + i,
                "char": word[i],
                time: this.currentTime,
                expiresAt: this.currentTime + 2000
            });
        }
        return {
            text: text.slice(0, wordStart) + text.slice(cursor),
            cursor: wordStart,
            deletions
        };
    }

    handleCtrlDelete(text, cursor, deletions) {
        const wordEnd = this.findNextWordBoundary(text, cursor);
        const word = text.slice(cursor, wordEnd);
        for (let i = 0; i < word.length; i++) {
            deletions.push({
                index: cursor + i,
                "char": word[i],
                time: this.currentTime,
                expiresAt: this.currentTime + 2000
            });
        }
        return {text: text.slice(0, cursor) + text.slice(wordEnd), deletions};
    }

    handleBackspace(text, cursor, deletions) {
        if (cursor === 0) {
            return {text, cursor, deletions};
        }
        deletions.push({
            index: cursor - 1,
            "char": text[cursor - 1],
            time: this.currentTime,
            expiresAt: this.currentTime + 2000
        });
        return {
            text: text.slice(0, cursor - 1) + text.slice(cursor),
            cursor: cursor - 1,
            deletions
        };
    }

    handleDelete(text, cursor, deletions) {
        if (cursor >= text.length) {
            return {text, deletions};
        }
        deletions.push({
            index: cursor,
            "char": text[cursor],
            time: this.currentTime,
            expiresAt: this.currentTime + 2000
        });
        return {
            text: text.slice(0, cursor) + text.slice(cursor + 1),
            deletions
        };
    }

    updateReplayStatus() {
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
            cursor = lastNonSpace + 1;
            return cursor;
        }

        let wordEnd = cursor;
        while (wordEnd < text.length && text[wordEnd] !== ' ') {
            wordEnd++;
        }

        return wordEnd;
    }

    findPreviousWordBoundary(text, cursor) {
        let pos = cursor;

        if (pos <= 0) {
            return 0;
        }

        pos--;

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
        if (wasPlaying) {
            this.replayInProgress = false;
            clearTimeout(this.replayTimeout);
        }

        const targetTime = (this.totalDuration * percentage) / 100;
        this.initializeReplayState(targetTime);

        for (let i = 0; i < this.logData.length; i++) {
            const event = this.logData[i];
            if (event.normalizedTime && event.normalizedTime > targetTime) {
                this.currentEventIndex = i;
                break;
            }
            this.handleReplayEvent(event, i, targetTime);
        }

        this.highlightedChars = this.removeExpiredHighlights(this.tempHighlights, targetTime);
        this.deletedChars = this.removeExpiredDeletions(this.tempDeletions, targetTime);

        this.text = this.replayText;
        this.cursorPosition = this.replayCursor;
        this.updateDisplayText(this.text, this.cursorPosition, this.highlightedChars, this.deletedChars);
        this.setScrubberVal(percentage);

        if (wasPlaying) {
            this.replayInProgress = true;
            this.replayLog();
        }
    }

    initializeReplayState(targetTime) {
        this.currentTime = targetTime;
        this.currentEventIndex = 0;
        this.text = '';
        this.cursorPosition = 0;
        this.highlightedChars = [];
        this.deletedChars = [];
        this.isControlKeyPressed = false;
        this.isPasteEvent = false;

        this.replayText = '';
        this.replayCursor = 0;
        this.tempHighlights = [];
        this.tempDeletions = [];
    }

    handleReplayEvent(event, index, targetTime) {
        if (event.rePosition !== undefined && (index === 0 || event.event === 'mouseDown' || event.event === 'mouseUp')) {
            this.replayCursor = Math.max(0, Math.min(event.rePosition, this.replayText.length));
        }

        if (event.event?.toLowerCase() === "keydown") {
            this.handleKeyInputDuringReplay(event, targetTime);
        }

        this.currentEventIndex = index + 1;
    }

    handleKeyInputDuringReplay(event, targetTime) {
        const key = event.key;
        const charToInsert = this.applyKey(key);

        this.updateModifierKeyStates(key);

        if (key === "Backspace" && this.isControlKeyPressed) {
            this.deletePreviousWordReplay(targetTime);
        } else if (key === "Delete" && this.isControlKeyPressed) {
            this.deleteNextWordReplay(targetTime);
        } else if (key === "ArrowLeft" && this.isControlKeyPressed) {
            this.replayCursor = this.findPreviousWordBoundary(this.replayText, this.replayCursor);
        } else if (key === "ArrowRight" && this.isControlKeyPressed) {
            this.replayCursor = this.findNextWordBoundary(this.replayText, this.replayCursor);
        } else if (key === "Backspace") {
            this.deleteCharacterBeforeCursor(targetTime);
        } else if (key === "Delete") {
            this.deleteCharacterAtCursor(targetTime);
        } else if (key === "ArrowLeft") {
            this.replayCursor = Math.max(0, this.replayCursor - 1);
        } else if (key === "ArrowRight") {
            this.replayCursor = Math.min(this.replayText.length, this.replayCursor + 1);
        } else if (charToInsert?.length > 0) {
            this.insertCharacterReplay(charToInsert, targetTime);
        }
    }

    updateModifierKeyStates(key) {
        if (key === "Control") {
            this.isControlKeyPressed = true;
        } else if (key !== "v") {
            this.isControlKeyPressed = false;
            this.isPasteEvent = false;
        } else if (key === "v" && this.isControlKeyPressed) {
            this.isPasteEvent = true;
            this.isControlKeyPressed = false;
        }
    }

    deletePreviousWordReplay(targetTime) {
        if (this.replayCursor > 0) {
            let start = this.replayCursor;
            while (start > 0 && this.replayText[start - 1] === ' ') {
                start--;
            }
            while (start > 0 && this.replayText[start - 1] !== ' ') {
                start--;
            }

            const deletedWord = this.replayText.substring(start, this.replayCursor);
            for (let i = 0; i < deletedWord.length; i++) {
                this.tempDeletions.push({
                    index: start + i,
                    "char": deletedWord[i],
                    time: targetTime,
                    expiresAt: targetTime + 2000
                });
            }

            this.replayText = this.replayText.slice(0, start) + this.replayText.slice(this.replayCursor);
            this.replayCursor = start;
        }
        this.isControlKeyPressed = false;
    }

    deleteNextWordReplay(targetTime) {
        if (this.replayCursor < this.replayText.length) {
            const end = this.findNextWordBoundary(this.replayText, this.replayCursor);
            const word = this.replayText.slice(this.replayCursor, end);

            for (let i = 0; i < word.length; i++) {
                this.tempDeletions.push({
                    index: this.replayCursor + i,
                    "char": word[i],
                    time: targetTime,
                    expiresAt: targetTime + 2000
                });
            }

            this.replayText = this.replayText.slice(0, this.replayCursor) + this.replayText.slice(end);
        }
        this.isControlKeyPressed = false;
    }

    deleteCharacterBeforeCursor(targetTime) {
        if (this.replayCursor > 0 && !this.isPasteEvent) {
            this.tempDeletions.push({
                index: this.replayCursor - 1,
                "char": this.replayText[this.replayCursor - 1],
                time: targetTime,
                expiresAt: targetTime + 2000
            });
            this.replayText = this.replayText.slice(0, this.replayCursor - 1) + this.replayText.slice(this.replayCursor);
            this.replayCursor--;
        }
    }

    deleteCharacterAtCursor(targetTime) {
        if (this.replayCursor < this.replayText.length) {
            this.tempDeletions.push({
                index: this.replayCursor,
                "char": this.replayText[this.replayCursor],
                time: targetTime,
                expiresAt: targetTime + 2000
            });
            this.replayText = this.replayText.slice(0, this.replayCursor) + this.replayText.slice(this.replayCursor + 1);
        }
    }

    insertCharacterReplay(char, targetTime) {
        this.replayText = this.replayText.slice(0, this.replayCursor) + char + this.replayText.slice(this.replayCursor);
        if (char.trim() !== "") {
            this.tempHighlights.push({
                index: this.replayCursor,
                "char": char,
                time: targetTime,
                expiresAt: targetTime + 1500
            });
        }
        this.replayCursor++;
    }

    removeExpiredHighlights(highlights, time) {
        return highlights.filter(h => !h.expiresAt || h.expiresAt > time);
    }

    removeExpiredDeletions(deletions, time) {
        return deletions.filter(d => !d.expiresAt || d.expiresAt > time);
    }


    // Update display with text, cursor, highlights and deletions
    updateDisplayText(text, cursorPosition, highlights, deletions) {
        let html = '';
        const highlightMap = {};
        const deletionMap = {};
        const currentTime = this.currentTime;

        highlights.forEach(h => {
            let opacity = 1;
            if (h.expiresAt) {
                const timeRemaining = h.expiresAt - currentTime;
                if (timeRemaining < 500) {
                    opacity = Math.max(0, timeRemaining / 500);
                }
            }
            highlightMap[h.index] = {"char": h.char, opacity: opacity};
        });

        deletions.forEach(d => {
            let opacity = 0.5;
            if (d.expiresAt) {
                const timeRemaining = d.expiresAt - currentTime;
                if (timeRemaining < 500) {
                    opacity = Math.max(0, (timeRemaining / 500) * 0.5);
                }
            }
            deletionMap[d.index] = {"char": d.char, opacity: opacity};
        });

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
                    const deletion = deletionMap[currentPosition];
                    html += `<span class="tiny_cursive-deleted-char" style="opacity: ${deletion.opacity};">${deletion.char}</span>`;
                }

                if (highlightMap[currentPosition] && char !== ' ') {
                    const highlight = highlightMap[currentPosition];
                    html += `<span class="tiny_cursive-highlighted-char" style="opacity: ${highlight.opacity};">${char}</span>`;
                } else {
                    html += char === ' ' ? '&nbsp;' : this.escapeHtml(char);
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

        // For control + backspace functionalities
        if (outOfRangeDeletions.length > 0) {
            outOfRangeDeletions.sort((a, b) => a.index - b.index);

            const cursorHTML = '<span class="tiny_cursive-cursor"></span>';
            let cursorPos = html.lastIndexOf(cursorHTML);

            if (cursorPos !== -1) {
                let deletedWordHTML = '<span class="tiny_cursive-deleted-char" style="opacity: 0.5;">';
                outOfRangeDeletions.forEach(d => {
                    deletedWordHTML += d.char;
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
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Used in various places to add a keydown, backspace, etc. to the output
    applyKey(key) {
        switch (key) {
            case "Enter":
                return "\n";
            case "Backspace":
            case "Delete":
                return "";
            case "ControlBackspace":
                return "";
            case " ":
                return " ";
            default:
                return !["Shift", "Ctrl", "Alt", "ArrowDown", "ArrowUp", "Control", "ArrowRight",
                    "ArrowLeft", "Meta", "CapsLock", "Tab", "Escape", "Delete", "PageUp", "PageDown",
                    "Insert", "Home", "End", "NumLock", "Insert", "Home", "End", "NumLock", "AudioVolumeUp",
                    "AudioVolumeDown", "MediaPlayPause", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9",
                    "F10", "F11", "F12", "PrintScreen", "UnIdentified"]
                    .includes(key) ? key : "";
        }
    }
}