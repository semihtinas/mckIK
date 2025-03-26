// ExpenseManagement.js
import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Badge, Space, Modal, Form, Input, Select, message, Card, Row, Col, Statistic, List, Empty, Upload } from 'antd';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  DollarOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  FileUnknownOutlined,
  ArrowUpOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { ExpenseRequestForm } from './ExpenseRequestForm';
import FixedExpenseTemplates from './FixedExpenseTemplates';


const { TabPane } = Tabs;
const API_URL = 'http://localhost:5001/api/expenses';
const BASE_URL = 'http://localhost:5001'; // Ana URL


export const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [statistics, setStatistics] = useState({
    totalExpenses: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    monthlyChange: 0
  });
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    record: null
  });
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();



  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchExpenses(),
        fetchPendingRequests(),
        fetchStatistics()
      ]);
    } catch (error) {
      message.error('Veriler yüklenirken hata oluştu');
    }
  };

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}`, { // '/all' kaldırıldı
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Harcamalar yüklenemedi');
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Harcama listesi hatası:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}?status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Bekleyen talepler yüklenemedi');
      const data = await response.json();
      setPendingRequests(data);
    } catch (error) {
      console.error('Bekleyen talepler hatası:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/statistics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (!response.ok) throw new Error('İstatistikler yüklenemedi');
      const data = await response.json();
      
      // İstatistik verilerini formatlayarak state'e kaydet
      setStatistics({
        totalExpenses: data.total_expenses || 0,
        pendingAmount: data.pending_amount || 0,
        approvedAmount: data.approved_amount || 0,
        rejectedAmount: data.rejected_amount || 0, // Yeni ekleme
        paidAmount: data.paid_amount || 0, // Ödenen harcamalar
        monthlyChange: data.monthly_change || 0
      });
    } catch (error) {
      console.error('İstatistik hatası:', error);
    }
  };
  

// Alt harcamaları getirme
const fetchSubExpenses = async (expenseId) => {
  try {
    const response = await fetch(
      `http://localhost:5001/api/expenses/${expenseId}/sub-expenses`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }
    );
    
    if (!response.ok) throw new Error('Alt harcamalar getirilemedi');
    
    const data = await response.json();
    return data;
  } catch (error) {
    message.error('Alt harcamalar yüklenirken hata oluştu');
    return [];
  }
};


// ExpenseManagement.js içinde

const handleStatusChange = async (id, status) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${id}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        status,
        reason: `Harcama ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Durum güncellenemedi');
    }

    message.success(`Talep ${status === 'approved' ? 'onaylandı' : 'reddedildi'}`);
    fetchData(); // Tüm verileri yenile
  } catch (error) {
    console.error('Durum değiştirme hatası:', error);
    message.error(error.message);
  }
};

// ExpenseManagement.js içinde handlePayment fonksiyonunu güncelle

const handlePayment = async (values) => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();

    // Form değerlerini ekle
    formData.append('payment_method', values.payment_method);
    formData.append('description', values.description || '');

    // Dosyaları ekle
    if (values.files) {
      values.files.fileList.forEach(file => {
        formData.append('files', file.originFileObj);
      });
    }

    const response = await fetch(`${API_URL}/${paymentModal.record.id}/pay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Ödeme işlemi başarısız');
    }

    message.success('Ödeme başarıyla tamamlandı');
    setPaymentModal({ visible: false, record: null });
    form.resetFields();
    fetchData();
  } catch (error) {
    message.error(error.message);
  } finally {
    setLoading(false);
  }
};

// ExpenseManagement.js içinde

