var crypto = require('crypto');
var request = require('request');
var injector = require('connect-injector');
var composable = require('composable-middleware');

(function () {

  'use strict';

  var options = {
    appId: process.env.USERBIN_APP_ID,
    apiSecret: process.env.USERBIN_API_SECRET
  };

  var defaults = function(source, obj) {
    if (source) {
      for (var prop in source) {
        if (obj[prop] === void 0) obj[prop] = source[prop];
      }
    }
    return obj;
  };

  var injectScript = function(body, loginPath) {
    var position = body.indexOf('</body>');
    if (position !== -1) {
      var tmpl = scriptTemplate(loginPath);
      return [body.slice(0, position), tmpl, body.slice(position)].join('');
    } else {
      return body;
    }
  };

  var scriptInjector = injector(function(req, res) {
    return !options.skipScriptInjection &&
      res.getHeader('content-type').indexOf('text/html') !== -1;
  }, function(callback, data, req, res) {
    callback(null, injectScript(data.toString()));
  });

  var scriptTemplate = function(loginPath) {
    var scriptUrl = process.env.USERBIN_SCRIPT_URL || '//js.userbin.com';
    var path = loginPath || options.protectedPath;
    var tmpl = '';

    tmpl += "<script src='" + scriptUrl + "?" + options.appId + "'></script>";
    tmpl += "<script type='text/javascript'>Userbin.config({";

    if (options.rootPath) {
      tmpl += "logoutRedirectUrl:'" + options.rootPath + "',";
    }
    if (path) {
      tmpl += "loginRedirectUrl:'" + path + "',";
    }
    tmpl += "reloadOnSuccess:true});</script>";

    return tmpl;
  };


  function validate(data, signature, secret) {
    return crypto.createHmac('sha256', secret).update(data).
      digest('hex') === signature;
  }

  function loginHTML() {
    return '<!DOCTYPE html>\n' +
           '<html>\n' +
           '<head>\n' +
           '  <title>Log in</title>\n' +
           '</head>\n' +
           '<body>\n' +
           '<a class="ub-login-form"></a>\n' +
           '</body>\n' +
           '</html>\n';
  }

  function config(opts) {
    if (!opts) { return options; }

    options = defaults(options, opts);

    options.skipScriptInjection = !!options.skipScriptInjection;
    return options
  }

  function middleware() {

    return function (req, res, next) {

      var finishUp = function(user) {
        if (options.protectedPath &&
            req.originalUrl.indexOf(options.protectedPath) === 0 && !user) {
          res.writeHead(403, { "Content-Type": "text/html" });
          res.end(injectScript(loginHTML(), req.originalUrl));
        } else {
          req.currentUser = user;
          req.userLoggedIn = !!user;
          if (res.locals) {
            res.locals.currentUser = req.currentUser;
            res.locals.userLoggedIn = req.userLoggedIn;
          }
          next();
        }
      };

      var bailOut = function() {
        res.clearCookie('_ubd');
        res.clearCookie('_ubs');
        finishUp();
      }

      if (!options.appId || !options.apiSecret) {
        console.warn('userbin: appId and apiSecret must be present!');
      }

      var data = req.cookies._ubd;
      var signature = req.cookies._ubs;

      if (data && signature && options.apiSecret) {

        if (validate(data, signature, options.apiSecret)) {

          var session = JSON.parse(data);
          var profile = JSON.parse(data).user;

          var assignUserStuff = function() {
            if (options.findUser) {
              options.findUser(profile.id, handleFoundUser);
            } else {
              finishUp(profile);
            }
          }

          var handleCreatedUser = function(user) {
            if (user) {
              finishUp(user);
            } else {
              finishUp(profile);
            }
          };

          var handleFoundUser = function(user) {
            if (user) {
              finishUp(user);
            } else {
              if (options.createUser) {
                options.createUser(profile, handleCreatedUser);
              } else {
                console.error('userbin: you need to implement createUser!');
              }
            }
          };

          var refreshSession = function(session_id) {
            var apiEndpoint = process.env.USERBIN_API_ENDPOINT ||
              'https://api.userbin.com';

            request.post(apiEndpoint + '/sessions/' + session_id + '/refresh',
              function (error, response, body) {
                if (error) {
                  bailOut();
                } else {
                  res.cookie('_ubd', body);
                  res.cookie('_ubs', response.headers['x-userbin-signature']);

                  data = req.cookies._ubd;
                  signature = req.cookies._ubs;
                  profile = JSON.parse(data).user;

                  assignUserStuff();
                }
              }
            ).auth(options.appId, options.apiSecret);
          };

          if (Date.now() > session.expires_at) {
            refreshSession(session.id);
          } else {
            assignUserStuff();
          }

        } else { // invalid signature
          bailOut();
        }

      } else { // missing signature, data or secret
        bailOut();
      }

    };
  }

  module.exports = {
    config: config,
    authenticate: function() {
      return composable().use(middleware()).use(scriptInjector);
    }
  };

}());
