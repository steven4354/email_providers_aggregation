"use strict";

//==================
// home router
//==================

const Express = require("express");
const router = Express.Router();
const mongoose = require("mongoose");
const User = require("./../models/User");
const passport = require("passport");

// 1
router.get("/", (req, res) => {
  console.log("entering path /");

  if (req.user) {
    //uncomment for debugging
    // console.log("entering if of path /");
    // console.log("req.user =>", req.user);
    // console.log("req.user.username =>", req.user.username);

    User.findOne({username: req.user.username}, async (err, user) => {
      try {
        let s = {};
        if (req.user.googleAccessArray.length > 0) {
          const accessToken = user.googleAccessArray[0].token;
          let Gmail = require("node-gmail-api");
          let gmail = new Gmail(accessToken);
          s = await gmail.messages("label:inbox", {max: 10});

          await s.on("data", function(d) {
            console.log("d.snippet =>", d.snippet);
            console.log("d =>", d);
          });

          res.render("home", {
            user: req.user,
            accounts: user.googleAccessArray,
            json: s
          });
        }
      } catch (e) {
        console.log(e);
      }
    }); // end of User.find

    //end of if statement
  } else {
    console.log("entering else of path /");

    res.redirect("/login");
  }
});

// 2
router.get("/login", (req, res) => {
  res.render("login");
});

router.get("/register", (req, res) => {
  res.render("register");
});

// 3
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true
  })
);

// 4

router.post("/register", (req, res, next) => {
  const {username, password} = req.body;

  const user = new User({username, password});
  user.save((err, user) => {
    req.login(user, function(err) {
      if (err) {
        return next(err);
      }
      return res.redirect("/");
    });
  });
});

// 5
router.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

module.exports = router;
