import React, { useEffect, useState } from 'react';
import { Tabs, Modal, Select, message } from 'antd';
import axios from 'axios';
import DepartmentsTab from './DepartmentsTab';
import TitlesTab from './TitlesTab';
import ContentTypesTab from './ContentTypesTab';
import LeaveSettingsTab from './LeaveSettingsTab';
import ImportAttendanceTab from './ImportAttendanceTab';
import PublicHolidaysTab from './PublicHolidaysTab';
import UsersTab from './UsersTab'; // Users tabını import edin
import RolePermissionsTab from './RolePermissionsTab';

const { Option } = Select;

const SettingsForm = () => {
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [invalidEntries, setInvalidEntries] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [users, setUsers] = useState([]);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  };

  useEffect(() => {
    fetchDepartments();
    fetchTitles();
    fetchContentTypes();
    fetchPersonnel();
    fetchHolidays();
    fetchUsers();
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    if (leaveTypes.length > 0) {
      fetchLeavePolicies();
    }
  }, [leaveTypes]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/departments');
      setDepartments(response.data);
    } catch (error) {
      message.error('Failed to load departments');
    }
  };

  const fetchTitles = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/titles');
      setTitles(response.data);
    } catch (error) {
      message.error('Failed to load titles');
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/contents');
      setContentTypes(response.data);
    } catch (error) {
      message.error('Failed to load content types');
    }
  };

  const fetchPersonnel = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/personnel');
      setPersonnelList(response.data);
    } catch (error) {
      message.error('Failed to load personnel list');
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/leave-management/new-leave-types', getAuthHeader());
      setLeaveTypes(response.data);
    } catch (error) {
      message.error('Failed to load leave types');
    }
  };

  const fetchLeavePolicies = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/leave-management/leave-policies', getAuthHeader());
      const policies = response.data.map(policy => {
        const leaveType = leaveTypes.find(type => type.id === policy.leave_type_id);
        return {
          ...policy,
          leave_type_name: leaveType ? leaveType.name : 'Unknown',
        };
      });
      setLeavePolicies(policies);
    } catch (error) {
      message.error('Failed to load leave policies');
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/public-holidays');
      setHolidays(response.data);
    } catch (error) {
      message.error('Failed to load public holidays');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/users');
      setUsers(response.data);
    } catch (error) {
      message.error('Failed to load users');
    }
  };

  const handleRowClick = (record) => {
    setSelectedEntry(record);
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedPersonnelId) {
      message.warning('Lütfen bir personel seçin.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/update-attendance', {
        personnelId: selectedPersonnelId,
        cardNumber: selectedEntry['Kart No'],
      });

      if (response.status === 200) {
        message.success('Personel başarıyla eşleştirildi!');
        const updatedEntries = invalidEntries.filter(entry => entry['Kart No'] !== selectedEntry['Kart No']);
        setInvalidEntries(updatedEntries);
        setIsModalVisible(false);
      }
    } catch (error) {
      message.error('Güncelleme sırasında bir hata oluştu');
    }
  };

  const tabItems = [
    {
      key: '1',
      label: 'Departments',
      children: <DepartmentsTab departments={departments} fetchDepartments={fetchDepartments} />,
    },
    {
      key: '2',
      label: 'Titles',
      children: <TitlesTab titles={titles} fetchTitles={fetchTitles} />,
    },
    {
      key: '3',
      label: 'Content Types',
      children: <ContentTypesTab contentTypes={contentTypes} fetchContentTypes={fetchContentTypes} />,
    },
    {
      key: '4',
      label: 'Leave Settings',
      children: (
        <LeaveSettingsTab 
          leaveTypes={leaveTypes} 
          leavePolicies={leavePolicies} 
          fetchLeaveTypes={fetchLeaveTypes} 
          fetchLeavePolicies={fetchLeavePolicies} 
        />
      ),
    },
    {
      key: '5',
      label: 'Import Attendance',
      children: <ImportAttendanceTab 
        invalidEntries={invalidEntries} 
        setInvalidEntries={setInvalidEntries} 
        handleRowClick={handleRowClick} 
      />,
    },
    {
      key: '6',
      label: 'Public Holidays',
      children: <PublicHolidaysTab fetchHolidays={fetchHolidays} />,
    },
    {
      key: '7',
      label: 'Users',
      children: <UsersTab users={users} fetchUsers={fetchUsers} personnelList={personnelList} />,
    },
    {
      key: '8',
      label: 'Role & Permissions',
      children: <RolePermissionsTab />,
    },
  ];

  return (
    <>
      <Tabs items={tabItems} defaultActiveKey="1" />
      <Modal 
        title="Personel Seç" 
        open={isModalVisible} 
        onCancel={() => setIsModalVisible(false)} 
        onOk={handleSave}
      >
        <Select 
          style={{ width: '100%' }} 
          placeholder="Personel Seç" 
          onChange={(value) => setSelectedPersonnelId(value)} 
          value={selectedPersonnelId}
        >
          {personnelList.map((personnel) => (
            <Option key={personnel.id} value={personnel.id}>
              {personnel.first_name} {personnel.last_name}
            </Option>
          ))}
        </Select>
      </Modal>
    </>
  );
};

export default SettingsForm;
