const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
app.use(cors());

const extractChannelId = (url) => {
  const match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)?([\w-]+)/);
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

  const channelId = extractChannelId(url);
  if (!channelId) return res.status(400).json({ error: 'Invalid URL format' });

  try {
    const fullUrl = url.includes('@')
      ? `https://www.youtube.com/@${channelId}`
      : `https://www.youtube.com/${channelId.startsWith('UC') ? 'channel' : 'c'}/${channelId}`;

    const html = await axios.get(fullUrl);
    const $ = cheerio.load(html.data);

    const title = $('meta[name="title"]').attr('content') || 'Unknown';
    const region = $('meta[itemprop="addressCountry"]').attr('content') || 'Unknown';
    const keywords = $('meta[name="keywords"]').attr('content') || 'N/A';
    const viewText = $('meta[itemprop="interactionCount"]').attr('content') || '0';
    const totalViews = parseInt(viewText);
    const monetized = html.data.includes('google_ads_iframe');
    const earnings = estimateCPM(totalViews);

    res.json({
      channelName: title,
      region,
      niche: keywords.split(',')[0],
      age: 'Unknown',
      views: totalViews.toLocaleString(),
      earnings,
      monetized
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel data' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
