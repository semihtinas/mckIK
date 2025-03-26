import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, DatePicker, Space, message, Input, Tag, Card } from 'antd';
import { PlusOutlined, UserOutlined, CalendarOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';


const { Option } = Select;
const BASE_URL = 'http://localhost:5001';


const ShiftGroups = ({ departments, shiftSchedules }) => {
    const [groups, setGroups] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState([]);
    const [form] = Form.useForm();



    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        if (form.getFieldValue('department_id')) {
            fetchDepartmentPersonnel(form.getFieldValue('department_id'));
        }
    }, [form.getFieldValue('department_id')]);



// ShiftGroups.js içinde
const getAuthConfig = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const fetchGroups = async () => {
    try {
        setLoading(true);
        const response = await axios.get(
            `${BASE_URL}/api/shifts/groups`,
            getAuthConfig()
        );
        setGroups(response.data);
    } catch (error) {
        message.error('Gruplar yüklenirken hata oluştu');
    } finally {
        setLoading(false);
    }
};

const fetchDepartmentPersonnel = async (departmentId) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/api/shifts/department-personnel/${departmentId}`,
            getAuthConfig()
        );
        setPersonnel(response.data);
    } catch (error) {
        message.error('Personel listesi alınırken hata oluştu');
    }
};
const handleDepartmentChange = (value) => {
    form.setFieldsValue({ personnel_ids: [] });
    if (value) {
        fetchDepartmentPersonnel(value);
    }
};


const fetchTemplates = async () => {
    try {
        const response = await axios.get(
            'http://localhost:5001/api/shifts/templates',
            getAuthConfig()
        );
        setTemplates(response.data);
    } catch (error) {
        message.error('Şablonlar yüklenirken hata oluştu');
    }
};



const handleSubmit = async (values) => {
    try {
        setLoading(true);
        const data = {
            ...values,
            rotation_start_date: values.rotation_start_date?.format('YYYY-MM-DD')
        };

        if (editingRecord?.id) {
            await axios.put(
                `${BASE_URL}/api/shifts/groups/${editingRecord.id}`,
                data,
                getAuthConfig()
            );
            message.success('Grup başarıyla güncellendi');
        } else {
            await axios.post(
                `${BASE_URL}/api/shifts/groups`,
                data,
                getAuthConfig()
            );
            message.success('Grup başarıyla oluşturuldu');
        }

        setIsModalVisible(false);
        form.resetFields();
        fetchGroups();
    } catch (error) {
        console.error('Error saving group:', error);
        message.error('Grup kaydedilirken hata oluştu');
    } finally {
        setLoading(false);
    }
};


const handleEdit = (record) => {
    setEditingRecord(record);
    form.setFieldsValue({
        ...record,
        rotation_start_date: record.rotation_start_date ? dayjs(record.rotation_start_date) : null,
        personnel_ids: record.members?.map(m => m.id)
    });
    if (record.department_id) {
        fetchDepartmentPersonnel(record.department_id);
    }
    setIsModalVisible(true);
};

const handleDelete = async (id) => {
    try {
        await axios.delete(`${BASE_URL}/api/shifts/groups/${id}`, getAuthConfig());
        message.success('Grup başarıyla silindi');
        fetchGroups();
    } catch (error) {
        message.error('Grup silinirken hata oluştu');
    }
};

const columns = [
    {
        title: 'Grup Adı',
        dataIndex: 'name',
    },
    {
        title: 'Departman',
        dataIndex: 'department_name',
    },
    {
        title: 'Personel',
        dataIndex: 'members',
        render: (members) => (
            <div style={{ maxWidth: 300, overflow: 'hidden' }}>
                {members?.map((member, index) => (
                    <Tag key={index}>{`${member.first_name} ${member.last_name}`}</Tag>
                ))}
            </div>
        ),
    },
    {
        title: 'İşlemler',
        render: (_, record) => (
            <Space>
                <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                <Button 
                    icon={<DeleteOutlined />} 
                    danger 
                    onClick={() => handleDelete(record.id)}
                />
            </Space>
        ),
    },
];

    return (
        <div>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                    setEditingRecord(null);
                    form.resetFields();
                    setIsModalVisible(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Yeni Grup
            </Button>

            <Table
                columns={columns}
                dataSource={groups}
                rowKey="id"
                loading={loading}
                expandable={{
                    expandedRowRender: record => (
                        <Card size="small">
                            
                            <div style={{ marginTop: 16 }}>
                                <strong>Grup Üyeleri:</strong>
                                <div style={{ marginTop: 8 }}>
                                    {record.members?.map((member, index) => (
                                        <Card.Grid style={{ width: '25%', textAlign: 'center' }} key={member.personnel_id}>
                                            <Space direction="vertical" size="small">
                                                <UserOutlined style={{ fontSize: '24px' }} />
                                                <div>{member.first_name} {member.last_name}</div>
                                                <Tag color="blue">
                                                    Başlangıç: Pattern {member.start_pattern_index + 1}
                                                </Tag>
                                            </Space>
                                        </Card.Grid>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    ),
                }}
            />

<Modal
                title={editingRecord ? 'Grup Düzenle' : 'Yeni Grup'}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setEditingRecord(null);
                    form.resetFields();
                }}
                footer={null}
            >
                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="Grup Adı"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="department_id"
                        label="Departman"
                        rules={[{ required: true }]}
                    >
                        <Select onChange={handleDepartmentChange}>
                            {departments.map(dept => (
                                <Option key={dept.id} value={dept.id}>
                                    {dept.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="personnel_ids"
                        label="Personel"
                        rules={[{ required: true }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Personel seçin"
                            style={{ width: '100%' }}
                            showSearch
                            optionFilterProp="children"
                        >
                            {personnel.map(p => (
                                <Option key={p.id} value={p.id}>
                                    {`${p.first_name} ${p.last_name}`}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="rotation_start_date"
                        label="Rotasyon Başlangıç Tarihi"
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item className="text-right">
                        <Space>
                            <Button onClick={() => {
                                setIsModalVisible(false);
                                setEditingRecord(null);
                                form.resetFields();
                            }}>
                                İptal
                            </Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {editingRecord ? 'Güncelle' : 'Kaydet'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ShiftGroups;