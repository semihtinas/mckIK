// components/ProductionTypeTab.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios'


const ProductionTypeTab = () => {
  const [productionTypes, setProductionTypes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingproductionType, setEditingProductionType] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchProductionTypes();
  }, []);

  const fetchProductionTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/design/production-types');
      setProductionTypes(response.data);
    } catch (error) {
      message.error('Üretim türleri yüklenirken hata oluştu');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingproductionType) {
        await axios.put(`http://localhost:5001/api/design/production-types/${editingProductionType.id}`, values);
        message.success('Üretim türü güncellendi');
      } else {
        await axios.post('http://localhost:5001/api/design/production-types', values);
        message.success('Üretim türü eklendi');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchProductionTypes();
    } catch (error) {
      message.error('İşlem sırasında hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/design/production-types/${id}`);
      fetchProductionTypes();
      message.success('Üretim türü silindi');
    } catch (error) {
      message.error('Üretim türü silinirken hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Üretim Türü',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (text, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
                setEditingProductionType(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          />
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingProductionType(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Üretim Türü Ekle
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={productionTypes}
        rowKey="id"
      />

      <Modal
        title={editingproductionType ? 'Üretim Türü Düzenle' : 'Yeni Üretim Türü Ekle'}
        open={isModalVisible}
        onOk={form.submit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Üretim Türü"
            rules={[{ required: true, message: 'Lütfen Üretim Türü adı girin' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProductionTypeTab;