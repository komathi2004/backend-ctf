const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    teamid: String,
    email: { type: String, unique: true },
    password: String,
    username: { type: String, unique: true, sparse: true }  // sparse:true allows multiple nulls
  });

module.exports = mongoose.model('User', userSchema);







