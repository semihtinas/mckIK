import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Button, Space, message, Tabs } from 'antd';
import { UserOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const BASE_URL = 'http://localhost:5001';

const ApplyTemplateModal = ({ visible, onCancel, onComplete, template, departmentId }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedType, setSelectedType] = useState('personnel');

    useEffect(() => {
        if (visible && departmentId) {
            fetchDepartmentData();
        }
    }, [visible, departmentId]);

    const getAuthConfig = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchDepartmentData = async () => {
        try {
            setLoading(true);
            // Departmandaki personelleri al
            const personnelResponse = await axios.get(
                `${BASE_URL}/api/shifts/department-personnel/${departmentId}`,
                getAuthConfig()
            );
            setPersonnel(personnelResponse.data);

            // Departmandaki grupları al
            const groupsResponse = await axios.get(
                `${BASE_URL}/api/shifts/groups`,
                getAuthConfig()
            );
            const departmentGroups = groupsResponse.data.filter(
                group => group.department_id === parseInt(departmentId)
            );
            setGroups(departmentGroups);
        } catch (error) {
            console.error('Error fetching data:', error);
            message.error('Veri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        try {
            setLoading(true);
            const requestData = {
                start_date: values.date_range[0].format('YYYY-MM-DD'),
                end_date: values.date_range[1].format('YYYY-MM-DD'),
                personnel_ids: selectedType === 'personnel' ? values.personnel : undefined,
                group_ids: selectedType === 'group' ? values.groups : undefined,
              };
            if (selectedType === 'personnel') {
                requestData.personnel_ids = values.personnel;
            } else {
                requestData.group_ids = values.groups;
            }

            await axios.post(
                `${BASE_URL}/api/shifts/templates/${template.id}/apply`,
                requestData,
                getAuthConfig()
            );

            message.success('Şablon başarıyla uygulandı');
            form.resetFields();
            onComplete();
        } catch (error) {
            console.error('Error applying template:', error);
            message.error('Şablon uygulanırken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={`Şablon Uygula: ${template?.name || ''}`}
            open={visible}
            onCancel={handleCancel}
            footer={null}
            width={600}
        >
            <Form
                form={form}
                onFinish={handleSubmit}
                layout="vertical"
            >
                <Tabs activeKey={selectedType} onChange={setSelectedType}>
                    <TabPane 
                        tab={<span><UserOutlined />Personel Seç</span>} 
                        key="personnel"
                    >
                        <Form.Item
                            name="personnel"
                            rules={[{ required: selectedType === 'personnel', message: 'Lütfen personel seçin' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Personel seçin"
                                loading={loading}
                                showSearch
                                optionFilterProp="children"
                                style={{ width: '100%' }}
                            >
                                {personnel.map(p => (
                                    <Select.Option key={p.id} value={p.id}>
                                        {`${p.first_name} ${p.last_name}`}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </TabPane>
                    
                    <TabPane 
                        tab={<span><TeamOutlined />Grup Seç</span>} 
                        key="group"
                    >
                        <Form.Item
                            name="groups"
                            rules={[{ required: selectedType === 'group', message: 'Lütfen grup seçin' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Grup seçin"
                                loading={loading}
                                style={{ width: '100%' }}
                            >
                                {groups.map(g => (
                                    <Select.Option key={g.id} value={g.id}>
                                        {g.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </TabPane>
                </Tabs>

                <Form.Item
                    name="date_range"
                    label="Tarih Aralığı"
                    rules={[{ required: true, message: 'Lütfen tarih aralığı seçin' }]}
                >
                    <RangePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item className="text-right">
                    <Space>
                        <Button onClick={handleCancel}>
                            İptal
                        </Button>
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                        >
                            Uygula
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ApplyTemplateModal;