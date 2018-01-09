const express = require("express");
const app = express();

// ----------------------------------------
// App Variables
// ----------------------------------------
app.locals.appName = "Email and Social Media Aggregator";

// ----------------------------------------
// ENV
// ----------------------------------------
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// ----------------------------------------
// Body Parser
// ----------------------------------------
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

// ----------------------------------------
// Sessions/Cookies
// ----------------------------------------
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");

app.use(cookieParser());
app.use(
  cookieSession({
    name: "session",
    keys: [process.env.SESSION_SECRET || "secret"]
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ----------------------------------------
// Flash Messages
// ----------------------------------------
const flash = require("express-flash-messages");
app.use(flash());

// ----------------------------------------
// Method Override
// ----------------------------------------
const methodOverride = require("method-override");
const getPostSupport = require("express-method-override-get-post-support");

app.use(
  methodOverride(
    getPostSupport.callback,
    getPostSupport.options // { methods: ['POST', 'GET'] }
  )
);

// ----------------------------------------
// Referrer
// ----------------------------------------
app.use((req, res, next) => {
  req.session.backUrl = req.header("Referer") || "/";
  next();
});

// ----------------------------------------
// Public
// ----------------------------------------
app.use(express.static(`${__dirname}/public`));

// ----------------------------------------
// Logging
// ----------------------------------------
const morgan = require("morgan");
const morganToolkit = require("morgan-toolkit")(morgan, {
  req: ["cookies" /*, 'signedCookies' */]
});

app.use(morganToolkit());

// ----------------------------------------
// Local Passport
// ----------------------------------------
const passport = require("passport");
app.use(passport.initialize());
app.use(passport.session());

// 1
const User = require("./models/User");
const mongoose = require("mongoose");
mongoose.connect("mongodb://localhost/test", {useMongoClient: true});

// 2
const LocalStrategy = require("passport-local").Strategy;

// 3
passport.use(
  new LocalStrategy(function(email, password, done) {
    User.findOne({email}, function(err, user) {
      if (err) return done(err);
      if (!user || !user.validPassword(password)) {
        return done(null, false, {message: "Invalid email/password"});
      }
      return done(null, user);
    });
  })
);

//4
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

// ----------------------------------------
// Facebook Passport
// ----------------------------------------
const FacebookStrategy = require("passport-facebook").Strategy;

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:3000/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos", "emails"]
    },

    function(accessToken, refreshToken, profile, done) {
      console.log("\x1b[34m", profile);

      const facebookId = profile.id;
      const displayName = profile.displayName;

      const photoURL = profile.photos[0].value;
      const email = profile.emails[0].value;

      User.findOne({email}, function(err, user) {
        if (err) return done(err);

        if (!user) {
          // Create a new account if one doesn't exist
          user = new User({email, facebookId, displayName, photoURL});
          user.save((err, user) => {
            if (err) return done(err);
            done(null, user);
          });
        } else {
          // Otherwise, return the extant user.
          user.facebookId = facebookId;
          user.photoURL = photoURL;
          user.save();
          done(null, user);
        }
      });
    }
  )
);

app.get(
  "/auth/facebook",
  passport.authenticate("facebook", {
    scope: ["email", "publish_actions", "user_photos"]
  })
);

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

// ----------------------------------------
// Linkedin Strategy
// ----------------------------------------
var LinkedInStrategy = require("passport-linkedin-oauth2").Strategy;

passport.use(
  new LinkedInStrategy(
    {
      clientID: process.env.LINKEDIN_KEY,
      clientSecret: process.env.LINKEDIN_SECRET,
      callbackURL: "http://localhost:3000/auth/linkedin/callback",
      scope: ["r_emailaddress", "r_basicprofile"],
      state: true
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        const linkedinId = profile.id;
        const displayName = profile.displayName;
        const summary = profile._json.summary;

        const email = profile.emails[0].value;

        let user = await User.findOne({email}, (err, obj) => {
          if (obj) {
            obj.linkedinId = linkedinId;
            obj.summary = summary;
            obj.save();
          }
        });

        if (!user) {
          user = new User({email, linkedinId, displayName, summary});
          await user.save();
        }
        done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.get("/auth/linkedin", passport.authenticate("linkedin"));

app.get(
  "/auth/linkedin/callback",
  passport.authenticate("linkedin", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

// ----------------------------------------
// Twitter Strategy
// ----------------------------------------

var TwitterStrategy = require("passport-twitter").Strategy;

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "http://localhost:3000/auth/twitter/callback"
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        console.log(profile);
        const twitterId = profile.id;
        const displayName = profile.displayName;
        const followers = profile._json.followers_count;

        let user = new User({twitterId, followers, displayName});
        await user.save();

        done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.get("/auth/twitter", passport.authenticate("twitter"));

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", {
    successRedirect: "/register",
    failureRedirect: "/login"
  })
);

// ----------------------------------------
// Google Strategy
// ----------------------------------------

var GoogleStrategy = require("passport-google-oauth20").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback"
    },
    async function(accessToken, refreshToken, profile, done) {
      try {
        console.log(profile);
        const googleId = profile.id;
        const displayName = profile.displayName;
        const email = profile.emails[0].value;
        const googlePhotoUrl = profile.photos[0].value;

        let user = await User.findOne({email}, (err, obj) => {
          if (obj) {
            obj.googleId = googleId;
            obj.googlePhotoUrl = googlePhotoUrl;
            obj.save();
          }
        });

        if (!user) {
          user = new User({email, displayName, googlePhotoUrl});
          await user.save();
        }
        done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["email"]
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

// ----------------------------------------
// Redirect to Routers
// ----------------------------------------
const home = require("./routers/home");
app.use("/", home);

// ----------------------------------------
// Template Engine
// ----------------------------------------
const expressHandlebars = require("express-handlebars");
const helpers = require("./helpers");

const hbs = expressHandlebars.create({
  helpers: helpers,
  partialsDir: "views/",
  defaultLayout: "application"
});

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

// ----------------------------------------
// Server
// ----------------------------------------
const port = process.env.PORT || process.argv[2] || 3000;
const host = "localhost";

let args;
process.env.NODE_ENV === "production" ? (args = [port]) : (args = [port, host]);

args.push(() => {
  console.log(`Listening: http://${host}:${port}\n`);
});

if (require.main === module) {
  app.listen.apply(app, args);
}

// ----------------------------------------
// Error Handling
// ----------------------------------------
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.stack) {
    err = err.stack;
  }
  res.status(500).render("errors/500", {error: err});
});

module.exports = app;
