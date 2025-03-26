import React, { useState, useEffect } from 'react';
import { Form, DatePicker, Button, Select, message, Modal, Input, ConfigProvider } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

const { Option } = Select;

const { RangePicker } = DatePicker;

const LeaveRequestForm = ({ closeModal, onLeaveRequestSuccess, refreshData }) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [form] = Form.useForm();
  const [leaveDays, setLeaveDays] = useState(0);
  const [workDays, setWorkDays] = useState(0);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [formData, setFormData] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [normalLeaveBalance, setNormalLeaveBalance] = useState(0);

   // Stil tanımlamaları komponentin en üstünde
   const rangePickerStyle = {
    width: '100%',
    '.ant-picker-input': {
      backgroundColor: '#fff',
      borderRadius: '4px',
      height: '40px'
    }
  };

  const datePickerTheme = {
    components: {
      DatePicker: {
        colorPrimary: '#1890ff',
        controlItemBgActive: '#e6f7ff',
        fontSize: 14
      }
    }
  };



  const axiosInstance = axios.create({
    baseURL: 'http://localhost:5001',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const userResponse = await axiosInstance.get('/api/me');
        setCurrentUser(userResponse.data);
        
        if (userResponse.data?.id) {
          try {
            const balanceResponse = await axiosInstance.get(`/api/leave/leave-balance/${userResponse.data.id}`);
            console.log('Leave balance response:', balanceResponse.data);
            setLeaveBalance(balanceResponse.data);
          } catch (error) {
            console.error('Error fetching leave balance:', error);
            message.error('İzin bakiyesi yüklenirken hata oluştu');
          }
        }

        const [leaveTypesRes, holidaysRes] = await Promise.all([
          axiosInstance.get('/api/leave-management/new-leave-types'),
          axiosInstance.get('/api/public-holidays')
        ]);
        

        setLeaveTypes(leaveTypesRes.data);
        setHolidays(holidaysRes.data.map(h => dayjs(h.holiday_date)));
      } catch (error) {
        console.error('Fetch error:', error);
        message.error('Veriler yüklenirken hata oluştu');
      }
    };

    fetchInitialData();
  }, []);


  


  useEffect(() => {
    const fetchNormalLeaveBalance = async () => {
      try {
        const response = await axiosInstance.get('/api/leave/leave-balances/summary/normal', {
          params: { personnel_id: currentUser?.id }
        });             
        setNormalLeaveBalance(response.data.total_remaining_days);
      } catch (error) {
        console.log('Fetching leave balance for:', currentUser?.id);
        console.log('Request URL:', '/api/leave/leave-balances/summary/normal');
        console.error('Normal izin bakiyesi yüklenirken hata:', error);
        message.error('İzin bakiyesi yüklenemedi');
      }
    };
  
    if (currentUser?.id) {
      fetchNormalLeaveBalance();
    }
  }, [currentUser]);


  const renderLeaveBalance = () => {
    if (!leaveBalance || !formData.leave_type_id) return null;
    
    const currentBalance = leaveBalance.find(b => b.leave_type_id === formData.leave_type_id);
    if (!currentBalance) return null;
  
    return (
      <div className="mb-4 p-4 bg-gray-50 rounded">
        <h4>İzin Bakiyesi</h4>
        <p>Toplam İzin Hakkı: {currentBalance.total_days} gün</p>
        <p>Kullanılan İzin: {currentBalance.used_days} gün</p>
        <p>Kalan İzin: {currentBalance.remaining_days} gün</p>
      </div>
    );
  };

  const calculateBusinessDays = (start, end, holidays) => {
    let businessDays = 0;
    let currentDate = dayjs(start);

    while (currentDate.isSameOrBefore(end, 'day')) {
      if (currentDate.day() !== 0 && currentDate.day() !== 6) {
        const isHoliday = holidays.some(holiday => holiday.isSame(currentDate, 'day'));
        if (!isHoliday) {
          businessDays++;
        }
      }
      currentDate = currentDate.add(1, 'days');
    }

    return businessDays;
  };

  const calculateLeaveDays = (start, end) => {
    if (start && end) {
      return end.diff(start, 'days') + 1;
    }
    return 0;
  };
  

  // onValuesChange fonksiyonunu güncelle
