const mongoose = require('mongoose');
const TeamScoreSchema = new mongoose.Schema({
    teamid: String,
    points: Number,
    completedChallenges: [String],
    lastUpdated: Date
});
module.exports = mongoose.model('TeamScore', TeamScoreSchema);
