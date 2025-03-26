import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AdminDashboard from './AdminDashboard';
import UserDashboard from './UserDashboard';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);

  // Kullanıcı bilgilerini çekmek için useEffect hook'u
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    axios.get('http://localhost:5001/api/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      setUserInfo(response.data);
      console.log("Kullanıcı Bilgileri:", response.data); // userInfo verisini kontrol etmek için
    })
    .catch(error => console.error('Error fetching user info:', error));
  }, [navigate]);

  // Kullanıcı rolüne göre dashboard bileşenini seç
  if (!userInfo) return <div>Yükleniyor...</div>; // Kullanıcı bilgisi yüklenene kadar yükleme ekranı

  return (
    <>
      {userInfo.role === 'superadmin' ? (
        <AdminDashboard userInfo={userInfo} />
      ) : (
        <UserDashboard userInfo={userInfo} />
      )}
    </>
  );
};

export default Dashboard;
