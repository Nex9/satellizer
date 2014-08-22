(function() {
  var Satellizer, config, providers,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  config = {
    logoutRedirect: '/',
    loginRedirect: '/',
    loginUrl: '/auth/login',
    signupUrl: '/auth/signup',
    signupRedirect: '/login',
    loginRoute: '/login',
    signupRoute: '/signup',
    user: 'currentUser',
    tokenName: 'satellizerToken'
  };

  providers = {
    google: {
      url: '/auth/google',
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/auth',
      redirectUri: window.location.origin,
      scope: 'openid profile email',
      scopeDelimiter: ' ',
      requiredUrlParams: ['scope'],
      optionalUrlParams: ['display'],
      display: 'popup',
      type: '2.0',
      popupOptions: {
        width: 452,
        height: 633
      }
    },
    facebook: {
      url: '/auth/facebook',
      authorizationEndpoint: 'https://www.facebook.com/dialog/oauth',
      redirectUri: window.location.origin + '/',
      scope: 'email',
      scopeDelimiter: ',',
      requiredUrlParams: ['display', 'scope'],
      display: 'popup',
      type: '2.0',
      popupOptions: {
        width: 481,
        height: 269
      }
    },
    linkedin: {
      url: '/auth/linkedin',
      authorizationEndpoint: 'https://www.linkedin.com/uas/oauth2/authorization',
      redirectUri: window.location.origin,
      requiredUrlParams: ['state'],
      scope: [],
      scopeDelimiter: ' ',
      state: 'STATE',
      type: '2.0',
      popupOptions: {
        width: 527,
        height: 582
      }
    },
    github: {
      name: 'github',
      url: '/auth/github',
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      redirectUri: window.location.origin,
      scope: [],
      scopeDelimiter: ' ',
      type: '2.0',
      popupOptions: {
        width: 1020,
        height: 618
      }
    },
    twitter: {
      url: '/auth/twitter',
      type: '1.0'
    }
  };

  Satellizer = (function(_super) {
    var $auth, HttpInterceptor, Local, Oauth1, Oauth2, Popup, RunBlock, Utils, onRun;

    __extends(Satellizer, _super);

    function Satellizer() {
      return Satellizer.__super__.constructor.apply(this, arguments);
    }

    $auth = (function(_super1) {
      __extends($auth, _super1);

      function $auth($q) {
        ({
          config: config,
          providers: providers,
          facebook: function(params) {
            return angular.extend(providers.facebook, params);
          },
          google: function(params) {
            return angular.extend(providers.facebook, params);
          },
          linkedin: function(params) {
            return angular.extend(providers.linkedin, params);
          },
          github: function(params) {
            return angular.extend(providers.github, params);
          },
          twitter: function(params) {
            return angular.extend(providers.twitter, params);
          },
          oauthBase: function(params) {
            providers[params.name] = providers[params.name] || {};
            return angular.extend(providers[params.name], params);
          },
          oauth1: (function(_this) {
            return function(params) {
              _this.oauthBase(params);
              return providers[params.name].type = '1.0';
            };
          })(this),
          oauth2: (function(_this) {
            return function(params) {
              _this.oauthBase(params);
              return providers[params.name].type = '2.0';
            };
          })(this),
          $get: function($q, Oauth1, Oauth2, Local) {
            $auth = {};
            $auth.authenticate = function(name) {
              var deferred, provider;
              deferred = $q.defer();
              provider = providers[name].type === 1.0 ? Oauth1 : Oauth2;
              provider.open(provider[name]).then(function(response) {
                return Local.parseUser(response.data.token, deferred);
              })["catch"](function(response) {
                return deferred.reject(response);
              });
              return deferred.promise;
            };
            $auth.login = function(user) {
              return Local.login(user);
            };
            $auth.signup = function(user) {
              return Local.signup(user);
            };
            $auth.logout = function(user) {
              return Local.logout();
            };
            $auth.isAuthenticated = function() {
              return Local.isAuthenticated();
            };
            return $auth;
          }
        });
      }

      return $auth;

    })(Provider);

    Local = (function(_super1) {
      __extends(Local, _super1);

      function Local($q, $http, $rootScope, $location) {
        var local;
        local = {};
        local.parseUser = function(token, deferred) {
          var payload;
          payload = JSON.parse(window.atob(token.split('.')[1]));
          localStorage.setItem(config.tokenName, token);
          $rootScope[config.user] = payload.user;
          $location.path(config.loginRedirect);
          return deferred.resolve(payload.user);
        };
        local.login = function(user) {
          var deferred;
          deferred = $q.defer();
          $http.post(config.loginUrl, user).then(function(response) {
            return local.parseUser(response.data.token, deferred);
          })["catch"](function(response) {
            return deferred.reject(response);
          });
          return deferred.promise;
        };
        local.signup = function(user) {
          var deferred;
          deferred = $q.defer();
          $http.post(config.signupUrl, user).then(function() {
            $location.path(config.signupRedirect);
            return deferred.resolve();
          })["catch"](function(response) {
            return deferred.reject(response);
          });
          return deferred.promise;
        };
        local.logout = function() {
          var deferred;
          deferred = $q.defer();
          delete $rootScope[config.user];
          localStorage.removeItem(config.tokenName);
          $location.path(config.logoutRedirect);
          deferred.resolve();
          return deferred.promise;
        };
        local.isAuthenticated = function() {
          return Boolean($rootScope.currentUser);
        };
        return local;
      }

      return Local;

    })(Factory);

    Oauth2 = (function(_super1) {
      __extends(Oauth2, _super1);

      function Oauth2($q, $http, Utils, Popup) {
        var defaults, oauth2;
        defaults = {
          url: null,
          name: null,
          scope: null,
          scopeDelimiter: null,
          clientId: null,
          redirectUri: null,
          popupOptions: null,
          authorizationEndpoint: null,
          requiredUrlParams: null,
          optionalUrlParams: null,
          defaultUrlParams: ['response_type', 'client_id', 'redirect_uri'],
          responseType: 'code'
        };
        oauth2 = {};
        oauth2.open = function(options) {
          var deferred, url;
          angular.extend(defaults, options);
          deferred = $q.defer();
          url = oauth2.buildUrl();
          Popup.open(url, defaults.popupOptions).then(function(oauthData) {
            return oauth2.exchangeForToken(oauthData).then(function(response) {
              return deferred.resolve(response);
            })["catch"](function(response) {
              return deferred.reject(response);
            });
          })["catch"](function(error) {
            return deferred.reject(error);
          });
          return deferred.promise;
        };
        oauth2.exchangeForToken = function(oauthData) {
          return $http.post(defaults, url, {
            code: oauthData.code,
            clientId: defaults.clientId,
            redirectUri: defaults.redirectUri
          });
        };
        oauth2.buildUrl = function() {
          var baseUrl, qs;
          baseUrl = defaults.authorizationEndpoint;
          qs = oauth2.buildQueryString();
          return [baseUrl, qs].join('?');
        };
        oauth2.buildQueryString = function() {
          var keyValuePairs, urlParams;
          keyValuePairs = [];
          urlParams = ['defaultUrlParams', 'requiredUrlParams', 'optionalUrlParams'];
          angular.forEach(urlParams, function(params) {
            return angular.forEach(defaults[params], function(paramName) {
              var camelizedName, paramValue;
              camelizedName = Utils.camelCase(paramName);
              paramValue = defaults[camelizedName];
              return keyValuePairs.push([paramName, encodeURIComponent(paramValue)]);
            });
          });
          return keyValuePairs.map(function(pair) {
            return pair.join('=');
          }).join('&');
        };
        return oauth2;
      }

      return Oauth2;

    })(Factory);

    Oauth1 = (function(_super1) {
      __extends(Oauth1, _super1);

      function Oauth1($q, $http, Popup) {
        var defaults, oauth1;
        defaults = {
          url: null,
          name: null,
          popupOptions: null
        };
        oauth1 = {};
        oauth1.open = function(options) {
          var deferred;
          angular.extend(defaults, options);
          deferred = $q.defer();
          Popup.open(defaults.url).then(function(oauthData) {
            return oauth1.exchangeForToken(oauthData).then(function(response) {
              return deferred.resolve(response.data);
            });
          });
          return deferred.promise;
        };
        oauth1.exchangeForToken = function(oauthData) {
          oauthData = oauth1.buildQueryString(oauthData);
          return $http.get(defaults.url + '?' + oauthData);
        };
        oauth1.buildQueryString = function(obj) {
          var str;
          str = [];
          angular.forEach(obj, function(value, key) {
            return str.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
          });
          return str.join('&');
        };
        return oauth1;
      }

      return Oauth1;

    })(Factory);

    Popup = (function(_super1) {
      __extends(Popup, _super1);

      function Popup($q, $interval, $window) {
        var polling, popup, popupWindow;
        popupWindow = null;
        polling = null;
        popup = {};
        popup.open = function(url, options) {
          var deferred, optionsString;
          deferred = $q.defer();
          optionsString = popup.stringifyOptions(popup.prepareOptions(options || {}));
          popupWindow = $window.open(url, '_blank', optionsString);
          popupWindow.focus();
          popup.postMessageHandler(deferred);
          popup.pollPopup(deferred);
          return deferred.promise;
        };
        popup.pollPopup = function(deferred) {
          return polling = $interval(function() {
            if (popupWindow.closed) {
              $interval.cancel(polling);
              return deferred.reject({
                data: 'Authorization Failed'
              });
            }
          }, 35);
        };
        popup.postMessageHandler = function(deferred) {
          return $window.addEventListener('message', function(event) {
            if (event.origin === $window.location.origin) {
              popupWindow.close();
              if (event.data.error) {
                return deferred.reject({
                  data: event.data.error
                });
              } else {
                return deferred.resolve(event.data);
              }
            }
          });
        };
        popup.prepareOptions = function(options) {
          var height, width;
          width = options.width || 500;
          height = options.height || 500;
          return angular.extend({
            width: width,
            height: height,
            left: $window.screenX + (($window.outerWidth - width) / 2),
            top: $window.screenY + (($window.outerHeight - height) / 2.5)
          }, options);
        };
        popup.stringifyOptions = function(options) {
          var parts;
          parts = [];
          angular.forEach(options, function(value, key) {
            return parts.push(key + '=' + value);
          });
          return parts.join(',');
        };
        return popup;
      }

      return Popup;

    })(factory);

    RunBlock = (function(_super1) {
      __extends(RunBlock, _super1);

      function RunBlock($rootScope, $window, $location, Utils) {
        return {
          run: function() {
            var params, payload, qs, token;
            token = $window.localStorage[config.tokenName];
            if (token) {
              payload = SON.parse($window.atob(token.split('.')[1]));
              $rootScope[config.user] = payload.user;
            }
            params = $window.location.search.substring(1);
            qs = Object.keys($location.search()).length ? $location.search() : Utils.parseQueryString(params);
            if ($window.opener && $window.opener.location.origin === $window.location.origin) {
              if (qs.oauth_token && qs.oauth_verifier) {
                return $window.opener.postMessage({
                  oauth_token: qs.oauth_token,
                  oauth_verifier: qs.oauth_verifier
                }, $window.location.origin);
              } else if (qs.code) {
                return $window.opener.postMessage({
                  code: qs.code
                }, $window.location.origin);
              } else if (qs.error) {
                return $window.opener.postMessage({
                  error: qs.error
                }, $window.location.origin);
              }
            }
          }
        };
      }

      return RunBlock;

    })(Factory);

    Utils = (function(_super1) {
      __extends(Utils, _super1);

      function Utils() {
        this.camelCase = function(name) {
          return name.replace(/([\:\-\_]+(.))/g, function(_, separator, letter, offset) {
            if (offset) {
              letter.toUpperCase();
            }
            return letter;
          });
        };
        this.parseQueryString = function(keyValue) {
          var obj;
          obj = {};
          angular.forEach((keyValue || '').split('&'), function(keyValue) {
            var key, value;
            if (keyValue) {
              value = keyValue.split('=');
              key = decodeURIComponent(value[0]);
              return obj[key] = angular.isDefined(value[1]) ? decodeURIComponent(value[1]) : true;
            }
          });
          return obj;
        };
      }

      return Utils;

    })(Service);

    HttpInterceptor = (function(_super1) {
      __extends(HttpInterceptor, _super1);

      function HttpInterceptor($httpProvider) {
        $httpProvider.interceptors.push(function($q, $window, $location) {
          return {
            request: function(config) {
              if ($window.localStorage[config.tokenName]) {
                config.headers.Authorization = 'Bearer' + $window.lcalStorage[config.tokenName];
              }
              return config;
            },
            responseError: function(response) {
              if (response.status === 401) {
                delete $window.localStorage[config.tokenName];
                $location.path(config.loginRoute);
              }
              return $q.reject(response);
            }
          };
        });
      }

      return HttpInterceptor;

    })(config);

    onRun = (function(_super1) {
      __extends(onRun, _super1);

      function onRun(RunBlock) {
        RunBlock.run();
      }

      return onRun;

    })(Run);

    return Satellizer;

  })(Module);

}).call(this);
