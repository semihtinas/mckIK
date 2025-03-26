// FixedExpenseTemplates.js
import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Form,
  Input,
  Button,
  Table,
  Space,
  Select,
  InputNumber,
  DatePicker,
  message,
  Modal,
  Upload,
  Tag,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  InboxOutlined,
  MinusCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { TextArea } = Input;

const FixedExpenseTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/expenses-management/templates', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      message.error('Şablonlar yüklenirken hata oluştu');
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/expenses-management/categories', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      message.error('Kategoriler yüklenirken hata oluştu');
    }
  };

  const handleSaveTemplate = async (values) => {
    try {
      const endpoint = selectedTemplate 
        ? `http://localhost:5001/api/expenses-management/templates/${selectedTemplate.id}`
        : 'http://localhost:5001/api/expenses-management/templates';
      
      const method = selectedTemplate ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) throw new Error('İşlem başarısız');

      message.success(`Şablon ${selectedTemplate ? 'güncellendi' : 'oluşturuldu'}`);
      setIsTemplateModalVisible(false);
      form.resetFields();
      fetchTemplates();
    } catch (error) {
      message.error('İşlem sırasında hata oluştu');
    }
  };

  const handleCreateExpense = async (values) => {
    try {
      const formData = new FormData();
      
      // Temel alanları ekle
      formData.append('title', selectedTemplate.name);
      formData.append('amount', selectedTemplate.total_amount);
      formData.append('category_id', selectedTemplate.category_id);
      formData.append('type', 'fixed');
      formData.append('payment_date', values.payment_date.format('YYYY-MM-DD'));
      formData.append('payment_method', values.payment_method);
      formData.append('description', values.description || '');
      formData.append('sub_expenses', JSON.stringify(selectedTemplate.items));
  
      // Dosyaları ekle
      if (values.files?.fileList) {
        values.files.fileList.forEach(file => {
          formData.append('files', file.originFileObj);
        });
      }
  
      const response = await fetch('http://localhost:5001/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
  
      if (!response.ok) throw new Error('Harcama kaydedilemedi');
  
      message.success('Harcama başarıyla oluşturuldu');
      setIsExpenseModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Harcama oluşturulurken hata oluştu');
    }
  };

  const templateColumns = [
    {
      title: 'Şablon Adı',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Kategori',
      dataIndex: 'category_name',
      key: 'category_name',
    },
    {
      title: 'Toplam Tutar',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₺${amount.toLocaleString()}`,
    },
    {
        title: 'Alt Kalemler',
        dataIndex: 'items',
        key: 'items',
        render: (items) => (
          <Space wrap>
            {items?.map((item, index) => (  // items? ekleyelim
              <Tooltip key={index} title={`${item.description}: ₺${item.amount.toLocaleString()}`}>
                <Tag color="blue">{item.description}</Tag>
              </Tooltip>
            )) || 'Alt kalem yok'}
          </Space>
        ),
      },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<CopyOutlined />}
            onClick={() => {
              setSelectedTemplate(record);
              setIsExpenseModalVisible(true);
            }}
          >
            Harcama Oluştur
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => {
              setSelectedTemplate(record);
              form.setFieldsValue(record);
              setIsTemplateModalVisible(true);
            }}
          >
            Düzenle
          </Button>
          <Button 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTemplate(record.id)}
          >
            Sil
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
  title="Sabit Gider Şablonları"
  extra={
    <Button 
      type="primary" 
      icon={<PlusOutlined />}
      onClick={() => {
        setSelectedTemplate(null);
        form.resetFields();
        setIsTemplateModalVisible(true);
      }}
    >
      Yeni Şablon
    </Button>
  }
>
  <Table
    dataSource={templates || []}
    columns={templateColumns}
    rowKey="id"
    locale={{
      emptyText: 'Henüz şablon oluşturulmamış'
    }}
    pagination={{
      pageSize: 10,
      total: templates?.length,
      showTotal: (total) => `Toplam ${total} şablon`
    }}
  />
</Card>

      {/* Şablon Ekleme/Düzenleme Modalı */}
      <Modal
        title={`${selectedTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon'}`}
        open={isTemplateModalVisible}
        onCancel={() => setIsTemplateModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          onFinish={handleSaveTemplate}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="Şablon Adı"
            rules={[{ required: true }]}
          >
            <Input placeholder="Örn: Aylık Kira Ödemesi" />
          </Form.Item>

          <Form.Item
            name="category_id"
            label="Kategori"
            rules={[{ required: true }]}
          >
            <Select placeholder="Kategori seçin">
              {categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.List name="items">
  {(fields, { add, remove }) => (
    <>
      {fields.map((field) => (
        <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }}>
          <Form.Item
            name={[field.name, 'description']}
            rules={[{ required: true }]}
            style={{ flex: 2 }}
          >
            <Input placeholder="Kalem açıklaması" />
          </Form.Item>
          <Form.Item
            name={[field.name, 'amount']}
            rules={[{ required: true }]}
            style={{ flex: 1 }}
          >
            <InputNumber
              placeholder="Tutar"
              formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/₺\s?|(,*)/g, '')}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <MinusCircleOutlined onClick={() => remove(field.name)} />
        </Space>
      ))}
      <Form.Item>
        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
          Alt Kalem Ekle
        </Button>
      </Form.Item>
    </>
  )}
</Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {selectedTemplate ? 'Güncelle' : 'Kaydet'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Harcama Oluşturma Modalı */}
      <Modal
        title="Şablondan Harcama Oluştur"
        open={isExpenseModalVisible}
        onCancel={() => setIsExpenseModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          onFinish={handleCreateExpense}
          layout="vertical"
          initialValues={{
            payment_date: dayjs(),
          }}
        >
          <Form.Item
            name="payment_date"
            label="Ödeme Tarihi"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="payment_method"
            label="Ödeme Yöntemi"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="cash">Nakit</Select.Option>
              <Select.Option value="bank">Banka</Select.Option>
              <Select.Option value="credit_card">Kredi Kartı</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Ek Açıklama"
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="files"
            label="Belgeler"
            valuePropName="file"
          >
            <Upload.Dragger
              multiple
              beforeUpload={() => false}
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">
                Dosyaları buraya sürükleyin veya tıklayın
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Harcama Oluştur
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FixedExpenseTemplates;