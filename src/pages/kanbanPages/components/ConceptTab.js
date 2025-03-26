// components/conceptTab.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios'


const conceptTab = () => {
  const [concepts, setconcepts] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingconcept, setEditingconcept] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchconcepts();
  }, []);

  const fetchconcepts = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/design/concepts');
      setconcepts(response.data);
    } catch (error) {
      message.error('Üretim türleri yüklenirken hata oluştu');
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingconcept) {
        await axios.put(`http://localhost:5001/api/design/concepts/${editingconcept.id}`, values);
        message.success('Konsept güncellendi');
      } else {
        await axios.post('http://localhost:5001/api/design/concepts', values);
        message.success('Konsept eklendi');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchconcepts();
    } catch (error) {
      message.error('İşlem sırasında hata oluştu');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5001/api/design/concepts/${id}`);
      fetchconcepts();
      message.success('Konsept silindi');
    } catch (error) {
      message.error('Konsept silinirken hata oluştu');
    }
  };

  const columns = [
    {
      title: 'Konsept',
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
                setEditingconcept(record);
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
            setEditingconcept(null);
            form.resetFields();
            setIsModalVisible(true);
          }}
        >
          Konsept Ekle
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={concepts}
        rowKey="id"
      />

      <Modal
        title={editingconcept ? 'Konsept Düzenle' : 'Yeni Konsept Ekle'}
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
            label="Konsept"
            rules={[{ required: true, message: 'Lütfen Konsept adı girin' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default conceptTab;