import React, { useEffect, useState } from 'react';
import { Form, Input, Select, DatePicker, Button, Space, message } from 'antd';
import { UserOutlined, CalendarOutlined, TeamOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;

// Axios instance oluşturuyoruz
const axiosInstance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
    }
});

const MeetingForm = ({ meeting, onSuccess }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState([]);

    useEffect(() => {
        fetchPersonnel();
        if (meeting) {
            form.setFieldsValue({
                ...meeting,
                date_range: [
                    moment(meeting.start_time),
                    moment(meeting.end_time)
                ],
                participants: meeting.participants?.map(p => p.id)
            });
        }
    }, [meeting, form]);

    const fetchPersonnel = async () => {
        try {
            const response = await axiosInstance.get('/api/personnel');
            setPersonnel(response.data);
        } catch (error) {
            console.error('Error fetching personnel:', error);
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };

    // MeetingForm.js içinde onFinish fonksiyonunu güncelleyelim
const onFinish = async (values) => {
    setLoading(true);
    try {
        const data = {
            title: values.title,
            description: values.description,
            meeting_type: values.meeting_type,
            start_time: values.date_range[0].format('YYYY-MM-DD HH:mm:ss'),
            end_time: values.date_range[1].format('YYYY-MM-DD HH:mm:ss'),
            location: values.location,
            participants: values.participants || [],
            status: 'planned'
        };

        if (meeting) {
            await axiosInstance.put(`/api/meetings/${meeting.id}`, data);
        } else {
            await axiosInstance.post('/api/meetings', data);
        }
        
        form.resetFields();
        // Message'ı burada değil, parent component'te gösterelim
        onSuccess?.();
    } catch (error) {
        console.error('Error saving meeting:', error);
        message.error('Toplantı kaydedilirken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
        >
            <Form.Item
                name="title"
                label="Toplantı Başlığı"
                rules={[{ required: true, message: 'Lütfen toplantı başlığı girin' }]}
            >
                <Input prefix={<CalendarOutlined />} placeholder="Toplantı başlığı..." />
            </Form.Item>

            <Form.Item
                name="meeting_type"
                label="Toplantı Türü"
                rules={[{ required: true, message: 'Lütfen toplantı türü seçin' }]}
            >
                <Select placeholder="Toplantı türü seçin">
                    <Option value="regular">Rutin Toplantı</Option>
                    <Option value="emergency">Acil Toplantı</Option>
                    <Option value="board">Yönetim Toplantısı</Option>
                    <Option value="other">Diğer</Option>
                </Select>
            </Form.Item>

            <Form.Item
                name="date_range"
                label="Tarih ve Saat"
                rules={[{ required: true, message: 'Lütfen tarih ve saat seçin' }]}
            >
                <RangePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    style={{ width: '100%' }}
                />
            </Form.Item>

            <Form.Item
                name="location"
                label="Konum"
            >
                <Input placeholder="Toplantı yeri veya online bağlantı..." />
            </Form.Item>

            <Form.Item
                name="participants"
                label="Katılımcılar"
            >
                <Select
                    mode="multiple"
                    placeholder="Katılımcıları seçin"
                    style={{ width: '100%' }}
                >
                    {personnel.map(person => (
                        <Option key={person.id} value={person.id}>
                            {`${person.first_name} ${person.last_name}`}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            <Form.Item
                name="description"
                label="Açıklama"
            >
                <TextArea rows={4} placeholder="Toplantı hakkında açıklama..." />
            </Form.Item>

            <Form.Item>
                <Space>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        {meeting ? 'Güncelle' : 'Oluştur'}
                    </Button>
                    <Button onClick={() => form.resetFields()}>
                        Temizle
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
};

export default MeetingForm;