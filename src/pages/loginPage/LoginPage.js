import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import './login.css';

function LoginPage({ setAuthState }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login request
      const loginResponse = await axios.post('http://localhost:5001/api/login', formData);
      const token = loginResponse.data.token;

      if (!token) {
        throw new Error('Token alınamadı');
      }

      localStorage.setItem('token', token);

      // Fetch user data and permissions after successful login
      const [permissionsResponse, userInfoResponse] = await Promise.all([
        axios.get('http://localhost:5001/api/permissions/user-permissions', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('http://localhost:5001/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      // Update auth state with all necessary data
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        userInfo: userInfoResponse.data,
        userPermissions: permissionsResponse.data.permissions || [],
        isPermissionsLoaded: true
      });

      // Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Giriş başarısız';
      
      if (error.response) {
        // Server error response
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // No response from server
        errorMessage = 'Sunucuya bağlanılamadı';
      } else {
        // Request setup error
        errorMessage = error.message;
      }

      setError(errorMessage);
      
      // Reset auth state on error
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        userInfo: null,
        userPermissions: [],
        isPermissionsLoaded: true
      });

      // Clear any existing token
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-form">
        <h2 className="text-center">Giriş Yap</h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <input
              type="text"
              name="username"
              placeholder="Kullanıcı Adı"
              value={formData.username}
              onChange={handleInputChange}
              disabled={loading}
              required
              className="form-control"
            />
          </div>
          <div className="form-group">
            <input
              type="password"
              name="password"
              placeholder="Şifre"
              value={formData.password}
              onChange={handleInputChange}
              disabled={loading}
              required
              className="form-control"
            />
          </div>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className={`login-button ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <Spin size="small" />
                <span>Giriş yapılıyor...</span>
              </>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;