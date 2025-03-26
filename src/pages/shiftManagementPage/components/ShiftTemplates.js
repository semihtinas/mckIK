import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Select, Input, InputNumber, Space, message, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import ApplyTemplateModal from './ApplyTemplateModal';

const { Option } = Select;

const ShiftTemplates = ({ departments, shiftSchedules }) => {
    const [templates, setTemplates] = useState([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isApplyModalVisible, setIsApplyModalVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const getAuthConfig = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });

    // Şablonları getir
    const fetchTemplates = async () => {
        try {
            const response = await axios.get('http://localhost:5001/api/shifts/templates', getAuthConfig());
            console.log('Gelen Şablonlar:', response.data);
            setTemplates(response.data);
        } catch (error) {
            message.error('Şablonlar yüklenirken hata oluştu');
        }
    };

    // Şablon oluştur/güncelle
    const handleSubmit = async (values) => {
        try {
            const patterns = values.shifts.map((shift, index) => ({
                day_index: index,
                shift_schedule_id: shift.shift_schedule_id,
                rest_day: shift.is_rest_day || false
            }));

            const templateData = {
                name: values.name,
                department_id: values.department_id,
                is_rotation: values.is_rotation,
                rotation_days: values.is_rotation ? values.rotation_days : null,
                patterns
            };

            if (selectedTemplate) {
                await axios.put(
                    `http://localhost:5001/api/shifts/templates/${selectedTemplate.id}`,
                    templateData,
                    getAuthConfig()
                );
                message.success('Şablon güncellendi');
            } else {
                await axios.post(
                    'http://localhost:5001/api/shifts/templates',
                    templateData,
                    getAuthConfig()
                );
                message.success('Şablon oluşturuldu');
            }
            setIsModalVisible(false);
            form.resetFields();
            fetchTemplates();
        } catch (error) {
            console.error('Hata:', error);
            message.error('İşlem başarısız oldu');
        }
    };

    const handleEdit = (template) => {
        console.log('Düzenlenecek Şablon:', template);
    
        if (!template.patterns || template.patterns.length === 0) {
            message.error('Bu şablonun deseni bulunamadı');
            return;
        }
    
        setSelectedTemplate(template);
    
        // Form verilerini hazırla
        const formValues = {
            name: template.name,
            department_id: template.department_id,
            is_rotation: template.is_rotation,
            rotation_days: template.rotation_days,
            shifts: template.patterns.map((pattern) => ({
                shift_schedule_id: pattern.shift_schedule_id,
                is_rest_day: pattern.rest_day,
            })),
        };
    
        form.setFieldsValue(formValues);
        setIsModalVisible(true);
    };
    




    

    // Şablonu düzenle


    // Şablonu sil
    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5001/api/shifts/templates/${id}`, getAuthConfig());
            message.success('Şablon silindi');
            fetchTemplates();
        } catch (error) {
            message.error('Şablon silinirken hata oluştu');
        }
    };

    // Şablonu uygula
    const handleApplyTemplate = (template) => {
        setSelectedTemplate(template);
        setIsApplyModalVisible(true);
    };

    const columns = [
        {
            title: 'Şablon Adı',
            dataIndex: 'name',
        },
        {
            title: 'Departman',
            dataIndex: 'department_name',
        },
        {
            title: 'Rotasyon',
            dataIndex: 'is_rotation',
            render: (value, record) => (
                <Tag color={value ? 'blue' : 'default'}>
                    {value ? `${record.rotation_days} günlük rotasyon` : 'Sabit vardiya'}
                </Tag>
            ),
        },
        {
            title: 'Vardiya Düzeni',
            dataIndex: 'patterns',
            render: (patterns) => (
                <div style={{ maxWidth: 300, overflow: 'hidden' }}>
                    {patterns?.map((pattern, index) => (
                        <Tag key={index} color={pattern.rest_day ? 'green' : 'blue'}>
                            {pattern.rest_day ? 'İzin' : pattern.shift_name}
                        </Tag>
                    ))}
                </div>
            ),
        },
        {
            title: 'İşlemler',
            render: (_, record) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
                    <Button type="primary" onClick={() => handleApplyTemplate(record)}>
                        Uygula
                    </Button>
                </Space>
            ),
        }
    ];

    // Şablon düzenleme formu
    const renderTemplateForm = () => (
        
        <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Form.Item name="name" label="Şablon Adı" rules={[{ required: true }]}>
                <Input />
            </Form.Item>

            <Form.Item name="department_id" label="Departman" rules={[{ required: true }]}>
                <Select>
                    {departments.map(dept => (
                        <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item name="is_rotation" label="Rotasyonlu Vardiya" valuePropName="checked">
                <Switch />
            </Form.Item>

            <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                    prevValues.is_rotation !== currentValues.is_rotation
                }
            >
                {({ getFieldValue }) =>
                    getFieldValue('is_rotation') && (
                        <Form.Item name="rotation_days" label="Rotasyon Günü" rules={[{ required: true }]}>
                            <InputNumber min={1} max={31} />
                        </Form.Item>
                    )
                }
            </Form.Item>

            <Form.List name="shifts">
        {(fields, { add, remove }) => (
            <>
                {fields.map((field, index) => (
                    <Space key={field.key} align="baseline">
                        <Form.Item
                            key={`shift_schedule_${field.key}`}
                            name={[field.name, 'shift_schedule_id']}
                            fieldKey={[field.fieldKey, 'shift_schedule_id']}
                            label={`Gün ${index + 1}`}
                        >
                            <Select
                                style={{ width: 200 }}
                                disabled={form.getFieldValue(['shifts', field.name, 'is_rest_day'])}
                            >
                                {shiftSchedules.map((schedule) => (
                                    <Option key={schedule.id} value={schedule.id}>
                                        {schedule.name} ({schedule.start_time}-{schedule.end_time})
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item
                            key={`is_rest_day_${field.key}`}
                            name={[field.name, 'is_rest_day']}
                            fieldKey={[field.fieldKey, 'is_rest_day']}
                            valuePropName="checked"
                        >
                            <Switch
                                checkedChildren="İzin"
                                unCheckedChildren="Vardiya"
                                onChange={(checked) => {
                                    if (checked) {
                                        form.setFieldsValue({
                                            shifts: {
                                                [field.name]: {
                                                    shift_schedule_id: null,
                                                },
                                            },
                                        });
                                    }
                                }}
                            />
                        </Form.Item>
                        <Button onClick={() => remove(field.name)} type="text" danger>
                            Sil
                        </Button>
                    </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Gün Ekle
                </Button>
            </>
        )}
    </Form.List>
            <Form.Item>
                <Button type="primary" htmlType="submit">
                    {selectedTemplate ? 'Güncelle' : 'Kaydet'}
                </Button>
            </Form.Item>
        </Form>
    );

    return (
        <div>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                    setSelectedTemplate(null);
                    form.resetFields();
                    setIsModalVisible(true);
                }}
                style={{ marginBottom: 16 }}
            >
                Yeni Şablon
            </Button>

            <Table
                columns={columns}
                dataSource={templates}
                rowKey="id"
            />

            <Modal
                title={selectedTemplate ? 'Şablon Düzenle' : 'Yeni Şablon'}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setSelectedTemplate(null);
                    form.resetFields();
                }}
                footer={null}
                width={800}
            >
                {renderTemplateForm()}
            </Modal>

            <ApplyTemplateModal
                visible={isApplyModalVisible}
                onCancel={() => {
                    setIsApplyModalVisible(false);
                    setSelectedTemplate(null);
                }}
                onComplete={() => {
                    setIsApplyModalVisible(false);
                    setSelectedTemplate(null);
                    message.success('Şablon başarıyla uygulandı');
                    fetchTemplates(); // Varsa güncellemeleri görmek için listeyi yenile
                }}
                template={selectedTemplate}
                departmentId={selectedTemplate?.department_id}
            />
        </div>
    );
};

export default ShiftTemplates;
