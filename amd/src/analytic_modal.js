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
 * This module defines a custom modal for analytics.
 *
 * @module     tiny_cursive/analytic_modal
 * @copyright  2024  CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';
import $ from 'jquery';
export default class MyModal extends Modal {
    static TYPE = "tiny_cursive/analytics_modal";
    static TEMPLATE = "tiny_cursive/analytics_modal";

    configure(modalConfig) {
        // Show this modal on instantiation.
        modalConfig.show = true;

        // Remove from the DOM on close.
        modalConfig.removeOnClose = true;
        modalConfig.backdrop = true;

        // Call the parent configure method.
        super.configure(modalConfig);
    }

    // Override the parent show method to add custom behavior.
    show() {
        super.show();

        const root = this.getRoot();

        // Hide the default modal header; the plugin renders its own.
        root.find('.modal-header').remove();

        // Core's aria-labelledby pointed at the removed header, so name the dialog from the plugin heading.
        const title = root.find('.tiny_cursive-analytics-title').first();
        if (title.length) {
            root.attr('aria-labelledby', title.attr('id'));
        }

        root.find('.modal-content').css({
            'border-radius': '30px'
        }).addClass('shadow-none border-none');
        // Remove padding from the modal content.
        root.find('.modal-body').css({
            'padding': '0',
            'border-radius': '30px',
            'overflow': 'auto',
            'scrollbar-width': 'none'
        });
        root.find('.modal-dialog').css({
            'max-width': '800px',
            'background-color': 'transparent'
        });

        this.initTabs(root[0]);

        // Ensure modal closes on 'analytic-close' button click.
        root.find('#analytic-close').on('click', () => {
            this.destroy();
        });

        // Ensure modal closes on backdrop click.
        root.on('click', (e) => {
            if ($(e.target).hasClass('modal')) {
                this.destroy();
            }
        });
    }

    /**
     * Give the Metrics / Difference / Replay / Learn more strip real tab semantics.
     *
     * The click handlers in analytic_events toggle the `active` class; this keeps
     * aria-selected, the roving tabindex and the panel label in step with that class,
     * and adds arrow-key navigation (APG tabs pattern, automatic activation).
     *
     * @param {HTMLElement} root The modal root element.
     */
    initTabs(root) {
        const tablist = root.querySelector('[role="tablist"]');
        // show() runs twice per modal (configure show:true, then the explicit call), so bind once.
        if (!tablist || tablist.dataset.tinyCursiveTabs) {
            return;
        }
        tablist.dataset.tinyCursiveTabs = '1';
        const panel = root.querySelector('[role="tabpanel"]');
        const tabs = () => Array.from(tablist.querySelectorAll('[role="tab"]'));
        const enabledTabs = () => tabs().filter(tab => !tab.disabled);

        const sync = () => {
            const all = tabs();
            const active = all.find(tab => tab.classList.contains('active'));
            all.forEach(tab => {
                const selected = tab === active;
                tab.setAttribute('aria-selected', selected ? 'true' : 'false');
                tab.tabIndex = selected ? 0 : -1;
            });
            // Keep one enabled tab reachable with Tab when nothing is selected (free mode).
            if (!active || active.disabled) {
                const first = enabledTabs()[0];
                if (first) {
                    first.tabIndex = 0;
                }
            }
            if (panel && active) {
                panel.setAttribute('aria-labelledby', active.id);
            }
        };

        tablist.addEventListener('keydown', (e) => {
            const enabled = enabledTabs();
            const index = enabled.indexOf(document.activeElement);
            if (index < 0) {
                return;
            }
            let next = null;
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    next = enabled[(index + 1) % enabled.length];
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    next = enabled[(index - 1 + enabled.length) % enabled.length];
                    break;
                case 'Home':
                    next = enabled[0];
                    break;
                case 'End':
                    next = enabled[enabled.length - 1];
                    break;
                default:
                    return;
            }
            e.preventDefault();
            next.focus();
            next.click();
        });

        new MutationObserver(sync).observe(tablist, {
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'disabled'],
        });
        sync();
    }
}
