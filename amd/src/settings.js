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
          {key: "tiny_cursive", component: "tiny_cursive"},
        ])
        .done(function() {
          usersTable.getToken(showcomments, user_role);
        });
    },

    getToken: function(showcomments, user_role) {
      var body = document.createElement("div");
      body.id = "body";
      body.className = "body";
      body.className = user_role;
      if (showcomments == 1) {
        body.className = 'intervention ' + user_role;
      }
      document.body.appendChild(body);

      document.querySelectorAll('#page-mod-forum-discuss article').forEach(function() {
        var replyButtons = document.querySelectorAll('a[data-region="post-action"][title="Reply"]');
        if (replyButtons.length > 0) {
            replyButtons.forEach(function(replyButton) {
                replyButton.addEventListener('click', function(event) {
                    var isTeacher = document.getElementById('body').classList.contains('teacher_admin');
                    if (!isTeacher) {
                        event.preventDefault();
                        var url = replyButton.getAttribute('href');
                        var urlParts = url.split('#');
                        var baseUrl = urlParts[0];
                        var hash = urlParts.length > 1 ? '#' + urlParts[1] : '';
                        if (baseUrl.indexOf('setformat=') > -1) {
                            baseUrl = baseUrl.replace(/setformat=\d/, 'setformat=1');
                        } else if (baseUrl.indexOf('?') > -1) {
                            baseUrl += '&setformat=1';
                        } else {
                            baseUrl += '?setformat=1';
                        }
                        var finalUrl = baseUrl + hash;
                        window.location.href = finalUrl;
                    }
                });
            });
        }
    });
    },
  };

  return usersTable;
});
