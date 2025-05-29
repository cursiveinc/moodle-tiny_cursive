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
 * @module     tiny_cursive/settings
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/str"], function(str) {
  var usersTable = {
    init: function(showcomments, user_role) {
      str
        .get_strings([
          { key: "tiny_cursive", component: "tiny_cursive" },
        ])
        .done(function() {
          usersTable.getToken(showcomments, user_role);
        });
    },

    getToken: function(showcomments, user_role) {
      var body = document.createElement("div");
      body.id = "body";
      body.className = "body";
      document.body.appendChild(body);

      body.className = user_role;

      if (showcomments == 1) {
        body.className = 'intervention ' + user_role;
      }
    },
  };

  return usersTable;
});
