// WeeklyShiftCalendar.js
import React, { useEffect, forwardRef, useImperativeHandle } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Select,
  Button,
  DatePicker,
  Space,
  Card,
  Dropdown,
  Modal,
  InputNumber,
  message,
  Table,
  Avatar
} from 'antd';
import {
  SettingOutlined,
  DeleteOutlined,
  CopyOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined
} from '@ant-design/icons';

import dayjs from 'dayjs';
import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

// Sürükle-bırak "tip" tanımı
const ItemTypes = {
  SHIFT_CARD: 'shiftCard',
};

const WeeklyShiftCalendar = forwardRef(({
  // Parent'tan gelen prop'lar
  departments,
  shiftSchedules,
  selectedDepartment,
  onDepartmentChange,
  onBulkAssign,

  // En kritik: tek bir tarih
  viewDate,
  setViewDate
}, ref) => {

  const [shifts, setShifts] = React.useState([]);
  const [personnel, setPersonnel] = React.useState([]);

  // Bazı modallarla ilgili state'ler
  const [isBulkCopyModalVisible, setIsBulkCopyModalVisible] = React.useState(false);
  const [bulkCopyShiftId, setBulkCopyShiftId] = React.useState(null);
  const [bulkCopyDays, setBulkCopyDays] = React.useState(1);

  const [isAddShiftModalVisible, setIsAddShiftModalVisible] = React.useState(false);
  const [selectedPerson, setSelectedPerson] = React.useState(null);
  const [selectedDay, setSelectedDay] = React.useState(null);
  const [selectedShiftScheduleId, setSelectedShiftScheduleId] = React.useState(null);

  // Publish akışı vs.
  const [publishModalVisible, setPublishModalVisible] = React.useState(false);
  const [previewVisible, setPreviewVisible] = React.useState(false);
  const [previewData, setPreviewData] = React.useState([]);
  const [dateRange, setDateRange] = React.useState(null);

  const [personnelPhotos, setPersonnelPhotos] = React.useState({});


  const fetchPersonnelPhotos = async (personnelList) => {
    try {
      const photoPromises = personnelList.map(async person => {
        try {
          const response = await axios.get(
            `${BASE_URL}/api/personnel/${person.id}/photo`, 
            getAuthConfig()
          );
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

  // Parent bileşen, bu bileşen üstünde "ref" üzerinden çağırabilsin
  useImperativeHandle(ref, () => ({
    fetchWeeklyShifts,
  }));

  // Departman veya viewDate değişince verileri çek
  useEffect(() => {
    if (selectedDepartment && viewDate) {
      fetchWeeklyShifts();
      fetchDepartmentPersonnel();
    }

  }, [selectedDepartment, viewDate]);

  // Token ayar
  const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });

  // Haftalık vardiyaları çek
  const fetchWeeklyShifts = async () => {
    try {
      const startDate = viewDate.startOf('week').format('YYYY-MM-DD');
      const endDate = viewDate.endOf('week').format('YYYY-MM-DD');

      const [shiftResponse, offDayResponse, leaveRequestResponse] = await Promise.all([
        axios.get(`${BASE_URL}/api/shifts/weekly-shifts`, {
          ...getAuthConfig(),
          params: { startDate, endDate, departmentId: selectedDepartment },
        }),
        axios.get(`${BASE_URL}/api/shifts/off-days`, {
          ...getAuthConfig(),
          params: { startDate, endDate, departmentId: selectedDepartment },
        }),
        axios.get(`${BASE_URL}/api/shifts/leave-requests`, {
          ...getAuthConfig(),
          params: {
            start_date: startDate,
            end_date: endDate,
            department_id: selectedDepartment,
          },
        }),
      ]);

      // İzin taleplerini harmanlayalım (leaveRequests)
      const leaveRequests = leaveRequestResponse.data.map((request) => ({
        ...request,
        id: `leave_${request.id}`,
        is_leave_request: true,
        shift_name: `İzin Talebi (${request.status})`,
        color:
          request.status === 'pending'
            ? '#faad14'
            : request.status === 'approved'
            ? '#52c41a'
            : '#f5222d',
        assignment_date: request.leave_date,
      }));

      const combinedShifts = [
        ...shiftResponse.data,
        ...offDayResponse.data,
        ...leaveRequests,
      ];

      setShifts(combinedShifts);
    } catch (error) {
      console.error('API Error:', error);
      message.error('Vardiya bilgileri yüklenirken hata oluştu');
    }
  };

  // Departman personeli çek
  const fetchDepartmentPersonnel = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/shifts/department-personnel/${selectedDepartment}`,
        getAuthConfig()
      );
      setPersonnel(response.data);
      await fetchPersonnelPhotos(response.data);


    } catch (error) {
      console.error('Error:', error);
      message.error('Personel listesi alınırken hata oluştu');
    }
  };

  // Departman seçimi değiştiğinde parent'a bildir
  const handleLocalDepartmentChange = (value) => {
    onDepartmentChange?.(value);
  };

  // Sürükle-bırak ile atama güncelleme
  const handleShiftDrop = async (shiftId, newDate, newPersonnelId, isOffDay) => {
    try {
      if (isOffDay) {
        await axios.put(
          `${BASE_URL}/api/shifts/off-days/${shiftId}`,
          { assignment_date: newDate, personnel_id: newPersonnelId },
          getAuthConfig()
        );
      } else {
        await axios.put(
          `${BASE_URL}/api/shifts/assignments/${shiftId}`,
          { assignment_date: newDate, personnel_id: newPersonnelId },
          getAuthConfig()
        );
      }
      fetchWeeklyShifts();
      message.success('Atama güncellendi');
    } catch (error) {
      console.error('Error updating assignment:', error);
      message.error('Atama güncellenirken hata oluştu');
    }
  };

  // Vardiya kartındaki menü aksiyonları
  const handleShiftAction = async (action, shiftId, isOffDay = false, isLeaveRequest = false) => {
    try {
      if (isLeaveRequest) {
        // İzin talebi onay/red
        if (action === 'approve' || action === 'reject') {
          const actualId = shiftId.replace('leave_', '');
          await axios.put(
            `${BASE_URL}/api/shifts/leave-requests/${actualId}`,
            { status: action === 'approve' ? 'approved' : 'rejected' },
            getAuthConfig()
          );
          message.success(
            `İzin talebi ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`
          );
          fetchWeeklyShifts();
        }
        return;
      }

      if (isOffDay) {
        // İzin günü sil
        if (action === 'delete') {
          await axios.delete(`${BASE_URL}/api/shifts/off-days/${shiftId}`, getAuthConfig());
          message.success('İzin günü silindi');
          fetchWeeklyShifts();
        }
        return;
      }

      // Normal vardiya işlemleri
      switch (action) {
        case 'copy':
          await copyShiftAssignment(shiftId);
          message.success('Vardiya başarıyla kopyalandı');
          fetchWeeklyShifts();
          break;
        case 'delete':
          await axios.delete(`${BASE_URL}/api/shifts/assignments/${shiftId}`, getAuthConfig());
          message.success('Vardiya silindi');
          fetchWeeklyShifts();
          break;
        case 'bulkCopy':
          setBulkCopyShiftId(shiftId);
          setIsBulkCopyModalVisible(true);
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Error during shift action:', error);
      message.error('İşlem sırasında hata oluştu');
    }
  };

  // Bir vardiyayı bir gün sonrasına kopyala
  const copyShiftAssignment = async (shiftId) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/shifts/assignments/${shiftId}`,
        getAuthConfig()
      );
      const shiftAssignment = response.data;

      const newDate = dayjs(shiftAssignment.assignment_date)
        .add(1, 'day')
        .format('YYYY-MM-DD');

      await axios.post(
        `${BASE_URL}/api/shifts/assignments`,
        {
          shift_schedule_id: shiftAssignment.shift_schedule_id,
          personnel_id: shiftAssignment.personnel_id,
          assignment_date: newDate,
          status: 'active',
        },
        getAuthConfig()
      );
    } catch (error) {
      console.error('Error copying shift assignment:', error);
      throw error;
    }
  };

  // Çoklu kopyalama
  const bulkCopyShiftAssignment = async (shiftId, days) => {
    try {
      const response = await axios.get(
        `${BASE_URL}/api/shifts/assignments/${shiftId}`,
        getAuthConfig()
      );
      const shiftAssignment = response.data;

      const promises = [];
      for (let i = 1; i <= days; i++) {
        const newDate = dayjs(shiftAssignment.assignment_date)
          .add(i, 'day')
          .format('YYYY-MM-DD');
        promises.push(
          axios.post(
            `${BASE_URL}/api/shifts/assignments`,
            {
              shift_schedule_id: shiftAssignment.shift_schedule_id,
              personnel_id: shiftAssignment.personnel_id,
              assignment_date: newDate,
              status: 'active',
            },
            getAuthConfig()
          )
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('Error in bulk copying shift assignment:', error);
      throw error;
    }
  };

  // Yeni vardiya ekleme
  const addShiftAssignment = async () => {
    if (!selectedShiftScheduleId || !selectedPerson || !selectedDay) {
      message.warning('Lütfen tüm bilgileri seçin');
      return;
    }

    try {
      await axios.post(
        `${BASE_URL}/api/shifts/assignments`,
        {
          shift_schedule_id: selectedShiftScheduleId,
          personnel_id: selectedPerson.id,
          assignment_date: selectedDay.format('YYYY-MM-DD'),
          status: 'active',
        },
        getAuthConfig()
      );
      message.success('Vardiya başarıyla eklendi');
      fetchWeeklyShifts();
      setIsAddShiftModalVisible(false);
      setSelectedShiftScheduleId(null);
    } catch (error) {
      console.error('Error adding shift assignment:', error);
      message.error('Vardiya eklenirken hata oluştu');
    }
  };

  // Publish / Önizleme
  const showPublishModal = () => {
    setPublishModalVisible(true);
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const handlePreview = async () => {
    if (!dateRange || !selectedDepartment) {
      message.warning('Lütfen departman ve tarih aralığı seçin');
      return;
    }
    const [start, end] = [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')];
    try {
      const config = getAuthConfig();
      const res = await axios.get(`${BASE_URL}/api/shifts/preview`, {
        ...config,
        params: { departmentId: selectedDepartment, start_date: start, end_date: end },
      });
      setPreviewData(res.data.assignments);
      setPreviewVisible(true);
    } catch (error) {
      console.error('Error fetching preview:', error);
      message.error('Önizleme alınırken hata oluştu');
    }
  };

  const handleConfirmPublish = async () => {
    if (!dateRange || !selectedDepartment) {
      message.warning('Lütfen departman ve tarih aralığı seçin');
      return;
    }
    const [start, end] = [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')];
    try {
      const config = getAuthConfig();
      await axios.post(
        `${BASE_URL}/api/shifts/publish-pdf`,
        {
          departmentId: selectedDepartment,
          startDate: start,
          endDate: end,
        },
        config
      );
      message.success('Vardiya planı mail olarak gönderildi (PDF).');
      setPublishModalVisible(false);
      setPreviewVisible(false);
      setDateRange(null);
      setPreviewData([]);
    } catch (error) {
      console.error('Error publishing shifts:', error);
      message.error('Yayınlama sırasında hata oluştu');
    }
  };

  // Haftanın 7 gününü hesaplıyoruz => parent'tan gelen viewDate kullanarak
  const weekDays = [...Array(7)].map((_, i) =>
    viewDate.startOf('week').add(i, 'day')
  );

  // Tablo başlığında gösterilecek kısaltmalar
  const formatDayHeader = (day) => {
    const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    return `${dayNames[day.day() === 0 ? 6 : day.day() - 1]} ${day.format('DD/MM')}`;
  };

  // Hücreye tıklandığında
  const handleCellClick = (person, day) => {
    setSelectedPerson(person);
    setSelectedDay(day);

    Modal.confirm({
      title: 'Ne eklemek istiyorsunuz?',
      okText: 'Vardiya',
      cancelText: 'İzin Günü',
      onOk: () => {
        setIsAddShiftModalVisible(true);
      },
      onCancel: async () => {
        try {
          await axios.post(
            `${BASE_URL}/api/shifts/off-days`,
            {
              personnel_id: person.id,
              assignment_date: day.format('YYYY-MM-DD'),
            },
            getAuthConfig()
          );
          message.success('İzin günü başarıyla eklendi');
          fetchWeeklyShifts();
        } catch (error) {
          console.error('Error adding off day:', error);
          message.error('İzin günü eklenirken hata oluştu');
        }
      },
    });
  };

  // Publish önizleme tablo kolonları
  const previewColumns = [
    {
      title: 'Personel Adı',
      dataIndex: 'first_name',
      render: (_, record) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Tarih',
      dataIndex: 'assignment_date',
      render: (d) => dayjs(d).format('DD.MM.YYYY'),
    },
    { title: 'Vardiya', dataIndex: 'shift_name' },
    { title: 'Başlangıç', dataIndex: 'start_time' },
    { title: 'Bitiş', dataIndex: 'end_time' },
  ];

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div style={{ padding: '16px' }}>
          {/* Üst bar */}
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            <Space>
              {/* Departman seçimi */}
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

              {/* Haftalık DatePicker => parent'taki viewDate değiştirilir */}
              <DatePicker
                picker="week"
                value={viewDate} // local state değil
                onChange={(val) => val && setViewDate(val)} 
              />
            </Space>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <Button type="primary" onClick={onBulkAssign}>
                Toplu İşlemler
              </Button>
              <Button onClick={showPublishModal}>Publish</Button>
            </div>
          </div>

          {/* Haftalık tablomsu layout */}
          <div
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}
          >
            {/* Başlık satırı (Günler) */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: 'bold',
                padding: '8px 0',
              }}
            >
              <div
                style={{
                  width: '16%',
                  minWidth: '150px',
                  borderRight: '1px solid #f0f0f0',
                  padding: '8px',
                  boxSizing: 'border-box',
                }}
              >
                Personel
              </div>

              {weekDays.map((day) => (
                <div
                  key={day.format()}
                  style={{
                    width: `${(84 / 7).toFixed(2)}%`,
                    borderRight: '1px solid #f0f0f0',
                    textAlign: 'center',
                    padding: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  {formatDayHeader(day)}
                </div>
              ))}
            </div>

            {/* Personel satırları */}
            {personnel.map((person) => {
              return (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #f0f0f0',
                    minHeight: '80px',
                  }}
                >
       <div
  style={{
    width: '16%',
    minWidth: '180px',
    borderRight: '1px solid #f0f0f0',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    gap: '8px'
  }}
>
  <Avatar 
    src={personnelPhotos[person.id]} 
    icon={<UserOutlined />}
    style={{ 
      border: '2px solid #f0f0f0',
      backgroundColor: '#fff',
      width: '64px',
      height: '64px'
    }}
  />
  <span>{person.first_name} {person.last_name}</span>
</div>

                  {/* Gün bazlı hücreler */}
                  {weekDays.map((day) => {
                    const dayShifts = shifts.filter(
                      (shift) =>
                        shift.personnel_id === person.id &&
                        dayjs(shift.assignment_date).isSame(day, 'day')
                    );
                    return (
                      <Cell
                        key={`${person.id}-${day.format('YYYY-MM-DD')}`}
                        person={person}
                        day={day}
                        dayShifts={dayShifts}
                        handleShiftDrop={handleShiftDrop}
                        handleShiftAction={handleShiftAction}
                        onCellClick={handleCellClick}
                        style={{
                          width: `${(84 / 7).toFixed(2)}%`,
                          borderRight: '1px solid #f0f0f0',
                          boxSizing: 'border-box',
                        }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </DndProvider>

      {/* Çoklu Kopyalama Modal */}
      <Modal
        title="Vardiyayı Çoklu Kopyala"
        open={isBulkCopyModalVisible}
        onCancel={() => setIsBulkCopyModalVisible(false)}
        onOk={async () => {
          try {
            await bulkCopyShiftAssignment(bulkCopyShiftId, bulkCopyDays);
            message.success('Vardiya başarıyla çoklu kopyalandı');
            fetchWeeklyShifts();
            setIsBulkCopyModalVisible(false);
          } catch (error) {
            message.error('İşlem sırasında hata oluştu');
          }
        }}
      >
        <p>Kaç gün boyunca kopyalamak istiyorsunuz?</p>
        <InputNumber
          min={1}
          max={365}
          value={bulkCopyDays}
          onChange={(value) => setBulkCopyDays(value)}
        />
      </Modal>

      {/* Vardiya Ekleme Modal */}
      <Modal
        title="Vardiya Ekle"
        open={isAddShiftModalVisible}
        onCancel={() => {
          setIsAddShiftModalVisible(false);
          setSelectedShiftScheduleId(null);
        }}
        onOk={addShiftAssignment}
      >
        <p>
          {selectedPerson
            ? `${selectedPerson.first_name} ${selectedPerson.last_name} için ${selectedDay?.format(
                'DD/MM/YYYY'
              )} tarihine vardiya ekle:`
            : ''}
        </p>
        <Select
          style={{ width: '100%' }}
          placeholder="Vardiya Seçin"
          value={selectedShiftScheduleId}
          onChange={(value) => setSelectedShiftScheduleId(value)}
        >
          {shiftSchedules.map((shift) => (
            <Select.Option key={shift.id} value={shift.id}>
              {shift.name} ({shift.start_time} - {shift.end_time})
            </Select.Option>
          ))}
        </Select>
      </Modal>

      {/* Publish Modal (Tarih aralığı) */}
      <Modal
        title="Vardiya Planı Yayınlama"
        open={publishModalVisible}
        onCancel={() => setPublishModalVisible(false)}
        footer={null}
      >
        <p>Lütfen tarih aralığı seçin:</p>
        <DatePicker.RangePicker onChange={handleDateRangeChange} />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button onClick={handlePreview} type="primary">
            Önizleme Al
          </Button>
        </div>
      </Modal>

      {/* Önizleme Modal */}
      <Modal
        title="Önizleme"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setPreviewVisible(false)}>
            İptal
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmPublish}>
            Onayla ve Mail Gönder
          </Button>,
        ]}
      >
        <Table columns={previewColumns} dataSource={previewData} rowKey="id" />
      </Modal>
    </>
  );
});

export default WeeklyShiftCalendar;

// Hücre bileşeni
const Cell = ({ person, day, dayShifts, handleShiftDrop, handleShiftAction, onCellClick, style }) => {
  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SHIFT_CARD,
    drop: (item) => {
      handleShiftDrop(item.id, day.format('YYYY-MM-DD'), person.id, item.isOffDay);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  });

  const handleClick = (event) => {
    if (!event.target.closest('.ant-card') && !event.target.closest('.ant-dropdown')) {
      onCellClick(person, day);
    }
  };

  return (
    <div
      ref={drop}
      onClick={handleClick}
      style={{
        ...style,
        padding: '4px',
        backgroundColor: isOver ? '#e6f7ff' : 'inherit',
        minHeight: '80px',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {dayShifts.map((shift) => (
        <ShiftCard
          key={shift.id}
          shift={shift}
          handleShiftAction={handleShiftAction}
        />
      ))}
    </div>
  );
};

const ShiftCard = ({ shift, handleShiftAction }) => {
  const isOffDay = shift.is_off_day || false;
  const isLeaveRequest = shift.is_leave_request || false;

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SHIFT_CARD,
    item: { id: shift.id, isOffDay, isLeaveRequest },
    canDrag: !isLeaveRequest, 
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const shiftActionMenu = {
    items: isLeaveRequest
      ? shift.status === 'pending'
        ? [
            { key: 'approve', icon: <CheckOutlined />, label: 'Onayla' },
            { key: 'reject', icon: <CloseOutlined />, label: 'Reddet' },
          ]
        : []
      : isOffDay
      ? [{ key: 'delete', icon: <DeleteOutlined />, label: 'Sil' }]
      : [
          { key: 'copy', icon: <CopyOutlined />, label: 'Kopyala' },
          { key: 'delete', icon: <DeleteOutlined />, label: 'Sil' },
          { key: 'bulkCopy', icon: <SettingOutlined />, label: 'Çoklu Kopyala' },
        ],
  };

  const handleMenuClick = ({ key }) => {
    handleShiftAction(key, shift.id, isOffDay, isLeaveRequest);
  };

  const cardProps = {
    size: 'small',
    style: {
      backgroundColor: shift.color || '#f0f0f0',
      marginBottom: 4,
      color: getBestTextColor(shift.color || '#f0f0f0'),
      minHeight: '60px',
      fontSize: '14px',
      opacity: isDragging ? 0.5 : 1,
      cursor: isLeaveRequest ? 'default' : 'move',
    },
  };

  return (
    <Card
      ref={!isLeaveRequest ? drag : null}
      {...cardProps}
      onClick={(e) => e.stopPropagation()}
      bodyStyle={{
        padding: '8px',
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
      }}
      actions={
        shiftActionMenu.items.length > 0
          ? [
              <Dropdown
                menu={{
                  items: shiftActionMenu.items,
                  onClick: handleMenuClick,
                }}
                trigger={['click']}
                key="dropdown"
              >
                <Button
                  type="text"
                  icon={<SettingOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Dropdown>,
            ]
          : []
      }
    >
      {shift.shift_name}
      {isLeaveRequest && shift.reason && (
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Sebep: {shift.reason}
        </div>
      )}
    </Card>
  );
};

function getBestTextColor(bgColor) {
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 125 ? '#000000' : '#ffffff';
}
