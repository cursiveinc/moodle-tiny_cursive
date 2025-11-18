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
 * SVG repository for icons used in the Curs
 *
 * @module     tiny_cursive/svg_repo
 * @copyright  2025 Cursive Technology, Inc. <info@cursivetechnology.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export default {
  people: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="me-2 small">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>`,
  assignment: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="me-2 small">
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path>
                </svg>`,
  time: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    class="me-2 small">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>`,
  offline: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-cloud-off
                w-5 h-5 text-gray-600"><path d="m2 2 20 20"></path><path d="M5.782 5.782A7 7 
                0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"></path><path d="M21.532 16.5A4.5 4.5 0
                0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"></path></svg>`,
  forum: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" 
                preserveAspectRatio="xMinYMid meet"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.49609 2.98999C4.5631
                2.98999 2.99609 4.55699 2.99609 6.48999V14.5561C2.99609 14.5635 2.99626 14.571 2.99658 14.5784V20.0092C2.99658
                20.841 3.95298 21.3092 4.60994 20.799L8.21061 18.0027H17.5034C19.4364 18.0027 21.0034 16.4357 21.0034
                14.5027V6.48999C21.0034 4.55699 19.4364 2.98999 17.5034 2.98999H6.49609ZM3.99658 13.9749C3.99658 13.9674 
                3.99642 13.9599 3.99609 13.9526V6.48999C3.99609 5.10928 5.11538 3.98999 6.49609 3.98999H17.5034C18.8841 
                3.98999 20.0034 5.10928 20.0034 6.48999V14.5027C20.0034 15.8834 18.8841 17.0027 17.5034 17.0027H8.02337C7.87222 
                17.0027 7.73673 17.0698 7.64504 17.1758L3.99658 20.0092V13.9749ZM7.00391 7.49414C7.00391 7.218 7.22776 
                6.99414 7.50391 6.99414H16.5085C16.7847 6.99414 17.0085 7.218 17.0085 7.49414C17.0085 7.77028 16.7847 7.99414 
                16.5085 7.99414H7.50391C7.22776 7.99414 7.00391 7.77028 7.00391 7.49414ZM7.50391 9.99048C7.22776 9.99048 
                7.00391 10.2143 7.00391 10.4905C7.00391 10.7666 7.22776 10.9905 7.50391 10.9905H16.5085C16.7847 10.9905 
                7.0085 10.7666 17.0085 10.4905C17.0085 10.2143 16.7847 9.99048 16.5085 9.99048H7.50391ZM7.50391 
                12.9905C7.22776 12.9905 7.00391 13.2143 7.00391 13.4905C7.00391 13.7666 7.22776 13.9905 7.50391 
                13.9905H13.5071C13.7832 13.9905 14.0071 13.7666 14.0071 3.4905C14.0071 13.2143 13.7832 12.9905 
                13.5071 12.9905H7.50391Z" fill="#212529"/></svg>`,
    close: `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g 
        id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round">
        </g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29289 5.29289C5.68342 4.90237 6.31658 
        4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 
        6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 
        19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 
        17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z" fill="#0F1729"></path> 
            </g></svg>`,
    hamburger: `<svg width="22px" height="22px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" 
        stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M20 7L4 7" stroke="#1C274C" stroke-width="1.5"
        stroke-linecap="round"></path> <path d="M20 12L4 12" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round">
        </path> <path d="M20 17L4 17" stroke="#1C274C" stroke-width="1.5" stroke-linecap="round"></path> </g></svg>`
};
