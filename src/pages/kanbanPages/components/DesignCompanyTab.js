// components/DesignCompanyTab.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios'

const DesignCompanyTab = () => {
  const [companies, setCompanies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/design/companies');
      setCompanies(response.data);
    } catch (error) {
      message.error('Şirketler yüklenirken hata oluştu');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingCompany) {
        await axios.put(`http://localhost:5001/api/design/companies/${editingCompany.id}`, values);
        message.success('Şirket güncellendi');
      } else {
        await axios.post('http://localhost:5001/api/design/companies', values);
        message.success('Şirket eklendi');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchCompanies();
    } catch (error) {
      message.error('İşlem sırasında hata oluştu');
    }
  };


  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/design/companies/${id}`);
      fetchCompanies();
      message.success('Şirket silindi');
    } catch (error) {
      message.error('Şirket silinirken hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Şirket Adı',
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
              setEditingCompany(record);
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
            setEditingCompany(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Yeni Şirket Ekle
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={companies}
        rowKey="id"
      />

      <Modal
        title={editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket Ekle'}
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
            label="Şirket Adı"
            rules={[{ required: true, message: 'Lütfen şirket adı girin' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DesignCompanyTab;