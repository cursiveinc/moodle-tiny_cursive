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
 * @module     tiny_cursive/common
 * @category   TinyMCE Editor
 * @copyright  2025 CTI <info@cursivetechnology.com>
 * @author     Brain Station 23 <sales@brainstation-23.com>
 */


const component = 'tiny_cursive';

export default {
    component,
    pluginName: `${component}/plugin`,
    iconUrl: M.util.image_url('cursive', 'tiny_cursive'),
    iconSaving: M.util.image_url('rotate', 'tiny_cursive'),
    iconGrayUrl: M.util.image_url('cursive_gray', 'tiny_cursive'),
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
    },
    Color: {
        white: 'rgba(252, 252, 252, 1)',
        lineBlue: 'rgb(75, 192, 192)',
        black: 'rgba(0, 0, 0, 1)',
        tpGray: '#cccccc',
        lightCyan: 'rgba(75, 192, 192, 0.3)',
        lineOrange: 'rgba(255, 165, 0)',
        lightOrange: 'rgba(255, 165, 0, 0.3)',
        Purple: 'rgb(139, 92, 246)',
        lineRed: 'rgb(255, 0, 0)',
        lightPurple: 'rgb(139, 92, 246, 0.4)',
    }
};
