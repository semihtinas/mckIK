// ContentTypesTab.js
import React, { useState, useEffect } from 'react';
import { Table, Form, Input, Button, message, Tabs, Select, InputNumber, Space } from 'antd';
import axios from 'axios';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const ContentTypesTab = ({ contentTypes, fetchContentTypes }) => {
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [expenseContentTypes, setExpenseContentTypes] = useState([]);
  const [parentCategories, setParentCategories] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchExpenseCategories();
    fetchExpenseContentTypes();
  }, []);

  const fetchExpenseCategories = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/expenses-management/categories', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setExpenseCategories(response.data);
      // Ana kategorileri ayır (parent_id = null olanlar)
      setParentCategories(response.data.filter(cat => !cat.parent_id));
    } catch (error) {
      message.error('Failed to load expense categories');
    }
  };

  const fetchExpenseContentTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/expenses-management/content-types', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setExpenseContentTypes(response.data);
    } catch (error) {
      message.error('Failed to load expense content types');
    }
  };

  // Genel Content Types için
  const onAddContentType = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/contents', values);
      message.success('Content type added successfully!');
      fetchContentTypes();
      form.resetFields();
    } catch (error) {
      message.error('Failed to add content type');
    }
  };

  // Expense Categories için
  const onAddExpenseCategory = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/expenses-management/categories', {
        ...values,
        budget_limit: values.budget_limit ? parseFloat(values.budget_limit) : null
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      message.success('Expense category added successfully!');
      fetchExpenseCategories();
      form.resetFields();
    } catch (error) {
      message.error('Failed to add expense category');
    }
  };

  // Expense Content Types için
  const onAddExpenseContentType = async (values) => {
    try {
      const formattedValues = {
        ...values,
        file_extensions: values.file_extensions.split(',').map(ext => ext.trim()),
        max_file_size: parseInt(values.max_file_size) * 1024 * 1024 // MB'ı byte'a çevir
      };

      await axios.post('http://localhost:5001/api/expenses-management/content-types', 
        formattedValues,
        { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }}
      );
      message.success('Expense content type added successfully!');
      fetchExpenseContentTypes();
      form.resetFields();
    } catch (error) {
      message.error('Failed to add expense content type');
    }
  };

  const contentTypeColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Content Type Name', dataIndex: 'name', key: 'name' }
  ];

  const expenseCategoryColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Code', dataIndex: 'code', key: 'code' },
    { 
      title: 'Parent Category', 
      dataIndex: 'parent_name', 
      key: 'parent_name',
      render: (text, record) => text || 'Ana Kategori'
    },
    { 
      title: 'Budget Limit', 
      dataIndex: 'budget_limit', 
      key: 'budget_limit',
      render: (value) => value ? `₺${value.toLocaleString()}` : '-'
    },
    {
      title: 'Monthly Spent',
      dataIndex: 'monthly_spent',
      key: 'monthly_spent',
      render: (value) => `₺${value.toLocaleString()}`
    }
  ];

  const expenseContentTypeColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Name', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { 
      title: 'File Extensions', 
      dataIndex: 'file_extensions', 
      key: 'file_extensions',
      render: (extensions) => extensions?.join(', ') || '-'
    },
    { 
      title: 'Max File Size', 
      dataIndex: 'max_file_size', 
      key: 'max_file_size',
      render: (size) => `${(size / (1024 * 1024)).toFixed(1)} MB`
    }
  ];

  return (
    <Tabs defaultActiveKey="1">
      <TabPane tab="File Content Types" key="1">
        <Form layout="vertical" onFinish={onAddContentType} form={form}>
          <Form.Item
            name="name"
            label="Content Type Name"
            rules={[{ required: true, message: 'Please input the content type name!' }]}
          >
            <Input placeholder="Enter content type name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Add Content Type
            </Button>
          </Form.Item>
        </Form>
        <Table
          dataSource={contentTypes}
          columns={contentTypeColumns}
          rowKey="id"
        />
      </TabPane>

      <TabPane tab="Expense Categories" key="2">
        <Form layout="vertical" onFinish={onAddExpenseCategory} form={form}>
          <Space style={{ width: '100%' }} direction="vertical" size="middle">
            <Form.Item
              name="name"
              label="Category Name"
              rules={[{ required: true, message: 'Please input the category name!' }]}
            >
              <Input placeholder="Enter category name" />
            </Form.Item>

            <Form.Item
              name="code"
              label="Category Code"
              rules={[{ required: true, message: 'Please input the category code!' }]}
            >
              <Input placeholder="Enter category code (e.g., OFG)" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea placeholder="Enter category description" rows={3} />
            </Form.Item>

            <Form.Item
              name="parent_id"
              label="Parent Category"
            >
              <Select placeholder="Select parent category" allowClear>
                {parentCategories.map(cat => (
                  <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="budget_limit"
              label="Budget Limit"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/₺\s?|(,*)/g, '')}
                placeholder="Enter budget limit (optional)"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Category
              </Button>
            </Form.Item>
          </Space>
        </Form>
        <Table
          dataSource={expenseCategories}
          columns={expenseCategoryColumns}
          rowKey="id"
        />
      </TabPane>

      <TabPane tab="Expense Content Types" key="3">
        <Form layout="vertical" onFinish={onAddExpenseContentType} form={form}>
          <Space style={{ width: '100%' }} direction="vertical" size="middle">
            <Form.Item
              name="name"
              label="Content Type Name"
              rules={[{ required: true, message: 'Please input the content type name!' }]}
            >
              <Input placeholder="Enter content type name" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea placeholder="Enter content type description" rows={3} />
            </Form.Item>

            <Form.Item
              name="file_extensions"
              label="Allowed File Extensions"
              rules={[{ required: true, message: 'Please input allowed file extensions!' }]}
              extra="Enter extensions separated by commas (e.g., .pdf, .jpg, .png)"
            >
              <Input placeholder=".pdf, .jpg, .png" />
            </Form.Item>

            <Form.Item
              name="max_file_size"
              label="Maximum File Size (MB)"
              rules={[{ required: true, message: 'Please input maximum file size!' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                max={50}
                placeholder="Enter maximum file size in MB"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Content Type
              </Button>
            </Form.Item>
          </Space>
        </Form>
        <Table
          dataSource={expenseContentTypes}
          columns={expenseContentTypeColumns}
          rowKey="id"
        />
      </TabPane>
    </Tabs>
  );
};

export default ContentTypesTab;