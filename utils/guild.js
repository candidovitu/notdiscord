const guildModel = require('../models/guild');
const userModel = require('../models/user');

// https://stackoverflow.com/questions/3954438/how-to-remove-item-from-array-by-value/3954451
Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
        what = a[--L];
        while ((ax = this.indexOf(what)) !== -1) {
            this.splice(ax, 1);
        }
    }
    return this;
};

module.exports = {
    addChannel: async (guildId, channelId) => {
        const guild = await guildModel.find({_id: guildId});
        const channels = guild[0].channels;
        channels.push(channelId.toString());
        return guildModel.updateOne({_id: guildId}, {channels});

    },
    addUser: async (userId, guildId) => {
        const user = await userModel.find({_id: userId});
        const guilds = user[0].guilds;
        guilds.push(guildId.toString());
        return userModel.updateOne({_id: userId}, {guilds});
    },
    addUserToGuild: async (userId, guildId) => {
        const guild = await guildModel.find({_id: guildId});
        const users = guild[0].members;
        users.push(userId.toString());
        return guildModel.updateOne({_id: guildId}, {members: users});
    },
    removeUser: async (userId, guildId) => {
        const user = await userModel.find({_id: userId});
        const guilds = user[0].guilds;
        guilds.remove(guildId.toString());
        return userModel.updateOne({_id: userId}, {guilds});
    },
    removeUserFromGuild: async (userId, guildId) => {
        const guild = await guildModel.find({_id: guildId});
        const users = guild[0].members;
        users.remove(userId.toString());
        return guildModel.updateOne({_id: guildId}, {members: users});
    }
}