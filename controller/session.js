const session = require('express-session');

module.exports = session({
    secret: require('crypto').randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});