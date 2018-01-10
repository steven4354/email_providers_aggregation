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
mongoose.connect("mongodb://localhost/email-aggregation", {
  useMongoClient: true
});

// 2
const LocalStrategy = require("passport-local").Strategy;

// 3
passport.use(
  new LocalStrategy(function(username, password, done) {
    console.log("username =>", username);
    console.log("password =>", password);
    User.findOne({username}, function(err, user) {
      if (err) return done(err);
      if (!user || !user.validPassword(password)) {
        return done(null, false, {message: "Invalid username/password"});
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
// Google Strategy
// ----------------------------------------

var GoogleStrategy = require("passport-google-oauth2").Strategy;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
      passReqToCallback: true
    },
    async function(request, accessToken, refreshToken, profile, done) {
      try {
        // uncomment below for debugging
        // console.log("google passport profile =>", profile);
        // console.log("google passport refreshToken =>", refreshToken);
        // console.log("google passport accessToken =>", accessToken);
        //
        // console.log("request.User in the authentification =>", request.User);
        // console.log("request.user in the authentification =>", request.user);

        const username = request.user.username;
        const googlePhotoUrl =
          "https://mindthegap.ng/wp-content/uploads/2017/11/gmail-login.png";
        const email = profile.email;
        const photo = profile.photos[0].value;
        // uncomment below for debugging
        // console.log("profile.photos => ", profile);

        let newObj = {
          photo: photo || googlePhotoUrl,
          token: accessToken,
          email: email
        };
        // const googleId = profile.id;
        // const displayName = profile.displayName;

        let user = await User.findOne({username}, (err, obj) => {
          if (obj) {
            obj.googleAccessArray = [...obj.googleAccessArray, newObj];
            obj.save();
          }
        });

        done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

//remove the old gmail login
//allowing new gmails to be added
app.get("/auth/accountclearing/:accounttype", (req, res, next) => {
  res.redirect(
    "https://www.google.com/accounts/Logout?continue=https://appengine.google.com/_ah/logout?continue=http://localhost:3000/auth/google"
  );
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose"
    ]
  })
);

app.get("/auth/google/callback", async (req, res, next) => {
  try {
    // uncomment below for debugging
    // console.log("req =>", req);

    await passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/login"
    })(req, res, next);
  } catch (e) {
    console.log(e);
  }
});

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
