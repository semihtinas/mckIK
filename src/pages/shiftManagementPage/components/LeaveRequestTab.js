import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, DatePicker, Input, Space, Tag, message, Radio } from 'antd';
import axios from 'axios';
import WeeklyLeaveCalendar from './WeeklyLeaveCalendar'; // Yeni bileşen oluşturacağız


const LeaveRequestTab = () => {
  const [requests, setRequests] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' veya 'calendar'


  useEffect(() => {
    fetchRequests();
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setIsAdmin(['admin', 'team_leader'].includes(response.data.role));
    } catch (error) {
      console.error('Error checking role:', error);
    }
  };

  const fetchRequests = async () => {
    try {
      const endpoint = isAdmin ? '/leave-requests' : '/my-leave-requests';
      const response = await axios.get(`http://localhost:5001/api/shifts${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
  
      // Her bir izin talebi için personel bilgisini alalım
      const requestsWithPersonnel = await Promise.all(
        response.data.map(async (request) => {
          try {
            const personnelResponse = await axios.get(
              `http://localhost:5001/api/personnel/${request.personnel_id}`,
              {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              }
            );
            return {
              ...request,
              personnel_name: `${personnelResponse.data.first_name} ${personnelResponse.data.last_name}`
            };
          } catch (error) {
            return {
              ...request,
              personnel_name: `Personel ${request.personnel_id}`
            };
          }
        })
      );
  
      setRequests(requestsWithPersonnel);
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      message.error('İzin talepleri yüklenirken hata oluştu');
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const formattedDate = values.leave_date.format('YYYY-MM-DD');
      
      await axios.post(
        'http://localhost:5001/api/shifts/leave-requests',
        {
          leave_date: formattedDate,
          reason: values.reason
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
   
      message.success('İzin talebi başarıyla oluşturuldu');
      setIsModalVisible(false);
      form.resetFields();
      fetchRequests();
    } catch (error) {
      if (error.response?.data?.error?.includes('duplicate key value violates unique constraint')) {
        message.warning('Bu tarihe ait bir izin talebiniz zaten bulunmaktadır');
      } else {
        message.error('İzin talebi oluşturulurken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
   };

  const handleStatusChange = async (id, status) => {
    try {
      await axios.put(
        `http://localhost:5001/api/shifts/leave-requests/${id}`,
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      message.success('İzin talebi durumu güncellendi');
      fetchRequests();
    } catch (error) {
      message.error('Durum güncellenirken hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Personel',
      key: 'personnel',
      render: (_, record) => `${record.first_name} ${record.last_name}`,
    },
    {
      title: 'Talep Tarihi',
      dataIndex: 'request_date',
      key: 'request_date',
      render: (date) => new Date(date).toLocaleDateString('tr-TR'),
    },
    {
      title: 'İzin Tarihi',
      dataIndex: 'leave_date',
      key: 'leave_date',
      render: (date) => new Date(date).toLocaleDateString('tr-TR'),
    },
    {
      title: 'Sebep',
      dataIndex: 'reason',
      key: 'reason',
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          pending: 'gold',
          approve: 'green',
          approved: 'green',
          reject: 'red',
          rejected: 'red',
        };
        const labels = {
          pending: 'BEKLEMEDE',
          approve: 'ONAYLANDI',
          approved: 'ONAYLANDI',
          reject: 'REDDEDİLDİ',
          rejected: 'REDDEDİLDİ',
        };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      },
    },
    isAdmin && {
      title: 'İşlemler',
      key: 'actions',
      render: (_, record) => (
        record.status === 'pending' && (
          <Space>
            <Button
              type="primary"
              size="small"
              onClick={() => handleStatusChange(record.id, 'approved')}
            >
              Onayla
            </Button>
            <Button
              danger
              size="small"
              onClick={() => handleStatusChange(record.id, 'rejected')}
            >
              Reddet
            </Button>
          </Space>
        )
      ),
    },
  ].filter(Boolean);

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          onClick={() => setIsModalVisible(true)}
        >
          Yeni İzin Talebi
        </Button>
        
        <Radio.Group 
          value={viewMode}
          onChange={e => setViewMode(e.target.value)}
          optionType="button"
        >
          <Radio.Button value="list">Liste</Radio.Button>
          <Radio.Button value="calendar">Takvim</Radio.Button>
        </Radio.Group>
      </Space>
 
      {viewMode === 'list' ? (
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
        />
      ) : (
        <WeeklyLeaveCalendar
        requests={requests}
        isAdmin={isAdmin}
        onStatusChange={handleStatusChange}
        onRefresh={fetchRequests} // Yeni prop
      />
      )}

      <Modal
        title="İzin Talebi Oluştur"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="leave_date"
            label="İzin Tarihi"
            rules={[{ required: true, message: 'Lütfen izin tarihi seçin' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Sebep"
            rules={[{ required: true, message: 'Lütfen izin sebebini belirtin' }]}
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Gönder
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LeaveRequestTab;