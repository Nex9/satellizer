#Global Vars
config =
  logoutRedirect: '/'
  loginRedirect: '/'
  loginUrl: '/auth/login'
  signupUrl: '/auth/signup'
  signupRedirect: '/login'
  loginRoute: '/login'
  signupRoute: '/signup'
  user: 'currentUser'
  tokenName: 'satellizerToken'

providers =

  google:
    url: '/auth/google'
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/auth'
    redirectUri: window.location.origin
    scope: 'openid profile email'
    scopeDelimiter: ' '
    requiredUrlParams: ['scope']
    optionalUrlParams: ['display']
    display: 'popup'
    type: '2.0'
    popupOptions:
      width: 452
      height: 633

  facebook:
    url: '/auth/facebook'
    authorizationEndpoint: 'https://www.facebook.com/dialog/oauth'
    redirectUri: window.location.origin + '/'
    scope: 'email'
    scopeDelimiter: ','
    requiredUrlParams: ['display', 'scope']
    display: 'popup'
    type: '2.0'
    popupOptions:
      width: 481
      height: 269

  linkedin:
    url: '/auth/linkedin'
    authorizationEndpoint: 'https://www.linkedin.com/uas/oauth2/authorization'
    redirectUri: window.location.origin
    requiredUrlParams: ['state']
    scope: []
    scopeDelimiter: ' '
    state: 'STATE'
    type: '2.0'
    popupOptions:
      width: 527
      height: 582

  github:
    name: 'github'
    url: '/auth/github'
    authorizationEndpoint: 'https://github.com/login/oauth/authorize'
    redirectUri: window.location.origin
    scope: []
    scopeDelimiter: ' '
    type: '2.0'
    popupOptions:
      width: 1020
      height: 618

  twitter:
    url: '/auth/twitter'
    type: '1.0'

