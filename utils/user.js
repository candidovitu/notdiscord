const crypto = require('crypto');
const bcrypt = require('bcrypt')
const userModel = require('../models/user');

function createDiscriminator(){
    return Math.floor(1000 + Math.random() * 9000);
}

async function discriminatorExists(discriminator){
    const user = await userModel.find({discriminator});
    return (user.length > 0);
}

async function generateDiscriminator(){
    let discriminator = createDiscriminator();
    if(await discriminatorExists(discriminator)) return generateDiscriminator();
    return discriminator;
}

async function generateToken(){
    let token = require('crypto').randomBytes(30).toString('hex');
    if(await hasToken(token)) return generateToken();
    return token;
}

async function hasToken(token){
    const user = await userModel.find({token});
    return (user.length > 0);
}

module.exports = {
    create: async (username, email, password) => {
        const hashPassword = bcrypt.hashSync(password, 10);
        const discriminator = await generateDiscriminator();
        const token = await generateToken();

        return userModel.create({
            username,
            email,
            token,
            password: hashPassword,
            discriminator
        });
    },
    isValid: async (email, password) => {
        const user = await userModel.find({email});
        if(user.length <= 0) return {success: false};

        const hashPassword = user[0].password;
        const comparePassword = bcrypt.compareSync(password, hashPassword);
        if(!comparePassword) return {success: false};
        if(user[0].bot) return {success: false};

        return {
            success: true,
            user
        };
    }
}