
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const YOUTUBE_API_KEY = 'AIzaSyCirrq-wAOf30Wv3GgqtuWFD1KQCUbwLcw';

const extractHandle = (url) => {
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([\w-]+)/);
  return match ? match[1] : null;
};

const estimateCPM = (views) => {
  const low = views * 0.5 / 1000;
  const high = views * 2.0 / 1000;
  return `$${low.toFixed(0)} - $${high.toFixed(0)}`;
};

app.get('/api/check', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  const handle = extractHandle(url);
  if (!handle) return res.status(400).json({ error: 'Invalid YouTube handle URL format.' });

  try {
    const searchUrl = \`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=\${handle}&key=\${YOUTUBE_API_KEY}\`;
    const searchResp = await axios.get(searchUrl);
    const items = searchResp.data.items;
    if (!items.length) throw new Error('Channel not found');

    const channelId = items[0].snippet.channelId;

    const statsUrl = \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=\${channelId}&key=\${YOUTUBE_API_KEY}\`;
    const statsResp = await axios.get(statsUrl);
    const channel = statsResp.data.items[0];

    const title = channel.snippet.title;
    const country = channel.snippet.country || 'Unknown';
    const publishedAt = channel.snippet.publishedAt;
    const views = parseInt(channel.statistics.viewCount);
    const niche = channel.snippet.description.split(' ').slice(0, 5).join(' ');

    const monetized = parseInt(channel.statistics.subscriberCount || 0) >= 1000 && views >= 4000000;
    const earnings = estimateCPM(views);

    res.json({
      channelName: title,
      region: country,
      age: new Date(publishedAt).toDateString(),
      views: views.toLocaleString(),
      niche,
      earnings,
      monetized
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel data', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
