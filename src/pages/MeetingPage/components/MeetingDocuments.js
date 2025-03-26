// components/MeetingDocuments.js
import React, { useState, useEffect } from 'react';
import { 
    Card, 
    List, 
    Button, 
    Space, 
    Tag, 
    message 
} from 'antd';
import { 
    FileOutlined, 
    DownloadOutlined, 
    ClockCircleOutlined 
} from '@ant-design/icons';
import moment from 'moment';
import axios from 'axios';

const MeetingDocuments = ({ meetingId }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(`/api/meetings/${meetingId}/documents`);
            setDocuments(response.data);
        } catch (error) {
            message.error('Dokümanlar yüklenirken bir hata oluştu');
        }
    };

    const handleDownload = async (documentId) => {
        try {
            const response = await axios.get(
                `/api/meetings/documents/${documentId}/download`,
                { responseType: 'blob' }
            );
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'document.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            message.error('Doküman indirilirken bir hata oluştu');
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [meetingId]);

    return (
        <Card title="Toplantı Dokümanları">
            <List
                loading={loading}
                dataSource={documents}
                renderItem={doc => (
                    <List.Item
                        actions={[
                            <Button 
                                type="primary" 
                                icon={<DownloadOutlined />}
                                onClick={() => handleDownload(doc.id)}
                            >
                                İndir
                            </Button>
                        ]}
                    >
                        <List.Item.Meta
                            title={
                                <Space>
                                    <FileOutlined />
                                    {doc.document_type === 'agenda' ? 'Gündem' : 'Tutanak'}
                                    <Tag color="blue">v{doc.version}</Tag>
                                </Space>
                            }
                            description={
                                <Space direction="vertical" size={0}>
                                    <span>Oluşturan: {doc.created_by_name}</span>
                                    <span>
                                        <ClockCircleOutlined /> {' '}
                                        {moment(doc.created_at).format('DD.MM.YYYY HH:mm')}
                                    </span>
                                </Space>
                            }
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
};

export default MeetingDocuments;