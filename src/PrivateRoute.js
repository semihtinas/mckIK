// PrivateRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = React.memo(({ children, isAuthenticated }) => {
  const token = localStorage.getItem('token');
  return token && isAuthenticated ? children : <Navigate to="/login" replace />;
});

export default PrivateRoute;