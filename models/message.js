const mongoose = require('mongoose');

module.exports = mongoose.model('message', new mongoose.Schema({
    attach: Boolean,
    content: String,
    guildId: String,
    author: String,
    channel: String,
    creation: {
        type: Date,
        default: Date.now
    }
}))