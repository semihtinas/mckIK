// ProfileTab.js
import React from 'react';
import { Avatar, Card, Button } from 'antd';
import { EditOutlined, UserOutlined } from '@ant-design/icons';

const ProfileTab = ({ personnelData, showUploadModal }) => {
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
      <p><strong>Email:</strong> {personnelData.email}</p>
      <p><strong>Phone:</strong> {personnelData.phone}</p>
      {personnelData.department && <p><strong>Department:</strong> {personnelData.department}</p>}
      {personnelData.title && <p><strong>Title:</strong> {personnelData.title}</p>}
      <Button onClick={() => window.history.back()}>Back to List</Button>
    </Card>
  );
};

export default ProfileTab;
