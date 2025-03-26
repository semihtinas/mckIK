import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Card, 
    Table, 
    Button, 
    Space, 
    Tag, 
    Input, 
    DatePicker, 
    Modal, 
    message,
    Row,
    Col,
    Select,
    Tabs
} from 'antd';
import { 
    PlusOutlined, 
    SearchOutlined, 
    FilterOutlined,
    TeamOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import MeetingForm from './components/MeetingForm';

const { RangePicker } = DatePicker;
const { Option } = Select;

const MeetingsPage = () => {
    const navigate = useNavigate();

    // State tanımları
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        dateRange: null,
        search: '',
        type: 'all'
    });
    const [meetingDocuments, setMeetingDocuments] = useState([]);
    const [documentsLoading, setDocumentsLoading] = useState(false);
    const [documentFilters, setDocumentFilters] = useState({
        dateRange: null,
        search: '',
        documentType: 'all',
    });

    // Axios instance
    const axiosInstance = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
        }
    });



    // Fetch toplantılar
    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const queryParams = [];
            if (filters.status !== 'all') queryParams.push(`status=${filters.status}`);
            if (filters.dateRange) {
                queryParams.push(`startDate=${filters.dateRange[0].format('YYYY-MM-DD')}`);
                queryParams.push(`endDate=${filters.dateRange[1].format('YYYY-MM-DD')}`);
            }
            if (filters.search) queryParams.push(`search=${filters.search}`);
            if (filters.type !== 'all') queryParams.push(`type=${filters.type}`);

            const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
            const response = await axiosInstance.get(`/api/meetings${queryString}`);
            setMeetings(response.data);
        } catch (error) {
            console.error('Error fetching meetings:', error);
            message.error('Toplantılar yüklenirken bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

  

    
    const fetchMeetingDocuments = async () => {
        setDocumentsLoading(true);
        try {
            const params = {};
            if (documentFilters.dateRange) {
                params.startDate = documentFilters.dateRange[0].format('YYYY-MM-DD');
                params.endDate = documentFilters.dateRange[1].format('YYYY-MM-DD');
            }
            if (documentFilters.search) params.search = documentFilters.search;
            if (documentFilters.documentType !== 'all') params.documentType = documentFilters.documentType;
    
            console.log('Fetching documents with params:', params);
    
            const response = await axiosInstance.get('/api/meetings/documents', { params });
            console.log('API response data:', response.data);
    
            setMeetingDocuments(response.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
            message.error('Dokümanlar yüklenirken bir hata oluştu');
        } finally {
            setDocumentsLoading(false);
        }
    };
    
    

    useEffect(() => {
        fetchMeetings();
    }, [filters]);
    


    useEffect(() => {
        fetchMeetingDocuments();
    }, [documentFilters]); // Bu doğru bir şekilde eklenmiş olmalı
    
    
    useEffect(() => {
        fetchMeetings();
        fetchMeetingDocuments();
    }, []);

    
    // Doküman indirme fonksiyonu
    const handleDownloadDocument = async (documentId, fileName) => {
        try {
            const response = await axiosInstance.get(`/api/meetings/documents/${documentId}/download`, {
                responseType: 'blob'
            });
    
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName || 'document.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading document:', error);
            message.error('Doküman indirilirken bir hata oluştu');
        }
    };
    
    

    // Toplantı kolonları
    const meetingColumns = [
        {
            title: 'Başlık',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <a onClick={() => navigate(`/meetings/${record.id}`)}>{text}</a>
            )
        },
        {
            title: 'Tür',
            dataIndex: 'meeting_type',
            key: 'meeting_type',
            render: type => {
                const typeConfig = {
                    regular: { color: 'blue', text: 'Rutin' },
                    emergency: { color: 'red', text: 'Acil' },
                    board: { color: 'purple', text: 'Yönetim' }
                };
                return <Tag color={typeConfig[type]?.color}>{typeConfig[type]?.text || type}</Tag>;
            },
            sorter: (a, b) => a.meeting_type.localeCompare(b.meeting_type),

        },
        {
            title: 'Tarih',
            dataIndex: 'start_time',
            key: 'start_time',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <div>{moment(text).format('DD.MM.YYYY')}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {`${moment(text).format('HH:mm')} - ${moment(record.end_time).format('HH:mm')}`}
                    </div>
                </Space>
            ),
            sorter: (a, b) => moment(a.start_time).unix() - moment(b.start_time).unix(),

        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                const statusConfig = {
                    planned: { color: 'blue', text: 'Planlandı' },
                    in_progress: { color: 'green', text: 'Devam Ediyor' },
                    completed: { color: 'purple', text: 'Tamamlandı' },
                    cancelled: { color: 'red', text: 'İptal Edildi' }
                };
                return <Tag color={statusConfig[status]?.color}>{statusConfig[status]?.text}</Tag>;
            },
            sorter: (a, b) => a.status.localeCompare(b.status),

        },
        {
            title: 'Organizatör',
            dataIndex: 'organizer_name',
            key: 'organizer_name'
        },
        {
            title: 'Katılımcılar',
            key: 'participants',
            render: (_, record) => (
                <Tag icon={<TeamOutlined />}>
                    {record.participants?.length || 0} Kişi
                </Tag>
            )
        }
    ];

    // Doküman kolonları
    const documentColumns = [
        {
            title: 'Toplantı',
            dataIndex: 'meeting_title',
            key: 'meeting_title',
            render: (text, record) => (
                <a onClick={() => navigate(`/meetings/${record.meeting_id}`)}>{text}</a>
            ),
            sorter: (a, b) => a.meeting_title.localeCompare(b.meeting_title),
        },
        {
            title: 'Doküman Tipi',
            dataIndex: 'document_type',
            key: 'document_type',
            render: type => {
                const types = {
                    agenda: { color: 'blue', text: 'Gündem' },
                    minutes: { color: 'green', text: 'Tutanak' }
                };
                return <Tag color={types[type]?.color}>{types[type]?.text}</Tag>;
            },
            filters: [
                { text: 'Gündem', value: 'agenda' },
                { text: 'Tutanak', value: 'minutes' },
            ],
            onFilter: (value, record) => record.document_type === value,
        },
        {
            title: 'Oluşturma Tarihi',
            dataIndex: 'created_at',
            key: 'created_at',
            render: date => moment(date).format('DD.MM.YYYY HH:mm'),
            sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
        },
        {
            title: 'Oluşturan',
            dataIndex: 'created_by_name',
            key: 'created_by_name',
            sorter: (a, b) => a.created_by_name.localeCompare(b.created_by_name),
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadDocument(record.id, record.file_name)}
                    >
                        İndir
                    </Button>
                </Space>
            )
        }
    ];

    

    const tabItems = [
        {
            key: 'meetings',
            label: 'Toplantılar',
            children: (
                <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={8}>
                            <Input
                                prefix={<SearchOutlined />}
                                placeholder="Toplantı Ara..."
                                value={filters.search}
                                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                allowClear
                            />
                        </Col>
                        <Col span={6}>
                            <Select
                                style={{ width: '100%' }}
                                value={filters.status}
                                onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                                placeholder="Durum Filtrele"
                            >
                                <Option value="all">Tüm Durumlar</Option>
                                <Option value="planned">Planlandı</Option>
                                <Option value="in_progress">Devam Ediyor</Option>
                                <Option value="completed">Tamamlandı</Option>
                                <Option value="cancelled">İptal Edildi</Option>
                            </Select>
                        </Col>
                        <Col span={6}>
                            <RangePicker
                                style={{ width: '100%' }}
                                value={filters.dateRange}
                                onChange={dates => setFilters(prev => ({ ...prev, dateRange: dates }))}
                                placeholder={['Başlangıç', 'Bitiş']}
                            />
                        </Col>
                        <Col span={4}>
                            <Space>
                                <Button 
                                    type="primary" 
                                    icon={<PlusOutlined />}
                                    onClick={() => setIsModalVisible(true)}
                                >
                                    Yeni Toplantı
                                </Button>
                                <Button
                                    icon={<FilterOutlined />}
                                    onClick={() => setFilters({
                                        status: 'all',
                                        dateRange: null,
                                        search: '',
                                        type: 'all'
                                    })}
                                >
                                    Sıfırla
                                </Button>
                            </Space>
                        </Col>
                    </Row>
                    <Table
                        columns={meetingColumns}
                        dataSource={meetings}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            showSizeChanger: true,
                            showTotal: (total, range) => 
                                `${range[0]}-${range[1]} / ${total} toplantı`,
                            defaultPageSize: 10,
                            pageSizeOptions: ['10', '20', '50']
                        }}
                    />
                </>
            )
        },
