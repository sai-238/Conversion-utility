const express = require('express');
const router = express.Router();
const bodyParser = require("body-parser");

const {
    checkApiKey, processJobQueue, checkApiKeycooldown
} = require('../functions.js');

let nextJobId = 1;
const jobRequests = {};
const jobQueue = [];

router.post(
    "/convert/:conversionType",
    bodyParser.json(),
    bodyParser.text(),
    checkApiKeycooldown,
    async (req, res) => {
        const { conversionType } = req.params;
        const { body: inputData } = req;
        const jobId = nextJobId++;

        jobQueue.push({
            jobId,
            conversionType,
            inputData,
        });

        if (jobQueue.length === 1) {
            processJobQueue(jobQueue, jobRequests);
        }

        res.json({ jobId });
    }
);

router.get("/jobs", checkApiKey, (req, res) => {
    const jobsList = Object.keys(jobRequests).map((jobId) => ({
        jobId,
        conversionType: jobRequests[jobId].conversionType,
        status: jobRequests[jobId].status,
    }));

    res.json(jobsList);
});

router.post("/stop/:jobId", checkApiKey, (req, res) => {
    const jobIdToStop = parseInt(req.params.jobId);
    const jobIndex = jobQueue.findIndex(job => job.jobId === jobIdToStop);

    if (jobIndex !== -1) {
        jobQueue.splice(jobIndex, 1);
    }

    res.json({ message: `Job ${jobIdToStop} processing stopped` });
});

module.exports = router;
