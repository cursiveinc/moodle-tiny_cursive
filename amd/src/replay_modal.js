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
 * This module defines a custom modal for replay functionality.
 *
 * @module     tiny_cursive/replay_modal
 * @copyright  2024  CTI <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Modal from 'core/modal';
import $ from 'jquery';

export default class ReplayModal extends Modal {
    static TYPE = "tiny_cursive/replay_modal";
    static TEMPLATE = "tiny_cursive/replay_modal";

    configure(modalConfig) {
        modalConfig.show = true;
        modalConfig.removeOnClose = true;
        modalConfig.backdrop = true;

        super.configure(modalConfig);
    }

    show() {
        super.show();

        const root = this.getRoot();

        // Hide the default modal header.
        root.find('.modal-header').remove();

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
}