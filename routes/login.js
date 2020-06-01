const express = require('express');
const utils = require('../utils');
const models = require('../models');
const router = express.Router();

router.use((req, res, next) => {
    if(req.session.logged) return res.redirect('/app');
    req.app.locals.layout = 'login';
    next();
});

router.get('/', (req, res) => {
    res.render('login/login');
});

router.get('/create', (req, res) => {
    res.render('login/register');
});

router.post('/create', async(req, res) => {
    const {email, password, username} = req.body;
    if(email.length <= 0 || email.length > 255 || password.length <= 0 || password.length > 300 || username.length <= 0 || username.length > 25) return res.json({type: 'error', content: 'Inserção de dados incorreta.'});

    const hasEmail = await models.user.find({email});
    if(hasEmail.length > 0) return res.json({type: 'error', content: 'Este email já está em uso.'});

    utils.user.create(username, email, password)
    .then(() => {
        res.json({type: 'redirect', content: '/app'});
    })
    .catch(() => res.json({type: 'error', content: 'Ocorreu um erro interno.'}));
});

router.post('/', async (req, res) => {
    const {email, password} = req.body;
    if(email.length <= 0 || email.length > 255 || password.length <= 0 || password.length > 300) return res.json({type: 'error', content: 'Inserção de dados incorreta.'})

    const auth = await utils.user.isValid(email, password);
    
    if(auth.success){
        req.session.logged = true;
        req.session.user = auth.user[0];
        return res.json({type: 'redirect', content: '/app'});
    }else{
        return res.json({type: 'error', content: 'Email ou senha inválidos.'});
    }

});

module.exports = router;