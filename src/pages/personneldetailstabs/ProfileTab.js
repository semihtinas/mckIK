import React, { useEffect, useState } from 'react';
import { Avatar, Card, Button } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const ProfileTab = ({ personnelData, showUploadModal }) => {
  const [contactInfo, setContactInfo] = useState({ email: '', phone: '' });
  const [workedDuration, setWorkedDuration] = useState('');

  const fetchContactInfo = () => {
    if (personnelData && personnelData.id) {
      axios.get(`http://localhost:5001/api/contact/${personnelData.id}`)
        .then(response => {
          setContactInfo({
            email: response.data.email,
            phone: response.data.phone_number,
          });
        })
        .catch(error => {
          console.error('Error fetching contact details:', error);
        });
    }
  };

  // İşe başlama tarihine göre çalışılan süreyi hesaplama
  const calculateWorkedDuration = (hireDate) => {
    if (hireDate) {
      const hireMoment = moment(hireDate);
      const today = moment();
      const duration = moment.duration(today.diff(hireMoment));

      const years = duration.years();
      const months = duration.months();
      const days = duration.days();

      let durationString = '';
      if (years > 0) durationString += `${years} year(s) `;
      if (months > 0) durationString += `${months} month(s) `;
      if (days > 0) durationString += `${days} day(s)`;

      setWorkedDuration(durationString.trim());
    }
  };

  useEffect(() => {
    fetchContactInfo();
    if (personnelData && personnelData.hire_date) {
      calculateWorkedDuration(personnelData.hire_date);
    }
  }, [personnelData]);

  return (
    <Card title={`${personnelData.first_name || ''} ${personnelData.last_name || ''}`}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Avatar
          size={100}
          src={personnelData.photo_url ? `http://localhost:5001${personnelData.photo_url}` : null}
          icon={!personnelData.photo_url && <UserOutlined />}
        />
        <EditOutlined 
          style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '20px', cursor: 'pointer' }} 
          onClick={showUploadModal} 
        />
      </div>
      <p><strong>First Name:</strong> {personnelData.first_name}</p>
      <p><strong>Last Name:</strong> {personnelData.last_name}</p>
      <p><strong>Email:</strong> {contactInfo.email || 'N/A'}</p>
      <p><strong>Phone:</strong> {contactInfo.phone || 'N/A'}</p>
      {personnelData.department && <p><strong>Department:</strong> {personnelData.department}</p>}
      {personnelData.title && <p><strong>Title:</strong> {personnelData.title}</p>}
      
      {/* Hire Date ve çalışılan süreyi burada gösteriyoruz */}
      {personnelData.hire_date && (
        <>
          <p><strong>Hire Date:</strong> {new Date(personnelData.hire_date).toLocaleDateString()}</p>
          <p><strong>Worked Duration:</strong> {workedDuration || 'Less than a day'}</p>
        </>
      )}
      
      <Button onClick={() => window.history.back()}>Back to List</Button>
    </Card>
  );
};

export default ProfileTab;
