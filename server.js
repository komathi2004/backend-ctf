const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: true, 
    credentials: true
}));
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Atlas Connected'))
    .catch(err => console.log('MongoDB Connection Error:', err));


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }) 
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    { usernameField: 'email' }, 
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: 'User not found' });
        if (user.password !== password) return done(null, false, { message: 'Incorrect password' });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  ));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });


app.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const teamid = "TEAM" + Date.now(); 

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        const newUser = new User({ teamid, email, password }); 
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully', teamid });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
});



app.post('/login', async (req, res) => {
    try {
        console.log("Login attempt:", req.body); 
        const { email, password } = req.body;
        console.log("Email:", email, "Password:", password); 
        
        const user = await User.findOne({ email });
        console.log("User found:", user ? "Yes" : "No"); 

        if (!user || user.password !== password) {
            console.log("Authentication failed"); 
            return res.status(401).json({ message: 'Invalid email or password', status: 'error' });
        }

        req.session.user = user;
        console.log("Session created:", req.sessionID); 
        
        res.cookie('session_token', req.sessionID, {  
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production'
        });

        res.json({ message: 'Login successful', user });
    } catch (err) {
        console.error("Login error:", err); 
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});




app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.json({ message: 'Welcome to the dashboard', user: req.session.user });
    } else {
        res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }
});


app.get('/logout', (req, res) => {  
    req.session.destroy();
    res.clearCookie('session_token');
    res.json({ message: 'Logged out successfully' });
});


const challengeFlags = {
    "easy-1": "CTF{crypto_123}",
    "easy-2": "CTF{hidden_text}",
    "easy-3": "CTF{sql_injection}",
    "easy-4": "CTF{buffer_overflow}",
    "easy-5": "CTF{reverse_me}",
    "easy-6": "CTF{file_metadata}",
    "easy-7": "CTF{osint_winner}",
    "medium-1": "CTF{advanced_crypto}",
    "medium-2": "CTF{audio_steg}",
    "medium-3": "CTF{xss_vulnerability}",
    "medium-4": "CTF{buffer_exploitation}",
    "medium-5": "CTF{auth_bypass}",
    "medium-6": "CTF{data_recovery}",
    "medium-7": "CTF{social_trace}",
    "hard-1": "CTF{ultimate_challenge}"
};


app.post("/submit-flag", (req, res) => {
    console.log("Received data:", req.body); 
    const { challengeId, flag } = req.body; 

    if (!challengeId || !flag) { 
        console.log("Missing required fields");
        return res.status(400).json({ message: "Missing required fields", status: "error" });
    }

    const isCorrect = checkFlag(challengeId, flag);

    if (isCorrect) {
        console.log(`Flag correct for challenge: ${challengeId}`);
        return res.json({ message: "Flag submitted successfully!", status: true });
    } else {
        console.log(`Incorrect flag for challenge: ${challengeId}`);
        return res.json({ message: "Incorrect flag", status: false });
    }
});


function checkFlag(challengeId, flag) {
    console.log(`Checking flag for challenge: ${challengeId}`);
    const correctFlag = challengeFlags[challengeId];
    console.log(`Correct flag: ${correctFlag}, Submitted flag: ${flag}`);

    return correctFlag === flag; 
}



app.listen(4000, () => {
    console.log('Server started on http://localhost:4000');
});



