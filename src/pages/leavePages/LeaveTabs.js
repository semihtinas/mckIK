import React, { useState, useEffect } from 'react';
import { Tabs, Table, message, Modal, Button, Input, Card, Row, Col,  Space, Tooltip  } from 'antd';
import axios from 'axios';
import moment from 'moment';
import BulkLeaveUpdate from './components/BulkLeaveUpdate';
import LeaveRequestForm from './components/LeaveRequestForm';
import { ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';

const LeaveTabs = () => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isLeaveFormVisible, setIsLeaveFormVisible] = useState(false);
  const [reason, setReason] = useState('');




  const axiosInstance = axios.create({
    baseURL: 'http://localhost:5001',
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
  });
const fetchLeaves = async () => {
  try {
    const [pendingResponse, approvedResponse, rejectedResponse] = await Promise.all([
      axiosInstance.get('/api/leave/leaves/pending'),
      axiosInstance.get('/api/leave/leaves/approved'),
      axiosInstance.get('/api/leave/leaves/rejected')
    ]);

    setPendingLeaves(pendingResponse.data);
    setApprovedLeaves(approvedResponse.data);
    setRejectedLeaves(rejectedResponse.data);
  } catch (error) {
    console.error('Fetch error:', error);
    message.error('İzin talepleri yüklenemedi');
  }
};

  useEffect(() => {
    fetchLeaves();
  }, []);

  const showModal = (leave) => {
    setSelectedLeave(leave);
    setReason('');
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setSelectedLeave(null);
  };

  useEffect(() => {
    axiosInstance.interceptors.request.use(request => {
      console.log('Starting Request:', request);
      return request;
    });

    axiosInstance.interceptors.response.use(
      response => {
        console.log('Response:', response);
        return response;
      },
      error => {
        console.log('Response Error:', error.response);
        return Promise.reject(error);
      }
    );
  }, []);

  const handleApprove = async (leaveId) => {
    try {
      console.log('Onaylama başlatılıyor:', leaveId);
      
      // İlk onay denemesi
      const approveResponse = await axiosInstance.put(`/api/leave/leaves/${leaveId}/approve`, {
        approval_reason: reason || "Onaylandı",
        forceApprove: false
      });

      console.log('İlk onay yanıtı:', approveResponse);

      if (approveResponse.status === 200) {
        message.success('İzin talebi başarıyla onaylandı');
        fetchLeaves();
        setIsModalVisible(false);
        return;
      }

    } catch (error) {
      console.log('Hata detayı:', error.response?.data);

      if (error.response?.status === 400) {
        if (error.response.data?.requiresConfirmation) {
          Modal.confirm({
            title: 'İzin Bakiyesi Yetersiz',
            content: `${error.response.data?.error || 'İzin bakiyesi yetersiz.'} 
                     İzni yine de onaylamak istiyor musunuz?`,
            okText: 'Onayla',
            cancelText: 'İptal',
            onOk: async () => {
              try {
                console.log('Zorla onaylama başlatılıyor');
                
                const forceResponse = await axiosInstance.put(`/api/leave/leaves/${leaveId}/approve`, {
                  approval_reason: reason || "Yetersiz bakiyeye rağmen onaylandı",
                  forceApprove: true
                });

                console.log('Zorla onaylama yanıtı:', forceResponse);

                if (forceResponse.status === 200) {
                  message.success(forceResponse.data.message || 'İzin talebi yetersiz bakiyeye rağmen onaylandı');
                  fetchLeaves();
                  setIsModalVisible(false);
                }
              } catch (forceError) {
                console.error('Zorla onaylama hatası:', forceError.response?.data);
                message.error(forceError.response?.data?.error || 'İzin onaylanırken bir hata oluştu');
              }
            },
            onCancel() {
              message.info('İzin onaylama işlemi iptal edildi');
            },
          });
        } else {
          // Diğer 400 hataları için
          message.error(error.response.data?.error || 'İzin onaylanamadı');
        }
      } else {
        // 500 ve diğer hatalar için
        console.error('Onaylama hatası:', error);
        message.error(error.response?.data?.error || 'Sunucu hatası oluştu');
      }
    }
  };
  

  const handleReject = async () => {
    if (!selectedLeave) {
      message.error('Seçili izin talebi bulunamadı');
      return;
    }

    try {
      const response = await axiosInstance.put(`/api/leave/leaves/${selectedLeave.id}/reject`, {
        approval_reason: reason || 'Reddedildi'
      });

      if (response.status === 200) {
        message.success('İzin talebi reddedildi');
        setIsModalVisible(false);
        fetchLeaves();
      }
    } catch (error) {
      console.error('Red hatası:', error);
      message.error(error.response?.data?.error || 'İzin talebi reddedilemedi');
    }
  };



  


  const getColumns = (isEditable = false) => [
    {
      title: 'Personel Adı',
      dataIndex: 'personnel_name',
      key: 'personnel_name',
    },
    {
      title: 'İzin Türü',
      dataIndex: 'leave_type_name',
      key: 'leave_type_name',
    },
    {
      title: 'Başlangıç Tarihi',
      dataIndex: 'start_date',
      key: 'start_date',
      render: (text) => moment(text).format('DD.MM.YYYY'),
    },
    {
      title: 'Bitiş Tarihi',
      dataIndex: 'end_date',
      key: 'end_date',
      render: (text) => moment(text).format('DD.MM.YYYY'),
    },
    {
      title: 'Durum',
      dataIndex: 'status',
      key: 'status',
    },
    ...(isEditable ? [{
      title: 'Düzenle',
      key: 'action',
      render: (text, record) => (
        <Button type="link" onClick={() => showModal(record)}>
          Düzenle
        </Button>
      ),
    }] : []),
  ];


  // İzin bakiyelerini yeniden hesaplama fonksiyonu
  const recalculateLeaveBalances = async () => {
    try {
      message.loading({ content: 'İzin bakiyeleri hesaplanıyor...', key: 'balanceUpdate' });
      
      // Önce tüm personel için yeniden hesaplama yap
      await axiosInstance.post('/api/leave/leave-balance/update-all');
      
      // Sonra güncel bakiyeleri getir
      await fetchLeaveBalances();
      
      message.success({ 
        content: 'İzin bakiyeleri başarıyla güncellendi', 
        key: 'balanceUpdate' 
      });
    } catch (error) {
      console.error('İzin bakiyesi güncelleme hatası:', error);
      message.error({ 
        content: 'İzin bakiyeleri güncellenirken hata oluştu', 
        key: 'balanceUpdate' 
      });
    }
  };


   // İzin bakiyelerini getiren fonksiyon
   const fetchLeaveBalances = async () => {
    try {
      const response = await axiosInstance.get('/api/leave/leave-balances/summary');
      setLeaveBalances(response.data);
    } catch (error) {
      console.error('İzin bakiyeleri yüklenirken hata:', error);
      message.error('İzin bakiyeleri yüklenemedi');
    }
  };

  useEffect(() => {
    fetchLeaves();
    fetchLeaveBalances();
  }, []);

  // İzin bakiyeleri için tablo kolonları
  const balanceColumns = [
    {
        title: 'Personel Adı',
        dataIndex: 'personnel_name',
        key: 'personnel_name',
        fixed: 'left',
        width: 200,
        sorter: (a, b) => a.personnel_name.localeCompare(b.personnel_name),
    },
    {
        title: 'İzin Türü',
        dataIndex: 'leave_type_name',
        key: 'leave_type_name',
        width: 150,
    },
    {
        title: 'Toplam Hak',
        dataIndex: 'total_days',
        key: 'total_days',
        width: 120,
        render: (text) => <span style={{ fontWeight: 'bold' }}>{text}</span>,
    },
    {
        title: 'Kullanılan',
        dataIndex: 'used_days',
        key: 'used_days',
        width: 120,
        render: (text) => <span style={{ color: '#f5222d' }}>{text || 0}</span>,
    },
    {
        title: 'Kalan',
        dataIndex: 'remaining_days',
        key: 'remaining_days',
        width: 120,
        render: (text, record) => (
            <span style={{ 
                color: (record.total_days - record.used_days) > 0 ? '#52c41a' : '#f5222d', 
                fontWeight: 'bold' 
            }}>
                {record.total_days - record.used_days}
            </span>
        ),
    },
    {
        title: 'Yıl',
        dataIndex: 'year',
        key: 'year',
        width: 100,
    },
    {
      title: 'Yenileme Bilgisi',
      dataIndex: 'renewal_period_name',
      key: 'renewal_period',
      width: 150,
  },
  {
      title: 'Sonraki Yenileme',
      dataIndex: 'calculated_next_renewal',
      key: 'next_renewal',
      width: 150,
      render: (date) => date ? moment(date).format('DD.MM.YYYY') : '-',
      sorter: (a, b) => moment(a.calculated_next_renewal) - moment(b.calculated_next_renewal),
  }
];

  // Özet kartı bileşeni
  const LeaveBalanceSummary = ({ data }) => {
    const uniquePersonnel = [...new Set(data.map(item => item.personnel_id))];
    const uniqueLeaveTypes = [...new Set(data.map(item => item.leave_type_id))];
  
    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <h3>Toplam Personel</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{uniquePersonnel.length}</p>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <h3>İzin Türü Sayısı</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{uniqueLeaveTypes.length}</p>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <h3>Toplam Aktif İzin Kaydı</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.length}</p>
          </Card>
        </Col>
      </Row>
    );
  };
  


  const items = [
    {
      key: '1',
      label: 'Onay Bekleyen İzinler',
      children: (
        <>
          <Button 
            type="primary" 
            onClick={() => setIsLeaveFormVisible(true)} 
            style={{ marginBottom: 16 }}
          >
            Yeni İzin Talebi
          </Button>
          <Table dataSource={pendingLeaves} columns={getColumns(true)} rowKey="id" />
        </>
      ),
    },
    {
      key: '2',
      label: 'Onaylanan İzinler',
      children: <Table dataSource={approvedLeaves} columns={getColumns()} rowKey="id" />,
    },
    {
      key: '3',
      label: 'Onaylanmayan İzinler',
      children: <Table dataSource={rejectedLeaves} columns={getColumns()} rowKey="id" />,
    },
    {
      key: '4',
      label: 'İzin Bakiyeleri',
      children: (
        <div>
          <LeaveBalanceSummary data={leaveBalances} />
          <Table 
            dataSource={leaveBalances} 
            columns={balanceColumns} 
            rowKey={record => `${record.personnel_id}-${record.leave_type_id}-${record.year}`}
            scroll={{ x: 'max-content' }}
            pagination={{ 
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} / ${total} kayıt gösteriliyor`
            }}
            title={() => (
              <Space>
                <Button 
                  type="primary" 
                  onClick={recalculateLeaveBalances}
                  icon={<ReloadOutlined />}
                >
                  Bakiyeleri Yeniden Hesapla
                </Button>
                <Tooltip title="Tüm personelin izin bakiyelerini yeni hesaplama mantığına göre günceller">
                  <InfoCircleOutlined />
                </Tooltip>
              </Space>
            )}
          />
        </div>
      ),
    },
{
  key: '5',
  label: 'Toplu İzin İşlemleri',
  children: <BulkLeaveUpdate />
}

  ];

  

  return (
    <>
      <Tabs defaultActiveKey="1" items={items} />
      
      <Modal
        title="İzin Talebini Düzenle"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button 
            key="reject" 
            danger 
            onClick={handleReject}
            disabled={!selectedLeave}
          >
            Red
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            onClick={() => selectedLeave && handleApprove(selectedLeave.id)}
            disabled={!selectedLeave}
          >
            Onayla
          </Button>,
        ]}
      >
        {selectedLeave && (
          <div>
            <p><strong>Personel:</strong> {selectedLeave.personnel_name}</p>
            <p><strong>İzin Türü:</strong> {selectedLeave.leave_type_name}</p>
            <p><strong>Başlangıç:</strong> {moment(selectedLeave.start_date).format('DD.MM.YYYY')}</p>
            <p><strong>Bitiş:</strong> {moment(selectedLeave.end_date).format('DD.MM.YYYY')}</p>
            <Input.TextArea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Onay/Red sebebi (opsiyonel)"
              rows={3}
            />
          </div>
        )}
      </Modal>

      <Modal
        title="Yeni İzin Talebi"
        open={isLeaveFormVisible}
        onCancel={() => setIsLeaveFormVisible(false)}
        footer={null}
        width={800}
      >
          <LeaveRequestForm
            closeModal={() => setIsLeaveFormVisible(false)}
            onLeaveRequestSuccess={fetchLeaves}
            refreshData={fetchLeaves}
          />
      </Modal>
    </>
  );
};

export default LeaveTabs;
