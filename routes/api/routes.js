const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const config = require("config");
var db = config.get('mongoURI');
const mongoose = require("mongoose");
const path = require("path");
const validator = require("validator");
const { check, validationResult } = require('express-validator');
const nodemailer = require("nodemailer");
const ObjectId = require('mongodb').ObjectID;
const webpush = require("web-push")
const passport = require("passport");
const dotenv = require("dotenv")
const strategy = require("passport-facebook")
const LocalStorage = require('node-localstorage').LocalStorage;

//REGEX:
const regexThree = /^\d{5}(?:[-\s]\d{4})?$/
const regexTwoPhone = /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/
const regexFourPhone = /^\s*(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?\s*$/
const regexFivePhone = /^(\+\d{1,2}\s?)?1?\-?\.?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/
const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
const emailREGEX = new RegExp(regex)
const phoneREGEX = new RegExp(regexFivePhone)
const zipREGEX = new RegExp(regexThree)
const maxSize = 1 * 1024 * 1024; // for 1MB 

var desiredSaves = [];

// Image Uploading Middlewares:
// Set The Storage Engine
const multer = require('multer');
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function(req, file, cb){
    cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Init Upload
// Set your file size limit
const upload = multer({
  storage: storage,
  limits:{fileSize: maxSize},
  fileFilter: function(req, file, cb){
    checkFileType(file, cb);
    }
}).single('myImage');

// Check File Type
function checkFileType(file, cb){
  // Allowed ext
  const filetypes = /jpeg|jpg|png|gif/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if(mimetype && extname){
    return cb(null,true);
  } else {
    cb('Images Only!');
  }
}

router.post("/facebook", (req, res) => {
  res.redirect("/auth/facebook");
})

router.get("/facebook-email", (req, res) => {
  res.render("fb-email");
})
//----------------- facebook login Left off On reversing user info for input and output
// @route POST /facebook-login
// @desc  Login With Facebook API
router.post("/facebook-login", (req, res) => {
  const { emailFB, emailFB2 } = req.body;

  if(!emailFB || emailFB === ""){
    console.log("Blank Email")
    req.flash("error", "For FB Login, We Only Require Your Email...");
    res.redirect("/register-page");
  }else if(!emailREGEX.test(emailFB)){
    console.log("Invalid Email")
    req.flash("error", "Please Enter A Valid Email");
    res.redirect("/facebook-email");
  }else if(emailFB !== emailFB2){
    console.log("Email Mismatch")
    req.flash("error", "Emails Didn't Match!");
    res.redirect("/facebook-email");
  }else{
    let lowerEmail = emailFB.toLowerCase()
    console.log("email lower case", lowerEmail)

    console.log("Desired Saves So far: ", desiredSaves)
    let name = desiredSaves[0].firstName + " " + desiredSaves[0].lastName;
    let fb_id = desiredSaves[0].fb_id;
    // console.log("name, email, fb_id: ", name, email, fb_id)
    // Check for existing user:
    User.findOne({ email: lowerEmail })
    .then(user => {
      if (user) {
        console.log("User Already Exists!")
        req.flash("error", "User Already Exists!")
        return res.redirect("/");
      }
      const newUser = new User({
        name,
        premium: true,
        email: lowerEmail,
        fb_login: true,
        fb_id:  fb_id,
        img: "../uploads/default-photo.jpg"
      })

      console.log("TEST HERE FACEBOOK LOGIN NEW USER CREATION: ", newUser)
      
      newUser.save((err) => {
        if (err) {
          console.log("User Already Exists!")
          req.flash("error", "User Already Exists")
          return res.redirect("/");
        }
      });
          console.log("success")
          // Add Into Session:
          req.session.user_id = newUser._id;
          sendEmail(lowerEmail, name)
          // req.flash("error", "Please Check Your Email From Typecast!")
          // res.render("success", {user: newUser, msg: 'Account Created! Please Check Your Email!'});
          res.render("profile", {user: newUser, msg: 'Account Created! Please Check Your Email!'}); 
    });
  }
});







const FacebookStrategy = strategy.Strategy;

dotenv.config();
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["email", "name"]
    },
    function(accessToken, refreshToken, profile, done) {
      const { id, first_name, last_name } = profile._json;
      const userData = {
        fb_id: id,
        firstName: first_name,
        lastName: last_name
      };
      desiredSaves.length = 0;
      console.log("Desired Saves Array Should Be Empty: ", desiredSaves)
      desiredSaves.push(userData);
      console.log("New Desired Saves: facebook User data: ", desiredSaves)
      done(null, profile);
    }));

