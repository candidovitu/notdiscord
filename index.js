const express = require('express');
const mongoose = require('mongoose');
const config = require('./config.json');
const routes = require('./routes');
const exphbs = require('express-handlebars');
const session = require('./controller/session');
const http = require('http');
const cors = require('cors');
const hbs = require('handlebars');
const moment = require('moment');

const app = express();
const server = http.createServer(app);
const socket = require('./controller/io').init(server);
require('./controller/socket')(socket);

moment.locale('pt-br');

hbs.registerHelper('toString', str => {
  return str.toString();
});

hbs.registerHelper('formatDate', date => {
  return moment(date).calendar();
});

hbs.registerHelper('ifEquals', (arg1, arg2, options) => {
  return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

mongoose.connect('mongodb://localhost:27017/discord', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('[MongoDB]', 'Connected!'))
  .catch(err => console.log('[MongoDB]', err));

app.engine('.hbs', exphbs({extname: '.hbs'}));
app.set('view engine', '.hbs');
app.use("/static", express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.set('trust proxy', 1);
app.use(session);

app.get('/', (req, res) => res.redirect('/app'));
app.use('/app', routes.app);
app.use('/login', routes.login);

server.listen(config.port, () => {
    console.log('Running at *:', config.port);
});

module.exports = {
  emit:(event, value) => {
    console.log(event, value);
  }
}