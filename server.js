const express = require('express');
const scraper = require('./scraper');
const app = express();

// Home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// API route (no API key required)
app.get('/api/search', (req, res) => {
    const query = req.query.q;
    const pageToken = req.query.pageToken;

    if (!query) {
        return res.status(400).json({ error: "Missing required parameter: q" });
    }

    scraper.youtube(query, pageToken)
        .then(x => res.json(x))
        .catch(e => res.status(500).json({ error: e.message }));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

module.exports = app;