router.get("/auth/facebook", passport.authenticate("facebook"));

router.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", {
    successRedirect: "/fb-email",
    failureRedirect: "/fail"
  })
);

//  LEFT OFF HERE WHERE ABOUT TO IMPLEMENT NEW PAGE FOR after succesfull facebook login. Then request email from user, 
// then CREATE NEW USER AND WHATNOT FROM NE WPOAT ROUTE WITH FACEBOOK CREDENTIALS. REMOVE CURRENT FUNCTIONALITY
// AND VALIDATIONS OF SIGN UP WITH FACEBOOK FORM/BUTTON. WHEN YOU CLIKC fb BUTTON, MAKE IT AUTOMATICALLY
// GO TO THE FB LOGIN EXTERNALLY. ONCE ITS SUCCESSFUL, THEN ASK FOR EMAIL TO CONCLUDE THE USER MODEL SAVE.

router.get("/fail", (req, res) => {
  // res.send("Failed attempt");
  console.log("Failed To Login With facebook")
  req.flash("error", "Failed To Login With Facebook!")
  req.redirect("/register-page")
});

router.get("/fb-email", (req, res) => {
  console.log("FB-login Successful, requesting email from user...")
  res.render("fb-email")
});

// router.post("/fb-success", (req, res) => {
  
// End of Facebook Routes: //--------------------






// @route POST /upload
// @desc  Uploads image to server/local-storage
router.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if(err){
      if(err.code === "LIMIT_FILE_SIZE"){
        console.log("Image to big!")
        req.flash("error", "Image Size To Big! 1 MB Maximum!");
        res.redirect('/edit-profile');
        }else{
        console.log("hitting here err", err)
        req.flash("error", "Images Only!");
        res.redirect('/edit-profile');
        }
      }else if(req.file == undefined){
        console.log("hitting here under undefined")
        req.flash("error", "No File Selected!");
        res.redirect('/edit-profile');
      }else{
        if (req.session.user_id) {
          User.findOne({ _id: new ObjectId(req.session.user_id) }, function (err, user) {
            if (err) {
              req.flash("error", "Must be logged in!")
              res.redirect("/");
            }
            else {
              const { name, email, zipcode, nickname} = user
              const updatedUser = {
                name,
                zipcode,
                nickname,
                img: `uploads/${req.file.filename}`
              }

              console.log("Updated User Image: ", updatedUser);
              User.updateOne({ "_id": new ObjectId(req.session.user_id)}, {$set: updatedUser}, (error, result) => {
                if(error) {
                    // return res.status(500).send(error);
                    console.log("Failed to upload image", error)
                    req.flash("error", "Failed to upload image");
                    return res.redirect("/profile-page")
                }
                console.log("Successfully Updated!")
                return res.render("edit-profile",  {user:updatedUser, msg: "Image Successfully Updated!" });
                // res.send(result);
        
            });
              // res.render("success", { user: user });
            }
          });
        }

        
        // res.render('success', {
        //   msg: 'Image Successfully Uploaded!',
        //   file: `uploads/${req.file.filename}`
        // });
      }
  });
});

// @route GET /
// @desc  Renders The Index/Login Reg Page
router.get("/", function (req, res) {
  res.render("index");
});

// @route GET /
// @desc  Renders The Profile Page
router.get("/profile", function (req, res) {
  res.render("success");
});

// @route GET /payment
// @desc  Renders The Payment Page
router.get("/payment-page", function (req, res) {
  res.render("payment");
});

// @route GET /register-page
// @desc  Renders The Register Page
router.get('/register-page', (req, res) => {
  res.render('index');
});

// @route GET /login-page
// @desc  Renders The Login Page
router.get('/login-page', (req, res) => {
  res.render('login');
});

 // @route GET /about-page
// @desc  Renders The About Page
router.get('/about-page', (req, res) => {
  res.render('about');
});

// @route GET /profile
// @desc  Renders The Profile Page
router.get('/profile-page', (req, res) => {
  if (req.session.user_id) {
    User.findOne({ _id: req.session.user_id }, function (err, user) {
      if (err) {
        req.flash("error", "Must be logged in!")
        res.redirect("/login-page");
      }
      else {
        res.render("profile", { user: user });
      }
    });
  }
  else {
    req.flash("error", "Must be logged in!")
    res.redirect("/login-page");
  }
});

