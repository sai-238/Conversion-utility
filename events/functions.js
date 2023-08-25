const voucher_codes = require("voucher-code-generator");
const fs = require("fs");
let converter = require("json-2-csv");
const nodemailer = require("nodemailer");
require("dotenv").config();

const keyCooldowns = new Map();
const COOLDOWN_DURATION = 60000;

const APICountModals = require('../events/modals/apiCount.js');
const APIKeyModals = require('../events/modals/apiKey.js');
const APIKeyDataModals = require('../events/modals/apiData.js');

// Variables -------------------------------------------

const TRANSUSER = process.env.TRANSUSER;
const TRANSPASS = process.env.TRANSPASS;
var transport = nodemailer.createTransport({
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: TRANSUSER,
        pass: TRANSPASS,
    },
});

// -------------------------------------------------------

//Functions
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function checkApiKey(req, res, next) {
    const apiKey = req.headers["api-key"];
    var APIKeyDataCheck = await APIKeyModals.findOne({
        APIKey: apiKey
    });
    if (!apiKey || !APIKeyDataCheck) {
        res.status(403).json({ error: "Invalid API key" });
    } else {
        next();
    }
}

async function checkApiKeycooldown(req, res, next) {

    const apiKey = req.headers["api-key"];
    var APIKeyDataCheck = await APIKeyModals.findOne({
        APIKey: apiKey
    });

    if (!apiKey || !APIKeyDataCheck) {
        res.status(403).json({ error: "Invalid API key" });
    } else {

        var APICount = await APICountModals.findOne({
            API: apiKey
        }).catch(err => console.log(err));

        const currentTime = Date.now();
        if (keyCooldowns.has(apiKey)) {
            const lastRequestTime = keyCooldowns.get(apiKey);
            const timeSinceLastRequest = currentTime - lastRequestTime;
            if (timeSinceLastRequest < COOLDOWN_DURATION) {
                const remainingCooldown = COOLDOWN_DURATION - timeSinceLastRequest;
                res.status(429).json({ error: "Request limit exceeded. Please wait.", cooldown: remainingCooldown / 1000 });
                return;
            }
        } else {

            if (!APICount) {
                const expirationDate = new Date(Date.now() + 1 * 60 * 1000);
                APICount = new APICountModals({
                    API: apiKey,
                    count: 1,
                    expirationDate: expirationDate
                });
                await APICount.save();
            }

            if (APICount.count === 5) {
                keyCooldowns.set(apiKey, currentTime);
                APICount.count += 1;
                await APICount.save().then(() => {
                    next();
                });
            } else if (APICount.count === 6) {
                res.status(429).json({ error: "Request limit exceeded. Please wait." });
            } else {
                APICount.count += 1;
                await APICount.save().then(() => {
                    next();
                });x
            }
        }
    }
}
    
function csvToXml(csv) {
    const lines = csv.split("\n");
    const delimiter = ",";
    const headers = lines[0].split(delimiter);
    let xml = "<data>";

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter);
        xml += "<row>";
        for (let j = 0; j < headers.length; j++) {
            xml += `<${headers[j]}>${values[j]}</${headers[j]}>`;
        }
        xml += "</row>";
    }
    xml += "</data>";
    return xml;
}

async function processJob(jobId, conversionType, inputData, jobRequests) {
    try {
        let result;
        jobRequests[jobId] = {
            conversionType,
            status: "pending",
        };

        if (conversionType === "json2csv") {
            await sleep(10000);
            result = await converter.json2csv(inputData);
        } else if (conversionType === "csvtojson") {
            await sleep(10000);
            result = csvToJson(inputData);
        } else if (conversionType === "csvtoxml") {
            await sleep(10000);
            result = csvToXml(inputData);
        } else {
            throw new Error("Invalid conversion type");
        }

        const APIData = new APIKeyDataModals({
            JobID: jobId,
            ConversionType: conversionType,
            Input: inputData,
            Output: result,
            Status: "completed",
            CreatedOn: new Date(),
        });
        await APIData.save();

        jobRequests[jobId] = {
            conversionType,
            status: "completed"
        };

        //console.log(result)
        console.log(`Job ${jobId} completed`);
    } catch (error) {
        console.error(`Error processing job ${jobId}: ${error}`);

        const APIData = new APIKeyDataModals({
            JobID: jobId,
            ConversionType: conversionType,
            Input: inputData,
            Output: "",
            Status: "error",
            CreatedOn: new Date(),
        });
        await APIData.save();

        jobRequests[jobId] = {
            status: "error",
            error: error.message,
        };
    }
}

function processJobQueue(jobQueue, jobRequests) {
    if (jobQueue.length === 0) {
        return;
    }
    const { jobId, conversionType, inputData } = jobQueue[0];

    if (jobRequests[jobId] && jobRequests[jobId].status === "stopped") {
        jobQueue.shift();
        processJobQueue(jobQueue, jobRequests);
        return;
    }

    jobRequests[jobId] = {
        conversionType,
        status: "pending",
    };

    processJob(jobId, conversionType, inputData, jobRequests)
        .then(() => {
            jobQueue.shift();
            if (jobQueue.length > 0) {
                processJobQueue(jobQueue, jobRequests);
            }
        })
        .catch((error) => {
            console.error(`Error processing job ${jobId}: ${error}`);
            jobQueue.shift();
            if (jobQueue.length > 0) {
                processJobQueue(jobQueue, jobRequests);
            }
        });
}

    async function validateEmail(email) {

        var validRegex =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        var email = email.toString();
        if (email.match(validRegex)) {

            var APIKeyData = await APIKeyModals.findOne({
                UserEmail: email
            });

            if (!APIKeyData) {
                APIKeyData = new APIKeyModals({
                    UserEmail: email,
                    Expire: true
                });
                await APIKeyData.save();
            }

            if (APIKeyData.Expire === false) {
                return email + "is already registered and has active Key!";
            } else {
                const code = voucher_codes.generate({
                    pattern: "#####-#####-#####-#####-#####-#####",
                });

                APIKeyData.APIKey = code.toString();
                APIKeyData.Expire = false;
                APIKeyData.CreatedOn = new Date();
                await APIKeyData.save();
                return code;
            }

        } else {
            return email + "is not valid";
        }
    }

function csvToJson(csv) {
    const lines = csv.split("\n");
    const delimeter = ",";
    const result = [];
    const headers = lines[0].split(delimeter);

    for (const line of lines) {
        const obj = {};
        const row = line.split(delimeter);

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            obj[header] = row[i];
        }
        result.push(obj);
    }
    return result;
}

async function sendKey(receiver, msg) {
    const info = await transport.sendMail({
        from: '"utility 👻" <foo@example.com>',
        to: receiver,
        subject: "API Key",
        text: msg,
    });
    return info.messageId;
}

async function convertCSV(path) {
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    //let data = req.body;
    //console.log(data);
    let csv = await converter.json2csv(data);
    //console.log(csv);
    fs.writeFileSync("students.csv", csv);
}

async function convertJSON(path) {
    fs.readFile(path, "utf8", async function (e, data) {
        var dataArray = data.split(/\r?\n/);
        //console.log(dataArray);
        const json = await csv().fromString(path);
        //console.log(json);
    });
}

//Exports
module.exports = {
    transport, checkApiKey, sleep, csvToXml,
    processJob, processJobQueue, validateEmail, csvToJson,
    sendKey, convertCSV, convertJSON, checkApiKeycooldown
}