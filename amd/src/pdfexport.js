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
 * Module for exporting PDF documents with authory_tech content. Handles PDF generation with custom formatting,
 * including margins, image quality settings and page orientation. Provides user feedback during export process.
 *
 * @module     tiny_authory_tech/pdfexport
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import templates from "core/templates";
import $ from 'jquery';
import Alert from 'core/modal';
import Factory from 'core/modal_factory';
import ModalEvents from 'core/modal_events';
import * as str from 'core/str';

export const init = (data) => {

    if (data) {
        data = JSON.parse(document.getElementById('AuthoryTechStudentData')?.dataset.submission || '{}');
    }

    if (!Object.keys(data).length) {
        Alert.create({
            type: Factory.types.ALERT,
            title: str.get_string('message', 'tool_dataprivacy'),
            body: str.get_string('nopaylod', 'tiny_authory_tech'),
            cssClass: 'modal-dialog modal-dialog-centered'
        }).then(modal => {
            modal.show();
            modal.getRoot().on(ModalEvents.hidden, () => {
                window.history.back();
            });
            return modal;
        }).catch(e => window.console.error(e));

        return;
    }

    $(function() {

        let option = {
                    margin:       [10, 6, 10, 6],
                    filename:     data.filename,
                    image:        {type: 'jpeg', quality: 1},
                    html2canvas:  {scale: 2},
                    jsPDF:        {unit: 'mm', format: 'a4', orientation: 'portrait'}};

        templates.render('tiny_authory_tech/export_pdf', data).then(html => {
            // eslint-disable-next-line
            return html2pdf().set(option).from(html).save().then(() => {
                // eslint-disable-next-line
                str.get_string('download_pdf_message', 'tiny_authory_tech').then(str =>{
                   document.getElementById('loadermessage').textContent = str;
                   return str;
                });

               return setTimeout(() => {
                    document.getElementById('pdfexportLoader').remove();
                    window.history.back();
                }, 4000);

            });

        }).catch(e => window.console.error(e));
    });
};