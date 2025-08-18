import React, { useEffect, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

export default function FlashMessage({ message, error, detail }) {
  const [show, setShow] = useState(Boolean(message || error));

  useEffect(() => {
    if (show) {
      const url = new URL(window.location);
      url.searchParams.delete('msg');
      url.searchParams.delete('err');
      url.searchParams.delete('detail');
      window.history.replaceState({}, '', url);
    }
  }, [show]);

  if (!show) return null;
  const bg = error ? 'danger' : 'success';
  return (
    <ToastContainer position="top-end" className="p-3">
      <Toast bg={bg} onClose={() => setShow(false)} show={show} delay={3000} autohide>
        <Toast.Body>
          {error || message}
          {detail && <div className="small text-muted">{detail}</div>}
        </Toast.Body>
      </Toast>
    </ToastContainer>
  );
}
