const express = require('express');
const scraper = require('./scraper');
const app = express();

const API_KEY = process.env.API_KEY || "ytai_92384_XYZ"; // set in Railway env

// Home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// API route with key validation
app.get('/api/search', (req, res) => {
    const accessKey = req.query.key || req.headers["x-api-key"];

    if (!accessKey || accessKey !== API_KEY) {
        return res.status(403).json({ error: "Forbidden: Invalid or missing API key" });
    }

    // ✅ don't pass the access key to scraper
    scraper.youtube(req.query.q, req.query.pageToken)
        .then(x => res.json(x))
        .catch(e => res.status(500).json({ error: e.message }));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

module.exports = app;
