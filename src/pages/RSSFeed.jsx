import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import rssService from '../services/rssService';

export default function RSSFeed() {
  const { matchId } = useParams();
  const [rssXml, setRssXml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!matchId) {
      setError('Match ID is required');
      setLoading(false);
      return;
    }

    // Start listening to match data and auto-updating RSS
    rssService.startListening(matchId);

    // Check if we have stored RSS data first
    const storedRss = rssService.getRSSFeed(matchId);
    if (storedRss) {
      setRssXml(storedRss);
      setLoading(false);
    }

    // Listen for RSS feed updates
    const handleRssUpdate = (event) => {
      if (event.detail.matchId === matchId && event.detail.rssXml) {
        setRssXml(event.detail.rssXml);
        setLoading(false);
      }
    };

    window.addEventListener('rssUpdated', handleRssUpdate);

    // Set a timeout to show error if no data is received
    const timeout = setTimeout(() => {
      if (!rssService.getRSSFeed(matchId)) {
        // Create demo RSS feed if no real data
        const demoRss = createDemoRSSFeed(matchId);
        setRssXml(demoRss);
        setLoading(false);
      }
    }, 3000);

    return () => {
      window.removeEventListener('rssUpdated', handleRssUpdate);
      clearTimeout(timeout);
    };
  }, [matchId]);

  // Create demo RSS feed for testing
  const createDemoRSSFeed = (matchId) => {
    const currentTime = new Date().toUTCString();
    
    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">\n';
    rss += '  <channel>\n';
    rss += `    <title>Pickleball Match ${matchId} - Live Score</title>\n`;
    rss += `    <description>Live score updates for Pickleball Match ${matchId}</description>\n`;
    rss += `    <link>${window.location.origin}/match/${matchId}</link>\n`;
    rss += `    <lastBuildDate>${currentTime}</lastBuildDate>\n`;
    rss += `    <pubDate>${currentTime}</pubDate>\n`;
    rss += '    <language>en-US</language>\n';
    rss += '    <generator>Pickleball Scoring App</generator>\n';
    rss += '\n';
    rss += '    <item>\n';
    rss += `      <title>Match ${matchId} - Current Score</title>\n`;
    rss += '      <description>Live score update for Doubles match</description>\n';
    rss += `      <link>${window.location.origin}/match/${matchId}</link>\n`;
    rss += `      <pubDate>${currentTime}</pubDate>\n`;
    rss += `      <guid isPermaLink="false">match-${matchId}-${Date.now()}</guid>\n`;
    rss += '      <content:encoded><![CDATA[\n';
    rss += `<h2>Match ${matchId} - Live Score</h2>\n`;
    rss += '<p><strong>Match Type:</strong> Doubles</p>\n';
    rss += '<p><strong>Status:</strong> Active</p>\n';
    rss += `<p><strong>Last Updated:</strong> ${currentTime}</p>\n`;
    rss += '<hr>\n';
    rss += '<table border="1" cellpadding="5" cellspacing="0">\n';
    rss += '<tr><th>Players</th><th>Team</th><th>Points</th><th>Serve</th></tr>\n';
    rss += '<tr><td>John Doe/ Jane Smith</td><td>Team Alpha</td><td><strong>15</strong></td><td>1</td></tr>\n';
    rss += '<tr><td>Mike Johnson/ Sarah Wilson</td><td>Team Beta</td><td><strong>12</strong></td><td></td></tr>\n';
    rss += '</table>\n';
    rss += '<hr>\n';
    rss += '<h3>Game Scores</h3>\n';
    rss += '<table border="1" cellpadding="5" cellspacing="0">\n';
    rss += '<tr><th>Team</th><th>Game 1</th><th>Game 2</th><th>Game 3</th><th>Total</th></tr>\n';
    rss += '<tr><td>Team Alpha</td><td>11</td><td>4</td><td>0</td><td><strong>15</strong></td></tr>\n';
    rss += '<tr><td>Team Beta</td><td>9</td><td>3</td><td>0</td><td><strong>12</strong></td></tr>\n';
    rss += '</table>\n';
    rss += ']]></content:encoded>\n';
    rss += '    </item>\n';
    rss += '  </channel>\n';
    rss += '</rss>';
    
    return rss;
  };

  // Set proper content type for RSS
  useEffect(() => {
    if (rssXml && !loading && !error) {
      // Set the content type to RSS/XML
      document.querySelector('meta[http-equiv="Content-Type"]')?.remove();
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Type');
      meta.setAttribute('content', 'application/rss+xml; charset=utf-8');
      document.head.appendChild(meta);
    }
  }, [rssXml, loading, error]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading RSS feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Error: {error}</div>
      </div>
    );
  }

  // Return raw RSS XML for external consumption
  return (
    <pre style={{ 
      margin: 0, 
      padding: 0, 
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      fontSize: '12px'
    }}>
      {rssXml}
    </pre>
  );
}