import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, DatePicker, message, Divider } from 'antd';
import axios from 'axios';
import moment from 'moment';

const { Option } = Select;

function PersonnelForm({ onAddPersonnel }) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);

  useEffect(() => {
    const fetchDepartmentsAndTitles = async () => {
      try {
        const [departmentResponse, titleResponse] = await Promise.all([
          axios.get('http://localhost:5001/api/departments'),
          axios.get('http://localhost:5001/api/titles'),
        ]);
        setDepartments(departmentResponse.data);
        setTitles(titleResponse.data);
      } catch (error) {
        console.error('Error fetching departments or titles:', error);
        message.error('Failed to load departments or titles.');
      }
    };

    fetchDepartmentsAndTitles();
  }, []);

  // Form gönderildiğinde yapılacaklar
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const hireDate = values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null;

      // Backend'e personel ekleme isteği
      const response = await axios.post('http://localhost:5001/api/personnel', {
        first_name: values.first_name,
        last_name: values.last_name,
        tc_id_number: values.tc_id_number,
        hire_date: hireDate,
      });

      const newPersonnel = response.data;

      // Departman ekleme (opsiyonel)
      if (values.department_id) {
        await axios.post(`http://localhost:5001/api/personnel/${newPersonnel.id}/department`, {
          department_id: values.department_id,
        });
      }

      // Title ekleme (opsiyonel)
      if (values.title_id) {
        await axios.post(`http://localhost:5001/api/personnel/${newPersonnel.id}/title`, {
          title_id: values.title_id,
        });
      }

      message.success('Personnel added successfully!');
      onAddPersonnel(newPersonnel); // Yeni personeli üst bileşene gönder
      form.resetFields(); // Formu sıfırla
    } catch (error) {
      console.error('Error during personnel addition:', error);
      if (error.response && error.response.status === 400) {
        message.error(error.response.data.error);
      } else {
        message.error('Failed to add personnel');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {/* Zorunlu alanlar */}
      <Form.Item name="first_name" label="First Name" rules={[{ required: true, message: 'First name is required' }]}>
        <Input placeholder="Enter first name" />
      </Form.Item>
      <Form.Item name="last_name" label="Last Name" rules={[{ required: true, message: 'Last name is required' }]}>
        <Input placeholder="Enter last name" />
      </Form.Item>
      <Form.Item name="tc_id_number" label="TC ID Number" rules={[{ required: true, message: 'TC ID number is required' }]}>
        <Input placeholder="Enter TC ID number" maxLength={11} />
      </Form.Item>
      <Form.Item name="hire_date" label="Hire Date" rules={[{ required: true, message: 'Hire date is required' }]}>
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      {/* Çizgi ile ayraç */}
      <Divider />

      {/* Opsiyonel alanlar */}
      <Form.Item name="department_id" label="Department">
        <Select placeholder="Select a department" allowClear>
          {departments.map((dep) => (
            <Option key={dep.id} value={dep.id}>
              {dep.name}
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="title_id" label="Title">
        <Select placeholder="Select a title" allowClear>
          {titles.map((title) => (
            <Option key={title.id} value={title.id}>
              {title.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Add Personnel
        </Button>
      </Form.Item>
    </Form>
  );
}

export default PersonnelForm;
