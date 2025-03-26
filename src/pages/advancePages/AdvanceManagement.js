import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Modal, Input, message, Card, Row, Col, Statistic, Tabs, Spin, Upload, Select, Form } from 'antd';
import { UserOutlined, DollarOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, InboxOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { TabPane } = Tabs;

const AdvanceManagement = () => {
  const [detailedStats, setDetailedStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalAmount: 0,
    averageAmount: 0
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    record: null
  });
  const [form] = Form.useForm();
  

    



    useEffect(() => {
        const fetchData = async () => {
          try {
            const response = await axios.get(
              'http://localhost:5001/api/advance-requests/detailed-statistics',
              {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              }
            );
            setDetailedStats(response.data);
          } catch (error) {
            console.error('Error fetching statistics:', error);
            message.error('İstatistikler yüklenirken hata oluştu');
          } finally {
            setLoading(false);
          }
        };
    
        fetchData();
      }, []);

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(
                'http://localhost:5001/api/advance-requests/statistics',
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setStatistics(response.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchAllRequests = async () => {
        try {
            const response = await axios.get(
                'http://localhost:5001/api/advance-requests/all',
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setAllRequests(response.data);
        } catch (error) {
            console.error('Error fetching all advance requests:', error);
            message.error('Tüm talepler yüklenirken hata oluştu');
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                'http://localhost:5001/api/advance-requests/pending',
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setRequests(response.data);
            await fetchStatistics();
        } catch (error) {
            console.error('Error fetching advance requests:', error);
            message.error('Avans talepleri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchAllRequests();
    }, []);

    const handleAction = async (action) => {
        try {
          await axios.put(
            `http://localhost:5001/api/advance-requests/${selectedRequest.id}/${action}`,
            { approval_reason: approvalReason },
            {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }
          );
    
          message.success(`Talep başarıyla ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`);
          setIsModalVisible(false);
          setSelectedRequest(null);
          setApprovalReason('');
          fetchRequests();
          fetchAllRequests();
        } catch (error) {
          console.error('Error updating advance request:', error);
          message.error('İşlem sırasında bir hata oluştu');
        }
      };


      const handlePayment = async (values) => {
        try {
          setLoading(true);
          const formData = new FormData();
          
          formData.append('payment_method', values.payment_method);
          formData.append('description', values.description || '');
          
          if (values.files) {
            values.files.fileList.forEach(file => {
              formData.append('files', file.originFileObj);
            });
          }
    
          const response = await fetch(
            `http://localhost:5001/api/advance-requests/${paymentModal.record.id}/pay`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
              body: formData,
            }
          );
    
          if (!response.ok) throw new Error('Ödeme işlemi başarısız');
    
          message.success('Ödeme başarıyla tamamlandı');
          setPaymentModal({ visible: false, record: null });
          form.resetFields();
          fetchRequests();
          fetchAllRequests();
        } catch (error) {
          message.error(error.message);
        } finally {
          setLoading(false);
        }
      };

    const allRequestsColumns = [
        {
            title: 'Personel',
            dataIndex: 'personnel_name',
            key: 'personnel_name',
        },
        {
            title: 'Talep Tarihi',
            dataIndex: 'request_date',
            key: 'request_date',
            render: date => moment(date).format('DD.MM.YYYY HH:mm'),
            sorter: (a, b) => moment(a.request_date).unix() - moment(b.request_date).unix()
        },
        {
            title: 'Tutar',
            dataIndex: 'amount',
            key: 'amount',
            render: amount => `₺${amount?.toLocaleString()}`,
            sorter: (a, b) => a.amount - b.amount
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: status => {
              const colors = {
                pending: 'gold',
                approved: 'green',
                rejected: 'red',
                paid: 'cyan'
              };
              const texts = {
                pending: 'Beklemede',
                approved: 'Onaylandı',
                rejected: 'Reddedildi',
                paid: 'Ödendi'
              };
              return <Tag color={colors[status]}>{texts[status]}</Tag>;
            },
            filters: [
              { text: 'Beklemede', value: 'pending' },
              { text: 'Onaylandı', value: 'approved' },
              { text: 'Reddedildi', value: 'rejected' },
              { text: 'Ödendi', value: 'paid' }
            ],
            onFilter: (value, record) => record.status === value
          },
        {
            title: 'Talep Nedeni',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true
        },
        {
            title: 'İşlem Yapan',
            dataIndex: 'approved_by_name',
            key: 'approved_by_name',
            render: (text, record) => text || '-'
        },
        {
            title: 'İşlem Tarihi',
            dataIndex: 'approved_date',
            key: 'approved_date',
            render: date => date ? moment(date).format('DD.MM.YYYY HH:mm') : '-',
            sorter: (a, b) => {
                if (!a.approved_date) return 1;
                if (!b.approved_date) return -1;
                return moment(a.approved_date).unix() - moment(b.approved_date).unix();
            }
        },
        {
            title: 'Onay/Red Nedeni',
            dataIndex: 'approval_reason',
            key: 'approval_reason',
            ellipsis: true,
            render: text => text || '-'
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_, record) => (
              <Space>
                {record.status === 'approved' && !record.payment_date && (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => setPaymentModal({ visible: true, record })}
                  >
                    Öde
                  </Button>
                )}
                {record.status === 'paid' && (
                  <Tag color="green">Ödendi</Tag>
                )}
                <Button 
                  type="link" 
                  onClick={() => handleViewDocuments(record)}
                >
                  Dökümanlar
                </Button>
              </Space>
            ),
          }
        ];
    

    const columns = [
        {
          title: 'Personel',
          dataIndex: 'personnel_name',
          key: 'personnel_name',
        },
        {
          title: 'Talep Tarihi',
          dataIndex: 'request_date',
          key: 'request_date',
          render: date => moment(date).format('DD.MM.YYYY HH:mm')
        },
        {
          title: 'Tutar',
          dataIndex: 'amount',
          key: 'amount',
          render: amount => `₺${amount?.toLocaleString()}`
        },
        {
          title: 'Durum',
          dataIndex: 'status',
          key: 'status',
          render: status => {
            const colors = {
              pending: 'gold',
              approved: 'green',
              rejected: 'red',
              paid: 'cyan'
            };
            const texts = {
              pending: 'Beklemede',
              approved: 'Onaylandı',
              rejected: 'Reddedildi',
              paid: 'Ödendi'
            };
            return <Tag color={colors[status]}>{texts[status]}</Tag>;
          }
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_, record) => (
              <Space>
                {record.status === 'pending' && (
                  <Button
                    type="primary"
                    onClick={() => {
                      setSelectedRequest(record);
                      setIsModalVisible(true);
                    }}
                  >
                    İşlem Yap
                  </Button>
                )}
                {record.status === 'approved' && !record.payment_date && (
                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    onClick={() => setPaymentModal({ visible: true, record })}
                  >
                    Öde
                  </Button>
                )}
                <Button 
                  type="link" 
                  onClick={() => handleViewDocuments(record)}
                >
                  Dökümanlar
                </Button>
              </Space>
            ),
          }
        ];

        const SummaryCards = () => (
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Toplam Talep"
                    value={statistics.totalRequests}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Bekleyen Talepler"
                    value={statistics.pendingRequests}
                    prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Onaylanan Talepler"
                    value={statistics.approvedRequests}
                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Reddedilen Talepler"
                    value={statistics.rejectedRequests}
                    prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    valueStyle={{ color: '#ff4d4f' }}
                  />
                </Card>
              </Col>
              <Col span={6} style={{ marginTop: 16 }}>
                <Card>
                  <Statistic
                    title="Ödenen Talepler"
                    value={statistics.paidRequests || 0}
                    prefix={<DollarOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6} style={{ marginTop: 16 }}>
                <Card>
                  <Statistic
                    title="Ödenen Toplam Tutar"
                    value={statistics.paidAmount || 0}
                    prefix="₺"
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6} style={{ marginTop: 16 }}>
                <Card>
                  <Statistic
                    title="Toplam Talep Edilen Tutar"
                    value={statistics.totalAmount}
                    prefix="₺"
                    precision={2}
                  />
                </Card>
              </Col>
              <Col span={6} style={{ marginTop: 16 }}>
                <Card>
                  <Statistic
                    title="Ortalama Talep Tutarı"
                    value={statistics.averageAmount}
                    prefix="₺"
                    precision={2}
                  />
                </Card>
              </Col>
            </Row>
          );



    const items = [
        {
          key: '1',
          label: 'Özet',
          children: (
            <>
              <SummaryCards />
              <Card title="Bekleyen Talepler" style={{ marginTop: 24 }}>
                <Table
                  columns={columns}
                  dataSource={requests}
                  rowKey="id"
                  loading={loading}
                />
              </Card>
            </>
          ),
        },
        {
          key: '2',
          label: 'Tüm Talepler',
          children: (
            <Table
              columns={allRequestsColumns}
              dataSource={allRequests}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1300 }}
            />
          ),
        },
        //{
        //  key: '3',
         // label: 'İstatistikler',
        //  children: <StatisticsContent detailedStats={detailedStats} loading={loading} />,
       // },
      ];
    
        return (
            <div style={{ padding: 24 }}>
              <Tabs items={items} defaultActiveKey="1" />
              
              <Modal
                title="Avans Talebi İşlemi"
                open={isModalVisible}
                onCancel={() => {
                  setIsModalVisible(false);
                  setSelectedRequest(null);
                  setApprovalReason('');
                }}
                footer={[
                  <Button 
                    key="reject" 
                    type="primary" 
                    danger
                    onClick={() => handleAction('reject')}
                  >
                    Reddet
                  </Button>,
                  <Button
                    key="approve"
                    type="primary"
                    onClick={() => handleAction('approve')}
                  >
                    Onayla
                  </Button>
                ]}
              >
                {selectedRequest && (
                  <div>
                    <p><strong>Personel:</strong> {selectedRequest.personnel_name}</p>
                    <p><strong>Tutar:</strong> ₺{selectedRequest.amount?.toLocaleString()}</p>
                    <p><strong>Talep Nedeni:</strong> {selectedRequest.reason}</p>
                    <Input.TextArea
                      rows={4}
                      placeholder="Onay/Red nedeni"
                      value={approvalReason}
                      onChange={e => setApprovalReason(e.target.value)}
                      style={{ marginTop: 16 }}
                    />
                  </div>
                )}
              </Modal>
        
              <Modal
                title="Avans Ödemesi"
                open={paymentModal.visible}
                onCancel={() => {
                  setPaymentModal({ visible: false, record: null });
                  form.resetFields();
                }}
                footer={null}
                width={600}
              >
                <Form form={form} onFinish={handlePayment} layout="vertical">
                  <Form.Item
                    name="payment_method"
                    label="Ödeme Yöntemi"
                    rules={[{ required: true, message: 'Lütfen ödeme yöntemi seçin' }]}
                  >
                    <Select>
                      <Select.Option value="cash">Nakit</Select.Option>
                      <Select.Option value="bank">Banka</Select.Option>
                      <Select.Option value="credit_card">Kredi Kartı</Select.Option>
                    </Select>
                  </Form.Item>
                  
                  <Form.Item
                    name="description"
                    label="Açıklama"
                  >
                    <Input.TextArea rows={4} placeholder="Ödeme ile ilgili notlar..." />
                  </Form.Item>
        
                  <Form.Item
                    name="files"
                    label="Ödeme Belgesi"
                    valuePropName="file"
                    extra="Dekont, fiş vb. belgeler ekleyebilirsiniz"
                  >
                    <Upload.Dragger
                      multiple
                      beforeUpload={() => false}
                      accept=".pdf,.jpg,.jpeg,.png"
                      maxCount={5}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        Dosya yüklemek için tıklayın veya sürükleyin
                      </p>
                      <p className="ant-upload-hint">
                        PDF, JPG, PNG formatlarını destekler (Maks. 5 dosya)
                      </p>
                    </Upload.Dragger>
                  </Form.Item>
        
                  <Form.Item className="text-right">
                    <Space>
                      <Button onClick={() => {
                        setPaymentModal({ visible: false, record: null });
                        form.resetFields();
                      }}>
                        İptal
                      </Button>
                      <Button type="primary" htmlType="submit" loading={loading}>
                        Ödemeyi Tamamla
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>
              </Modal>
            </div>
          );
        };
    
    export default AdvanceManagement;