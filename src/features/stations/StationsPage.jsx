import React, { useEffect, useState } from 'react';

export default function StationsPage() {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    fetch('/stations')
      .then((res) => res.json())
      .then((data) => setStations(data.stations || []))
      .catch(() => {});
  }, []);

  return (
    <main className="login-page home-page d-flex align-items-center justify-content-center">
      <div className="login-card card shadow-sm p-4 text-center">
        <h1 className="mb-4">Choose Station</h1>
        <div className="row g-4 justify-content-center">
          {stations.map((st) => (
            <div className="col-12 col-sm-6 col-md-4" key={st.id}>
              <a href={`/station/${st.id}`} className="btn btn-primary dash-btn w-100">
                <i className="bi bi-display-fill me-2" aria-hidden="true"></i>
                {st.name}
                {st.type && (
                  <small className="d-block text-uppercase">{st.type}</small>
                )}
              </a>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