// Dokümanlar sekmesi
{
    key: 'documents',
    label: 'Dokümanlar',
    children: (
        <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={8}>
                    <Input
                        prefix={<SearchOutlined />}
                        placeholder="Doküman Ara..."
                        value={documentFilters.search}
                        onChange={e => setDocumentFilters(prev => ({ ...prev, search: e.target.value }))}
                        allowClear
                    />
                </Col>
                <Col span={6}>
                    <Select
                        style={{ width: '100%' }}
                        value={documentFilters.documentType}
                        onChange={value => setDocumentFilters(prev => ({ ...prev, documentType: value }))}
                        placeholder="Doküman Tipi Filtrele"
                    >
                        <Option value="all">Tüm Doküman Tipleri</Option>
                        <Option value="agenda">Gündem</Option>
                        <Option value="minutes">Tutanak</Option>
                    </Select>
                </Col>
                <Col span={6}>
                    <RangePicker
                        style={{ width: '100%' }}
                        value={documentFilters.dateRange}
                        onChange={dates => setDocumentFilters(prev => ({ ...prev, dateRange: dates }))}
                        placeholder={['Başlangıç', 'Bitiş']}
                    />
                </Col>
                <Col span={4}>
                    <Button
                        icon={<FilterOutlined />}
                        onClick={() => setDocumentFilters({
                            dateRange: null,
                            search: '',
                            documentType: 'all',
                        })}
                    >
                        Sıfırla
                    </Button>
                </Col>
            </Row>
            <Table
    columns={documentColumns}
    dataSource={meetingDocuments} // Bu state doğru güncellenmeli
    rowKey="id"
    loading={documentsLoading}
    pagination={{
        showSizeChanger: true,
        showTotal: (total, range) =>
            `${range[0]}-${range[1]} / ${total} doküman`,
        defaultPageSize: 10,
        pageSizeOptions: ['10', '20', '50']
    }}
/>
        </>
    )
}
    ];

    return (
        <div>
            <Card>
                <Tabs items={tabItems} />
            </Card>
            <Modal
                title="Yeni Toplantı"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={800}
            >
                <MeetingForm
                    onSuccess={() => {
                        setIsModalVisible(false);
                        fetchMeetings();
                        message.success('Toplantı başarıyla oluşturuldu');
                    }}
                />
            </Modal>
        </div>
    );
};

export default MeetingsPage;
