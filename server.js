const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');
const TeamScore = require('./models/TeamScore');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: true, 
    credentials: true
}));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
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

passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: 'User not found' });
        if (user.password !== password) return done(null, false, { message: 'Incorrect password' });
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Authentication check middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Not authenticated', status: 'error' });
};

app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Missing required fields', status: 'error' });
    }
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists', status: 'error' });
        }
        const teamid = `team-${Math.random().toString(36).slice(2, 11)}`;
        user = new User({ email, password, teamid });
        await user.save();
        res.json({ message: 'Signup successful', status: 'success' });
    } catch (err) {
        res.status(500).json({ message: 'Error signing up', status: 'error', error: err.message });
    }
});

app.post('/login', passport.authenticate('local'), (req, res) => {
    res.json({ message: 'Login successful', status: 'success', teamid: req.user.teamid });
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { 
            return res.status(500).json({ message: 'Error logging out', error: err.message });
        }
        req.session.destroy(() => {
            res.json({ message: 'Logout successful', status: 'success' });
        });
    });
});

// Add the team-score endpoint
app.get('/team-score', isAuthenticated, async (req, res) => {
    try {
        const teamid = req.user.teamid;
        const teamScore = await TeamScore.findOne({ teamid });
        
        if (!teamScore) {
            return res.json({ points: 0, completedChallenges: [] });
        }
        
        res.json(teamScore);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching team score', error: err.message });
    }
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

const challengePoints = {
    "easy-1": 10, "easy-2": 10, "easy-3": 10, "easy-4": 10, "easy-5": 10, "easy-6": 10, "easy-7": 10,
    "medium-1": 20, "medium-2": 20, "medium-3": 20, "medium-4": 20, "medium-5": 20, "medium-6": 20, "medium-7": 20,
    "hard-1": 50
};

app.post("/submit-flag", isAuthenticated, async (req, res) => {
    console.log("Received data:", req.body);
    const { challengeId, flag } = req.body;
    const teamid = req.user.teamid; 
    
    if (!teamid || !challengeId || !flag) {
        console.log("Missing required fields");
        return res.status(400).json({ message: "Missing required fields", status: "error" });
    }

    const isCorrect = challengeFlags[challengeId] === flag;

    if (isCorrect) {
        let teamScore = await TeamScore.findOne({ teamid });
        if (!teamScore) {
            teamScore = new TeamScore({ teamid, points: 0, completedChallenges: [] });
        }
        if (!teamScore.completedChallenges.includes(challengeId)) {
            const pointsToAdd = challengePoints[challengeId] || 0;
            teamScore.points += pointsToAdd;
            teamScore.completedChallenges.push(challengeId);
            teamScore.lastUpdated = new Date();
            console.log(`Team ${teamid} awarded ${pointsToAdd} points for challenge: ${challengeId}`);
            await teamScore.save();
        }
        return res.json({ message: "Flag submitted successfully!", status: true });
    } else {
        return res.json({ message: "Incorrect flag", status: false });
    }
});

app.get("/leaderboard", async (req, res) => {
    try {
        const leaderboard = await TeamScore.find().sort({ points: -1, lastUpdated: 1 });
        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ message: "Error fetching leaderboard", error: err.message });
    }
});

app.listen(4000, () => {
    console.log('Server started on http://localhost:4000');
});











// const cors = require('cors');
// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const session = require('express-session');
// const passport = require('passport');
// const LocalStrategy = require('passport-local').Strategy;
// const User = require('./models/User');
// const TeamScore = require('./models/TeamScore');
// const cookieParser = require('cookie-parser');
// const MongoStore = require('connect-mongo');
// require('dotenv').config();

// const app = express();
// app.use(cors({
//     origin: true, 
//     credentials: true
// }));
// mongoose.connect(process.env.MONGO_URI)
//     .then(() => console.log('MongoDB Atlas Connected'))
//     .catch(err => console.log('MongoDB Connection Error:', err));

// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(cookieParser());
// app.use(session({
//     secret: 'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }) 
// }));
// app.use(passport.initialize());
// app.use(passport.session());

// passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
//     try {
//         const user = await User.findOne({ email });
//         if (!user) return done(null, false, { message: 'User not found' });
//         if (user.password !== password) return done(null, false, { message: 'Incorrect password' });
//         return done(null, user);
//     } catch (err) {
//         return done(err);
//     }
// }));

// passport.serializeUser((user, done) => done(null, user.id));
// passport.deserializeUser(async (id, done) => {
//     try {
//         const user = await User.findById(id);
//         done(null, user);
//     } catch (err) {
//         done(err);
//     }
// });

