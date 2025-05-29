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
 * @author Brain Station 23 <sales@brainstation-23.com>
 */

define(["core/ajax", "core/str"], function(AJAX, str) {
  var usersTable = {
    init: function(page) {
      str
        .get_strings([{key: "field_require", component: "tiny_cursive"}])
        .done(function() {
          usersTable.getToken(page);
          usersTable.generateToken();
        });
    },
    getToken: function() {
      const approveTokenBtn = document.getElementById("approve_token");
      if (approveTokenBtn) {
        approveTokenBtn.addEventListener("click", function() {
          const tokenInput = document.getElementById("id_s_tiny_cursive_secretkey");
          var token = tokenInput ? tokenInput.value : "";
          var promise1 = AJAX.call([
            {
              methodname: "cursive_approve_token",
              args: {
                token: token,
              },
            },
          ]);
          promise1[0].done(function(json) {
            var data = JSON.parse(json);
            var messageAlert = "";
            if (data.status == true) {
              messageAlert =
                "<span class='alert alert-success' role='alert'>" +
                data.message +
                "</span>";
            } else {
              messageAlert =
                "<span class='alert alert-danger' role='alert'>" +
                data.message +
                "</span>";
            }
            const tokenMessage = document.getElementById("token_message");
            if (tokenMessage) {
              tokenMessage.innerHTML = messageAlert;
            }
          });
        });
      }
    },

    generateToken() {
      const generateToken = document.getElementById("generate_cursivetoken");
      const cursiveDisable = document.getElementById("cursivedisable");
      const cursiveEnable = document.getElementById("cursiveenable");

      if (generateToken) {
        generateToken.addEventListener("click", function(e) {
          e.preventDefault();
          var promise1 = AJAX.call([
            {
              methodname: "cursive_generate_webtoken",
              args: [],
            },
          ]);
          promise1[0].done(function(data) {
            var messageAlert = "";
            str.get_strings([
              {key: "webservtokengensucc", component: "tiny_cursive"},
              {key: "webservtokengenfail", component: "tiny_cursive"}
            ]).then(function([success, fail]) {

              if (data.token) {
                const cursiveTokenInput = document.getElementById("id_s_tiny_cursive_cursivetoken");
                if (cursiveTokenInput) {
                  cursiveTokenInput.value = data.token;
                }
                messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
              } else {
                messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
              }
              const cursiveTokenMsg = document.getElementById("cursivetoken_");
              if (cursiveTokenMsg) {
                cursiveTokenMsg.innerHTML = messageAlert;
                setTimeout(() => {
                  cursiveTokenMsg.innerHTML = "";
                }, 3000);
              }
              return true;
           }).catch(error => window.console.error(error));
          });
          promise1[0].fail(function(textStatus) {
            var errorMessage = "<span class='text-danger' role='alert'>";
            str
              .get_string("webservtokenerror", "tiny_cursive")
              .then((str) => {
                errorMessage += str + " " + textStatus.error + "</span>";

            const cursiveTokenMsg = document.getElementById("cursivetoken_");
            if (cursiveTokenMsg) {
              cursiveTokenMsg.innerHTML = errorMessage;
              // Clear the error message after 3 seconds.
              setTimeout(function() {
                cursiveTokenMsg.innerHTML = "";
              }, 3000);
            }
            return true;
          }).catch(error => window.console.error(error));
          });
        });
      }

      if (cursiveDisable) {
        cursiveDisable.addEventListener("click", function(e) {
          e.preventDefault();

          var promise1 = AJAX.call([
            {
              methodname: "cursive_disable_all_course",
              args: {
                disable: true,
              },
            },
          ]);
          promise1[0].done(function(data) {
            var messageAlert = "";
            str.get_strings([
              {key: "cursive:dis:succ", component: "tiny_cursive"},
              {key: "cursive:dis:fail", component: "tiny_cursive"}
            ]).then(function([success, fail]) {
              if (data) {
                messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
              } else {
                messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
              }

              const cursiveDisableMsg = document.getElementById("cursivedisable_");
              if (cursiveDisableMsg) {
                cursiveDisableMsg.innerHTML = messageAlert;
                setTimeout(() => {
                  cursiveDisableMsg.innerHTML = "";
                }, 3000);
              }
              return true;
            }).catch(error => window.console.error(error));
          });
          promise1[0].fail(function(textStatus) {
            var errorMessage = "<span class='text-danger' role='alert'>";
            str
              .get_string("cursive:status", "tiny_cursive")
              .then((str) => {
                errorMessage += str + " " + textStatus.error + "</span>";

            const cursiveDisableMsg = document.getElementById("cursivedisable_");
            if (cursiveDisableMsg) {
              cursiveDisableMsg.innerHTML = errorMessage;
              // Clear the error message after 3 seconds.
              setTimeout(function() {
                cursiveDisableMsg.innerHTML = "";
              }, 3000);
            }
            return true;
          }).catch(error => window.console.error(error));
          });
        });
      }

      if (cursiveEnable) {
        cursiveEnable.addEventListener("click", function(e) {
          e.preventDefault();

          var promise1 = AJAX.call([
            {
              methodname: "cursive_disable_all_course",
              args: {
                disable: false,
              },
            },
          ]);
          promise1[0].done(function(data) {
            var messageAlert = "";
            str.get_strings([
              {key: "cursive:ena:succ", component: "tiny_cursive"},
              {key: "cursive:ena:fail", component: "tiny_cursive"}
            ]).then(function([success, fail]) {
              if (data) {
                messageAlert = `<span class='text-success' role='alert'>${success}</span>`;
              } else {
                messageAlert = `<span class='text-danger' role='alert'>${fail}</span>`;
              }

              const cursiveDisableMsg = document.getElementById("cursivedisable_");
              if (cursiveDisableMsg) {
                cursiveDisableMsg.innerHTML = messageAlert;
                setTimeout(() => {
                  cursiveDisableMsg.innerHTML = "";
                }, 3000);
              }
              return true;
            }).catch(error => window.console.error(error));
          });
          promise1[0].fail(function(textStatus) {
            var errorMessage = "<span class='text-danger' role='alert'>";
            str.get_string("cursive:status", "tiny_cursive")
              .then((str) => {
                errorMessage += str + " " + textStatus.error + "</span>";

            const cursiveDisableMsg = document.getElementById("cursivedisable_");
            if (cursiveDisableMsg) {
              cursiveDisableMsg.innerHTML = errorMessage;
              // Clear the error message after 3 seconds.
              setTimeout(function() {
                cursiveDisableMsg.innerHTML = "";
              }, 3000);
            }
            return true;
          }).catch(error => window.console.error(error));
          });
        });
      }
    },
  };
  return usersTable;
});