// @route GET /edit-profile
// @desc  Renders The Edit profile Page
router.get('/edit-profile', (req, res) => {
  if (req.session.user_id) {
    User.findOne({ _id: req.session.user_id }, function (err, user) {
      if (err) {
        req.flash("error", "Must be logged in!")
        res.redirect("/login-page");
      }
      else {
        res.render("edit-profile", { user: user, msg: "Edit YOUR Profile!" });
      }
    });
  }
  else {
    req.flash("error", "Must be logged in!")
    res.redirect("/login-page");
  }
});

// @route GET /admin-login
// @desc  Login in as admin to skip into typecast
router.get("/admin-login", function (req, res) {
  user = {
    _id: "5ed80482a57d32f956f1291d",
    name: "Admin",
    email: "Admin@admin.com",
    password: 123123
  }
  req.session.user_id = user._id
  
  res.render("success", { user: user });
});

// @route GET /update-profile
// @desc  Form to add 
router.post("/update-profile", (req, res) => {
  if (req.session.user_id) {
    User.findOne({ _id: new ObjectId(req.session.user_id) }, function (err, user) {
      if (err) {
        req.flash("error", "Must be logged in!")
        res.redirect("/login-page");
      }
      else {
        const { email,  phone, img } = user
        const { name, zipcode, nickname } = req.body
        const updatedUser = {
          name,
          email,
          zipcode,
          nickname,
          phone,
          img
        }
        if(!name || name === ""){
          console.log("Name Blank")
          req.flash("error", "Please Enter Your Name!");
          res.redirect("/edit-profile");
        }
        else if(!nickname || nickname === ""){
          console.log("Nickname Blank")
          req.flash("error", "Please Enter your Nickname!");
          res.redirect("/edit-profile");
        // }else if(!country || country === "default"){
        //   console.log("Country Blank")
        //   req.flash("error", "Your Country Must Be Selected!");
        //   res.redirect("/edit-profile");
        // }else if(!gender || gender === "default"){
        //   console.log("Gender Blank");
        //   req.flash("error", "Your Gender Must Be Selected!");
        //   res.redirect("/edit-profile");
        }else if(!zipcode || zipcode === ""){
          console.log("zipcode Blank")
          req.flash("error", "Please Enter your Zipcode!");
          res.redirect("/edit-profile");
        }else if(!zipREGEX.test(zipcode)) {
            console.log("Zipcode Is Invalid")
            req.flash("error", "Please Enter A Valid Zipcode")
            res.redirect("/edit-profile");
          }else{
          console.log("Updated User Info: ", updatedUser);
          User.updateOne({ "_id": new ObjectId(req.session.user_id)}, {$set: updatedUser}, (error, result) => {
            if(!result) {
                // return res.status(500).send(error);
                console.log("Failed to update Profile Info.")
                req.flash("error", "Failed To Update Profile Info");
                return res.redirect("/success")
            }
            console.log("Successfully Updated!")
            return res.render("edit-profile",  {user:updatedUser, msg: "Profile Successfully Updated! THANK YOU!" });
            // res.send(result);
          });
        }
      }
    });
  }
});

// @route GET /login
// @desc  For Loggin In A User
router.post('/login', (req, res) => {
  console.log("hitting here login")
  const { emailLog, passwordLog } = req.body;
  const emailLower = emailLog.toLowerCase();

  // Simple validation:
  if (!emailLog || !passwordLog) {
    console.log("Please Enter All Login Fields!")
    req.flash("error", "Please Enter All Login Fields")
    res.redirect("/login-page");;
  }
  else if(!emailREGEX.test(emailLog)){
    console.log("Invalid Email")
    req.flash("error", "Please Enter A Valid Email")
    res.redirect("/login-page");
  }
  else {
    User.findOne({ email: emailLower }, function (err, user) {
      if (err) {
        req.flash("error", "User Doesnt Exists");
        res.redirect("/login-page");
      }
      else {
        if (user) { // Means user was found
          console.log("found user with email " + user.email);
          bcrypt.compare(passwordLog, user.password, function (err, result) {
            if (result) {
              req.session.user_id = user._id;
              // res.render("success", {user: user, msg: "Successfully Logged in! Welcome Back!"});
              res.render("profile", {user: user, msg: "Successfully Logged in! Welcome Back!"});
            }
            else {
              console.log("Wrong Password!")
              req.flash("error", "Wrong Password!")
              res.redirect("/login-page");
            }
          });
        }
        else { // User not found
          console.log("User Not Found!")
          req.flash("error", "User Not found")
          res.redirect("/login-page")
        }
      }
    })
  }
});