const onValuesChange = (changedValues, allValues) => {
  if (changedValues.leave_type_id) {
    setFormData(prev => ({
      ...prev,
      leave_type_id: changedValues.leave_type_id
    }));
  }

  if (changedValues.reason) {
    setFormData(prev => ({
      ...prev,
      reason: changedValues.reason
    }));
  }
};
  


  const handleLeaveRequest = async () => {
    try {
      const requestedDays = leaveDays;
      const selectedLeaveType = formData.leave_type_id;

      if (!formData.leave_type_id) {
        message.error('Lütfen izin türünü seçiniz');
        return;
      }
  
      if (!formData.start_date || !formData.end_date) {
        message.error('Lütfen tarih aralığı seçiniz');
        return;
      }
      if (!selectedLeaveType) {
        message.error('Lütfen izin türünü seçiniz.');
        return;
      }
  
      // Önce izin türü detaylarını ve koşullarını kontrol et
      try {
        const leaveTypeResponse = await axiosInstance.get(`/api/leave-management/new-leave-types/${selectedLeaveType}`);
        const leaveTypeDetails = leaveTypeResponse.data;
        
        // İzin türü için koşul kontrolü
        if (leaveTypeDetails.conditions && leaveTypeDetails.conditions.length > 0) {
          try {
            // Koşul kontrolü için leave.js'deki yeni check-eligibility endpoint'ini çağır
            await axiosInstance.post('/api/leave/check-eligibility', {
              personnel_id: currentUser.id,
              leave_type_id: selectedLeaveType
            });
          } catch (eligibilityError) {
            message.error(eligibilityError.response?.data?.error || 'İzin koşulları karşılanmıyor');
            return;
          }
        }
  
        // İzin bakiyesi kontrolü
        const formattedValues = {
          ...formData,
          personnel_id: currentUser.id,
          start_date: dayjs(formData.start_date).format('YYYY-MM-DD'),
          end_date: dayjs(formData.end_date).format('YYYY-MM-DD'),
          status: 'Pending',
          work_days: workDays,
          total_days: leaveDays
        };

        console.log("Formatted Values:", formattedValues);

        try {
          await axiosInstance.post('/api/leave/check-balance', {
            personnel_id: currentUser.id,
            leave_type_id: selectedLeaveType,
            requested_days: workDays,
          });
  
          // Bakiye kontrolü başarılı, izin talebini oluştur
          await axiosInstance.post('/api/leave/leave-request', formattedValues);
          
          message.success('İzin talebi başarıyla oluşturuldu');
          form.resetFields();
          if (onLeaveRequestSuccess) {
            onLeaveRequestSuccess();
          }
          if (closeModal) {
            closeModal();
          }
          if (refreshData) {
            refreshData();
          }
        } catch (balanceError) {
          if (balanceError.response?.status === 400) {
            Modal.confirm({
              title: 'Yetersiz İzin Bakiyesi',
              content: `${balanceError.response.data.error}. İzin talebini yine de göndermek istiyor musunuz?`,
              okText: 'Gönder',
              cancelText: 'Vazgeç',
              onOk: async () => {
                try {
                  // Force approve ile tekrar dene
                  await axiosInstance.post('/api/leave/leave-request', {
                    ...formattedValues,
                    force_approve: true
                  });
                  
                  message.success('İzin talebi başarıyla oluşturuldu');
                  form.resetFields();
                  if (onLeaveRequestSuccess) onLeaveRequestSuccess();
                  if (closeModal) closeModal();
                  if (refreshData) refreshData();
                } catch (submitError) {
                  message.error(submitError.response?.data?.error || 'İzin talebi oluşturulurken hata oluştu');
                }
              }
            });
          } else {
            message.error(balanceError.response?.data?.error || 'İzin bakiyesi kontrolünde hata oluştu');
          }
        }
      } catch (leaveTypeError) {
        console.error('Error fetching leave type details:', leaveTypeError);
        message.error('İzin türü bilgileri alınırken hata oluştu');
        return;
      }
    } catch (error) {
      console.error('Error:', error);
      message.error('İzin talebi işlenirken bir hata oluştu');
    }
  };

  const handleConfirm = async () => {
    try {
      const formattedValues = {
        ...formData,
        personnel_id: currentUser.id,
        start_date: formData.start_date && dayjs(formData.start_date).isValid() ? dayjs(formData.start_date).format('YYYY-MM-DD') : null,
        end_date: formData.end_date && dayjs(formData.end_date).isValid() ? dayjs(formData.end_date).format('YYYY-MM-DD') : null,
        status: 'Pending',
        work_days: workDays,
        total_days: leaveDays // `total_days` değerini ekledik
      };
      
      console.log('Sending work_days value:', formattedValues.work_days);
      console.log('Sending total_days value:', formattedValues.total_days); // Ek log
      console.log('Formatted start_date:', dayjs(formData.start_date).format('YYYY-MM-DD'));
      console.log('Formatted end_date:', dayjs(formData.end_date).format('YYYY-MM-DD'));

  
      await axiosInstance.post('/api/leave/leave-request', formattedValues);
      
      message.success('İzin talebi başarıyla oluşturuldu');
      form.resetFields();
      setIsConfirmModalVisible(false);
      if (onLeaveRequestSuccess) {
        onLeaveRequestSuccess();
      }
      if (closeModal) {
        closeModal();
      }
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Submit error:', error);
      message.error('İzin talebi oluşturulurken hata oluştu');
    }
  };

  

