// components/productFamilyTab.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios'


const productFamilyTab = () => {
  const [productFamilies, setproductFamilies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingproductFamily, setEditingproductFamily] = useState(null);
  const [form] = Form.useForm();
  const [productionTypes, setProductionTypes] = useState([]); // Üretim türleri


  useEffect(() => {
    fetchproductFamilies();
    fetchProductionTypes(); // Üretim türlerini çek
  }, []);


  const fetchProductionTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/design/production-types');
      setProductionTypes(response.data);
    } catch (error) {
      message.error('Üretim türleri yüklenirken hata oluştu');
    }
  };


  const fetchproductFamilies = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/design/product-families');
      setproductFamilies(response.data);
    } catch (error) {
      message.error('Üretim türleri yüklenirken hata oluştu');
    }
  };



  const handleSubmit = async (values) => {
    try {
      if (editingproductFamily) {
        await axios.put(`http://localhost:5001/api/design/product-families/${editingproductFamily.id}`, values);
        message.success('Ürün Ailesi güncellendi');
      } else {
        await axios.post('http://localhost:5001/api/design/product-families', values);
        message.success('Ürün Ailesi eklendi');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchproductFamilies();
    } catch (error) {
      message.error('İşlem sırasında hata oluştu');
    }
  };


  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/design/product-families/${id}`);
      fetchproductFamilies();
      message.success('Ürün ailesi silindi');
    } catch (error) {
      message.error('Ürün ailesi silinirken hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Ürün Ailesi',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Üretim Türü',
      dataIndex: 'production_type_id',
      key: 'production_type',
      render: (production_type_id) => {
        // production_type_id ile productionTypes'tan adı eşleştir
        const productionType = productionTypes.find(
          (type) => type.id === production_type_id
        );
        return productionType ? productionType.name : 'Bilinmiyor';
      },
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
                setEditingproductFamily(record);
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
            setEditingproductFamily(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Ürün Ailesi Ekle
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={productFamilies}
        rowKey="id"
      />

      <Modal
        title={editingproductFamily ? 'Ürün Ailesi Düzenle' : 'Yeni Ürün Ailesi Ekle'}
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
  label="Ürün Ailesi"
  rules={[{ required: true, message: 'Lütfen ürün ailesi adını girin' }]}
>
  <Input />
</Form.Item>

<Form.Item
  name="production_type_id"
  label="Üretim Türü"
  rules={[{ required: true, message: 'Lütfen bir üretim türü seçin' }]}
>
  <Select placeholder="Üretim türü seçin">
    {productionTypes.map((type) => (
      <Select.Option key={type.id} value={type.id}>
        {type.name}
      </Select.Option>
    ))}
  </Select>
</Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default productFamilyTab;