// @route GET /success
// @desc  The TypeCast Official Logged In Home Page
router.get("/success", function (req, res) {
  if (req.session.user_id) {
    User.findOne({ _id: req.session.user_id }, function (err, user) {
      if (err) {
        req.flash("error", "Must be logged in!")
        res.redirect("/");
      }
      else {
        res.render("profile", { user: user });
      }
    });
  }
  else {
    req.flash("error", "Must be logged in!")
    res.redirect("/");
  }
});

// @route GET /logout
// @desc  Logout A User
router.post("/logout", function (req, res) {
  req.session.user_id = null;
  res.redirect("/")
});

// @route POST /register
// @desc  Registers A New User
router.post("/register", (req, res) => {
  // Destructuring, Pulling the values out from request.body
  const { name, email, password, password2, phone, zipcode, nickname, gender, country } = req.body;
  let lowerEmail = email.toLowerCase()
  console.log("email lower case", lowerEmail)
  //Simple Basic Validation: --------
  // if(!phone || phone === ""){
  //   console.log("Phone Is blank")
  //   req.flash("error", "Please Enter A Phone Number")
  //   res.redirect("/register-page");
  // }
  // else if(/^\d+$/.test(phone)){
  //   console.log("Phone number is all digits. Running check for proper length")
  //   if(phone.length < 10 || phone.length > 10) {
  //     console.log("Phone number is less or more than 10!")
  //     // req.flash("error", "Please Enter A Valid Phone Number")
  //     // res.redirect("/register-page");
  //   }
  // }
  // else if(!phoneREGEX.test(phone)) {
  //   console.log("Phone Is Invalid")
  //   req.flash("error", "Please Enter A Valid Phone Number")
  //   res.redirect("/register-page");
  // }
  // else if(!zipcode || zipcode === ""){
  //   console.log("Zip Is blank")
  //   req.flash("error", "Please Enter Zipcode")
  //   res.redirect("/register-page");
  // }
  // else if(!zipREGEX.test(zipcode)) {
  //   console.log("Phone Is Invalid")
  //   req.flash("error", "Please Enter A Valid Zipcode")
  //   res.redirect("/register-page");
  // }
  // else if(!nickname || nickname === ""){
  //   console.log("Nickname Is blank")
  //   req.flash("error", "Please Enter A Nickname")
  //   res.redirect("/register-page");
  // }
  if(!name || name === ""){
    console.log("Name Is blank")
    req.flash("error", "Please Enter A Name")
    res.redirect("/register-page");
  }
  else if(!email || email === ""){
    console.log("email Is blank")
    req.flash("error", "Please Enter An Email")
    res.redirect("/register-page");
  }
  else if(!emailREGEX.test(email)){
    console.log("Invalid Email")
    req.flash("error", "Please Enter A Valid Email")
    res.redirect("/register-page");
  }
  // else if(!gender || gender === "" || gender === "default"){
  //   console.log("Gender Is blank")
  //   req.flash("error", "Please Enter A Gender")
  //   res.redirect("/register-page");
  // }
  else if(!password || password === ""){
    console.log("Password Is blank")
    req.flash("error", "Please Enter A Password")
    res.redirect("/register-page");
  }else if(password != password2){
    console.log("Passwords DO NOt match!")
    req.flash("error", "Passwords Do not Match!")
    res.redirect("/register-page");
  }else{
    // ENd of validation ------------
    // Check for existing user:
    User.findOne({ email: email })
      .then(user => {
        if (user) {
          console.log("User Already Exists!")
          req.flash("error", "User Already Exists!")
          return res.redirect("/");
        }
        const newUser = new User({
          name,
          email: lowerEmail,
          zipcode,
          nickname,
          phone,
          gender,
          country,
          password,
          img: "../uploads/default-photo.jpg"
        })
        // Create salt and hashed password:
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err
            newUser.password = hash;
            console.log("HASHED Password", hash);
            newUser.save((err) => {
              if (err) {
                console.log("User Already Exists!")
                req.flash("error", "User Already Exists")
                return res.redirect("/");
              }
            })
            
            console.log("success")
            // Add Into Session:
            req.session.user_id = newUser._id;
            sendEmail(email, name)
            // req.flash("error", "Please Check Your Email From Typecast!")
            // res.render("success", {user: newUser, msg: 'Account Created! Please Check Your Email!'});
            res.render("profile", {user: newUser, msg: 'Account Created! Please Check Your Email!'});
            
          });
        });
      });
  }
});

