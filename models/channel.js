const mongoose = require('mongoose');

module.exports = mongoose.model('channel', new mongoose.Schema({
    name: String,
    guildId: String,
    creation: {
        type: Date,
        default: new Date()
    }
}))