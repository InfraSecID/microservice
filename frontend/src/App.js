import React, { useEffect, useState } from 'react';

export default function App() {
  const [visits, setVisits] = useState(null);
  const [pod, setPod] = useState('-');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const res = await fetch('/api/visits');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setVisits(data.visits);
        setPod(data.hostname || '-');
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchVisits();
    const interval = setInterval(fetchVisits, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '4rem' }}>
      <h1>Kubernetes Microservices Demo</h1>
      <p style={{ fontSize: '2rem' }}>
        Total Kunjungan: <strong>{visits !== null ? visits : 'Loading...'}</strong>
      </p>
      <p>Served by API Pod: <code>{pod}</code></p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}
