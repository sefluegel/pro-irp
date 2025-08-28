import React from 'react';

const Logo = ({ size = 120 }) => (
  <div className="flex justify-center">
    <img
      src={process.env.PUBLIC_URL + "/logo.png"}
      alt="Pro IRP Logo"
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  </div>
);

export default Logo;
