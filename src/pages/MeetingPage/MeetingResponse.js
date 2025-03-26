import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, Result, Button, Space, Spin, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

// Özel axios instance
const publicAxios = axios.create({
    baseURL: 'http://localhost:5001',
});


const MeetingResponse = () => {
    const { meetingId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [meeting, setMeeting] = useState(null);
    const [error, setError] = useState(null);
    const [responseSubmitted, setResponseSubmitted] = useState(false);

    const response = searchParams.get('response');
    const token = searchParams.get('token');


    // useEffect'i düzenleyelim
useEffect(() => {
    if (response && token && !responseSubmitted) {
        handleResponse();
        fetchMeetingDetails();
    }
}, []); // Sadece bir kere çalışsın

    const handleResponse = async () => {
        if (!response || !token || responseSubmitted) {
            return;
        }
    
        try {
            setLoading(true);
                
            const result = await publicAxios.put(`/api/public/meetings/${meetingId}/respond`, {
                response,
                token
            });
    
            if (result.data.success) {
                if (!result.data.message?.includes('already')) {
                    message.success('Yanıtınız başarıyla kaydedildi');
                }
                setResponseSubmitted(true);
            }
        } catch (error) {
            console.error('Error details:', error.response?.data);
            setError(
                error.response?.data?.details || 
                error.response?.data?.error || 
                'Yanıtınız kaydedilirken bir hata oluştu'
            );
        } finally {
            setLoading(false);
        }
    };

// fetchMeetingDetails fonksiyonunu da sadece bir kere çalıştıracak şekilde düzenleyelim
const fetchMeetingDetails = async () => {
    if (meeting) return; // Eğer meeting zaten varsa tekrar çağırma

    try {
        const result = await publicAxios.get(`/api/public/meetings/${meetingId}`);
        setMeeting(result.data);
    } catch (error) {
        console.error('Error fetching meeting details:', error);
        setError('Toplantı bilgileri alınamadı');
    } finally {
        setLoading(false);
    }
};



    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error) {
        return (
            <Result
                status="error"
                title="Bir hata oluştu"
                subTitle={error}
                extra={[
                    <Button type="primary" key="login" onClick={() => window.location.href = '/login'}>
                        Giriş Yap
                    </Button>
                ]}
            />
        );
    }

    return (
        <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
            <Card>
                {response === 'accepted' ? (
                    <Result
                        icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        title="Toplantıya katılımınız onaylandı"
                        subTitle={meeting ? `${meeting.title} toplantısına katılacağınızı bildirdiniz.` : 'Yanıtınız kaydedildi.'}
                        extra={[
                            <Button 
                                type="primary" 
                                key="login"
                                onClick={() => window.location.href = '/login'}
                            >
                                Giriş Yap
                            </Button>
                        ]}
                    />
                ) : (
                    <Result
                        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        title="Toplantıya katılamayacağınız bildirildi"
                        subTitle={meeting ? `${meeting.title} toplantısına katılamayacağınızı bildirdiniz.` : 'Yanıtınız kaydedildi.'}
                        extra={[
                            <Button 
                                key="login" 
                                onClick={() => window.location.href = '/login'}
                            >
                                Giriş Yap
                            </Button>
                        ]}
                    />
                )}
            </Card>
        </div>
    );
};

export default MeetingResponse;