// // Authentication check middleware
// const isAuthenticated = (req, res, next) => {
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     res.status(401).json({ message: 'Not authenticated', status: 'error' });
// };

// app.post('/signup', async (req, res) => {
//     const { email, password } = req.body;
//     if (!email || !password) {
//         return res.status(400).json({ message: 'Missing required fields', status: 'error' });
//     }
//     try {
//         let user = await User.findOne({ email });
//         if (user) {
//             return res.status(400).json({ message: 'User already exists', status: 'error' });
//         }
//         const teamid = team-${Math.random().toString(36).substr(2, 9)};
//         user = new User({ email, password, teamid });
//         await user.save();
//         res.json({ message: 'Signup successful', status: 'success' });
//     } catch (err) {
//         res.status(500).json({ message: 'Error signing up', status: 'error', error: err.message });
//     }
// });

// app.post('/login', passport.authenticate('local'), (req, res) => {
//     res.json({ message: 'Login successful', status: 'success', teamid: req.user.teamid });
// });

// app.get('/logout', (req, res) => {
//     req.logout(function(err) {
//         if (err) { 
//             return res.status(500).json({ message: 'Error logging out', error: err.message });
//         }
//         res.json({ message: 'Logout successful', status: 'success' });
//     });
// });

// // Add the team-score endpoint
// app.get('/team-score', isAuthenticated, async (req, res) => {
//     try {
//         const teamid = req.user.teamid;
//         const teamScore = await TeamScore.findOne({ teamid });
        
//         if (!teamScore) {
//             return res.json({ points: 0, completedChallenges: [] });
//         }
        
//         res.json(teamScore);
//     } catch (err) {
//         res.status(500).json({ message: 'Error fetching team score', error: err.message });
//     }
// });

// const challengeFlags = {
//     "easy-1": "CTF{crypto_123}",
//     "easy-2": "CTF{hidden_text}",
//     "easy-3": "CTF{sql_injection}",
//     "easy-4": "CTF{buffer_overflow}",
//     "easy-5": "CTF{reverse_me}",
//     "easy-6": "CTF{file_metadata}",
//     "easy-7": "CTF{osint_winner}",
//     "medium-1": "CTF{advanced_crypto}",
//     "medium-2": "CTF{audio_steg}",
//     "medium-3": "CTF{xss_vulnerability}",
//     "medium-4": "CTF{buffer_exploitation}",
//     "medium-5": "CTF{auth_bypass}",
//     "medium-6": "CTF{data_recovery}",
//     "medium-7": "CTF{social_trace}",
//     "hard-1": "CTF{ultimate_challenge}"
// };

// const challengePoints = {
//     "easy-1": 10, "easy-2": 10, "easy-3": 10, "easy-4": 10, "easy-5": 10, "easy-6": 10, "easy-7": 10,
//     "medium-1": 20, "medium-2": 20, "medium-3": 20, "medium-4": 20, "medium-5": 20, "medium-6": 20, "medium-7": 20,
//     "hard-1": 50
// };

// app.post("/submit-flag", isAuthenticated, async (req, res) => {
//     console.log("Received data:", req.body);
//     const { challengeId, flag } = req.body;
//     const teamid = req.user.teamid; // Get teamid from the authenticated user
    
//     if (!teamid || !challengeId || !flag) {
//         console.log("Missing required fields");
//         return res.status(400).json({ message: "Missing required fields", status: "error" });
//     }

//     const isCorrect = challengeFlags[challengeId] === flag;

//     if (isCorrect) {
//         let teamScore = await TeamScore.findOne({ teamid });
//         if (!teamScore) {
//             teamScore = new TeamScore({ teamid, points: 0, completedChallenges: [] });
//         }
//         if (!teamScore.completedChallenges.includes(challengeId)) {
//             const pointsToAdd = challengePoints[challengeId] || 0;
//             teamScore.points += pointsToAdd;
//             teamScore.completedChallenges.push(challengeId);
//             teamScore.lastUpdated = new Date();
//             console.log(Team ${teamid} awarded ${pointsToAdd} points for challenge: ${challengeId});
//             await teamScore.save();
//         }
//         return res.json({ message: "Flag submitted successfully!", status: true });
//     } else {
//         return res.json({ message: "Incorrect flag", status: false });
//     }
// });

// app.get("/leaderboard", async (req, res) => {
//     try {
//         const leaderboard = await TeamScore.find().sort({ points: -1, lastUpdated: 1 });
//         res.json(leaderboard);
//     } catch (err) {
//         res.status(500).json({ message: "Error fetching leaderboard", error: err.message });
//     }
// });

// app.listen(4000, () => {
//     console.log('Server started on http://localhost:4000');
// }); 