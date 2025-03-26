import React, { useState, useEffect } from 'react';
import {
    Card, Form, Input, Button, Space, Select, Tag,
    Typography, Divider, message, List, Modal, DatePicker,
    Badge  // Badge'i ekledik
} from 'antd';

import {
    PlusOutlined, DeleteOutlined, EditOutlined,
    UserOutlined, CalendarOutlined, FileOutlined, FileTextOutlined, UploadOutlined, CheckOutlined, CheckCircleOutlined // FileOutlined'ı ekledik
} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';
import { pdf } from '@react-pdf/renderer'; // Bunu ekledik
import MeetingMinutesDocument from './MeetingMinutesPDF';


const { TextArea } = Input;
const { Option } = Select;

// ActionItemForm bileşeni - Yapılacak iş ekleme formu
const ActionItemForm = ({ onAdd, personnel }) => {
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState(null);
    const [dueDate, setDueDate] = useState(null);
    const [priority, setPriority] = useState(null);
    const [loading, setLoading] = useState(false); // Loading state'ini ekledik
    const [pdfLoading, setPdfLoading] = useState(false); // PDF oluşturma için ayrı bir loading state
    const [participants, setParticipants] = useState([]); // Bu satırı ekleyin

    const priorities = [
        { value: 'high', label: 'Yüksek', color: 'red' },
        { value: 'medium', label: 'Orta', color: 'orange' },
        { value: 'low', label: 'Düşük', color: 'green' }
    ];


    const handleAdd = () => {
        if (!description || !assignedTo || !dueDate || !priority) {
            message.error('Lütfen tüm alanları doldurun');
            return;
        }

        const newItem = {
            description,
            assigned_to: assignedTo,
            due_date: dueDate.format('YYYY-MM-DD'),
            priority
        };

        onAdd(newItem);
        setDescription('');
        setAssignedTo(null);
        setDueDate(null);
        setPriority(null);
    };

    return (
        <Card size="small" title="Yeni Yapılacak İş">
            <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                    <Typography.Text>Açıklama</Typography.Text>
                    <TextArea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        rows={2} 
                    />
                </div>

                <Space style={{ width: '100%', gap: 16 }}>
                    <div>
                        <Typography.Text>Sorumlu</Typography.Text>
                        <Select
                            style={{ width: 200 }}
                            value={assignedTo}
                            onChange={value => setAssignedTo(value)}
                            placeholder="Sorumlu seç"
                            showSearch
                            optionFilterProp="children"
                        >
                            {personnel.map(person => (
                                <Option key={person.id} value={person.id}>
                                    {`${person.first_name} ${person.last_name}`}
                                </Option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <Typography.Text>Bitiş Tarihi</Typography.Text>
                        <DatePicker 
                            value={dueDate}
                            onChange={value => setDueDate(value)}
                            format="DD.MM.YYYY" 
                        />
                    </div>

                    <div>
                        <Typography.Text>Öncelik</Typography.Text>
                        <Select
                            style={{ width: 120 }}
                            value={priority}
                            onChange={value => setPriority(value)}
                            placeholder="Öncelik seç"
                        >
                            {priorities.map(({ value, label, color }) => (
                                <Option key={value} value={value}>
                                    <Badge color={color} text={label} />
                                </Option>
                            ))}
                        </Select>
                    </div>
                </Space>

                <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                >
                    Ekle
                </Button>
            </Space>
        </Card>
    );
};

// Ana MinutesTab bileşeni
const MinutesTab = ({ meetingId, canEdit }) => {
    const [minutes, setMinutes] = useState([]);
    const [agendaItems, setAgendaItems] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [participants, setParticipants] = useState([]); // Bu satırı ekleyin ve üste taşıyın
    const [loading, setLoading] = useState(false);
    const [loadingPdfId, setLoadingPdfId] = useState(null);
    const [selectedAgendaItem, setSelectedAgendaItem] = useState(null);
    const [actionItems, setActionItems] = useState([]);
    const [minuteForm] = Form.useForm();

    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });

    

    const fetchMinutes = async () => {
        try {
            console.log('Fetching minutes for meetingId:', meetingId);
            const response = await axiosInstance.get(`/api/meetings/${meetingId}/minutes`);
            console.log('Minutes response:', response.data);
            setMinutes(response.data);
        } catch (error) {
            console.error('Minutes fetch error:', error);
            message.error('Tutanaklar yüklenirken bir hata oluştu');
        }
    };

    const fetchAgendaItems = async () => {
        try {
            const response = await axiosInstance.get(`/api/meetings/${meetingId}/agenda`);
            setAgendaItems(response.data);
        } catch (error) {
            message.error('Gündem maddeleri yüklenirken bir hata oluştu');
        }
    };

    const fetchPersonnel = async () => {
        try {
            const response = await axiosInstance.get('/api/personnel');
            setPersonnel(response.data);
        } catch (error) {
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };

       // Fetch fonksiyonları
       const fetchParticipants = async () => {
        try {
            console.log('Fetching participants for meeting:', meetingId);
            const response = await axiosInstance.get(`/api/meetings/${meetingId}/participants`);
            console.log('Participants response:', response.data);
            setParticipants(response.data); // Artık bu satır çalışacak
        } catch (error) {
            console.error('Error fetching participants:', error);
            message.error('Katılımcılar yüklenirken bir hata oluştu');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (meetingId) {
                try {
                    setLoading(true);
                    await Promise.all([
                        fetchMinutes(),
                        fetchAgendaItems(),
                        fetchPersonnel(),
                        fetchParticipants()
                    ]);
                } catch (error) {
                    console.error('Error loading data:', error);
                } finally {
                    setLoading(false);
                }
            }
        };

        loadData();
    }, [meetingId]);
    

// MinutesTab.js içindeki handleGenerateCombinedPDF fonksiyonunu güncelleyin
// MinutesTab.js içinde handleGenerateCombinedPDF fonksiyonunu güncelleyin

// MinutesTab.js

// MinutesTab.js - handleGenerateCombinedPDF fonksiyonu

const handleGenerateCombinedPDF = async () => {
    setLoading(true);
    try {
        // Toplantı detaylarını al
        const meetingResponse = await axiosInstance.get(`/api/meetings/${meetingId}`);
        const meeting = meetingResponse.data;
        
        // Katılımcıları al
        const participantsResponse = await axiosInstance.get(`/api/meetings/${meetingId}/participants`);
        const participants = participantsResponse.data;

        // PDF blob'unu oluştur
        const blob = await pdf(
            <MeetingMinutesDocument 
                meeting={meeting}
                minutes={minutes}
                participants={participants}
            />
        ).toBlob();

        // FormData oluştur
        const formData = new FormData();
        const file = new File([blob], 'minutes.pdf', { type: 'application/pdf' });
        formData.append('document', file);

        // PDF'i kaydet
        const saveResponse = await axiosInstance.post(
            `/api/meetings/${meetingId}/documents/minutes`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );

        console.log('Save response:', saveResponse);

        // PDF'i indir
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `toplanti-tutanaklari-${meetingId}-${moment().format('YYYY-MM-DD')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);

        message.success('Toplantı tutanakları başarıyla indirildi ve kaydedildi');
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        message.error('PDF oluşturulurken bir hata oluştu: ' + error.response?.data?.details || error.message);
    } finally {
        setLoading(false);
    }
};

// MinutesTab.js
// MinutesTab.js
const handleSubmitMinute = async (values) => {
    try {
        const response = await axiosInstance.post(
            `/api/meetings/${meetingId}/minutes`,
            {
                agenda_item_id: selectedAgendaItem.id,
                content: values.content,
                actionItems: actionItems.map(item => ({
                    description: item.description,
                    assigned_to: item.assigned_to,
                    due_date: item.due_date,
                    priority: item.priority
                }))
            }
        );

        if (response.status === 201) {
            message.success('Tutanak başarıyla eklendi');
            setActionItems([]);
            setSelectedAgendaItem(null);
            minuteForm.resetFields();
            fetchMinutes();
        }
    } catch (error) {
        console.error('Error creating minute:', error);
        message.error('Tutanak eklenirken bir hata oluştu');
    }
};
    
const handleGenerateAndDownloadPDF = async (minute) => {
    try {
        setLoadingPdfId(minute.id);
        
        // Debug için
        console.log('Generating PDF for minute:', minute);
        console.log('Created by:', minute.created_by);
        console.log('Approved by:', minute.approved_by);

        const requests = [
            axiosInstance.get(`/api/meetings/${meetingId}`),
            axiosInstance.get(`/api/meetings/${meetingId}/agenda`),
            axiosInstance.get(`/api/meetings/${meetingId}/participants`)
        ];

        // Sadece geçerli ID'ler için istek yap
        if (minute.created_by) {
            requests.push(axiosInstance.get(`/api/personnel/${minute.created_by}/minutes-detail`));
        } else {
            requests.push(Promise.resolve({ data: null }));
        }

        if (minute.approved_by) {
            requests.push(axiosInstance.get(`/api/personnel/${minute.approved_by}/minutes-detail`));
        } else {
            requests.push(Promise.resolve({ data: null }));
        }

        const [
            meetingResponse,
            agendaResponse,
            participantsResponse,
            creatorResponse,
            approverResponse
        ] = await Promise.all(requests);

        const meeting = meetingResponse.data;
        const agendaItem = agendaResponse.data.find(item => item.id === minute.agenda_item_id);
        const participants = participantsResponse.data;
        const creator = creatorResponse?.data;
        const approver = approverResponse?.data;

        // Debug için
        console.log('Data collected:', {
            meeting,
            agendaItem,
            participants,
            creator,
            approver
        });

        const blob = await pdf(
            <MeetingMinutesPDF
                meeting={meeting}
                minute={minute}
                agendaItem={agendaItem || {}}
                actionItems={minute.action_items || []}
                participants={participants || []}
                creator={creator}
                approver={approver}
            />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `toplanti-tutanagi-${moment(meeting.start_time).format('YYYY-MM-DD')}-${agendaItem?.id || 'genel'}.pdf`;
        link.click();
        URL.revokeObjectURL(url);

        message.success('Tutanak başarıyla indirildi');
    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        console.error('Hata detayları:', error.response?.data);
        
        message.error(
            error.response?.data?.message || 
            'Tutanak oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.'
        );
    } finally {
        setLoadingPdfId(null);
    }
};
    const handleAddActionItem = (newItem) => {
        setActionItems(prev => [...prev, newItem]);
    };

    const handleRemoveActionItem = (index) => {
        setActionItems(prev => prev.filter((_, i) => i !== index));
    };

    const hasMinute = (agendaItemId) => {
        console.log('Checking minutes for agenda item:', agendaItemId, minutes);
        return minutes.some(minute => Number(minute.agenda_item_id) === Number(agendaItemId));
    };


    // MinutesTab.js içine eklenecek
const handleApproveMinute = async (minuteId) => {
    try {
        await axiosInstance.put(`/api/meetings/${meetingId}/minutes/${minuteId}/approve`);
        message.success('Tutanak onaylandı');
        fetchMinutes();
    } catch (error) {
        message.error('Tutanak onaylanırken bir hata oluştu');
    }
};


    // Tutanak görüntüleme kısmını güncelleyelim
const getPriorityTag = (priority) => {
    const config = {
        high: { color: 'red', text: 'Yüksek' },
        medium: { color: 'orange', text: 'Orta' },
        low: { color: 'green', text: 'Düşük' }
    };
    return config[priority] || { color: 'blue', text: priority || 'Bilinmiyor' };};




    return (
        <div>
            {/* Tüm tutanakları indir butonu en üstte olacak */}
            <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
                <Button
                    type="primary"
                    icon={<FileOutlined />}
                    onClick={handleGenerateCombinedPDF}
                    loading={loading}
                    style={{ width: 'auto' }} // Buton genişliğini içeriğe göre ayarla
                >
                    Tüm Tutanakları İndir
                </Button>
            </Space>
    
            <List
                dataSource={agendaItems}
                renderItem={item => (
                    <List.Item>
                        <Card 
                            style={{ width: '100%', marginBottom: 16 }}
                            title={
                                <Space>
                                    {item.agenda_item}
                                    {hasMinute(item.id) && 
                                        <Tag color="green">Tutanak Eklendi</Tag>
                                    }
                                </Space>
                            }
                        >
                            {!hasMinute(item.id) && canEdit && (
                                <Button 
                                    type="primary"
                                    onClick={() => setSelectedAgendaItem(item)}
                                >
                                    Tutanak Ekle
                                </Button>
                            )}
    
                            {minutes.filter(minute => minute.agenda_item_id === item.id).map(minute => (
                                <div key={minute.id}>
                                    <Divider>
                                        <Space>
                                            {/* Sadece onay butonu ve durumu göster */}
                                            {canEdit && minute.status === 'draft' && (
                                                <Button
                                                    type="primary"
                                                    icon={<CheckCircleOutlined />}
                                                    onClick={() => handleApproveMinute(minute.id)}
                                                    size="small"
                                                >
                                                    Onayla
                                                </Button>
                                            )}
                                            {minute.status === 'approved' && (
                                                <Tag color="green">
                                                    Onaylandı
                                                </Tag>
                                            )}
                                        </Space>
                                    </Divider>
    
                                    <Typography.Title level={5}>Kararlar:</Typography.Title>
                                    <Typography.Paragraph>{minute.content}</Typography.Paragraph>
    
                                    {minute.action_items?.length > 0 && (
                                        <>
                                            <Typography.Title level={5}>Yapılacak İşler:</Typography.Title>
                                            <List
                                                dataSource={minute.action_items?.filter(item => item !== null) || []}
                                                rowKey={record => record.id || Math.random()}
                                                renderItem={(action, index) => (
                                                    <List.Item key={`action-${index}`}>
                                                        <Space align="start" style={{ width: '100%' }}>
                                                            <Typography.Text>{index + 1}.</Typography.Text>
                                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                                <Typography.Text>{action.description}</Typography.Text>
                                                                <Space>
                                                                    <Tag color="blue" icon={<UserOutlined />}>
                                                                        Sorumlu: {personnel.find(p => p.id === action.assigned_to)?.first_name || 'Belirsiz'}
                                                                    </Tag>
                                                                    <Tag color="cyan" icon={<CalendarOutlined />}>
                                                                        Bitiş: {moment(action.due_date).format('DD.MM.YYYY')}
                                                                    </Tag>
                                                                    <Tag color={getPriorityTag(action.priority).color}>
                                                                        Öncelik: {getPriorityTag(action.priority).text}
                                                                    </Tag>
                                                                </Space>
                                                            </Space>
                                                        </Space>
                                                    </List.Item>
                                                )}
                                            />
                                        </>
                                    )}
                                </div>
                            ))}
                        </Card>
                    </List.Item>
                )}
            />

            <Modal
                title="Tutanak Ekle"
                open={selectedAgendaItem !== null}
                onCancel={() => {
                    setSelectedAgendaItem(null);
                    setActionItems([]);
                    minuteForm.resetFields();
                }}
                footer={null}
                width={800}
            >
                <Form
                    form={minuteForm}
                    layout="vertical"
                    onFinish={handleSubmitMinute}
                >
                    <Form.Item
                        name="content"
                        label="Kararlar"
                        rules={[{ required: true }]}
                    >
                        <TextArea rows={4} placeholder="Alınan kararları girin..." />
                    </Form.Item>

                    <Divider>Yapılacak İşler</Divider>

                    {actionItems.length > 0 && (
                        <List
                            style={{ marginBottom: 16 }}
                            dataSource={actionItems}
                            renderItem={(item, index) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="text"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleRemoveActionItem(index)}
                                        />
                                    ]}
                                >
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Typography.Text strong>{item.description}</Typography.Text>
                                        <Space>
                                            <Tag icon={<UserOutlined />}>
                                                {personnel.find(p => p.id === item.assigned_to)?.first_name}
                                            </Tag>
                                            <Tag icon={<CalendarOutlined />}>
                                                {item.due_date}
                                            </Tag>
                                        </Space>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    )}

                    <ActionItemForm onAdd={handleAddActionItem} personnel={personnel} />

                    <Form.Item style={{ marginTop: 24 }}>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Tutanağı Kaydet
                            </Button>
                            <Button onClick={() => {
                                setSelectedAgendaItem(null);
                                setActionItems([]);
                                minuteForm.resetFields();
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

export default MinutesTab;