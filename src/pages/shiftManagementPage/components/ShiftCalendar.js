import React, { useState, useEffect } from 'react';
import {
    Calendar,
    Select,
    Badge,
    Modal,
    Form,
    Button,
    message,
    Tooltip,
    Space,
    Tag,
    Popconfirm,
    Card,
    Input  // Input'u ekleyelim
  } from 'antd';
import { DeleteOutlined, SwapOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Option } = Select;

const ShiftCalendar = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [shiftSchedules, setShiftSchedules] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchAssignments(selectedDepartment);
      fetchDepartmentPersonnel(selectedDepartment);
    }
  }, [selectedDepartment]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [deptsRes, schedulesRes] = await Promise.all([
        axios.get('http://localhost:5001/api/departments', config),
        axios.get('http://localhost:5001/api/shifts/shift-schedules', config),
      ]);

      setDepartments(deptsRes.data);
      setShiftSchedules(schedulesRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Veriler yüklenirken hata oluştu');
    }
  };

  const fetchDepartmentPersonnel = async (departmentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5001/api/departments/${departmentId}/personnel`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPersonnel(response.data);
    } catch (error) {
      console.error('Error fetching personnel:', error);
      message.error('Personel listesi alınırken hata oluştu');
    }
  };

  const fetchAssignments = async (departmentId) => {
    try {
      const token = localStorage.getItem('token');
      const currentDate = dayjs();
      
      const response = await axios.get(
        'http://localhost:5001/api/shifts/personnel-shift-assignments',
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            department_id: departmentId,
            start_date: currentDate.startOf('month').format('YYYY-MM-DD'),
            end_date: currentDate.endOf('month').format('YYYY-MM-DD')
          }
        }
      );
      
      setAssignments(response.data);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      message.error('Vardiya atamaları alınırken hata oluştu');
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleAssignmentSubmit = async (values) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5001/api/shifts/personnel-shift-assignments',
        {
          personnel_id: values.personnel_id,
          shift_schedule_id: values.shift_schedule_id,
          assignment_date: selectedDate.format('YYYY-MM-DD'),
          notes: values.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success('Vardiya ataması başarıyla yapıldı');
      setIsModalVisible(false);
      fetchAssignments(selectedDepartment);
    } catch (error) {
      console.error('Error creating assignment:', error);
      message.error(error.response?.data?.error || 'Vardiya ataması yapılırken hata oluştu');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5001/api/shifts/personnel-shift-assignments/${assignmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      message.success('Vardiya ataması silindi');
      fetchAssignments(selectedDepartment);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      message.error('Vardiya ataması silinirken hata oluştu');
    }
  };

  const dateCellRender = (date) => {
    const dayAssignments = assignments.filter(
      a => dayjs(a.assignment_date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );

    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {dayAssignments.map((assignment) => (
          <li key={assignment.id}>
            <Tooltip title={`${assignment.personnel_name} - ${assignment.shift_name}`}>
              <Tag 
                color={assignment.color}
                style={{ width: '100%', margin: '2px 0' }}
                closable
                onClose={(e) => {
                  e.preventDefault();
                  handleDeleteAssignment(assignment.id);
                }}
              >
                {`${assignment.personnel_name.split(' ')[0]} - ${assignment.shift_name}`}
              </Tag>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Card title="Vardiya Takvimi">
      <div className="mb-4">
        <Space>
          <Select
            placeholder="Departman Seçin"
            style={{ width: 200 }}
            onChange={setSelectedDepartment}
            value={selectedDepartment}
          >
            {departments.map(dept => (
              <Option key={dept.id} value={dept.id}>{dept.name}</Option>
            ))}
          </Select>
          <Button 
            icon={<TeamOutlined />}
            onClick={() => fetchAssignments(selectedDepartment)}
          >
            Yenile
          </Button>
        </Space>
      </div>

      <Calendar 
        dateCellRender={dateCellRender}
        onSelect={handleDateSelect}
      />


      <Modal
        title={`Vardiya Ataması - ${selectedDate?.format('DD.MM.YYYY')}`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleAssignmentSubmit}
          layout="vertical"
        >
          <Form.Item
            name="personnel_id"
            label="Personel"
            rules={[{ required: true, message: 'Lütfen personel seçin!' }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {personnel.map(p => (
                <Option key={p.id} value={p.id}>
                  {`${p.first_name} ${p.last_name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="shift_schedule_id"
            label="Vardiya"
            rules={[{ required: true, message: 'Lütfen vardiya seçin!' }]}
          >
            <Select>
              {shiftSchedules.map(schedule => (
                <Option key={schedule.id} value={schedule.id}>
                  {`${schedule.name} (${schedule.start_time}-${schedule.end_time})`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Notlar">
            <Input.TextArea />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Kaydet
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ShiftCalendar;