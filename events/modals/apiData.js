const { Schema, model } = require('mongoose');

const apiData = Schema({
    JobID: Number,
    ConversionType: String,
    Input: Schema.Types.Mixed,
    Output: Schema.Types.Mixed,
    Status: String,
    CreatedOn: Date
});

module.exports = model('api-data', apiData);