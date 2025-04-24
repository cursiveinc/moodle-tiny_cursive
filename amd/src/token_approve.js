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
 * @module     tiny_cursive/token_approve
 * @category TinyMCE Editor
 * @copyright  CTI <info@cursivetechnology.com>
 * @author Brain Station 23 <elearning@brainstation-23.com>
 */

define(["core/ajax", "core/str"], function (AJAX, str) {
  var usersTable = {
    init: function (page) {
      str
        .get_strings([
          { key: "field_require", component: "tiny_cursive" },
        ])
        .then(function () {
          usersTable.getToken(page);
          usersTable.generateToken();
        });
    },
    getToken: function () {
      document.getElementById("approve_token").addEventListener("click", function () {
        var token = document.getElementById('id_s_tiny_cursive_secretkey').value;
        var promise1 = AJAX.call([
          {
            methodname: "cursive_approve_token",
            args: {
              token: token,
            },
          },
        ]);
        promise1[0].done(function (json) {
          var data = JSON.parse(json);
          var message_alert = '';
          if (data.status === true) {
            message_alert = "<span class='alert alert-success' role='alert'>" + data.message + "</span>";
          } else {
            message_alert = "<span class='alert alert-danger' role='alert'>" + data.message + "</span>";
          }
          document.getElementById("token_message").innerHTML = message_alert;
        });
      });
    },

    generateToken() {
      const generateTokenButton = document.querySelector('#generate_cursivetoken');
      generateTokenButton.addEventListener('click', function (e) {
        e.preventDefault();
        // Call AJAX with the required methodname and arguments
        const promise = AJAX.call([{
          methodname: "cursive_generate_webtoken",
          args: []
        }])[0];

        // Handle the success response
        promise.done((data) => {
          let message_alert = '';
          if (data.token) {
            document.querySelector('#id_s_tiny_cursive_cursivetoken').value = data.token;
            message_alert = "<span class='text-success' role='alert'>Webservice Token Generation Success</span>";
          } else {
            message_alert = "<span class='text-danger' role='alert'>Webservice Token Generation Failed</span>";
          }

          // Set success or failure message
          const alertContainer = document.querySelector('#cursivetoken_');
          alertContainer.innerHTML = message_alert;

          // Clear the message after 3 seconds
          setTimeout(() => {
            alertContainer.innerHTML = '';
          }, 3000);
        });

        // Handle the failure response
        promise.fail((jqXHR, textStatus) => {
          const errorMessage = `<span class='text-danger' role='alert'>An error occurred while generating the token: ${textStatus}</span>`;
          const alertContainer = document.querySelector('#cursivetoken_');
          alertContainer.innerHTML = errorMessage;

          // Clear the error message after 3 seconds 
          setTimeout(() => {
            alertContainer.innerHTML = '';
          }, 3000);
        });
      });
    }

  };
  return usersTable;
});
