import express from "express";
import cors from "cors";
import mongoose from "mongoose"; //1
import crypto from "crypto"; // 4
import bcrypt from "bcryptjs"; // 6

//Setting up the db and creating the cluster auth //2
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/auth"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// 5 Create a user object that has an access token 
const User = mongoose.model('User', {
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex") // Creates a random unique string of 128 characters
  }
});

// 8 Create a middleware defining using express = this will tell express to continue execution if everything is OK
const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header("Authorization") }); // Header is called authorization
  if (user) {
    req.user = user; //attach the user object to the request
    next();
  } else {
    res.status(401).json({ loggedOut: true }); //If false
  }
};


// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello Technigo!");
});

// 7 POST endpoint try to register the user
app.post("/users", async (req, res) => {
  try {
    const { name, email, password } = req.body; //retreive the name, email and password from the json rquest body
    const user = new User({ name, email, password: bcrypt.hashSync(password) }) // create an instance of the mongoose user model, use hash function to store the hashed value of the password
    user.save(); //save user to the DB
    res.status(201).json({ id: user._id, accessToken: user.accessToken }); //feedback if successful
  } catch (err) {
    res.status(400).json({ message: "Could not create user", errors: err.errors });
  }
});

// 9 
app.get("/secrets", authenticateUser); // 9 Protect endpoint 
app.get("/secrets", (req, res) => { // 3
  res.json({ secret: "This is a super secret message." });
});

// 10 - allow user to login
// req.body.password = declare password from the request
// user.password = hashed password that is tsored in the DB
// bcrypt.compareSync = chechs if the 2 lines above are equal
app.post("/sessions", async (req, res) => {
  const user = await User.findOne({email: req.body.email}) //getting user from db, expecting user to give email and password to login
  if(user && bcrypt.compareSync(req.body.password, user.password)) { //if the user returned from the DB exists and that the password sent in the json body matches the password that we have stored in the database
    res.json({userId: user._id, accessToken: user.accessToken});
  } else {
    res.json({notFound: true});
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});