const handleDocumentsClick = async (record) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/${record.id}/files`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error('Dökümanlar yüklenirken hata oluştu');

    const files = await response.json();
    console.log('Alınan dosyalar:', files);

    const getFileIcon = (filename) => {
      const ext = filename.split('.').pop().toLowerCase();
      switch (ext) {
        case 'pdf': return <FilePdfOutlined style={{ fontSize: '24px', color: '#ff4d4f' }} />;
        case 'jpg':
        case 'jpeg':
        case 'png': return <FileImageOutlined style={{ fontSize: '24px', color: '#1890ff' }} />;
        case 'xlsx':
        case 'xls': return <FileExcelOutlined style={{ fontSize: '24px', color: '#52c41a' }} />;
        default: return <FileUnknownOutlined style={{ fontSize: '24px' }} />;
      }
    };
    

    // Belge tipine göre dosyaları ayır
    const requestDocs = files.filter(f => f.document_type === 'request_document');
    const paymentDocs = files.filter(f => f.document_type === 'payment_document');
    
    

    Modal.info({
      title: 'Harcama Dökümanları',
      width: 800,
      className: 'document-modal',
      content: (
        <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
       <Tabs defaultActiveKey="request">
  <Tabs.TabPane 
    tab={`Harcama Belgeleri (${requestDocs.length})`} 
    key="request"
  >
    {requestDocs.length > 0 ? (
      <List
        dataSource={requestDocs}
        renderItem={file => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  const url = `${BASE_URL}/uploads/expenses/requests/${file.filename}`;
                  window.open(url);
                }}
              >
                Görüntüle
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={getFileIcon(file.originalname)}
              title={file.originalname}
              description={`Yüklenme: ${new Date(file.uploaded_at).toLocaleString()}`}
            />
          </List.Item>
        )}
      />
    ) : (
      <Empty description="Harcama belgesi yok" />
    )}
  </Tabs.TabPane>
  
  <Tabs.TabPane 
    tab={`Ödeme Belgeleri (${paymentDocs.length})`} 
    key="payment"
  >
    {paymentDocs.length > 0 ? (
      <List
        dataSource={paymentDocs}
        renderItem={file => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  const url = `${BASE_URL}/uploads/expenses/payments/${file.filename}`;
                  window.open(url);
                }}
              >
                Görüntüle
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={getFileIcon(file.originalname)}
              title={file.originalname}
              description={`Yüklenme: ${new Date(file.uploaded_at).toLocaleString()}`}
            />
          </List.Item>
        )}
      />
    ) : (
      <Empty description="Ödeme belgesi yok" />
    )}
  </Tabs.TabPane>
</Tabs>
        </div>
      ),
      okText: 'Kapat'
    });
  } catch (error) {
    console.error('Döküman hatası:', error);
    message.error('Dökümanlar yüklenirken bir hata oluştu');
  }
};

// Dosya tipi etiketini al
const getFileTypeLabel = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  switch (ext) {
    case 'pdf': return 'PDF Belgesi';
    case 'jpg':
    case 'jpeg':
    case 'png': return 'Görüntü Dosyası';
    case 'xlsx':
    case 'xls': return 'Excel Dosyası';
    default: return 'Belge';
  }
};


  // Dashboard bileşeni
  const DashboardContent = () => (
    <div className="dashboard-content">
      {/* Scorecards */}
      <Row gutter={16} className="mb-4">
        <Col span={4}>
          <Card>
            <Statistic
              title="Toplam Harcama"
              value={statistics.totalExpenses}
              prefix="₺"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Onay Bekleyen"
              value={statistics.pendingAmount}
              prefix="₺"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Onaylanan"
              value={statistics.approvedAmount}
              prefix="₺"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Reddedilen"
              value={statistics.rejectedAmount}
              prefix="₺"
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Ödenen"
              value={statistics.paidAmount}
              prefix="₺"
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic
              title="Aylık Değişim"
              value={statistics.monthlyChange}
              precision={2}
              prefix={
                <>
                  {statistics.monthlyChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  ₺
                </>
              }
              valueStyle={{
                color: statistics.monthlyChange >= 0 ? '#3f8600' : '#cf1322'
              }}
            />
          </Card>
        </Col>
      </Row>
  
      {/* Onay Bekleyen Talepler */}
      <Card title="Onay Bekleyen Talepler" className="mb-4">
        <Table
          dataSource={pendingRequests}
          columns={columns.pendingRequests}
          rowKey="id"
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    </div>
  );
  

  const columns = {
    pendingRequests: [
      {
        title: 'Personel',
        dataIndex: 'personnel_name',
        key: 'personnel_name',
      },
      {
        title: 'Başlık',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: 'Tutar',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => `₺${amount.toLocaleString()}`,
      },
      {
        title: 'Kategori',
        dataIndex: 'category',
        key: 'category',
      },
      {
        title: 'İşlemler',
        key: 'actions',
        render: (_, record) => (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(record.id, 'approved')}
            >
              Onayla
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => handleStatusChange(record.id, 'rejected')}
            >
              Reddet
            </Button>
          </Space>
        ),
      },
    ],
    allExpenses: [
      {
        title: 'Personel',
        dataIndex: 'personnel_name',
        key: 'personnel_name',
      },
      {
        title: 'Başlık',
        dataIndex: 'title',
        key: 'title',
      },
      {
        title: 'Tutar',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => `₺${amount.toLocaleString()}`,
      },
      {
        title: 'Kategori',
        dataIndex: 'category',
        key: 'category',
      },
      {
        title: 'Durum',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
          <Badge
            status={
              status === 'paid' ? 'success' :
              status === 'approved' ? 'processing' :
              status === 'rejected' ? 'error' :
              'default'
            }
            text={
              status === 'paid' ? 'Ödendi' :
              status === 'approved' ? 'Onaylandı' :
              status === 'rejected' ? 'Reddedildi' :
              'Bekliyor'
            }
          />
        ),
      },
      {
        title: 'İşlemler',
        key: 'actions',
        render: (_, record) => (
          <Space>
            {record.status === 'approved' && (
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
              onClick={() => handleDocumentsClick(record)}
            >
              Dökümanlar
            </Button>
          </Space>
        ),
      },
    ],
  };

  return (
    <div className="expense-management">
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Özet',
            children: <DashboardContent />
          },
          {
            key: '2',
            label: 'Tüm Harcamalar',
            children: (
              <Table
                columns={columns.allExpenses}
                dataSource={expenses}
                rowKey="id"
              />
            )
          },
          {
            key: '3',
            label: 'Yeni Talep',
            children: <ExpenseRequestForm onSuccess={fetchData} />
          },
          {
            key: '4',
            label: 'Sabit Giderler',
            children: <FixedExpenseTemplates />
          }
        ]}
      />
  

  <Modal
    title="Ödeme Yap"
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
          beforeUpload={() => false} // Otomatik yüklemeyi engelle
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
          <Button 
            onClick={() => {
              setPaymentModal({ visible: false, record: null });
              form.resetFields();
            }}
          >
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

export default ExpenseManagement;