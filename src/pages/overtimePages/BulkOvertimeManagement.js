import React, { useState, useEffect } from 'react';
import { Table, Button, Form, Select, DatePicker, InputNumber, message, Card, Space, Input } from 'antd';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/tr';  // Türkçe locale'i import ediyoruz
import locale from 'antd/es/date-picker/locale/tr_TR'; // Bu satırı ekleyin


const { RangePicker } = DatePicker;

moment.locale('tr');


const BulkOvertimeManagement = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [dateRange, setDateRange] = useState(null);

    // Departmanları getir
    const fetchDepartments = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/departments');
            setDepartments(response.data);
        } catch (error) {
            message.error('Departmanlar yüklenirken bir hata oluştu');
        }
    };

    // Seçilen departmana göre personelleri getir
    const fetchPersonnel = async (departmentId) => {
        try {
            const response = await axios.get(`http://localhost:5001/api/personnel/department/${departmentId}`);
            setPersonnel(response.data);
        } catch (error) {
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (selectedDepartment) {
            fetchPersonnel(selectedDepartment);
        }
    }, [selectedDepartment]);

    const handleDepartmentChange = (value) => {
        setSelectedDepartment(value);
        form.resetFields(['overtimeData']);
    };

    const handleDateRangeChange = (dates) => {
        setDateRange(dates);
    };

    const handleSubmit = async (values) => {
        if (!selectedDepartment || !dateRange) {
            message.warning('Lütfen departman ve tarih aralığı seçin');
            return;
        }

        setLoading(true);
        try {
            const overtimeRecords = values.overtimeData.map(record => ({
                personnel_id: record.personnel_id,
                hours: record.hours,
                start_time: dateRange[0].format('YYYY-MM-DD HH:mm:ss'),
                end_time: dateRange[1].format('YYYY-MM-DD HH:mm:ss'),
                description: record.description || 'Toplu mesai girişi',
                reason: record.reason || 'Departman mesaisi'
            }));

            await axios.post('http://localhost:5001/api/overtime/bulk', overtimeRecords, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            message.success('Mesai kayıtları başarıyla oluşturuldu');
            form.resetFields(['overtimeData']);
        } catch (error) {
            message.error('Mesai kayıtları oluşturulurken bir hata oluştu');
        }
        setLoading(false);
    };

    const columns = [
        {
            title: 'Personel',
            dataIndex: ['first_name', 'last_name'],
            key: 'name',
            render: (text, record) => `${record.first_name} ${record.last_name}`
        },
        {
            title: 'Mesai Saati',
            dataIndex: 'hours',
            key: 'hours',
            render: (text, record, index) => (
                <Form.Item
                    name={['overtimeData', index, 'hours']}
                    rules={[{ required: true, message: 'Mesai saati gerekli' }]}
                >
                    <InputNumber min={0} max={24} />
                </Form.Item>
            )
        },
        {
            title: 'Açıklama',
            dataIndex: 'description',
            key: 'description',
            render: (text, record, index) => (
                <Form.Item
                    name={['overtimeData', index, 'description']}
                >
                    <Input.TextArea rows={1} />
                </Form.Item>
            )
        }
    ];

    return (
        <Card title="Toplu Mesai Girişi">
            <Form form={form} onFinish={handleSubmit} layout="vertical">
                <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                    <Form.Item
                        label="Departman"
                        required
                    >
                        <Select
                            placeholder="Departman seçin"
                            onChange={handleDepartmentChange}
                            options={departments.map(dept => ({
                                value: dept.id,
                                label: dept.name
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Tarih Aralığı"
                        required
                    >
<RangePicker 
    onChange={setDateRange} 
    format="DD/MM/YYYY"
    locale={tr_TR}
/>
                    </Form.Item>
                </Space>

                <Table
                    columns={columns}
                    dataSource={personnel}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                />

                <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ marginTop: 16 }}
                >
                    Mesaileri Kaydet
                </Button>
            </Form>
        </Card>
    );
};

export default BulkOvertimeManagement;