import React, { useState, useEffect } from 'react';
import { 
    Card, 
    List, 
    Button, 
    Input, 
    Space, 
    Modal, 
    Form, 
    InputNumber, 
    Select,
    Tag, 
    Tooltip,
    message,
    Popconfirm,
    DatePicker
} from 'antd';
import { 
    PlusOutlined, 
    DeleteOutlined, 
    EditOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    ClockCircleOutlined,
    UserOutlined
} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';


const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    }
});

const { TextArea } = Input;
const { Option } = Select;

const formLayout = {
    labelCol: { span: 6 },
    wrapperCol: { span: 18 }
};

const AgendaTab = ({ meetingId, canEdit, onUpdate }) => {
    const [agendaItems, setAgendaItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [personnel, setPersonnel] = useState([]);
    const [postponeModalVisible, setPostponeModalVisible] = useState(false);
    const [postponeForm] = Form.useForm();
    const [form] = Form.useForm();

    useEffect(() => {
        fetchAgendaItems();
        if (canEdit) {
            fetchPersonnel();
        }
    }, [meetingId]);

    const fetchAgendaItems = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get(`/api/meetings/${meetingId}/agenda`);
            setAgendaItems(response.data);
        } catch (error) {
            console.error('Error fetching agenda items:', error);
            message.error('Gündem maddeleri yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    const fetchPersonnel = async () => {
        try {
            const response = await axiosInstance.get('/api/personnel');
            setPersonnel(response.data);
        } catch (error) {
            console.error('Error fetching personnel:', error);
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };
    
    useEffect(() => {
        fetchAgendaItems();
        if (canEdit) {
            fetchPersonnel();
        }
    }, [meetingId, canEdit]); // canEdit'i dependency array'e ekledik

    const handleReorder = async (item, direction) => {
        const currentIndex = agendaItems.findIndex(i => i.id === item.id);
        const newItems = [...agendaItems];
        const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        [newItems[currentIndex], newItems[swapIndex]] = [newItems[swapIndex], newItems[currentIndex]];

        const updatedItems = newItems.map((item, index) => ({
            ...item,
            order_number: index + 1
        }));

        setAgendaItems(updatedItems);

        try {
            await axiosInstance.put(`/api/meetings/${meetingId}/agenda/reorder`, {
                items: updatedItems.map(item => ({
                    id: item.id,
                    order_number: item.order_number
                }))
            });
        } catch (error) {
            message.error('Sıralama güncellenirken bir hata oluştu');
            fetchAgendaItems();
        }
    };

    const handleSubmit = async (values) => {
        try {
            if (selectedItem) {
                await axiosInstance.put(`/api/meetings/${meetingId}/agenda/${selectedItem.id}`, values);
                message.success('Gündem maddesi güncellendi');
            } else {
                await axiosInstance.post(`/api/meetings/${meetingId}/agenda`, {
                    ...values,
                    order_number: agendaItems.length + 1
                });
                message.success('Gündem maddesi eklendi');
            }
            setIsModalVisible(false);
            form.resetFields();
            fetchAgendaItems();
            onUpdate?.();
        } catch (error) {
            console.error('Error saving agenda item:', error);
            message.error('Gündem maddesi kaydedilirken bir hata oluştu');
        }
    };

    const handlePostpone = async (values) => {
        try {
            await axiosInstance.put(`/api/meetings/${meetingId}/agenda/${selectedItem.id}/postpone`, {
                is_postponed: true,
                postponed_reason: values.reason,
                postponed_date: values.date?.format('YYYY-MM-DD HH:mm:ss')
            });
            message.success('Gündem maddesi ertelendi');
            setPostponeModalVisible(false);
            postponeForm.resetFields();
            fetchAgendaItems();
        } catch (error) {
            message.error('Gündem maddesi ertelenirken bir hata oluştu');
        }
    };

    const handleRemovePostpone = async (itemId) => {
        try {
            await axiosInstance.put(`/api/meetings/${meetingId}/agenda/${itemId}/postpone`, {
                is_postponed: false,
                postponed_reason: null,
                postponed_date: null
            });
            message.success('Erteleme kaldırıldı');
            fetchAgendaItems();
        } catch (error) {
            message.error('Erteleme kaldırılırken bir hata oluştu');
        }
    };

    return (
        <div>
            {canEdit && (
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setSelectedItem(null);
                        setIsModalVisible(true);
                    }}
                    style={{ marginBottom: 16 }}
                >
                    Yeni Gündem Maddesi
                </Button>
            )}

            {agendaItems.map((item, index) => (
                <Card
                    key={item.id}
                    size="small"
                    style={{ marginBottom: 8 }}
                    title={
                        <Space>
                            <span>{index + 1}.</span>
                            <span>{item.agenda_item}</span>
                            {item.is_postponed && (
                                <Tag color="orange">
                                    Ertelendi: {moment(item.postponed_date).format('DD.MM.YYYY')}
                                </Tag>
                            )}
                        </Space>
                    }
                    extra={
                        <Space>
                            <Tooltip title="Süre">
                                <Tag icon={<ClockCircleOutlined />}>
                                    {item.duration_minutes} dk
                                </Tag>
                            </Tooltip>
                            {canEdit && (
                                <>
                                    <Button
                                        type="text"
                                        icon={<ArrowUpOutlined />}
                                        disabled={index === 0}
                                        onClick={() => handleReorder(item, 'up')}
                                    />
                                    <Button
                                        type="text"
                                        icon={<ArrowDownOutlined />}
                                        disabled={index === agendaItems.length - 1}
                                        onClick={() => handleReorder(item, 'down')}
                                    />
                                    <Button
                                        type="text"
                                        icon={<EditOutlined />}
                                        onClick={() => {
                                            setSelectedItem(item);
                                            form.setFieldsValue(item);
                                            setIsModalVisible(true);
                                        }}
                                    />
                                    {item.is_postponed ? (
                                        <Button
                                            type="link"
                                            onClick={() => handleRemovePostpone(item.id)}
                                        >
                                            Ertelemeyi Kaldır
                                        </Button>
                                    ) : (
                                        <Button
                                            type="link"
                                            onClick={() => {
                                                setSelectedItem(item);
                                                setPostponeModalVisible(true);
                                            }}
                                        >
                                            Ertele
                                        </Button>
                                    )}
                                    <Popconfirm
                                        title="Bu gündem maddesini silmek istediğinizden emin misiniz?"
                                        onConfirm={() => handleDelete(item.id)}
                                    >
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                        />
                                    </Popconfirm>
                                </>
                            )}
                        </Space>
                    }
                >
                    <div style={{ marginBottom: 8 }}>
                        {item.description}
                    </div>
                    {item.presenter_id && (
                        <div>
                            <Tag icon={<UserOutlined />}>
                                Sunucu: {personnel.find(p => p.id === item.presenter_id)?.first_name} {
                                    personnel.find(p => p.id === item.presenter_id)?.last_name
                                }
                            </Tag>
                        </div>
                    )}
                </Card>
            ))}

<Modal
    title={selectedItem ? "Gündem Maddesi Düzenle" : "Yeni Gündem Maddesi"}
    open={isModalVisible}
    onCancel={() => {
        setIsModalVisible(false);
        setSelectedItem(null);
        form.resetFields();
    }}
    footer={null}
>
    <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
    >
        <Form.Item
            name="agenda_item"
            label="Gündem Maddesi"
            rules={[{ required: true, message: 'Lütfen gündem maddesi girin' }]}
        >
            <Input />
        </Form.Item>

        <Form.Item
            name="description"
            label="Açıklama"
        >
            <TextArea rows={4} />
        </Form.Item>

        <Form.Item
            name="duration_minutes"
            label="Süre (Dakika)"
            rules={[{ required: true, message: 'Lütfen süre girin' }]}
        >
            <InputNumber min={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
            name="presenter_id"
            label="Sunucu"
        >
            <Select
                allowClear
                placeholder="Sunucu seçin"
                style={{ width: '100%' }}
            >
                {personnel.map(person => (
                    <Option key={person.id} value={person.id}>
                        {`${person.first_name} ${person.last_name}`}
                    </Option>
                ))}
            </Select>
        </Form.Item>

        <Form.Item>
            <Space>
                <Button type="primary" htmlType="submit">
                    {selectedItem ? 'Güncelle' : 'Ekle'}
                </Button>
                <Button onClick={() => {
                    setIsModalVisible(false);
                    setSelectedItem(null);
                    form.resetFields();
                }}>
                    İptal
                </Button>
            </Space>
        </Form.Item>
    </Form>
</Modal>
        </div>
    );
};

export default AgendaTab;