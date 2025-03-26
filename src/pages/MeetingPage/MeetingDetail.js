import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Card, 
    Tabs, 
    Steps, 
    Button, 
    Space, 
    Tag, 
    Descriptions, 
    message,
    Row,
    Col,
    Modal
} from 'antd';
import {
    CalendarOutlined,
    TeamOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    EditOutlined,
    ClockCircleOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import axios from 'axios'; // Axios'u import ettik
import moment from 'moment';

import AgendaTab from './components/AgendaTab';
import ParticipantsTab from './components/ParticipantsTab';
import MinutesTab from './components/MinutesTab';
import MeetingForm from './components/MeetingForm';
import { DownloadAgendaPDF } from './components/MeetingAgendaPDF';
import { DownloadAgendaPDFButton } from './components/MeetingAgendaPDF';
import { 
    DownloadOutlined,
    FileOutlined 
} from '@ant-design/icons';
import { pdf } from '@react-pdf/renderer';
import { MeetingAgendaPDF } from './components/MeetingAgendaPDF'; // Bunu ekleyin




const { TabPane } = Tabs;

const items = [ // Tabs warning'i için items ekledik
    {
        key: '1',
        label: <span><FileTextOutlined />Gündem</span>,
        children: <AgendaTab />
    },
    {
        key: '2',
        label: <span><TeamOutlined />Katılımcılar</span>,
        children: <ParticipantsTab />
    },
    {
        key: '3',
        label: <span><FileTextOutlined />Tutanak</span>,
        children: <MinutesTab />
    }
];
const MeetingDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [agendaItems, setAgendaItems] = useState([]);
    const [generatedPdf, setGeneratedPdf] = useState(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


    // Axios instance oluşturalım
    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });
   // Toplantı durumlarına göre workflow adımları
   const steps = [
    {
        title: 'Planlama',
        description: 'Gündem ve katılımcıların belirlenmesi',
        status: meeting?.status === 'planned' ? 'process' : 'finish'
    },
    {
        title: 'Başlatıldı',
        description: 'Toplantı devam ediyor',
        status: meeting?.status === 'in_progress' ? 'process' : 
               meeting?.status === 'completed' ? 'finish' : 'wait'
    },
    {
        title: 'Tamamlandı',
        description: 'Toplantı tutanakları ve görevler',
        status: meeting?.status === 'completed' ? 'finish' : 'wait'
    }
];

useEffect(() => {
    if (id) {
        fetchMeetingDetails();
        fetchAgendaItems(); // Gündem maddelerini getir
    }
}, [id]);


const fetchAgendaItems = async () => {
    try {
        const response = await axiosInstance.get(`/api/meetings/${id}/agenda`);
        setAgendaItems(response.data);
    } catch (error) {
        message.error('Gündem maddeleri yüklenirken bir hata oluştu');
    }
};

