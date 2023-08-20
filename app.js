const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const { checkExpiredCooldown } = require('./events/removeCooldown.js');
const { mongodb } = require('./events/mongodb.js');

//MongoDB ------------------------------------------------------

mongodb();
setInterval(checkExpiredCooldown, 1000); 

// --------------------------------------------------------------

var app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.get("/", function (req, res) {
    res.send("Hello World!");
});

const apiWebhook = require('./events/routes/webhook.js');
const apiJobs = require('./events/routes/jobs.js');

app.use('/', apiWebhook);
app.use('/', apiJobs);

const PORT = process.env.PORT;
app.listen(PORT, function () {
    console.log("Server running on http://localhost:3000");
});

process.on('unhandledRejection', async (err, promise) => {
    console.error(`ERROR unhandledRejection: ${err}`);
});
process.on('uncaughtException', async (err, origin) => {
    console.error(`ERROR uncaughtException: ${err}`);
});