const express = require('express');
const scraper = require('./scraper');
const app = express();

// ✅ Load API key from Railway environment
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY is not set in environment variables");
}

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

  // ✅ don’t pass the API key into scraper
  scraper.youtube(req.query.q, req.query.pageToken)
    .then(x => res.json(x))
    .catch(e => res.status(500).json({ error: e.message }));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;
