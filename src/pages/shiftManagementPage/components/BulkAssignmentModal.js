// BulkAssignmentModal.js
import React, { useState, useEffect } from 'react';
import { 
    Drawer, 
    Form, 
    Select, 
    InputNumber, 
    Switch, 
    Button, 
    Radio, 
    Space, 
    DatePicker, 
    message, 
    Tabs 
} from 'antd';
import { CopyOutlined, SettingOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const BASE_URL = 'http://localhost:5001';
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

const BulkAssignmentModal = ({ 
    visible, 
    onCancel, 
    onComplete, 
    departmentId,
    shiftSchedules 
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [assignmentType, setAssignmentType] = useState('auto');

    const [personnel, setPersonnel] = useState([]);
    const [groups, setGroups] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [selectedType, setSelectedType] = useState('personnel');

    useEffect(() => {
        if (visible && departmentId) {
            fetchDepartmentPersonnel();

            if (assignmentType === 'template') {
                fetchDepartmentGroups();
                fetchDepartmentTemplates();
            }
        }
    }, [visible, departmentId, assignmentType]);

    useEffect(() => {
        if (assignmentType === 'template' && visible && departmentId) {
            fetchDepartmentGroups();
            fetchDepartmentTemplates();
        }
    }, [assignmentType]);

    const getAuthConfig = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    const fetchDepartmentPersonnel = async () => {
        try {
            const response = await axios.get(
                `${BASE_URL}/api/shifts/department-personnel/${departmentId}`,
                getAuthConfig()
            );
            setPersonnel(response.data);
        } catch (error) {
            console.error('Error:', error);
            message.error('Personel listesi alınırken hata oluştu');
        }
    };

    const fetchDepartmentGroups = async () => {
        try {
            const response = await axios.get(
                `${BASE_URL}/api/shifts/groups`,
                getAuthConfig()
            );
            const departmentGroups = response.data.filter(
                group => group.department_id === parseInt(departmentId)
            );
            setGroups(departmentGroups);
        } catch (error) {
            console.error('Error fetching groups:', error);
            message.error('Grup listesi alınırken hata oluştu');
        }
    };

    const fetchDepartmentTemplates = async () => {
        try {
            const response = await axios.get(
                `${BASE_URL}/api/shifts/templates`,
                getAuthConfig()
            );
            const departmentTemplates = response.data.filter(
                t => t.department_id === parseInt(departmentId)
            );
            setTemplates(departmentTemplates);
        } catch (error) {
            console.error('Error fetching templates:', error);
            message.error('Şablonlar alınırken hata oluştu');
        }
    };

    const handleSubmit = async (values) => {
        if (!departmentId) {
            message.error('Lütfen bir departman seçin');
            return;
        }

        setLoading(true);
        try {
            if (assignmentType === 'copy') {
                await axios.post(`${BASE_URL}/api/shifts/copy-last-week`, {
                    startDate: values.dateRange[0].format('YYYY-MM-DD'),
                    endDate: values.dateRange[1].format('YYYY-MM-DD'),
                    departmentId
                }, getAuthConfig());
            } else if (assignmentType === 'auto') {
                await axios.post(`${BASE_URL}/api/shifts/auto-assignments`, {
                    startDate: values.dateRange[0].format('YYYY-MM-DD'),
                    endDate: values.dateRange[1].format('YYYY-MM-DD'),
                    departmentId,
                    personnelIds: values.personnel,
                    shiftScheduleId: values.shiftType,
                    daysOff: values.daysOff,
                    includeWeekends: values.includeWeekends
                }, getAuthConfig());
            } else if (assignmentType === 'template') {
                if (!values.template_id) {
                    message.warning('Lütfen bir şablon seçin');
                    setLoading(false);
                    return;
                }

                const requestData = {
                    start_date: values.dateRange[0].format('YYYY-MM-DD'),
                    end_date: values.dateRange[1].format('YYYY-MM-DD'),
                };

                if (selectedType === 'personnel') {
                    if (!values.personnelTemplate || values.personnelTemplate.length === 0) {
                        message.warning('Lütfen personel seçin');
                        setLoading(false);
                        return;
                    }
                    requestData.personnel_ids = values.personnelTemplate;
                } else {
                    if (!values.groupsTemplate || values.groupsTemplate.length === 0) {
                        message.warning('Lütfen grup seçin');
                        setLoading(false);
                        return;
                    }
                    requestData.group_ids = values.groupsTemplate;
                }

                await axios.post(
                    `${BASE_URL}/api/shifts/templates/${values.template_id}/apply`,
                    requestData,
                    getAuthConfig()
                );
            }

            message.success('İşlem başarıyla tamamlandı');
            form.resetFields();
            onComplete?.();
        } catch (error) {
            console.error('Error in bulk assignment:', error);
            message.error('İşlem sırasında hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setAssignmentType('auto');
        onCancel();
    };

    return (
        <Drawer
            title="Toplu Vardiya İşlemleri"
            placement="right"
            width={600}
            onClose={handleCancel}
            open={visible}
        >
            <Form 
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{
                    assignmentType: 'auto',
                    includeWeekends: false,
                    daysOff: 2
                }}
            >
                <Form.Item name="assignmentType">
                    <Radio.Group onChange={(e) => setAssignmentType(e.target.value)}>
                        <Space direction="vertical">
                            <Radio value="auto">
                                <Space>
                                    <SettingOutlined />
                                    Otomatik Atama
                                </Space>
                            </Radio>
                            <Radio value="copy">
                                <Space>
                                    <CopyOutlined />
                                    Geçen Haftayı Kopyala
                                </Space>
                            </Radio>
                            <Radio value="template">
                                <Space>
                                    <UserOutlined />
                                    Şablon Uygula
                                </Space>
                            </Radio>
                        </Space>
                    </Radio.Group>
                </Form.Item>

                <Form.Item
                    name="dateRange"
                    label="Tarih Aralığı"
                    rules={[{ required: true, message: 'Tarih aralığı seçin' }]}
                >
                    <RangePicker style={{ width: '100%' }} />
                </Form.Item>

                {assignmentType === 'auto' && (
                    <>
                        <Form.Item
                            name="personnel"
                            label="Personel Seçimi"
                            rules={[{ required: true, message: 'En az bir personel seçin' }]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Personel seçin"
                                style={{ width: '100%' }}
                                showSearch
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
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
                            name="shiftType"
                            label="Vardiya Türü"
                            rules={[{ required: true, message: 'Vardiya türü seçin' }]}
                        >
                            <Select placeholder="Vardiya türü seçin">
                                {shiftSchedules.map(s => (
                                    <Option key={s.id} value={s.id}>
                                        {s.name} ({s.start_time}-{s.end_time})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="daysOff"
                            label="Haftalık İzin Günü Sayısı"
                            rules={[{ required: true }]}
                        >
                            <InputNumber min={0} max={7} style={{ width: '100%' }} />
                        </Form.Item>

                        <Form.Item
                            name="includeWeekends"
                            valuePropName="checked"
                            label="Hafta Sonları Dahil"
                        >
                            <Switch />
                        </Form.Item>
                    </>
                )}

                {assignmentType === 'template' && (
                    <>
                        <Form.Item
                            name="template_id"
                            label="Şablon Seç"
                            rules={[{ required: true, message: 'Lütfen bir şablon seçin' }]}
                        >
                            <Select placeholder="Şablon seçin" loading={loading} style={{ width: '100%' }}>
                                {templates.map(t => (
                                    <Option key={t.id} value={t.id}>
                                        {t.name}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Tabs activeKey={selectedType} onChange={setSelectedType} style={{ marginBottom: 16 }}>
                            <TabPane 
                                tab={<span><UserOutlined />Personel</span>} 
                                key="personnel"
                            >
                                <Form.Item
                                    name="personnelTemplate"
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
                                            <Option key={p.id} value={p.id}>
                                                {`${p.first_name} ${p.last_name}`}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </TabPane>
                            
                            <TabPane 
                                tab={<span><TeamOutlined />Grup</span>} 
                                key="group"
                            >
                                <Form.Item
                                    name="groupsTemplate"
                                    rules={[{ required: selectedType === 'group', message: 'Lütfen grup seçin' }]}
                                >
                                    <Select
                                        mode="multiple"
                                        placeholder="Grup seçin"
                                        loading={loading}
                                        style={{ width: '100%' }}
                                    >
                                        {groups.map(g => (
                                            <Option key={g.id} value={g.id}>
                                                {g.name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </TabPane>
                        </Tabs>
                    </>
                )}

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
                            {assignmentType === 'auto' ? 'Otomatik Ata' : 
                             assignmentType === 'copy' ? 'Kopyala' : 'Uygula'}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Drawer>
    );
};

export default BulkAssignmentModal;
