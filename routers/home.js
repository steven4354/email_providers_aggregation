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
router.get("/", async (req, res) => {
  try {
    if (req.user) {
      //uncomment for debugging
      // console.log("entering if of path /");
      // console.log("req.user =>", req.user);
      // console.log("req.user.username =>", req.user.username);
      let sessionStoredUser = req.user;
      let jsonObj = {};
      let eLogger = [];

      for (
        let i = 0;
        i <= sessionStoredUser.googleAccessArray.length - 1;
        i++
      ) {
        await new Promise(resolve => {
          const accessToken = sessionStoredUser.googleAccessArray[i].token;
          let Gmail = require("node-gmail-api");
          let gmail = new Gmail(accessToken);
          let s = gmail.messages("label:inbox", {max: 10});

          s.on("data", function(d) {
            console.log("d.id should appear before eLogger=>", d.id);
            eLogger.push({
              id: d.id,
              emailSnippet: d.snippet
            });
          });

          s.on("end", function() {
            resolve("break");
          });
        });
      }

      console.log("eLogger should appear at the end =>", eLogger);

      res.render("home", {
        user: sessionStoredUser,
        accounts: sessionStoredUser.googleAccessArray,
        jsonObj: eLogger
      });

      /*
      User.findOne({username: req.user.username}, async (err, user) => {
        let jsonObj = {};

        try {
          //collecting the emails
          if (user.googleAccessArray.length > 0) {
            for (let i = 0; i < user.googleAccessArray.length; i++) {
              const accessToken = user.googleAccessArray[i].token;
              let Gmail = require("node-gmail-api");
              let gmail = new Gmail(accessToken);
              let s = await gmail.messages("label:inbox", {max: 10});

              await s.on("data", function(d) {
                // uncomment for email collection debugging
                // console.log("d.snippet =>", d.snippet);
                // console.log("d =>", d);
                jsonObj[d.id] = d.snippet;
                console.log("jsonObj inside if =>", jsonObj);
              });

              await s.on("end", function() {
                res.render("home", {
                  user: sessionStoredUser,
                  accounts: user.googleAccessArray,
                  jsonObj: JSON.stringify(jsonObj)
                });
              });
            }
          } else {
            //end of email data collection
            console.log("jsonObj in else =>", jsonObj);

            res.render("home", {
              user: sessionStoredUser,
              accounts: user.googleAccessArray,
              jsonObj: JSON.stringify(jsonObj)
            });
          }

          //end of try
        } catch (e) {
          console.log(e);
        }
      }); // end of User.find

      //end of if statement
      */
    } else {
      console.log("entering else of path /");

      res.redirect("/login");
    }
  } catch (e) {
    console.log(e);
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