const fetchMeetingDetails = async () => {
    try {
        const response = await axiosInstance.get(`/api/meetings/${id}`);
        setMeeting(response.data);
        updateCurrentStep(response.data.status);
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        message.error('Toplantı detayları yüklenirken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};

    const updateCurrentStep = (status) => {
        switch (status) {
            case 'planned':
                setCurrentStep(0);
                break;
            case 'in_progress':
                setCurrentStep(1);
                break;
            case 'completed':
                setCurrentStep(2);
                break;
            default:
                setCurrentStep(0);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            const response = await axiosInstance.put(`/api/meetings/${id}/status`, { 
                status: newStatus 
            });
            
            message.success('Toplantı durumu güncellendi');
            // Toplantı detaylarını yenile
            fetchMeetingDetails();
        } catch (error) {
            console.error('Error updating meeting status:', error);
            message.error('Toplantı durumu güncellenirken bir hata oluştu');
        }
    };

    const canEditMeeting = () => {
        // Burada yetkilendirme kontrolü yapılabilir
        return meeting?.status === 'planned';
    };

    const canStartMeeting = () => {
        return meeting?.status === 'planned' && agendaItems?.length > 0;
    };

    const canCompleteMeeting = () => {
        return meeting?.status === 'in_progress';
    };


 // MeetingDetail.js içinde handleGenerateAndDownloadPDF fonksiyonunu güncelleyin

 const handleGenerateAndDownloadPDF = async () => {
    try {
        setIsGeneratingPdf(true);
        
        // Güncel verileri çek
        const agendaResponse = await axiosInstance.get(`/api/meetings/${id}/agenda`);
        const meetingResponse = await axiosInstance.get(`/api/meetings/${id}`);
        
        // Doğrudan API yanıtlarını kullan
        const currentMeeting = meetingResponse.data;
        const currentAgendaItems = agendaResponse.data;

        // PDF blob'unu oluştur
        const blob = await pdf(
            <MeetingAgendaPDF 
                meeting={currentMeeting} 
                agendaItems={currentAgendaItems} 
            />
        ).toBlob();

        // FormData oluştur
        const formData = new FormData();
        const file = new File([blob], 'agenda.pdf', { type: 'application/pdf' });
        formData.append('document', file);

        // PDF'i kaydet
        const saveResponse = await axiosInstance.post(
            `/api/meetings/${id}/documents/agenda`,
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
        link.download = `toplanti-gundemi-${moment(currentMeeting.start_time).format('YYYY-MM-DD')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        
        // State'leri güncelle
        setMeeting(currentMeeting);
        setAgendaItems(currentAgendaItems);
        
        message.success('Gündem başarıyla indirildi ve kaydedildi');
    } catch (error) {
        console.error('PDF error:', error);
        message.error('Gündem oluşturulurken bir hata oluştu: ' + error.message);
    } finally {
        setIsGeneratingPdf(false);
    }
};

    const renderMeetingHeader = () => (
        <Card>
            <Row gutter={[24, 24]}>
                <Col span={16}>
                    <Descriptions title="Toplantı Bilgileri" bordered>
                        <Descriptions.Item label="Başlık" span={3}>
                            {meeting?.title}
                        </Descriptions.Item>
                        <Descriptions.Item label="Durum">
                            <Tag color={
                                meeting?.status === 'planned' ? 'blue' :
                                meeting?.status === 'in_progress' ? 'green' :
                                'purple'
                            }>
                                {meeting?.status === 'planned' ? 'Planlandı' :
                                 meeting?.status === 'in_progress' ? 'Devam Ediyor' :
                                 'Tamamlandı'}
                            </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Tarih" span={2}>
                            {moment(meeting?.start_time).format('DD.MM.YYYY HH:mm')} - 
                            {moment(meeting?.end_time).format('HH:mm')}
                        </Descriptions.Item>
                        <Descriptions.Item label="Konum" span={3}>
                            {meeting?.location || 'Belirtilmedi'}
                        </Descriptions.Item>
                    </Descriptions>
                </Col>
                <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        {canEditMeeting() && (
                            <Button 
                                type="primary" 
                                icon={<EditOutlined />}
                                onClick={() => setIsEditModalVisible(true)}
                                block
                            >
                                Düzenle
                            </Button>
                        )}
{canStartMeeting() && (
    <Space direction="vertical" style={{ width: '100%' }}>
        <Button
            type="primary"
            icon={<FileOutlined />}
            onClick={handleGenerateAndDownloadPDF}
            loading={isGeneratingPdf}
            block
        >
            Gündemi İndir
        </Button>
        
        <Button 
            type="primary" 
            icon={<ClockCircleOutlined />}
            onClick={() => handleStatusChange('in_progress')}
            block
        >
            Toplantıyı Başlat
        </Button>
    </Space>
)}
                        
                        {canCompleteMeeting() && (
                            <Button 
                                type="primary" 
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleStatusChange('completed')}
                                block
                            >
                                Toplantıyı Tamamla
                            </Button>
                        )}
                    </Space>
                </Col>
            </Row>
        </Card>
    );

    if (loading) {
        return <Card loading />;
    }

    return (
        <div>
            {renderMeetingHeader()}

            <Card style={{ marginTop: 16 }}>
                <Steps 
                    current={currentStep} 
                    items={steps}
                    style={{ marginBottom: 24 }}
                />

<Tabs 
    defaultActiveKey="1"
    items={items.map(item => ({
        ...item,
        children: React.cloneElement(item.children, {
            meetingId: id,
            // Her tab için farklı canEdit koşulu tanımlanıyor
            canEdit: item.key === '1' // Gündem
                ? meeting?.status === 'planned' // Sadece 'planned' durumunda düzenlenebilir
                : item.key === '3' // Tutanak
                ? meeting?.status === 'in_progress' // Sadece 'in_progress' durumunda düzenlenebilir
                : false, // Diğer tablar düzenlenemez
            onUpdate: fetchMeetingDetails
        })
    }))}
                />
            </Card>

            <Modal
                title="Toplantı Düzenle"
                open={isEditModalVisible}
                onCancel={() => setIsEditModalVisible(false)}
                footer={null}
                width={800}
            >
                <MeetingForm
                    meeting={meeting}
                    onSuccess={() => {
                        setIsEditModalVisible(false);
                        fetchMeetingDetails();
                    }}
                />
            </Modal>
        </div>
    );
};

export default MeetingDetail;