class Satellizer extends Module

  class $auth extends Provider
    constructor: ($q) ->

      config: config
      providers: providers

      facebook: (params) ->
        angular.extend providers.facebook, params

      google: (params) ->
        angular.extend providers.facebook, params

      linkedin: (params) ->
        angular.extend providers.linkedin, params

      github: (params) ->
        angular.extend providers.github, params

      twitter: (params) ->
        angular.extend providers.twitter, params

      oauthBase: (params) ->
        providers[params.name] = providers[params.name] or {}
        angular.extend providers[params.name], params

      oauth1: (params) =>
        @oauthBase(params)
        providers[params.name].type = '1.0'

      oauth2: (params) =>
        @oauthBase(params)
        providers[params.name].type = '2.0'

      $get: ($q, Oauth1, Oauth2, Local) ->

        $auth = {}

        $auth.authenticate = (name) ->
          deferred = $q.defer()

          provider = if providers[name].type is 1.0 then Oauth1 else Oauth2

          provider.open(provider[name])
            .then (response) ->
              Local.parseUser response.data.token, deferred
            .catch (response) ->
              deferred.reject response

          return deferred.promise

        $auth.login = (user) ->
          Local.login user

        $auth.signup = (user) ->
          Local.signup user

        $auth.logout = (user) ->
          Local.logout()

        $auth.isAuthenticated = () ->
          Local.isAuthenticated()

        return $auth

  class Local extends Factory
    constructor: ($q, $http, $rootScope, $location) ->

      local = {}

      local.parseUser = (token, deferred) ->
        payload = JSON.parse(window.atob(token.split('.')[1]))
        localStorage.setItem config.tokenName, token
        $rootScope[config.user] = payload.user
        $location.path config.loginRedirect
        deferred.resolve payload.user

      local.login = (user) ->
        deferred = $q.defer()

        $http.post config.loginUrl, user
          .then (response) ->
            local.parseUser response.data.token, deferred
          .catch (response) ->
            deferred.reject response

        return deferred.promise

      local.signup = (user) ->
        deferred = $q.defer()

        $http.post config.signupUrl, user
          .then () ->
            $location.path config.signupRedirect
            deferred.resolve()
          .catch (response) ->
            deferred.reject response

        return deferred.promise

      local.logout = () ->
        deferred = $q.defer()

        delete $rootScope[config.user]
        localStorage.removeItem config.tokenName
        $location.path config.logoutRedirect
        deferred.resolve()

        return deferred.promise

      local.isAuthenticated = () ->
        return Boolean $rootScope.currentUser

      return local

  class Oauth2 extends Factory
    constructor: ($q, $http, Utils, Popup) ->
      defaults =
        url: null
        name: null
        scope: null
        scopeDelimiter: null
        clientId: null
        redirectUri: null
        popupOptions: null
        authorizationEndpoint: null
        requiredUrlParams: null
        optionalUrlParams: null
        defaultUrlParams: ['response_type', 'client_id', 'redirect_uri']
        responseType: 'code'

      oauth2 = {}

      oauth2.open = (options) ->
        angular.extend defaults, options
        deferred = $q.defer()
        url = oauth2.buildUrl()

        Popup.open url, defaults.popupOptions
          .then (oauthData) ->
            oauth2.exchangeForToken oauthData
              .then (response) ->
                deferred.resolve response
              .catch (response) ->
                deferred.reject response
          .catch (error) ->
            deferred.reject error

        return deferred.promise

      oauth2.exchangeForToken = (oauthData) ->
        return $http.post defaults,url,
          code: oauthData.code
          clientId: defaults.clientId
          redirectUri: defaults.redirectUri

      oauth2.buildUrl = () ->
        baseUrl = defaults.authorizationEndpoint
        qs = oauth2.buildQueryString()
        return [baseUrl, qs].join('?')

      oauth2.buildQueryString = () ->
        keyValuePairs = []
        urlParams = ['defaultUrlParams', 'requiredUrlParams', 'optionalUrlParams']

        angular.forEach urlParams, (params) ->
          angular.forEach defaults[params], (paramName) ->
            camelizedName = Utils.camelCase(paramName)
            paramValue = defaults[camelizedName]
            keyValuePairs.push [paramName, encodeURIComponent(paramValue)]

        return keyValuePairs.map( (pair) ->
          return pair.join('=')
          ).join('&')

      return oauth2

  class Oauth1 extends Factory
    constructor: ($q, $http, Popup) ->
      defaults =
        url: null
        name: null
        popupOptions: null

      oauth1 = {}

      oauth1.open = (options) ->
        angular.extend defaults, options

        deferred = $q.defer()

        Popup.open defaults.url
          .then (oauthData) ->
            oauth1.exchangeForToken(oauthData)
              .then (response) ->
                deferred.resolve(response.data)

        return deferred.promise

      oauth1.exchangeForToken = (oauthData) ->
        oauthData = oauth1.buildQueryString oauthData
        return $http.get(defaults.url + '?' + oauthData)

      oauth1.buildQueryString = (obj) ->
        str = []
        angular.forEach obj, (value, key) ->
          str.push encodeURIComponent(key) + '=' + encodeURIComponent(value)
        return str.join('&')

      return oauth1

  class Popup extends factory
    constructor: ($q, $interval, $window) ->
      popupWindow = null
      polling = null

      popup = {}

      popup.open = (url, options) ->
        deferred = $q.defer()
        optionsString = popup.stringifyOptions popup.prepareOptions(options or {})

        popupWindow = $window.open url, '_blank', optionsString
        popupWindow.focus()

        popup.postMessageHandler deferred
        popup.pollPopup deferred

        return deferred.promise

      popup.pollPopup = (deferred) ->
        polling = $interval () ->
          if popupWindow.closed
            $interval.cancel polling
            deferred.reject {data: 'Authorization Failed'}
        , 35

      popup.postMessageHandler = (deferred) ->
        $window.addEventListener 'message', (event) ->
          if event.origin is $window.location.origin
            popupWindow.close()
            if event.data.error
              deferred.reject {data: event.data.error}
            else
              deferred.resolve event.data

      popup.prepareOptions = (options) ->
        width = options.width or 500
        height = options.height or 500

        return angular.extend
          width: width
          height: height
          left: $window.screenX + (($window.outerWidth - width) / 2)
          top: $window.screenY + (($window.outerHeight - height) / 2.5)
        , options

      popup.stringifyOptions = (options) ->
        parts = []
        angular.forEach options, (value, key) ->
          parts.push key + '=' + value

        return parts.join ','

      return popup

  class RunBlock extends Factory
    constructor: ($rootScope, $window, $location, Utils) ->
      return {
        run: () ->
          token = $window.localStorage[config.tokenName]
          if token
            payload = SON.parse($window.atob(token.split('.')[1]))
            $rootScope[config.user] = payload.user

          params = $window.location.search.substring(1)
          qs = if Object.keys($location.search()).length then $location.search() else Utils.parseQueryString params

          if $window.opener and $window.opener.location.origin is $window.location.origin
            if qs.oauth_token and qs.oauth_verifier
              $window.opener.postMessage({ oauth_token: qs.oauth_token, oauth_verifier: qs.oauth_verifier }, $window.location.origin)
            else if qs.code
              $window.opener.postMessage({ code: qs.code }, $window.location.origin)
            else if qs.error
              $window.opener.postMessage({ error: qs.error }, $window.location.origin)
      }

  class Utils extends Service
    constructor: () ->
      @camelCase = (name) ->
        return name.replace /([\:\-\_]+(.))/g, (_, separator, letter, offset) ->
          letter.toUpperCase() if offset
          return letter

      @parseQueryString = (keyValue) ->
        obj = {}
        angular.forEach (keyValue or '').split('&'), (keyValue) ->
          if keyValue
            value = keyValue.split '='
            key = decodeURIComponent value[0]
            obj[key] = if angular.isDefined value[1] then decodeURIComponent value[1] else true
        return obj

  class HttpInterceptor extends config
    constructor: ($httpProvider) ->
      $httpProvider.interceptors.push ($q, $window, $location) ->
        return {
          request: (config) ->
            if $window.localStorage[config.tokenName]
              config.headers.Authorization = 'Bearer' + $window.lcalStorage[config.tokenName]
            return config
          responseError: (response) ->
            if response.status is 401
              delete $window.localStorage[config.tokenName]
              $location.path config.loginRoute
            return $q.reject response
        }

  class onRun extends Run
    constructor: (RunBlock) ->
      RunBlock.run()
