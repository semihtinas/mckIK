import React, { useState, useEffect } from 'react';
import { 
    Form, 
    Select, 
    InputNumber, 
    Button, 
    Table, 
    message, 
    Card,
    Input,
    Space,
    Tag,
    Modal,
    Spin,
    Row,    // Eklendi
    Col,    // Eklendi
    Switch  // Eklendi
} from 'antd';
import moment from 'moment';
import axios from 'axios';

const { Option } = Select;

const BulkLeaveUpdate = () => {
    const [form] = Form.useForm();
    const [departments, setDepartments] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [selectedPersonnel, setSelectedPersonnel] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [loading, setLoading] = useState(false);
    const [previewModalVisible, setPreviewModalVisible] = useState(false);
    const [affectedPersonnel, setAffectedPersonnel] = useState([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [selectSpecificPersonnel, setSelectSpecificPersonnel] = useState(false);

    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });

    const fetchInitialData = async () => {
        setInitialLoading(true);
        try {
            const [deptRes, leaveTypesRes] = await Promise.all([
                axiosInstance.get('/api/departments'),
                axiosInstance.get('/api/leave-management/new-leave-types')
            ]);

            setDepartments(deptRes.data);
            setLeaveTypes(leaveTypesRes.data);
        } catch (error) {
            console.error('Initial data error:', error);
            message.error('Veriler yüklenirken hata oluştu');
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const handleDepartmentChange = async (deptId) => {
        setSelectedDept(deptId);
        setSelectedPersonnel([]); // Departman değiştiğinde seçili personeli sıfırla
        form.setFieldsValue({ selected_personnel: [] }); // Form değerini de sıfırla
        
        if (!deptId) {
            setPersonnel([]);
            return;
        }

        setLoading(true);

        try {
            const response = await axiosInstance.get(`/api/departments/${deptId}/personnel`);
            setPersonnel(response.data);
        } catch (error) {
            console.error('Personnel fetch error:', error);
            message.error('Personel listesi yüklenemedi: ' + 
                (error.response?.data?.error || error.message));
            setPersonnel([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePersonnelSelect = (selectedIds) => {
        setSelectedPersonnel(selectedIds);
    };

    const handlePreview = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            
            const requestData = {
                ...values,
                selected_personnel: selectSpecificPersonnel ? values.selected_personnel : undefined
            };
            
            const response = await axiosInstance.post('/api/leave/preview-bulk-update', requestData);
            setAffectedPersonnel(response.data);
            setPreviewModalVisible(true);
        } catch (error) {
            if (!error.errorFields) {
                console.error('Preview error:', error);
                message.error('Önizleme oluşturulamadı: ' + 
                    (error.response?.data?.error || error.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            const requestData = {
                ...values,
                selected_personnel: selectSpecificPersonnel ? values.selected_personnel : undefined
            };

            const response = await axiosInstance.post('/api/leave/bulk-leave-balance-update', requestData);
            message.success(response.data.message);
            form.resetFields();
            setPreviewModalVisible(false);
            setSelectedPersonnel([]);
        } catch (error) {
            console.error('Submit error:', error);
            message.error('Güncelleme sırasında hata oluştu: ' + 
                (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };


    // handleSubmit fonksiyonundan sonra yeni fonksiyon ekleyin
    const verifyUpdate = async () => {
        try {
            // Mevcut form değerlerini al
            const values = form.getFieldsValue();
            
            if (!values.department_id || !values.leave_type_id) {
                message.warning('Lütfen departman ve izin türü seçin');
                return;
            }

            setLoading(true);
            
            const response = await axiosInstance.get('/api/leave/verify-balance-update', {
                params: {
                    department_id: values.department_id,
                    leave_type_id: values.leave_type_id,
                    selected_personnel: values.selected_personnel
                }
            });

            if (response.data && response.data.length > 0) {
                Modal.info({
                    title: 'Güncelleme Sonuçları',
                    width: 1000,
                    content: (
                        <div style={{ maxHeight: '500px', overflow: 'auto' }}>
                            <Table
                                dataSource={response.data}
                                rowKey={(record) => `${record.id}-${record.log_created_at}`}
                                columns={[
                                    {
                                        title: 'Personel',
                                        dataIndex: 'full_name',
                                        key: 'full_name',
                                    },
                                    {
                                        title: 'Toplam İzin',
                                        dataIndex: 'total_days',
                                        key: 'total_days',
                                        render: (text) => <Tag color="blue">{text || 0}</Tag>
                                    },
                                    {
                                        title: 'Kullanılan',
                                        dataIndex: 'used_days',
                                        key: 'used_days',
                                        render: (text) => <Tag color="orange">{text || 0}</Tag>
                                    },
                                    {
                                        title: 'Kalan',
                                        key: 'remaining',
                                        render: (_, record) => (
                                            <Tag color="green">
                                                {((record.total_days || 0) - (record.used_days || 0))}
                                            </Tag>
                                        )
                                    },
                                    {
                                        title: 'Son İşlem',
                                        dataIndex: 'last_action',
                                        key: 'last_action',
                                        render: (text) => <Tag color="purple">{text}</Tag>
                                    },
                                    {
                                        title: 'Eklenen Gün',
                                        dataIndex: 'days_changed',
                                        key: 'days_changed',
                                        render: (text) => text ? <Tag color="green">+{text}</Tag> : '-'
                                    },
                                    {
                                        title: 'İşlem Tarihi',
                                        dataIndex: 'log_created_at',
                                        key: 'log_created_at',
                                        render: (text) => text ? moment(text).format('DD.MM.YYYY HH:mm:ss') : '-'
                                    },
                                    {
                                        title: 'Sebep',
                                        dataIndex: 'reason',
                                        key: 'reason',
                                        ellipsis: true,
                                    }
                                ]}
                                pagination={false}
                                size="small"
                            />
                        </div>
                    )
                });
            } else {
                message.info('Bu parametrelerle herhangi bir güncelleme bulunamadı');
            }
        } catch (error) {
            console.error('Verification error:', error);
            message.error('Güncelleme kontrolü yapılırken hata oluştu: ' + 
                (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

   


    if (initialLoading) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <Spin size="large" />
                    <p>Veriler yükleniyor...</p>
                </div>
            </Card>
        );
    }

    return (
        <Card title="Toplu İzin Bakiyesi Güncelleme">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item
                    name="department_id"
                    label="Departman"
                    rules={[{ required: true, message: 'Lütfen departman seçin' }]}
                >
                    <Select
                        placeholder="Departman seçin"
                        onChange={handleDepartmentChange}
                        allowClear
                        loading={loading}
                    >
{departments.map(dept => (
    <Option key={dept.id} value={dept.id || ''}>
        {dept.name}
    </Option>
))}
                    </Select>
                </Form.Item>

                <Form.Item>
                    <Row align="middle" gutter={8}>
                        <Col>
                            <Switch
                                checked={selectSpecificPersonnel}
                                onChange={setSelectSpecificPersonnel}
                            />
                        </Col>
                        <Col>Belirli personel seç</Col>
                    </Row>
                </Form.Item>

                {selectSpecificPersonnel && (
                    <Form.Item
                        name="selected_personnel"
                        label="Personel Seç"
                        rules={[{ 
                            required: true, 
                            message: 'Lütfen en az bir personel seçin' 
                        }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Personel seçin"
                            onChange={handlePersonnelSelect}
                            loading={loading}
                            optionFilterProp="children"
                            showSearch
                            allowClear
                        >
                            {personnel.map(person => (
                                <Option key={person.id} value={person.id}>
                                    {person.first_name} {person.last_name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                )}

                <Form.Item
                    name="leave_type_id"
                    label="İzin Türü"
                    rules={[{ required: true, message: 'Lütfen izin türü seçin' }]}
                >
                    <Select placeholder="İzin türü seçin" loading={loading}>
                    {leaveTypes.map(type => (
    <Option key={type.id} value={type.id || ''}>
        {type.name}
    </Option>
))}
                    </Select>
                </Form.Item>

                <Form.Item
                    name="days_to_add"
                    label="Eklenecek Gün Sayısı"
                    rules={[{ required: true, message: 'Lütfen gün sayısı girin' }]}
                >
                    <InputNumber min={1} />
                </Form.Item>

                <Form.Item
                    name="reason"
                    label="Güncelleme Nedeni"
                    rules={[{ required: true, message: 'Lütfen güncelleme nedeni girin' }]}
                >
                    <Input.TextArea rows={4} />
                </Form.Item>

                <Form.Item>
    <Space>
        <Button type="primary" onClick={handlePreview} loading={loading}>
            Önizle
        </Button>
        <Button type="primary" htmlType="submit" loading={loading}>
            Güncelle
        </Button>
        <Button onClick={verifyUpdate}>
            Güncellemeyi Kontrol Et
        </Button>
    </Space>
</Form.Item>
            </Form>

            <Modal
                title="Bakiye Güncelleme Önizleme"
                open={previewModalVisible}
                onOk={() => form.submit()}
                onCancel={() => setPreviewModalVisible(false)}
                width={800}
            >
                <Table
                    dataSource={affectedPersonnel}
                    rowKey="id"
                    columns={[
                        {
                            title: 'Personel',
                            dataIndex: 'personnel_name',
                            key: 'personnel_name',
                        },
                        {
                            title: 'Mevcut Bakiye',
                            dataIndex: 'current_balance',
                            key: 'current_balance',
                        },
                        {
                            title: 'Yeni Bakiye',
                            dataIndex: 'new_balance',
                            key: 'new_balance',
                            render: (text) => <Tag color="green">{text}</Tag>,
                        },
                    ]}
                    pagination={false}
                    size="small"
                />
            </Modal>
        </Card>
    );
};

export default BulkLeaveUpdate;