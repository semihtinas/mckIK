import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.get('http://localhost:5001/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setUserInfo(response.data))
    .catch(error => console.error('Error fetching user info:', error));
  }, [navigate]);

  if (!userInfo) return <div>Yükleniyor...</div>; // Kullanıcı bilgisi yüklenene kadar yükleme ekranı

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
      {/* Kullanıcı Bilgi Kartı */}
      <Card
        style={{
          width: '30%',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
          borderRadius: '8px',
          textAlign: 'center'
        }}
      >
        <Avatar
          size={100}
          src={userInfo.photo_url ? `http://localhost:5001${userInfo.photo_url}` : null}
          icon={!userInfo.photo_url && <UserOutlined />}
          style={{ marginBottom: '15px' }}
        />
        <h3>{`${userInfo.first_name} ${userInfo.last_name}`}</h3>
        <p><strong>Departman:</strong> {userInfo.department}</p>
        <p><strong>Görev:</strong> {userInfo.title}</p>
        <p><strong>Rol:</strong> Kullanıcı</p>
      </Card>
    </div>
  );
};

export default UserDashboard;
