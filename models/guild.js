const mongoose = require('mongoose');


module.exports = mongoose.model('guild', new mongoose.Schema({
    ownerId: String,
    name: String,
    channels: {
        type: Array,
        default: []
    },
    verified: {
        type: Boolean,
        default: false                                                                                     
    },
    creation: {
        type: Date,
        default: new Date()
    },
    members: {
        type: Array,
        default: []
    },
    icon: {
        type: String,
        default: 'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png'
    }
}))