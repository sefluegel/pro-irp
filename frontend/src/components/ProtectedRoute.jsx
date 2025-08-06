```jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = /* replace with real auth check */ true;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
```