// Helper function to send email to users:
function sendEmail(email, name){
  console.log(`Sending Email To ${email}...`)
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: config.get("email"), // generated ethereal user
      pass: config.get("password"), // generated ethereal password
    },
  });
  // try{
      
      // Email template:
    // const output = `<table cellspacing="0" cellpadding="0" border="0" style="color:#333;background:#fff;padding:0;margin:0;width:100%;font:15px/1.25em 'Helvetica Neue',Arial,Helvetica"> <tbody><tr width="100%"> <td valign="top" align="left" style="background:#eef0f1;font:15px/1.25em 'Helvetica Neue',Arial,Helvetica"> <table style="border:none;padding:0 18px;margin:50px auto;width:500px"> <tbody> <tr width="100%" height="60"> <td valign="top" align="left" style="border-top-left-radius:4px;border-top-right-radius:4px;background:#27709b url("/images/typecast-logo-solo.png" title="Trello" style="font-weight:bold;font-size:18px;color:#fff;vertical-align:top" class="CToWUd"> </td> </tr> <tr width="100%"> <td valign="top" align="left" style="background:#fff;padding:18px">

    // <h1 style="font-size:20px;margin:16px 0;color:#333;text-align:center"> Let's collaborate! </h1>
    
    // <p style="font:15px/1.25em 'Helvetica Neue',Arial,Helvetica;color:#333;text-align:center"> You are invited to the TypeCast Group: </p>
    // <p style="font:15px/1.25em 'Helvetica Neue',Arial,Helvetica;color:#333;text-align:center"> Thank you for registering! Your typecasting awaits! </p>
    
    // <div style="background:#f6f7f8;border-radius:3px"> <br>
    
    // <p style="text-align:center"> <a href="#" style="color:#306f9c;font:26px/1.25em 'Helvetica Neue',Arial,Helvetica;text-decoration:none;font-weight:bold" target="_blank">Typecast.Life</a> </p>
    
    // <p style="font:15px/1.25em 'Helvetica Neue',Arial,Helvetica;margin-bottom:0;text-align:center"> <a href="#" style="border-radius:3px;background:#3aa54c;color:#fff;display:block;font-weight:700;font-size:16px;line-height:1.25em;margin:24px auto 6px;padding:10px 18px;text-decoration:none;width:180px" target="_blank"> See the organization</a> </p>
    
    // <br><br> </div>
    
    // <p style="font:14px/1.25em 'Helvetica Neue',Arial,Helvetica;color:#333"> <strong>What's Typecast?</strong> It's the easiest way to find out what others perceive of you! <a href="https://type-cast.herokuapp.com/about-page" style="color:#306f9c;text-decoration:none;font-weight:bold" target="_blank">Learn more »</a> </p>
    
    // </td>
    
    // </tr>
    
    // </tbody> </table> </td> </tr></tbody> </table>`;

    var output = `Welcome to TypeCast.Life, ${name}!

    Let's get started! Head to https://www.typecast.life and update your profile. Once that's out of the way, feel free to select a few sample questions as a challenge to other users. It will be fun!
    
    As a reward for pre-registering on the site before the launch, you have been awarded 12 credits towards Premium membership. Check back often to discover new ways to earn more credits!
    
    Sincerely,
    The TypeCast.Life team
    
    P.S. This is automated email. Please do not reply to this message`;

    var mailOptions = {
      from: '"TypeCast.Life! "<no-Reply@gmail.com>', // sender address
      to: `${email}`, // list of receivers
      subject: "Hello ✔ WELCOME TO TYPECAST.LIFE!",
      text: output
  };

  // Send email and handle response:
  transporter.sendMail(mailOptions, function(error, info){
  if(error){
      console.log("error:", error)
  }else{
      console.log('Message sent: ' + info.response);
      // res.json({message: info.response});
  };
  });
    
};

module.exports = router;