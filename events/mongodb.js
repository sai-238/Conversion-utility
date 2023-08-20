const {
    connect,
    set
} = require('mongoose');


async function mongodb() {
    const dburl = process.env.MONGOURL;
    
    set('strictQuery', false);
    connect(dburl, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(console.log('MongoDB Connected'));
}

module.exports = { mongodb }