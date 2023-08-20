const { Schema, model } = require('mongoose');

const apiCount = Schema({
    API: String,
    count: Number,
    expirationDate: Date,
});

module.exports = model('api-count', apiCount);