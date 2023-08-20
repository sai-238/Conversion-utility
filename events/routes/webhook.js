const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");

const {
    transport, validateEmail
} = require('../functions.js');

//------------------------------------------------

router.post("/webhook", bodyParser.text(), async (req, res) => {
    const code = await validateEmail(req.body);
    await transport.sendMail({
        from: '"utility 👻" <foo@example.com>',
        to: req.body,
        subject: "API Key",
        text: code.toString(),
    });
    res.send("Email sent successfully");
});

module.exports = router;