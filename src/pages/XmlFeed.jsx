import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import scoreJsonService from '../services/scoreJsonService';

export default function XmlFeed() {
  const { matchId } = useParams();
  const [xmlData, setXmlData] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!matchId) {
      setError('Match ID is required');
      setLoading(false);
      return;
    }

    // Start listening to match data and auto-updating XML
    scoreJsonService.startListening(matchId);

    // Check if we have stored XML data first
    const storedXml = scoreJsonService.getStoredXmlData(matchId);
    if (storedXml) {
      setXmlData(storedXml);
      setLoading(false);
    }

    // Listen for score data updates
    const handleScoreUpdate = (event) => {
      if (event.detail.matchId === matchId && event.detail.xmlData) {
        setXmlData(event.detail.xmlData);
        setLoading(false);
      }
    };

    window.addEventListener('scoreDataUpdated', handleScoreUpdate);

    // Set a timeout to show error if no data is received
    const timeout = setTimeout(() => {
      if (!scoreJsonService.getStoredXmlData(matchId)) {
        setError('Match not found or failed to load');
        setLoading(false);
      }
    }, 5000);

    return () => {
      // Don't stop listening here as other components might need it
      window.removeEventListener('scoreDataUpdated', handleScoreUpdate);
      clearTimeout(timeout);
    };
  }, [matchId]);

  // Set proper content type for XML
  useEffect(() => {
    if (xmlData && !loading && !error) {
      // Set the content type to XML
      document.querySelector('meta[http-equiv="Content-Type"]')?.remove();
      const meta = document.createElement('meta');
      meta.setAttribute('http-equiv', 'Content-Type');
      meta.setAttribute('content', 'application/xml; charset=utf-8');
      document.head.appendChild(meta);
    }
  }, [xmlData, loading, error]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading XML feed...</div>
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

  // Return raw XML for external consumption
  return (
    <pre style={{ 
      margin: 0, 
      padding: 0, 
      fontFamily: 'monospace',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
    }}>
      {xmlData}
    </pre>
  );
}