import React from 'react';
import { Table, Form, Input, Button, message } from 'antd';
import axios from 'axios';

const TitlesTab = ({ titles, fetchTitles }) => {
  const onAddTitle = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/titles', values);
      message.success('Title added successfully!');
      fetchTitles(); 
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        message.error(error.response.data.error);  // Backend'den gelen hata mesajını göster
      } else {
        message.error('Failed to add title');
      }
    }
  };
  return (
    <>
      <Form layout="vertical" onFinish={onAddTitle}>
        <Form.Item
          name="name"
          label="Title Name"
          rules={[{ required: true, message: 'Please input the title name!' }]}
        >
          <Input placeholder="Enter title name" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Add Title
          </Button>
        </Form.Item>
      </Form>
      <Table 
        dataSource={titles} 
        columns={[
          { title: 'ID', dataIndex: 'id', key: 'id' }, 
          { title: 'Title Name', dataIndex: 'name', key: 'name' }
        ]} 
        rowKey="id" 
      />
    </>
  );
};

export default TitlesTab;