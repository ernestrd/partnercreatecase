import React from 'react';

function ErrorBanner({ message }) {
  return (
    <div className="error-banner">
      <p>{message}</p>
    </div>
  );
}

export default ErrorBanner;
