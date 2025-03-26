import React from 'react';
import { Table, Form, Input, Button, message } from 'antd';
import axios from 'axios';


const DepartmentsTab = ({ departments, fetchDepartments }) => {
  const onAddDepartment = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/departments', { name: values.name });
      message.success('Department added successfully!');
      fetchDepartments();  // Departmanları tekrar yükle
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        message.error(error.response.data.error);  // Backend'den gelen hata mesajını göster
      } else {
        message.error('Failed to add department');
      }
    }
  };
  

  return (
    <>
      <Form layout="vertical" onFinish={onAddDepartment}>
        <Form.Item
          name="name"
          label="Department Name"
          rules={[{ required: true, message: 'Please input the department name!' }]}
        >
          <Input placeholder="Enter department name" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Department
          </Button>
        </Form.Item>
      </Form>
      <Table 
        dataSource={departments} 
        columns={[
          { title: 'ID', dataIndex: 'id', key: 'id' }, 
          { title: 'Department Name', dataIndex: 'name', key: 'name' }
        ]} 
        rowKey="id" 
      />
    </>
  );
};

export default DepartmentsTab;