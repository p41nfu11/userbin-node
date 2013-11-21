Userbin for Node.js
===================

Userbin for Node.js adds user authentication, login flows and user management to your **Connect**- or **Express**-based app.

[Userbin](https://userbin.com) provides a set of login, signup, and password reset forms that drop right into your application without any need of styling or writing markup. Connect your users via traditional logins or third party social networks. We take care of linking accounts across networks, resetting passwords, and keeping everything safe and secure.

[Create a free account](https://userbin.com) at Userbin to start accepting users in your application.

Installation
------------

1. Install the `userbin` package.

    ```bash
    $ npm install userbin
    ```

1. Include the Userbin node packages in your app.js or server.js.

    ```javascript
    var userbin = require('userbin');
    ```

1. Configure the Userbin module with the credentials you got from signing up.

    ```javascript
    userbin.config({
      appId: 'YOUR_APP_ID',
      apiSecret: 'YOUR_API_SECRET'
    });
    ```

    If you don't configure the `appId` and `apiSecret`, the `USERBIN_APP_ID` and `USERBIN_API_SECRET` environment variables will be used instead. This may come in handy on Heroku.

1. Insert the Userbin middleware after the cookieParser (and add the cookieParser if not present):

    ```javascript
    app.use(connect.cookieParser());  // or express.cookieParser()
    app.use(userbin.authenticate());
    ```


Usage
-----

### Forms

An easy way to integrate Userbin is via the [Widget](https://userbin.com/docs/javascript#widget), which will take care of building forms, validating input and provides a drop-in design that adapts nicely to all devices.

The Widget is fairly high level, so remember that you can still use Userbin with your [own forms](https://userbin.com) if it doesn't fit your use-case.

The following links will open up the Widget with the login or the signup form respectively.

```html
<a class="ub-login">Log in</a>
```

```html
<a class="ub-signup">Sign up</a>
```

The logout link will clear the session and redirect the user back to your root path:

```html
<a class="ub-logout">Log out</a>
```


### The current user

#### Express

Userbin keeps track of the currently logged in user which can be accessed in your controllers and views through the global `currentUser` property.

```html
Welcome to your account, #{currentUser.email}
```

To check if a user is logged in, use `userLoggedIn`.

```html
if userLoggedIn
  You are logged in!
```

#### Connect

In Connect the currently logged in user is accessed through the `req.user` property which needs to be explicitly passed to your views.

```javascript
app.get('/', function (req, res) {
  res.render('home', {currentUser: req.currentUser});
});
```

Configuration
-------------

The call to `userbin.config` supports a range of options additional to the Userbin credentials. None of the following options are mandatory.

### protectedPath

By default, Userbin reloads the current page on a successful login. If you set the `protectedPath` option, users will be redirected to this path instead.

Once set, this path and any sub-path of it will be protected from unauthenticated users by instead rendering a login form.

```javascript
userbin.config({ protectedPath: '/dashboard' })
```

### rootPath

By default, Userbin redirects the users to your root path after logging out. If you want to override this behavior, you can set the `rootPath` option:

```javascript
userbin.config({ rootPath: '/login' })
```

### createUser and findUser

By default, `currentUser` will reference a *limited* Userbin profile, enabling you to work without a database. If you override the functions `createUser` and `findUser`, the current user will instead reference one of your models. The `profile` object is an *extended* Userbin profile. For more information about the available attributes in the profile see the [Userbin profile](https://userbin.com/docs/concepts) documentation.

```javascript
userbin.config({
  createUser: function(profile, done) {
    var user = User.new({
      userbinId         : profile.id,
      email             : profile.email,
      photo             : profile.image
    });
    user.save(function(err, user) {
      done(user);
    });
  },

  findUser: function(userbinId, done) {
    User.findOne({ userbinId: userbinId }, function(err, user) {
      done(user);
    });
  }
})
```

### skipScriptInjection

By default, the Userbin middleware will automatically insert a `<script>` tag before the closing `</body>` in your HTML files in order to handle forms, sessions and user tracking. This script loads everything asynchronously, so it won't affect your page load speed. However if you want to have control of this procedure, set `skipScriptInjection` to true and initialize the library yourself. To do that, checkout the [Userbin.js configuration guide](https://userbin.com/docs/javascript#configuration).

```ruby
userbin.config({ skipScriptInjection: true });
```


Further configuration and customization
---------------------------------------

Your Userbin dashboard gives you access to a range of functionality:

- Configure the appearance of the login widget to feel more integrated with your service
- Connect 10+ OAuth providers like Facebook, Github and Google.
- Use Markdown to generate mobile-ready transactional emails
- Invite users to your application
- See who is logging in and when
- User management: block, remove and impersonate users
- Export all your user data from Userbin


Documentation
-------------
For complete documentation go to [userbin.com/docs](https://userbin.com/docs)
