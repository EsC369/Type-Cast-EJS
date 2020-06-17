const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const config = require("config");
const Routes = require("./routes/api/routes");
const User = require("./models/User");
const port = process.env.PORT || 5000;
const path = require("path");
const passport = require("passport");

// Passport Middleware:
app.use(passport.initialize());

// Db Config:
// const db = config.get("mongoURI");
const connectDB = require("./config/db");

// Declare paths, static and parsers middle ware:
app.use(express.static(path.join(__dirname + "/public")));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// Session:
const session = require("express-session");
app.use(session({
  secret: config.get("sessionSecret"),
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 600000 } // One hour session - will change later on.
}));
// Flash Error Messages
const flash = require("express-flash");
app.use(flash());

// Routes:
app.use("/", Routes);

// Connect Mongo: - updated method, async:
connectDB();
// mongoose.connect(db, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
//   .then(() => console.log("Mongo DB Connected..."))
//   .catch(err => console.log(err));

// Listening
app.listen(port, () => {
  console.log(`Server Running On Port: ${port}`)
});