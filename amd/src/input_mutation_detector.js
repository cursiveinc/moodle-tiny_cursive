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
 * TODO describe module input_mutation_detector
 *
 * @module     tiny_cursive/input_mutation_detector
 * @copyright  2026 Brain Station 23 <sales@brainstation-23.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export default class InputMutationDetector {
    constructor(editor, callback) {
        this.editor = editor;
        this.callback = callback;
        this.mutationObserver = null;
        this.isObserving = false;
        this.previousContent = '';
        this._bindInputEvent();
        this._bindRemove();
    }

    _bindInputEvent() {
        this.editor.on('input', (e) => {
            if (!this.isObserving) {
                // At this point editor already has the new char inserted.
                // So we need to derive previous content from inputType
                // to rewind back before the change.
                this.previousContent = this._getContentBeforeInput(e);
                this._observe();
                // Manually trigger first change since observer missed it
                this._handleChange();
            }
        });
    }

    _getContentBeforeInput(e) {
        const editorBody = this.editor.getBody();
        const curr = (editorBody.innerText || '').replace(/\u00a0/g, ' ');

        // Rewind: remove last typed char to reconstruct previous state
        if (e.inputType === 'insertText' && e.data) {
            return curr.slice(0, curr.length - e.data.length);
        }

        // Composition (mobile IME) — remove composed text
        if (e.inputType === 'insertCompositionText' && e.data) {
            return curr.slice(0, curr.length - e.data.length);
        }

        // Backspace
        if (e.inputType === 'deleteContentBackward') {
            return curr; // will be handled by next mutation
        }

        // Fallback — assume empty before first input
        return '';
    }

    _bindRemove() {
        this.editor.on('remove', () => {
            this.disconnect();
        });
    }

    _observe() {
        const editorBody = this.editor.getBody();
        if (!editorBody) {
            window.console.warn('InputMutationDetector: editor body not found');
            return;
        }

        this.mutationObserver = new MutationObserver(() => {
            this._handleChange();
        });

        this.mutationObserver.observe(editorBody, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });

        this.isObserving = true;
    }

    _handleChange() {
        const editorBody = this.editor.getBody();
        const curr = (editorBody.innerText || '').replace(/\u00a0/g, ' ');
        const prev = this.previousContent;

        if (prev === curr) {
            return;
        }

        const { added, removed } = this._getDiff(prev, curr);

        if (removed && !added) {
            for (let i = 0; i < removed.length; i++) {
                this.callback('Backspace');
            }
        } else if (removed && added) {
            for (let i = 0; i < removed.length; i++) {
                this.callback('Backspace');
            }
            for (const char of added) {
                this.callback(this._resolveKey(char));
            }
        } else if (added) {
            for (const char of added) {
                this.callback(this._resolveKey(char));
            }
        }

        this.previousContent = curr;
    }

    _getDiff(oldStr, newStr) {
        let start = 0;
        while (
            start < oldStr.length &&
            start < newStr.length &&
            oldStr[start] === newStr[start]
        ) {
            start++;
        }

        let oldEnd = oldStr.length;
        let newEnd = newStr.length;
        while (
            oldEnd > start &&
            newEnd > start &&
            oldStr[oldEnd - 1] === newStr[newEnd - 1]
        ) {
            oldEnd--;
            newEnd--;
        }

        return {
            removed: oldStr.slice(start, oldEnd),
            added: newStr.slice(start, newEnd)
        };
    }

    _resolveKey(char) {
        const specialMap = {
            '\n': 'Enter',
            '\r': 'Enter',
            ' ': ' ',
            '\u00a0': ' ',
            '\t': 'Tab',
            '\b': 'Backspace',
            '\x1B': 'Escape',
            '\x7F': 'Delete',
        };

        return specialMap[char] ?? char;
    }

    disconnect() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
            this.mutationObserver = null;
            this.isObserving = false;
            this.previousContent = '';
        }
    }

    reconnect() {
        if (!this.isObserving) {
            this._observe();
        }
    }
}