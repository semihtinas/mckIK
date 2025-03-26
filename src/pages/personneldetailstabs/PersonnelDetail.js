import React, { useState, useEffect } from 'react';
import { Tabs, Card } from 'antd';
import axios from 'axios';
import ProfileTab from './ProfileTab';
import CareerTab from './CareerTab';
import FilesTab from './FilesTab';
import PersonalInfoTab from './PersonalInfoTab'; 
import PhotoUploadModal from './PhotoUploadModal';
import { useParams } from 'react-router-dom';
import AttendanceTab from './AttendanceTab';
import LeaveRequestsTab from './LeaveRequestsTab';
import AdvanceRequestsTab from './AdvanceRequestsTab';


const PersonnelDetail = ({ userInfo }) => {
  const { id } = useParams();
  const personnelId = id || userInfo?.personnel_id; // Eğer id yoksa userInfo'dan alır
  const [personnelData, setPersonnelData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshPersonnelData = () => {
    if (!personnelId) {
      console.error("Geçerli bir personnelId tanımlanmadı.");
      return;
    }
    axios.get(`http://localhost:5001/api/personnel/${personnelId}`)
      .then(response => setPersonnelData(response.data))
      .catch(error => console.error('Error fetching personnel data:', error));
  };

  useEffect(() => {
    if (personnelId) {
      refreshPersonnelData();
    }
  }, [personnelId]);

  if (!personnelData) return <div>Loading...</div>;

  const tabItems = [
    { key: '1', label: 'Profile', children: <ProfileTab personnelData={personnelData} showUploadModal={() => setIsModalOpen(true)} /> },
    { key: '2', label: 'Career', children: <CareerTab personnelId={personnelId} departments={departments} titles={titles} refreshPersonnelData={refreshPersonnelData} /> },
    { key: '3', label: 'Files', children: <FilesTab personnelId={personnelId} /> },
    { key: '4', label: 'Kişisel Bilgiler', children: <PersonalInfoTab personnelId={personnelId} onDataUpdate={refreshPersonnelData} /> },
    { key: '5', label: 'Attendance', children: <AttendanceTab personnelId={personnelId} /> },
    { key: '6', label: 'Leave Requests', children: <LeaveRequestsTab personnelId={personnelId} /> },
    { key: '7', label: 'Avans Talepleri', children: <AdvanceRequestsTab personnelId={personnelId} />},
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
