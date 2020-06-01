const mongoose = require('mongoose');

module.exports = mongoose.model('user', new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    token: String,
    discriminator: Number,
    emblems: Array,
    avatar: {
        type: String,
        default: 'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png'
    },
    staff: {
        type: Boolean,
        default: false                                                                                     
    },
    bot: {
        type: Boolean,
        default: false                                                                                     
    },
    creation: {
        type: Date,
        default: new Date()
    },
    guilds: {
        type: Array,
        default: []
    }
}))