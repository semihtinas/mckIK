import React, { useState, useEffect } from 'react';
import { Tabs, Card } from 'antd';
import axios from 'axios';
import ProfileTab from './ProfileTab';
import CareerTab from './CareerTab';
import FilesTab from './FilesTab';
import PersonalInfoTab from './PersonalInfoTab'; // Yeni tabı ekliyoruz
import PhotoUploadModal from './PhotoUploadModal';
import { useParams } from 'react-router-dom';
import AttendanceTab from './AttendanceTab';

const PersonnelDetail = () => {
  const { id: personnelId } = useParams();
  const [personnelData, setPersonnelData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshPersonnelData = () => {
    axios.get(`http://localhost:5001/api/personnel/${personnelId}`)
      .then(response => setPersonnelData(response.data))
      .catch(error => console.error('Error fetching personnel data:', error));
  };

  useEffect(() => {
    refreshPersonnelData();
    axios.get('http://localhost:5001/api/departments').then(res => setDepartments(res.data));
    axios.get('http://localhost:5001/api/titles').then(res => setTitles(res.data));
  }, [personnelId]);

  if (!personnelData) return <div>Loading...</div>;

  const tabItems = [
    {
      key: '1',
      label: 'Profile',
      children: <ProfileTab personnelData={personnelData} showUploadModal={() => setIsModalOpen(true)} />,
    },
    {
      key: '2',
      label: 'Career',
      children: <CareerTab personnelId={personnelId} departments={departments} titles={titles} refreshPersonnelData={refreshPersonnelData} />,
    },
    {
      key: '3',
      label: 'Files',
      children: <FilesTab personnelId={personnelId} />,
    },
    {
      key: '4',
      label: 'Kişisel Bilgiler',  // Yeni kişisel bilgiler sekmesi
      children: <PersonalInfoTab personnelId={personnelId} />,  // Yeni bileşeni ekliyoruz
    },
    {
      key: '5',
      label: 'Attendance',  // Yeni kişisel bilgiler sekmesi
      children: <AttendanceTab personnelId={personnelId} />,  // Yeni bileşeni ekliyoruz
    },
  ];

  return (
    <>
      <Card title="Personnel Details">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>
      <PhotoUploadModal
        personnelId={personnelId}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        refreshPersonnelData={refreshPersonnelData}
      />
    </>
  );
};

export default PersonnelDetail;

