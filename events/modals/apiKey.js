const { Schema, model } = require('mongoose');

const apiKey = Schema({
    APIKey: String,
    UserEmail: String,
    CreatedOn: Date,
    Expire: Boolean
});

module.exports = model('api-key', apiKey);