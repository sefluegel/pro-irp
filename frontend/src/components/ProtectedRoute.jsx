import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
```jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute() {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
