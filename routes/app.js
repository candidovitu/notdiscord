const express = require('express');
const router = express.Router();
const models = require('../models');
const utils = require('../utils');
const socket = require('../controller/io');
const cloudinary = require('cloudinary');
const multer = require('multer');
const fs = require('fs');
const config = require('../config.json');

cloudinary.config(config.cloudinary);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'tmp/')
    },
    filename: (req, file, cb) => {
      cb(null, Date.now()+'-'+file.originalname)
    }
});

const upload = multer({storage});

router.use((req, res, next) => {
    if(!req.session.logged) return res.redirect('/login');
    req.app.locals.layout = 'app';
    req.app.locals.session = req.session.user;
    next();
});

router.get('/', async (req, res) => {
    const guilds = await models.guild.find({members: req.session.user._id}).lean();
    res.render('app/hub', {guilds});
});

router.get('/guild/:guildId', async (req, res) => {
    const {guildId} = req.params;

    const guild = await models.guild.find({_id: guildId});
    if(guild.length <= 0) return res.redirect('/app');
    const channels = await models.channel.find({guildId: guild[0]._id});
    const channelId = channels[0]._id.toString();

    res.redirect(`/app/channels/${guildId}/${channelId}`);
});

router.get('/channels/:guildId/:channelId', async (req, res) => {
    const {guildId, channelId} = req.params;
    const guild = await models.guild.find({_id: guildId, channels: channelId}).lean();
    if(guild.length <= 0) return res.redirect('/app');
    const channels = await models.channel.find({guildId: guild[0]._id}).lean();
    const currentChannel = await models.channel.find({_id: channelId}).lean();
    const userGuilds = await models.guild.find({members: req.session.user._id}).lean();
    const channelMessages = await models.message.find({guildId, channel: currentChannel[0]._id}).lean();

    req.session.currentChannel = currentChannel[0]._id.toString();

    res.render('app/channel', {guild: guild[0], channels, currentChannel: currentChannel[0], guilds: userGuilds, channelMessages});
});


router.post('/guild/create', async (req, res) => {
    const {name} = req.body;
    if(name.length <= 0 || name.length > 50) return res.json({type: 'error', content: 'Nome inválido'});

    try{
        const guild = await models.guild.create({name, ownerId: req.session.user._id, members: [req.session.user._id]});
        const channel = await models.channel.create({guildId: guild.id, name: 'general'});
        utils.guild.addChannel(guild._id, channel._id);
        utils.guild.addUser(req.session.user._id, guild._id);
        res.json({type: 'redirect', content: `/app/channels/${guild._id}/${channel._id}`});
    }catch(err){
        console.error(err);
        res.json({type: 'error', content: 'Ocorreu um erro interno.'});
    } 
});

router.post('/channel/create', async (req, res) => {
    const {name, guildId} = req.body;
    if(name.length <= 0 || name.length > 50 || !guildId) return res.json({type: 'error', content: 'Inserção de dados incorreta.'});
    if(typeof name != 'string') return res.json({type: 'error', content: 'O nome do canal deve ser um texto'});
    try{
        const guild = await models.guild.find({_id: guildId});
        if(guild[0].ownerId != req.session.user._id) return res.json({type: 'error', content: 'Acesso negado.'});
        const channel = await models.channel.create({guildId, name});
        utils.guild.addChannel(guildId, channel._id);
        return res.json({type: 'redirect', content: `/app/channels/${guildId}/${channel._id}`});
    }catch(err){
        console.log(err);
        return res.json({type: 'error', content: 'Ocorreu um erro interno.'});
    }
});

router.post('/channel/delete', async (req, res) => {
    const {channelId, guildId} = req.body;
    if(!channelId || !guildId) return res.json({type: 'error', content: 'Inserção de dados incorreta.'});
    try{
        const guild = await models.guild.find({_id: guildId});
        if(guild[0].ownerId != req.session.user._id) return res.json({type: 'error', content: 'Acesso negado.'});
        models.channel.find({_id: channelId})
        .then(async () => {
            await models.channel.deleteOne({_id: channelId});
            await models.message.deleteMany({channel: channelId});
            await models.guild.updateOne(req.body.id, { $pull: { channels: channelId } });
            return res.json({type: 'redirect', content: `/app/guild/${guildId}/`});
        }).catch(() => {
            if(channel.length <= 0) return res.json({type: 'error', content: 'Canal inexistente'});
        });
    }catch(err){
        console.log(err);
        return res.json({type: 'error', content: 'Ocorreu um erro interno.'});
    }
});