// onFinish fonksiyonunu güncelle
const onFinish = (values) => {
  const dateRange = values.date_range;
  if (!dateRange || !dateRange[0] || !dateRange[1]) {
    message.error('Lütfen geçerli bir tarih aralığı seçin');
    return;
  }

  const formattedValues = {
    ...formData,
    personnel_id: currentUser?.id,
    leave_type_id: values.leave_type_id,
    start_date: dateRange[0].format('YYYY-MM-DD'),
    end_date: dateRange[1].format('YYYY-MM-DD'),
    reason: values.reason
  };

  handleLeaveRequest();
};

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onValuesChange}>
        {currentUser && (
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p><strong>Personel:</strong> {currentUser.first_name} {currentUser.last_name}</p>
          </div>
        )}

{normalLeaveBalance > 0 && (
  <div className="mb-4 p-4 bg-gray-50 rounded">
    <h4>Toplam İzin Bakiyesi</h4>
    <p><strong>Kalan Gün:</strong> {normalLeaveBalance} gün</p>
  </div>
)}


        {renderLeaveBalance()}



        <Form.Item name="leave_type_id" label="İzin Türü" rules={[{ required: true, message: 'Lütfen izin türü seçin' }]}>
          <Select placeholder="İzin türü seçin">
            {leaveTypes.map((type) => (
              <Option key={type.id} value={type.id}>
                {type.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
  name="date_range" 
  label="İzin Tarihleri" 
  rules={[{ required: true, message: 'Lütfen izin tarihlerini seçin' }]}
>
  <RangePicker 
    style={{ width: '100%' }}
    format="DD.MM.YYYY"
    disabledDate={(current) => {
      // Geçmiş tarihleri devre dışı bırak
      return current && current < dayjs().startOf('day');
    }}
    placeholder={['Başlangıç Tarihi', 'Bitiş Tarihi']}
    onChange={(dates) => {
      if (dates) {
        const [start, end] = dates;
        if (start && end) {
          const leaveDays = calculateLeaveDays(start, end);
          const workDays = calculateBusinessDays(start, end, holidays);
          setLeaveDays(leaveDays);
          setWorkDays(workDays);
          
          // Form data'yı güncelle
          setFormData(prev => ({
            ...prev,
            start_date: start,
            end_date: end
          }));
        }
      } else {
        setLeaveDays(0);
        setWorkDays(0);
        setFormData(prev => ({
          ...prev,
          start_date: null,
          end_date: null
        }));
      }
    }}
  />
</Form.Item>

        <Form.Item>
          <p><strong>Talep edilen izin gün sayısı:</strong> {leaveDays} gün</p>
          <p><strong>İzin hakkından düşülecek iş günleri:</strong> {workDays} gün</p>
        </Form.Item>

        <Form.Item name="reason" label="İzin Nedeni" rules={[{ required: true, message: 'Lütfen izin nedeni girin' }]}>
          <Input.TextArea rows={4} placeholder="İzin nedeni yazın" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Talep Gönder
          </Button>
        </Form.Item>
      </Form>

      <Modal
  title="İzin Talebini Onayla"
  open={isConfirmModalVisible}
  onOk={handleConfirm}
  onCancel={() => setIsConfirmModalVisible(false)}
  okText="Onayla"
  cancelText="İptal"
>
  <p><strong>İzin Türü:</strong> {leaveTypes.find(l => l.id === formData.leave_type_id)?.name}</p>
  <p><strong>İzin Tarihleri:</strong> {formData.start_date && formData.end_date ? 
    `${dayjs(formData.start_date).format('DD.MM.YYYY')} - ${dayjs(formData.end_date).format('DD.MM.YYYY')}` : 
    'Belirtilmemiş'}</p>
  <p><strong>Talep edilen izin gün sayısı:</strong> {leaveDays} gün</p>
  <p><strong>İş günleri:</strong> {workDays} gün</p>
  <p><strong>İzin Nedeni:</strong> {formData.reason}</p>
</Modal>
    </>
  );
}

export default LeaveRequestForm;
