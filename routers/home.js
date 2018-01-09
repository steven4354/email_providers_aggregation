'use strict';

//==================
// home router
//==================

const Express = require('express');
const router = Express.Router();
const mongoose = require('mongoose');
const User = require('./../models/User');
const passport = require('passport');

// 1
router.get('/', (req, res) => {
  if (req.user) {
    res.render('home', {
      user: req.user,
      picture: req.user.photoURL,
      summary: req.user.summary,
      followers: req.user.followers,
      googlePhotoUrl: req.user.googlePhotoUrl
    });
  } else {
    res.redirect('/login');
  }
});

// 2
router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

// 3
router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  })
);

// 4

router.post('/register', (req, res, next) => {
  const { email, password } = req.body;

  if (req.session.passport.user) {
    User.find({ _id: req.session.passport.user }, (err, objArr) => {
      objArr[0].email = email;
      objArr[0].password = password;
      objArr[0].save();
      res.redirect('/');
    });
  }
  const user = new User({ email, password });
  user.save((err, user) => {
    req.login(user, function(err) {
      if (err) {
        return next(err);
      }
      return res.redirect('/');
    });
  });
});

// 5
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

module.exports = router;
