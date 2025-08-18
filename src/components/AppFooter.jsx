import React from 'react';

export default function AppFooter() {
  return (
    <footer className="bg-light text-center py-3 mt-auto">
      <small>&copy; {new Date().getFullYear()} FreeKDS</small>
    </footer>
  );
}
