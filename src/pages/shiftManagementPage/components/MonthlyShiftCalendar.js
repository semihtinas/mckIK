// MonthlyShiftCalendar.js güncellenmiş versiyon
import React, { useEffect } from 'react';
import { Table, Select, DatePicker, Space, Button, Tooltip, message, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const MonthlyShiftCalendar = ({
  departments,
  shiftSchedules,
  selectedDepartment,
  onDepartmentChange,
  onBulkAssign,
  viewDate,
  setViewDate
}) => {
  const [shifts, setShifts] = React.useState([]);
  const [personnel, setPersonnel] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [personnelPhotos, setPersonnelPhotos] = React.useState({});

  const BASE_URL = 'http://localhost:5001';

  useEffect(() => {
    if (selectedDepartment && viewDate) {
      fetchMonthlyData();
    }
  }, [selectedDepartment, viewDate]);

  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  // Personel fotoğraflarını çek
  const fetchPersonnelPhotos = async (personnelList) => {
    try {
      const photoPromises = personnelList.map(async person => {
        try {
          const response = await axios.get(`${BASE_URL}/api/personnel/${person.id}/photo`, getAuthConfig());
          // Tam URL'yi oluştur
          const photoUrl = response.data.photo_url ? `${BASE_URL}${response.data.photo_url}` : null;
          return {
            id: person.id,
            photoUrl: photoUrl
          };
        } catch (error) {
          console.error(`Error fetching photo for personnel ${person.id}:`, error);
          return {
            id: person.id,
            photoUrl: null
          };
        }
      });

      const photos = await Promise.all(photoPromises);
      const photoMap = {};
      photos.forEach(photo => {
        photoMap[photo.id] = photo.photoUrl;
      });
      setPersonnelPhotos(photoMap);
    } catch (error) {
      console.error('Error fetching personnel photos:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      const startDate = viewDate.startOf('month').format('YYYY-MM-DD');
      const endDate = viewDate.endOf('month').format('YYYY-MM-DD');

      const [
        shiftResponse,
        offDayResponse,
        leaveResponse,
        personnelResponse
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/shifts/weekly-shifts`, {
          ...getAuthConfig(),
          params: { startDate, endDate, departmentId: selectedDepartment }
        }),
        axios.get(`${BASE_URL}/api/shifts/off-days`, {
          ...getAuthConfig(),
          params: { startDate, endDate, departmentId: selectedDepartment }
        }),
        axios.get(`${BASE_URL}/api/shifts/leave-requests`, {
          ...getAuthConfig(),
          params: {
            start_date: startDate,
            end_date: endDate,
            department_id: selectedDepartment
          }
        }),
        axios.get(
          `${BASE_URL}/api/shifts/department-personnel/${selectedDepartment}`,
          getAuthConfig()
        )
      ]);

      const combinedShifts = [
        ...shiftResponse.data,
        ...offDayResponse.data,
        ...leaveResponse.data
      ];

      setShifts(combinedShifts);
      setPersonnel(personnelResponse.data);

      // Personel listesi geldiğinde fotoğrafları çek
      await fetchPersonnelPhotos(personnelResponse.data);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      message.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalDepartmentChange = (value) => {
    onDepartmentChange?.(value);
  };

  const handleMonthChange = (date) => {
    if (date) {
      setViewDate(date);
    }
  };

  const getColumns = () => {
    if (!viewDate) return [];

    const daysInMonth = viewDate.daysInMonth();
    const baseColumns = [
      {
        title: 'Personel',
        dataIndex: 'name',
        key: 'name',
        fixed: 'left',
        width: 200,
        render: (text, record) => (
          <Space>
            <Avatar 
              src={personnelPhotos[record.id]} 
              icon={<UserOutlined />}
              style={{ 
                border: '2px solid #f0f0f0',
                backgroundColor: '#fff',
                width: '32px',
                height: '32px'
              }}
            />
            <span>{text}</span>
          </Space>
        ),
      },
    ];

    const dayColumns = Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = viewDate.date(day);
      const isWeekend = date.day() === 0 || date.day() === 6;

      return {
        title: day.toString(),
        dataIndex: day.toString(),
        key: day.toString(),
        width: 50,
        align: 'center',
        className: isWeekend ? 'weekend-column' : '',
        render: (cell) => {
          if (!cell) return null;

          if (cell.is_off_day) {
            return (
              <Tooltip title="İzin Günü">
                <div style={offDayStyle}>İ</div>
              </Tooltip>
            );
          }
          if (cell.is_leave_request) {
            return (
              <Tooltip title={`İzin Talebi (${cell.status})`}>
                <div style={leaveRequestStyle}>T</div>
              </Tooltip>
            );
          }
          if (cell.shift_name) {
            return (
              <Tooltip title={`${cell.shift_name} (${cell.start_time}-${cell.end_time})`}>
                <div
                  style={{
                    backgroundColor: cell.color || '#f0f0f0',
                    padding: 4,
                    borderRadius: 4,
                    color: '#fff',
                    textAlign: 'center',
                  }}
                >
                  {cell.shift_name.substring(0, 1)}
                </div>
              </Tooltip>
            );
          }
          return null;
        },
      };
    });

    return [...baseColumns, ...dayColumns];
  };

  const getTableData = () => {
    if (!viewDate) return [];
    return personnel.map((person) => {
      const rowData = {
        key: person.id,
        id: person.id,  // personelin id'sini ekle
        name: `${person.first_name} ${person.last_name}`,
      };
      for (let day = 1; day <= viewDate.daysInMonth(); day++) {
        const currentDate = viewDate.date(day).format('YYYY-MM-DD');
        const dayShift = shifts.find(
          (shift) =>
            shift.personnel_id === person.id &&
            dayjs(shift.assignment_date).format('YYYY-MM-DD') === currentDate
        );
        rowData[day.toString()] = dayShift || null;
      }
      return rowData;
    });
  };

  const offDayStyle = {
    backgroundColor: '#52c41a',
    padding: 4,
    borderRadius: 4,
    color: '#fff',
    textAlign: 'center',
  };

  const leaveRequestStyle = {
    backgroundColor: '#fa8c16',
    padding: 4,
    borderRadius: 4,
    color: '#fff',
    textAlign: 'center',
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
        <Space>
          <Select
            style={{ width: 200 }}
            placeholder="Departman Seçin"
            onChange={handleLocalDepartmentChange}
            value={selectedDepartment}
          >
            {departments.map((dept) => (
              <Select.Option key={dept.id} value={dept.id}>
                {dept.name}
              </Select.Option>
            ))}
          </Select>
          <DatePicker
            picker="month"
            value={viewDate}
            onChange={handleMonthChange}
          />
        </Space>
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" onClick={onBulkAssign}>
            Toplu İşlemler
          </Button>
        </div>
      </div>

      <Table
        columns={getColumns()}
        dataSource={getTableData()}
        loading={loading}
        pagination={false}
        scroll={{ x: 'max-content' }}
        bordered
        size="small"
      />

      <style>{`
        .weekend-column {
          background-color: #fafafa;
        }
        .ant-table-cell {
          padding: 4px !important;
        }
      `}</style>
    </div>
  );
};

export default MonthlyShiftCalendar;