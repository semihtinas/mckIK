import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, message, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import MeetingForm from './MeetingForm';
import moment from 'moment';

const MeetingList = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/meetings', {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setMeetings(response.data);
        } catch (error) {
            console.error('Error fetching meetings:', error);
            message.error('Toplantılar yüklenirken bir hata oluştu');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMeetings();
    }, []);

    const columns = [
        {
            title: 'Başlık',
            dataIndex: 'title',
            key: 'title',
            sorter: (a, b) => a.title.localeCompare(b.title)
        },
        {
            title: 'Tür',
            dataIndex: 'meeting_type',
            key: 'meeting_type',
            filters: [
                { text: 'Rutin', value: 'regular' },
                { text: 'Acil', value: 'emergency' },
                { text: 'Yönetim', value: 'board' }
            ],
            render: type => (
                <Tag color={type === 'emergency' ? 'red' : type === 'board' ? 'blue' : 'green'}>
                    {type}
                </Tag>
            )
        },
        {
            title: 'Tarih',
            dataIndex: 'start_time',
            key: 'start_time',
            render: date => moment(date).format('DD.MM.YYYY HH:mm'),
            sorter: (a, b) => moment(a.start_time).unix() - moment(b.start_time).unix()
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            filters: [
                { text: 'Planlandı', value: 'planned' },
                { text: 'Devam Ediyor', value: 'in_progress' },
                { text: 'Tamamlandı', value: 'completed' }
            ],
            render: status => (
                <Tag color={
                    status === 'completed' ? 'green' :
                    status === 'in_progress' ? 'blue' : 'orange'
                }>
                    {status}
                </Tag>
            )
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        icon={<EditOutlined />} 
                        onClick={() => {
                            setSelectedMeeting(record);
                            setIsModalVisible(true);
                        }}
                    >
                        Düzenle
                    </Button>
                    <Button 
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => handleDelete(record.id)}
                    >
                        Sil
                    </Button>
                </Space>
            )
        }
    ];

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/meetings/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            message.success('Toplantı başarıyla silindi');
            fetchMeetings();
        } catch (error) {
            console.error('Error deleting meeting:', error);
            message.error('Toplantı silinirken bir hata oluştu');
        }
    };

    return (
        <div>
            <Space style={{ marginBottom: 16 }}>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setSelectedMeeting(null);
                        setIsModalVisible(true);
                    }}
                >
                    Yeni Toplantı
                </Button>
            </Space>

            <Table
                columns={columns}
                dataSource={meetings}
                rowKey="id"
                loading={loading}
            />

            <Modal
                title={selectedMeeting ? "Toplantı Düzenle" : "Yeni Toplantı"}
                open={isModalVisible}
                onCancel={() => {
                    setIsModalVisible(false);
                    setSelectedMeeting(null);
                }}
                footer={null}
                width={800}
            >
                <MeetingForm
                    meeting={selectedMeeting}
                    onSuccess={() => {
                        setIsModalVisible(false);
                        setSelectedMeeting(null);
                        fetchMeetings();
                    }}
                />
            </Modal>
        </div>
    );
};

export default MeetingList;