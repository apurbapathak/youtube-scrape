# YouTube Scrape

A lightweight YouTube search scraping API.

> Scrape search results quickly with clean JSON responses—built to be dropped into apps, CLIs, and cron jobs.

---

## Features

* Search YouTube and get structured results (title, channel, duration, views, published time, thumbnails, videoId)
* Pagination via `pageToken`
* Optional result type filters (e.g. videos only)
* Simple API key auth via query string or header
* Sensible rate limits and cache-friendly responses

---

## Quick Start

### 1) Install (self-hosted)

```bash
# clone your service and install deps
pnpm i    # or npm i / yarn
cp .env.example .env
# set required env vars in .env (see below)

# run dev
pnpm dev

# or run in production
pnpm build && pnpm start
```

### 2) Call the API

```bash
curl "https://your-domain.tld/api/search?q=lofi+beats&key=YOUR_API_KEY"
```

---

## HTTP API

### GET `/api/search`

Search YouTube and return results.

**Query parameters**

| Name        | Type   | Required | Example        | Notes                                            |
| ----------- | ------ | -------- | -------------- | ------------------------------------------------ |
| `q`         | string | yes      | `adhenti gani` | URL-encode your query.                           |
| `key`       | string | yes\*    | `ytai_abc123`  | API key; can also be sent as `x-api-key` header. |
| `type`      | enum   | no       | `video`        | Supported: `video`, `any` (default).             |
| `pageToken` | string | no       | `CBQQAA`       | Use token from previous response to paginate.    |
| `limit`     | number | no       | `25`           | Max items per page (implementation-dependent).   |

**Headers**

* `x-api-key: YOUR_API_KEY` (alternative to `key` query)

**Response (200)**

```json
{
  "q": "lofi beats",
  "type": "video",
  "pageInfo": { "totalResults": 1000, "resultsPerPage": 25 },
  "nextPageToken": "CBQQAA",
  "items": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Best Lofi Beats Mix",
      "channel": {
        "id": "UCxxxx",
        "name": "Lofi Hub",
        "url": "https://www.youtube.com/@lofihub"
      },
      "duration": 3600,
      "views": 1234567,
      "publishedText": "2 years ago",
      "thumbnails": [
        { "url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", "width": 480, "height": 360 }
      ],
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    }
  ]
}
```

**Errors**

```json
// 400 Bad Request
{ "error": "Missing query 'q'" }

// 401 Unauthorized
{ "error": "Invalid or missing API key" }

// 429 Too Many Requests
{ "error": "Rate limit exceeded. Try again later." }

// 500 Internal Server Error
{ "error": "Upstream fetch failed" }
```

---

## Examples

### cURL

```bash
curl -s --get \
  --data-urlencode "q=best edm 2025" \
  --data "type=video" \
  --data "key=$API_KEY" \
  https://your-domain.tld/api/search | jq .items[0]
```

### Node.js (fetch)

```js
const url = new URL("https://your-domain.tld/api/search");
url.searchParams.set("q", "adhenti gani");
url.searchParams.set("type", "video");

const res = await fetch(url, { headers: { "x-api-key": process.env.API_KEY } });
if (!res.ok) throw new Error(await res.text());
const data = await res.json();
console.log(data.items.map(i => ({ id: i.videoId, title: i.title })));
```

### PHP

```php
$q = urlencode('adhenti gani');
$ch = curl_init("https://your-domain.tld/api/search?q={$q}&type=video");
curl_setopt($ch, CURLOPT_HTTPHEADER, ["x-api-key: ".getenv('API_KEY')]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
if (curl_getinfo($ch, CURLINFO_HTTP_CODE) !== 200) die($resp);
$data = json_decode($resp, true);
print_r(array_column($data['items'], 'title'));
```

### Python

```python
import os, requests
params = {"q": "adhenti gani", "type": "video"}
headers = {"x-api-key": os.getenv("API_KEY")}
r = requests.get("https://your-domain.tld/api/search", params=params, headers=headers)
r.raise_for_status()
print([ (i["videoId"], i["title"]) for i in r.json()["items"] ])
```

---

## Authentication

Provide an API key either as `?key=YOUR_API_KEY` or in `x-api-key` header.

---

## Environment Variables

| Name         | Required | Example          | Notes                                  |
| ------------ | -------- | ---------------- | -------------------------------------- |
| `API_KEYS`   | yes      | `key1,key2,key3` | Comma-separated list of allowed keys.  |
| `PORT`       | no       | `3000`           | Server port.                           |
| `CACHE_TTL`  | no       | `900`            | Seconds to cache successful responses. |
| `RATE_LIMIT` | no       | `60`             | Requests per minute per key/IP.        |

> Your implementation may expose more vars (e.g., proxies). Document them here.

---

## Rate Limiting

* Default: `RATE_LIMIT` requests/minute per key or IP
* 429 response on exceed; `Retry-After` header provided when possible

---

## Caching

* Successful responses may include `Cache-Control` (e.g., `public, max-age=900`)
* You can layer a CDN in front for extra speed

---

## Notes & Caveats

* This project scrapes public YouTube pages. Respect YouTube ToS and local laws.
* Upstream markup can change—pin versions and add monitoring.
* Use exponential backoff for transient errors.

---

## Development

```bash
pnpm test
pnpm lint
```

---

## License

MIT

---

## Contact & Support

Questions, feature requests, or custom integration work? **[Get in touch →](https://www.arnlweb.com/get-in-touch/)**
