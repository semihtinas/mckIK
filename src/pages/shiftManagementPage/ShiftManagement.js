// ShiftManagement.js
import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs'; 
import { Tabs, message, Radio } from 'antd';
import axios from 'axios';

import WeeklyShiftCalendar from './components/WeeklyShiftCalendar';
import MonthlyShiftCalendar from './components/MonthlyShiftCalendar';
import BulkAssignmentModal from './components/BulkAssignmentModal';
// Aşağıdakiler projede varsa; yoksa kaldırabilirsiniz
import ShiftSettings from './components/ShiftSettings';
import ShiftTemplates from './components/ShiftTemplates';
import ShiftGroups from './components/ShiftGroups';
import LeaveRequestTab from './components/LeaveRequestTab';

const ShiftManagement = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [departments, setDepartments] = useState([]);
  const [shiftSchedules, setShiftSchedules] = useState([]);
  const [isBulkAssignModalVisible, setIsBulkAssignModalVisible] = useState(false);

  // Departman seçimi (parent seviyede)
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Haftalık / Aylık görünüm seçimi
  const [viewMode, setViewMode] = useState('weekly');
  const [userRole, setUserRole] = useState('');

  // ANA FARK: Tek bir tarih state (dayjs tipinde)
  const [viewDate, setViewDate] = useState(dayjs());

  // WeeklyShiftCalendar'a doğrudan erişmek isterseniz (ör. fetchWeeklyShifts)
  const weeklyShiftCalendarRef = useRef();

  useEffect(() => {
    fetchInitialData();
    checkUserRole();
  }, []);

  // Kullanıcının rolünü çekme
  const checkUserRole = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setUserRole(response.data.role);
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  // Başlangıç verilerini çekme
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [deptRes, schedulesRes] = await Promise.all([
        axios.get('http://localhost:5001/api/departments', config),
        axios.get('http://localhost:5001/api/shifts/shift-schedules', config),
      ]);

      setDepartments(deptRes.data);
      setShiftSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      message.error('Veri yüklenirken bir hata oluştu');
    }
  };

  // Departman değişince setle
  const handleDepartmentChange = (value) => {
    setSelectedDepartment(value);
  };

  // Toplu atama tamamlanınca haftalık takvimi yenilemek istiyorsak
  const handleBulkAssignmentComplete = () => {
    setIsBulkAssignModalVisible(false);
    message.success('Toplu vardiya ataması başarıyla tamamlandı');

    if (weeklyShiftCalendarRef.current) {
      weeklyShiftCalendarRef.current.fetchWeeklyShifts();
    }
  };

  // Haftalık / Aylık takvimi seçime göre render et
  const renderCalendarView = () => {
    const commonProps = {
      departments,
      shiftSchedules,
      selectedDepartment,
      onDepartmentChange: handleDepartmentChange,
      onBulkAssign: () => setIsBulkAssignModalVisible(true),
      // Tarih kontrolü (ANA EKLENTİ)
      viewDate,
      setViewDate,
    };

    if (viewMode === 'weekly') {
      return <WeeklyShiftCalendar ref={weeklyShiftCalendarRef} {...commonProps} />;
    }
    return <MonthlyShiftCalendar {...commonProps} />;
  };

  // Sekme içerikleri (örnek)
  const getTabItems = () => {
    // Herkeste görünen örnek sekme: İzin Talepleri
    const items = [
      {
        key: '5',
        label: 'İzin Talepleri',
        children: <LeaveRequestTab />,
      },
    ];

    // Sadece admin/superadmin
    if (userRole === 'admin' || userRole === 'superadmin') {
      items.push(
        {
          key: '1',
          label: 'Vardiya Takvimi',
          children: (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Radio.Group
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Button value="weekly">Haftalık Görünüm</Radio.Button>
                  <Radio.Button value="monthly">Aylık Görünüm</Radio.Button>
                </Radio.Group>
              </div>
              {renderCalendarView()}
            </div>
          ),
        },
        {
          key: '2',
          label: 'Vardiya Şablonları',
          children: (
            <ShiftTemplates
              departments={departments}
              shiftSchedules={shiftSchedules}
            />
          ),
        },
        {
          key: '3',
          label: 'Vardiya Grupları',
          children: (
            <ShiftGroups
              departments={departments}
              shiftSchedules={shiftSchedules}
            />
          ),
        },
        {
          key: '4',
          label: 'Vardiya Ayarları',
          children: (
            <ShiftSettings
              departments={departments}
              onSettingsUpdate={fetchInitialData}
            />
          ),
        }
      );
    }

    return items;
  };

  return (
    <div style={{ padding: '20px' }}>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={getTabItems()} />

      {(userRole === 'admin' || userRole === 'superadmin') && (
        <BulkAssignmentModal
          visible={isBulkAssignModalVisible}
          onCancel={() => setIsBulkAssignModalVisible(false)}
          onComplete={handleBulkAssignmentComplete}
          departmentId={selectedDepartment}
          shiftSchedules={shiftSchedules}
        />
      )}
    </div>
  );
};

export default ShiftManagement;
