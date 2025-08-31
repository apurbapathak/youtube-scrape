const express = require('express');
const scraper = require('./scraper');
const app = express();

const API_KEY = process.env.API_KEY || "mysupersecretkey"; // set in Railway env

// Home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// API route with key validation
app.get('/api/search', (req, res) => {
    const key = req.query.key || req.headers["x-api-key"];

    if (!key || key !== API_KEY) {
        return res.status(403).json({ error: "Forbidden: Invalid or missing API key" });
    }

    scraper.youtube(req.query.q, req.query.key, req.query.pageToken)
        .then(x => res.json(x))
        .catch(e => res.status(500).json({ error: e.message }));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
    console.log(`Listening on port ${PORT}`);
});

module.exports = app;
