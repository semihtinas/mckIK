import React, { useState } from 'react';
import { DatePicker, Button, Space, Tag, Modal, Form, Input, message } from 'antd';
import dayjs from 'dayjs';
import axios from 'axios';

const WeeklyLeaveCalendar = ({ requests, isAdmin, onStatusChange, onRefresh }) => {
 const [currentWeek, setCurrentWeek] = useState(dayjs());
 const [isModalVisible, setIsModalVisible] = useState(false);
 const [selectedPerson, setSelectedPerson] = useState(null);
 const [selectedDay, setSelectedDay] = useState(null);
 const [form] = Form.useForm();

 const weekDays = [...Array(7)].map((_, i) => currentWeek.startOf('week').add(i, 'day'));

 const getRequests = (day, requests) => {
   return requests.filter(request => 
     dayjs(request.leave_date).format('YYYY-MM-DD') === day.format('YYYY-MM-DD')
   );
 };

 const handleCellClick = (person, day) => {
   setSelectedPerson(person);
   setSelectedDay(day);
   setIsModalVisible(true);
 };

 const handleSubmit = async (values) => {
    try {
      await axios.post(
        'http://localhost:5001/api/shifts/leave-requests',
        {
          leave_date: selectedDay.format('YYYY-MM-DD'),
          reason: values.reason
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      message.success('İzin talebi başarıyla oluşturuldu');
      setIsModalVisible(false);
      form.resetFields();
      onRefresh(); // Talep oluşturulunca sayfayı yenile
    } catch (error) {
      if (error.response?.data?.error?.includes('duplicate key value')) {
        message.warning('Bu tarihe ait bir izin talebiniz zaten bulunmaktadır');
      } else {
        message.error('İzin talebi oluşturulurken hata oluştu');
      }
    }
  };


    // onStatusChange'i sarmalayalım
    const handleStatusChange = async (id, status) => {
        await onStatusChange(id, status);
        onRefresh(); // Durum değişince sayfayı yenile
      };


 const formatDayHeader = (day) => {
   const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
   return `${dayNames[day.day() === 0 ? 6 : day.day() - 1]} ${day.format('DD/MM')}`;
 };

 return (
   <div>
     <Space style={{ marginBottom: 16 }}>
       <DatePicker picker="week" value={currentWeek} onChange={setCurrentWeek} />
     </Space>

     <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #f0f0f0' }}>
       <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold', padding: '8px 0' }}>
         <div style={{ width: '16%', minWidth: '150px', borderRight: '1px solid #f0f0f0', padding: '8px' }}>
           Personel
         </div>
         {weekDays.map((day) => (
           <div key={day.format()} style={{ width: `${(84 / 7).toFixed(2)}%`, borderRight: '1px solid #f0f0f0', textAlign: 'center', padding: '8px' }}>
             {formatDayHeader(day)}
           </div>
         ))}
       </div>

       {Array.from(new Set(requests.map(r => r.personnel_id))).map(personnelId => {
         const person = requests.find(r => r.personnel_id === personnelId);
         return (
           <div key={personnelId} style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', minHeight: '80px' }}>
             <div style={{ width: '16%', minWidth: '150px', borderRight: '1px solid #f0f0f0', padding: '8px', display: 'flex', alignItems: 'center' }}>
               {person.first_name} {person.last_name}
             </div>
             {weekDays.map((day) => {
               const dayRequests = getRequests(day, requests.filter(r => r.personnel_id === personnelId));
               return (
                 <div 
                   key={day.format()} 
                   style={{ 
                     width: `${(84 / 7).toFixed(2)}%`, 
                     borderRight: '1px solid #f0f0f0', 
                     padding: '4px',
                     cursor: 'pointer',
                     minHeight: '80px',
                     backgroundColor: day.isSame(selectedDay, 'day') ? '#f0f0f0' : 'inherit'
                   }}
                   onClick={() => handleCellClick(person, day)}
                 >
                   {dayRequests.map((request) => (
                     <Tag
                       key={request.id}
                       color={request.status === 'pending' ? 'gold' : request.status === 'approved' ? 'green' : 'red'}
                       style={{ width: '100%', margin: '2px 0' }}
                     >
                       {request.status === 'pending' ? 'Beklemede' : request.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                       {isAdmin && request.status === 'pending' && (
                         <Space style={{ float: 'right' }}>
                           <Button 
                             size="small" 
                             type="link" 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleStatusChange(request.id, 'approved');
                             }}
                           >
                             Onayla
                           </Button>
                           <Button 
                             size="small" 
                             type="link" 
                             danger 
                             onClick={(e) => {
                               e.stopPropagation();
                               handleStatusChange(request.id, 'rejected');
                             }}
                           >
                             Reddet
                           </Button>
                         </Space>
                       )}
                     </Tag>
                   ))}
                 </div>
               );
             })}
           </div>
         );
       })}
     </div>

     <Modal
       title={`İzin Talebi Oluştur - ${selectedPerson?.first_name} ${selectedPerson?.last_name} (${selectedDay?.format('DD/MM/YYYY')})`}
       open={isModalVisible}
       onCancel={() => {
         setIsModalVisible(false);
         form.resetFields();
       }}
       footer={null}
     >
       <Form form={form} onFinish={handleSubmit} layout="vertical">
         <Form.Item
           name="reason"
           label="Sebep"
           rules={[{ required: true, message: 'Lütfen izin sebebini belirtin' }]}
         >
           <Input.TextArea />
         </Form.Item>

         <Form.Item>
           <Button type="primary" htmlType="submit">
             Gönder
           </Button>
         </Form.Item>
       </Form>
     </Modal>
   </div>
 );
};

export default WeeklyLeaveCalendar;