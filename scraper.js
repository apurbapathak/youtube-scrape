const axios = require("axios");

async function youtube(query, key, pageToken) {
    let json = { results: [], version: require("./package.json").version };

    // ✅ Case: with key (continuation)
    if (key) {
        json["parser"] = "json_format.page_token";
        json["key"] = key;

        try {
            const { data } = await axios.post(
                `https://www.youtube.com/youtubei/v1/search?key=${key}`,
                {
                    context: {
                        client: {
                            clientName: "WEB",
                            clientVersion: "2.20201022.01.01",
                        },
                    },
                    continuation: pageToken,
                },
                { timeout: 10000 }
            );

            parseJsonFormat(
                data.onResponseReceivedCommands[0].appendContinuationItemsAction
                    .continuationItems,
                json
            );

            return json;
        } catch (error) {
            throw normalizeError(error);
        }
    }

    // ✅ Case: no key (scrape results page)
    try {
        const url = `https://www.youtube.com/results?q=${encodeURIComponent(query)}`;
        const { data: html } = await axios.get(url, { timeout: 10000 });

        json["parser"] = "json_format";
        json["key"] = html.match(/"innertubeApiKey":"([^"]*)/)?.[1] || null;

        let match = html.match(/ytInitialData[^{]*(.*?);\s*<\/script>/s);
        if (match && match.length > 1) {
            json["parser"] += ".object_var";
        } else {
            json["parser"] += ".original";
            match = html.match(
                /ytInitialData"[^{]*(.*);\s*window\["ytInitialPlayerResponse"\]/s
            );
        }

        const data = JSON.parse(match[1]);
        json["estimatedResults"] = data.estimatedResults || "0";

        const sectionLists =
            data.contents.twoColumnSearchResultsRenderer.primaryContents
                .sectionListRenderer.contents;

        parseJsonFormat(sectionLists, json);
        return json;
    } catch (error) {
        throw normalizeError(error);
    }
}

/**
 * Convert axios or parsing errors into consistent Error messages
 */
function normalizeError(error) {
    if (error.response) {
        return new Error(`HTTP ${error.response.status} from YouTube`);
    }
    if (error.request) {
        return new Error(`No response from YouTube`);
    }
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * Parse youtube search results from json sectionList array and add to json result object
 */
function parseJsonFormat(contents, json) {
    contents.forEach(sectionList => {
        try {
            if (sectionList.itemSectionRenderer?.contents) {
                sectionList.itemSectionRenderer.contents.forEach(content => {
                    try {
                        if (content.channelRenderer) {
                            json.results.push(
                                parseChannelRenderer(content.channelRenderer)
                            );
                        }
                        if (content.videoRenderer) {
                            json.results.push(
                                parseVideoRenderer(content.videoRenderer)
                            );
                        }
                        if (content.radioRenderer) {
                            json.results.push(
                                parseRadioRenderer(content.radioRenderer)
                            );
                        }
                        if (content.playlistRenderer) {
                            json.results.push(
                                parsePlaylistRenderer(content.playlistRenderer)
                            );
                        }
                    } catch (ex) {
                        console.error("Failed to parse renderer:", ex.message);
                    }
                });
            } else if (sectionList.continuationItemRenderer) {
                json["nextPageToken"] =
                    sectionList.continuationItemRenderer.continuationEndpoint
                        ?.continuationCommand?.token || null;
            }
        } catch (ex) {
            console.error("Failed to read contents for section list:", ex.message);
        }
    });
}

/**
 * Safe reducer helper
 */
function safeReduce(runs, combFn, def = "") {
    return Array.isArray(runs) ? runs.reduce(combFn, "") : def;
}

function comb(a, b) {
    return a + (b?.text || "");
}

/**
 * Parse helpers
 */
function parseChannelRenderer(renderer) {
    return {
        channel: {
            id: renderer.channelId || null,
            title:
                renderer.title?.simpleText ||
                safeReduce(renderer.title?.runs, comb),
            url: `https://www.youtube.com${
                renderer.navigationEndpoint?.commandMetadata
                    ?.webCommandMetadata?.url || ""
            }`,
            snippet: safeReduce(renderer.descriptionSnippet?.runs, comb),
            thumbnail_src:
                renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
            video_count: safeReduce(renderer.videoCountText?.runs, comb),
            subscriber_count:
                renderer.subscriberCountText?.simpleText || "0 subscribers",
            verified:
                renderer.ownerBadges?.some(badge =>
                    badge.metadataBadgeRenderer?.style?.includes("VERIFIED")
                ) || false,
        },
    };
}

function parsePlaylistRenderer(renderer) {
    const thumbnails =
        renderer.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail
            ?.thumbnails || [];
    return {
        playlist: {
            id: renderer.playlistId || null,
            title:
                renderer.title?.simpleText ||
                safeReduce(renderer.title?.runs, comb),
            url: `https://www.youtube.com${
                renderer.navigationEndpoint?.commandMetadata
                    ?.webCommandMetadata?.url || ""
            }`,
            thumbnail_src: thumbnails.slice(-1)[0]?.url || null,
            video_count: renderer.videoCount || null,
        },
        uploader: {
            username: renderer.shortBylineText?.runs?.[0]?.text || null,
            url: `https://www.youtube.com${
                renderer.shortBylineText?.runs?.[0]?.navigationEndpoint
                    ?.commandMetadata?.webCommandMetadata?.url || ""
            }`,
        },
    };
}

function parseRadioRenderer(renderer) {
    return {
        radio: {
            id: renderer.playlistId || null,
            title:
                renderer.title?.simpleText ||
                safeReduce(renderer.title?.runs, comb),
            url: `https://www.youtube.com${
                renderer.navigationEndpoint?.commandMetadata
                    ?.webCommandMetadata?.url || ""
            }`,
            thumbnail_src:
                renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
            video_count: safeReduce(renderer.videoCountText?.runs, comb),
        },
        uploader: {
            username: renderer.shortBylineText?.simpleText || "YouTube",
        },
    };
}

function parseVideoRenderer(renderer) {
    const video = {
        id: renderer.videoId || null,
        title: safeReduce(renderer.title?.runs, comb),
        url: `https://www.youtube.com${
            renderer.navigationEndpoint?.commandMetadata?.webCommandMetadata
                ?.url || ""
        }`,
        duration: renderer.lengthText?.simpleText || "Live",
        snippet: safeReduce(
            renderer.descriptionSnippet?.runs,
            (a, b) => a + (b?.bold ? `<b>${b.text}</b>` : b?.text || "")
        ),
        upload_date: renderer.publishedTimeText?.simpleText || "Live",
        thumbnail_src:
            renderer.thumbnail?.thumbnails?.slice(-1)[0]?.url || null,
        views:
            renderer.viewCountText?.simpleText ||
            safeReduce(renderer.viewCountText?.runs, comb) ||
            (renderer.publishedTimeText ? "0 views" : "0 watching"),
    };

    const uploader = {
        username: renderer.ownerText?.runs?.[0]?.text || null,
        url: `https://www.youtube.com${
            renderer.ownerText?.runs?.[0]?.navigationEndpoint?.commandMetadata
                ?.webCommandMetadata?.url || ""
        }`,
        verified:
            renderer.ownerBadges?.some(badge =>
                badge.metadataBadgeRenderer?.style?.includes("VERIFIED")
            ) || false,
    };

    return { video, uploader };
}

module.exports.youtube = youtube;
