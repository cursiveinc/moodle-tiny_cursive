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
 * @module     tiny_authory_tech/common
 * @category   TinyMCE Editor
 * @copyright  2025 CTI <info@cursivetechnology.com>
 * @copyright  2026 Authory Technology S.L. <info@authory.tech>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */


const component = 'tiny_authory_tech';

export default {
    component,
    pluginName: `${component}/plugin`,
    iconUrl: M.util.image_url('authory_tech', 'tiny_authory_tech'),
    iconSaving: M.util.image_url('rotate', 'tiny_authory_tech'),
    iconGrayUrl: M.util.image_url('authory_tech_gray', 'tiny_authory_tech'),
    tooltipCss: {
        display: 'block',
        position: 'absolute',
        transform: 'translateX(-100%)',
        backgroundColor: 'white',
        color: 'black',
        border: '1px solid #ccc',
        marginBottom: '6px',
        padding: '10px',
        textAlign: 'justify',
        minWidth: '200px',
        borderRadius: '1px',
        pointerEvents: 'none',
        zIndex: 10000
    }
};
