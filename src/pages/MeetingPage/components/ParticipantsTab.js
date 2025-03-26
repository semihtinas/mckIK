import React, { useState, useEffect } from 'react';
import {
    Table,
    Button,
    Tag,
    Space,
    Select,
    message,
    Tooltip,
    Modal,
    Typography
} from 'antd';
import {
    UserAddOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    MailOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;
const { Text } = Typography;

const ParticipantsTab = ({ meetingId, canEdit, onUpdate }) => {
    const [participants, setParticipants] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedPersonnel, setSelectedPersonnel] = useState([]);
    const [loadingStates, setLoadingStates] = useState({});

    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });

    useEffect(() => {
        fetchParticipants();
        if (canEdit) {
            fetchPersonnel();
        }
    }, [meetingId]);

    const fetchParticipants = async () => {
        try {
            const response = await axiosInstance.get(`/api/meetings/${meetingId}/participants`);
            setParticipants(response.data);
        } catch (error) {
            console.error('Error fetching participants:', error);
            message.error('Katılımcılar yüklenirken bir hata oluştu');
        }
    };

    const fetchPersonnel = async () => {
        try {
            const response = await axiosInstance.get('/api/personnel');
            const filteredPersonnel = response.data.filter(
                person => !participants.some(p => p.id === person.id)
            );
            setPersonnel(filteredPersonnel);
        } catch (error) {
            console.error('Error fetching personnel:', error);
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };

    const handleAddParticipants = async () => {
        try {
            await axiosInstance.post(`/api/meetings/${meetingId}/participants`, {
                participants: selectedPersonnel
            });
            message.success('Katılımcılar eklendi');
            setIsModalVisible(false);
            setSelectedPersonnel([]);
            fetchParticipants();
            fetchPersonnel();
            onUpdate?.();
        } catch (error) {
            console.error('Error adding participants:', error);
            message.error('Katılımcılar eklenirken bir hata oluştu');
        }
    };

    const handleRemoveParticipant = async (participantId) => {
        try {
            await axiosInstance.delete(`/api/meetings/${meetingId}/participants/${participantId}`);
            message.success('Katılımcı kaldırıldı');
            fetchParticipants();
            fetchPersonnel();
            onUpdate?.();
        } catch (error) {
            console.error('Error removing participant:', error);
            message.error('Katılımcı kaldırılırken bir hata oluştu');
        }
    };

    // Durum güncelleme fonksiyonu
    const handleStatusChange = async (participantId, newStatus) => {
        setLoadingStates(prev => ({ ...prev, [participantId]: true }));
        try {
            await axiosInstance.put(`/api/meetings/${meetingId}/participants/${participantId}/status`, {
                status: newStatus
            });
            message.success('Katılım durumu güncellendi');
            fetchParticipants();
            onUpdate?.();
        } catch (error) {
            console.error('Error updating participant status:', error);
            message.error('Katılım durumu güncellenirken bir hata oluştu');
        } finally {
            setLoadingStates(prev => ({ ...prev, [participantId]: false }));
        }
    };

    // Davet yeniden gönderme fonksiyonu
    const handleResendInvitation = async (participantId) => {
        setLoadingStates(prev => ({ ...prev, [`resend-${participantId}`]: true }));
        try {
            await axiosInstance.post(`/api/meetings/${meetingId}/participants/${participantId}/resend-invitation`);
            message.success('Davet yeniden gönderildi');
        } catch (error) {
            console.error('Error resending invitation:', error);
            message.error('Davet gönderilirken bir hata oluştu');
        } finally {
            setLoadingStates(prev => ({ ...prev, [`resend-${participantId}`]: false }));
        }
    };

    const getStatusTag = (status) => {
        const statusConfig = {
            accepted: { color: 'success', icon: <CheckCircleOutlined />, text: 'Katılacak' },
            declined: { color: 'error', icon: <CloseCircleOutlined />, text: 'Katılamayacak' },
            pending: { color: 'warning', icon: <ClockCircleOutlined />, text: 'Yanıt Bekleniyor' }
        };

        const config = statusConfig[status];
        return (
            <Tag icon={config.icon} color={config.color}>
                {config.text}
            </Tag>
        );
    };

    const columns = [
        {
            title: 'Ad Soyad',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Katılım Durumu',
            dataIndex: 'attendance_status',
            key: 'attendance_status',
            render: status => getStatusTag(status),
            filters: [
                { text: 'Katılacak', value: 'accepted' },
                { text: 'Katılamayacak', value: 'declined' },
                { text: 'Yanıt Bekleniyor', value: 'pending' }
            ],
            onFilter: (value, record) => record.attendance_status === value
        },
        canEdit && {
            title: 'İşlemler',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.attendance_status === 'pending' && (
            <Tooltip title="Daveti Yeniden Gönder">
                <Button
                    icon={<MailOutlined />}
                    size="small"
                    loading={loadingStates[`resend-${record.id}`]}
                    onClick={() => handleResendInvitation(record.id)}
                />
            </Tooltip>
        )}
        <Tooltip title="Durum Güncelle">
            <Select
                value={record.attendance_status}
                style={{ width: 130 }}
                onChange={(value) => handleStatusChange(record.id, value)}
                size="small"
                disabled={loadingStates[record.id]}
            >
                <Option value="accepted">Katılacak</Option>
                <Option value="declined">Katılamayacak</Option>
                <Option value="pending">Yanıt Bekleniyor</Option>
            </Select>
        </Tooltip>
                    <Tooltip title="Kaldır">
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => handleRemoveParticipant(record.id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ].filter(Boolean);

    const statistics = {
        total: participants.length,
        accepted: participants.filter(p => p.attendance_status === 'accepted').length,
        declined: participants.filter(p => p.attendance_status === 'declined').length,
        pending: participants.filter(p => p.attendance_status === 'pending').length
    };

    return (
        <div>
            <Space direction="vertical" style={{ width: '100%' }}>
                {/* İstatistikler */}
                <Space size="large">
                    <Text>Toplam: {statistics.total}</Text>
                    <Text type="success">Katılacak: {statistics.accepted}</Text>
                    <Text type="danger">Katılamayacak: {statistics.declined}</Text>
                    <Text type="warning">Yanıt Bekleyen: {statistics.pending}</Text>
                </Space>

                {/* Katılımcı Ekleme Butonu */}
                {canEdit && (
                    <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        onClick={() => setIsModalVisible(true)}
                        style={{ marginBottom: 16 }}
                    >
                        Katılımcı Ekle
                    </Button>
                )}

                {/* Katılımcı Listesi */}
                <Table
                    dataSource={participants}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                />

                {/* Katılımcı Ekleme Modalı */}
                <Modal
                    title="Katılımcı Ekle"
                    open={isModalVisible}
                    onOk={handleAddParticipants}
                    onCancel={() => {
                        setIsModalVisible(false);
                        setSelectedPersonnel([]);
                    }}
                    okButtonProps={{ disabled: selectedPersonnel.length === 0 }}
                >
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Katılımcıları seçin"
                        value={selectedPersonnel}
                        onChange={setSelectedPersonnel}
                        optionFilterProp="children"
                        showSearch
                    >
                        {personnel.map(person => (
                            <Option 
                                key={person.id} 
                                value={person.id}
                                disabled={participants.some(p => p.id === person.id)}
                            >
                                {`${person.first_name} ${person.last_name}`}
                            </Option>
                        ))}
                    </Select>
                </Modal>
            </Space>
        </div>
    );
};

export default ParticipantsTab;