router.post('/message/create', async (req, res) => {
    const {guildId, channelId, content} = req.body;
    if(!guildId || !channelId || content.length <= 0 || content.length > 2000){
        res.json({type: 'hidden', content: 'Não foi possível enviar sua mensagem.'});
        return socket.emit(req.session.user.token, 'to user', 'Não foi possível enviar sua mensagem.');
    }

    const guild = await models.guild.find({_id: guildId, members: req.session.user._id});
    if(guild.length <= 0) return res.json({type: 'error', content: 'Guild inexistente.'});
    const channel = await models.channel.find({_id: channelId, guildId});
    if(channel.length <= 0) return res.json({type: 'error', content: 'Canal inexistente.'});

    models.message.create({channel: channelId, guildId, author: req.session.user._id, content, attach: false});

    socket.emit(req.session.currentChannel, 'new message', {
        user: {
            id: req.session.user._id
        },
        message: {
            content,
            attach: false,
            createdDate: new Date()
        }
    });

    return res.json({type: 'code', code: 200});
});

router.post('/attach/upload/:guildId/:channelId', upload.single('attach'), (req, res) => {
    const {guildId, channelId} = req.params;
    if(req.file.size >= 52428800) return socket.emit(req.session.user.token, 'to user', 'O arquivo excede o limite (50 mb) de upload.');

    const mimetype = req.file.mimetype;
    let fileType;

    if(mimetype.startsWith('image')){
        fileType = 'image';
    }else if(mimetype.startsWith('video')){
        fileType = 'video';
    }else{
        return socket.emit(req.session.user.token, 'to user', 'Não foi possível enviar o anexo');
    }

    models.guild.find({_id: guildId})
    .then(() => {
        cloudinary.v2.uploader.upload('tmp/'+req.file.filename, {
            resource_type: fileType
        }, (error, result) => {
            fs.unlinkSync('tmp/'+req.file.filename);
            if(error) return socket.emit(req.session.user.token, 'to user', 'Não foi possível enviar o anexo');
            models.message.create({channel: channelId, guildId, author: req.session.user._id, content: result.secure_url, attach: true});
            socket.emit(channelId, 'new message', {
                user: {
                    id: req.session.user._id
                },
                message: {
                    content: result.secure_url,
                    attach: true,
                    createdDate: new Date()
                }
            });
        });
        return res.json({type: 'code', code: 200});
    })
    .catch(() => {
        socket.emit(req.session.user.token, 'to user', {content: 'Não foi possível enviar o anexo'});
    });

});

router.get('/join/:guildId', async (req, res) => {
    const {guildId} = req.params;

    const guild = await models.guild.find({_id: guildId});
    if(guild.length <= 0) return res.redirect('/app');

    const userIsJoined = await models.guild.find({_id: guildId, members: req.session.user._id});
    if(userIsJoined.length <= 0){
        models.message.create({channel: guild[0].channels[0], guildId, author: '5ed40eab7ed6161a3c57d6a9', content: `${req.session.user.username} entrou na guild.`});
        socket.emit(guild[0].channels[0].toString(), 'new message', {
            user: {
                id: '5ed40eab7ed6161a3c57d6a9'
            },
            message: {
                content: `${req.session.user.username} entrou na guild.`,
                createdDate: new Date()
            }
        });
    
        utils.guild.addUser(req.session.user._id, guildId);
        utils.guild.addUserToGuild(req.session.user._id, guildId);
    }

    return res.redirect('/app/guild/'+guildId);

});

router.get('/user/name/:userId', async (req, res) => {
    const {userId} = req.params;
    const user = await models.user.find({_id: userId})
    .then(user => {
        return res.json({
            username: user[0].username,
            avatarURL: user[0].avatar,
            bot: user[0].bot
        });
    })
    .catch(() => {
        if(user.length <= 0) return res.json({
            username: 'Deleted User',
            avatarURL: 'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png',
            bot: false
        });
    });
});

router.get('/user/details/:userId', async (req, res) => {
    const {userId} = req.params;
    models.user.find({_id: userId})
    .then(user => {
        return res.json({
            username: user[0].username,
            avatarURL: user[0].avatar,
            discriminator: user[0].discriminator,
            badges: user[0].emblems,
            bot: user[0].bot
        });
    })
    .catch(() => {
        return res.json({
            username: 'Deleted User',
            discriminator: "0000",
            avatarURL: 'https://discordapp.com/assets/322c936a8c8be1b803cd94861bdfa868.png',
            badges: [],
            bot: false
        });
    });
});

router.post('/guild/exit', async (req, res) => {
    const {guildId} = req.body;
    if(!guildId) return res.json({type: 'error', content: 'Requisição inválida.'});

    const guild = await models.guild.find({_id: guildId, members: req.session.user._id});
    if(guild.length <= 0) return res.json({type: 'error', content: 'Servidor inexistente.'});
    if(guild[0].ownerId === req.session.user._id) return res.json({type: 'error', content: 'Você é o dono da guild'});

    utils.guild.removeUser(req.session.user._id.toString(), guildId);
    utils.guild.removeUserFromGuild(req.session.user._id.toString(), guildId);

    return res.json({type: 'redirect', content: '/app'});
});

router.post('/channel/typing', (req, res) => {
    const user = req.session.user;
    socket.emit(req.session.currentChannel, 'startTyping', {username: user.username, id: user._id});
    return res.json({type: 'code', code: 200});
});


module.exports = router;