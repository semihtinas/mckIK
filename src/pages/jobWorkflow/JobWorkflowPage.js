import React, { useState, useEffect } from 'react';
import { 
    Table, 
    Button, 
    Modal, 
    Form, 
    Input, 
    Select, 
    DatePicker, 
    Tag, 
    Spin, 
    message,
    Card, 
    Row, 
    Col, 
    Space,
    Badge,
    Progress,
    Tooltip
} from 'antd';
import { 
    EditOutlined, 
    EyeOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import StatisticsCards from './components/StatisticsCards';
import TaskDetail from './components/TaskDetail';


const { Option } = Select;
const { RangePicker } = DatePicker;

const JobWorkflowPage = () => {
    const [tasks, setTasks] = useState([]);
    const [subtasks, setSubtasks] = useState({});  // key: taskId, value: subtask array
    const [expandedRows, setExpandedRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [filters, setFilters] = useState({
        priority: 'all',
        status: 'all',
        dateRange: null,
        search: ''
    });
    const [form] = Form.useForm();
    const [selectedTask, setSelectedTask] = useState(null);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [statisticsKey, setStatisticsKey] = useState(0); // Yeni state ekle


       // Filtre resetleme
       const handleResetFilters = () => {
        setFilters({
            priority: 'all',
            status: 'all',
            dateRange: null,
            search: ''
        });
    };
 
   
    // Filtreleme bölümü
    const renderFilters = () => (
        <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
                <Input
                    placeholder="Arama..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    allowClear
                />
            </Col>
            <Col span={6}>
                <Select
                    value={filters.priority}
                    onChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}
                    placeholder="Öncelik Filtresi"
                    style={{ width: '100%' }}
                >
                    <Option value="all">Tüm Öncelikler</Option>
                    <Option value="High">Yüksek</Option>
                    <Option value="Medium">Orta</Option>
                    <Option value="Low">Düşük</Option>
                </Select>
            </Col>
            <Col span={6}>
                <Select
                    value={filters.status}
                    onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                    placeholder="Durum Filtresi"
                    style={{ width: '100%' }}
                >
                    <Option value="all">Tüm Durumlar</Option>
                    <Option value="pending">Beklemede</Option>
                    <Option value="completed">Tamamlandı</Option>
                </Select>
            </Col>
            <Col span={6}>
                <Space>
                    <RangePicker
                        value={filters.dateRange}
                        onChange={(dates) => setFilters((prev) => ({ ...prev, dateRange: dates }))}
                        style={{ width: '100%' }}
                    />
                    <Button onClick={handleResetFilters}>Sıfırla</Button>
                </Space>
            </Col>
        </Row>
    );

// Add fetchTasks function
// fetchTasks fonksiyonunu güncelleyelim
const fetchTasks = async () => {
    setIsLoading(true);
    try {
        const queryParams = [];
        if (filters.priority !== 'all') queryParams.push(`priority=${filters.priority}`);
        if (filters.status !== 'all') queryParams.push(`status=${filters.status}`);
        if (filters.dateRange) {
            queryParams.push(`startDate=${filters.dateRange[0].format('YYYY-MM-DD')}`);
            queryParams.push(`endDate=${filters.dateRange[1].format('YYYY-MM-DD')}`);
        }
        if (filters.search) queryParams.push(`search=${filters.search}`);

        const queryString = queryParams.length ? `?${queryParams.join('&')}` : '';
        const response = await axios.get(
            `http://localhost:5001/api/workflow/tasks${queryString}`,
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        
        setTasks(response.data);

        // Tüm görevlerin alt görevlerini getir
        const fetchAllSubtasks = response.data.map(task => 
            axios.get(
                `http://localhost:5001/api/workflow/tasks/${task.id}/subtasks`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            )
        );

        const subtaskResponses = await Promise.all(fetchAllSubtasks);
        const newSubtasks = {};
        
        response.data.forEach((task, index) => {
            newSubtasks[task.id] = subtaskResponses[index].data;
        });

        setSubtasks(newSubtasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        message.error('Görevler yüklenirken bir hata oluştu');
    } finally {
        setIsLoading(false);
    }
};



     // Alt görevleri getir
     const fetchSubtasks = async (taskId) => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/tasks/${taskId}/subtasks`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setSubtasks(prev => ({
                ...prev,
                [taskId]: response.data
            }));
        } catch (error) {
            console.error('Alt görevler alınırken hata oluştu:', error);
        }
    };

    // Genişletilen satır render fonksiyonu
    const expandedRowRender = (task) => {
        const subtaskColumns = [
            { 
                title: 'Açıklama', 
                dataIndex: 'description', 
                key: 'description' 
            },
            { 
                title: 'Atanan Kişi', 
                dataIndex: 'assigned_to_name', 
                key: 'assigned_to_name',
                render: (text) => text || 'Atanmamış'
            },
            {
                title: 'Bitiş Tarihi',
                dataIndex: 'due_date',
                key: 'due_date',
                render: (date) => date ? moment(date).format('DD.MM.YYYY') : '-'
            },
            {
                title: 'Durum',
                dataIndex: 'status',
                key: 'status',
                render: (status) => (
                    <Tag color={status === 'completed' ? 'green' : 'gold'}>
                        {status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                    </Tag>
                )
            }
        ];

        return (
            <Table
                columns={subtaskColumns}
                dataSource={subtasks[task.id] || []}
                pagination={false}
                rowKey="id"
            />
        );
    };

    // Alt görev sayısı ve ilerleme durumunu hesapla
    const getTaskProgress = (taskId) => {
        const taskSubtasks = subtasks[taskId] || [];
        if (taskSubtasks.length === 0) return null;

        const completed = taskSubtasks.filter(st => st.status === 'completed').length;
        return {
            total: taskSubtasks.length,
            completed,
            percentage: Math.round((completed / taskSubtasks.length) * 100)
        };
    };


      // Add handleSave function
      const handleSave = async (values) => {
        try {
            const token = localStorage.getItem('token');
            const updatedTask = {
                ...editingTask,
                ...values,
                due_date: values.due_date.format('YYYY-MM-DD'),
            };

            await axios.put(
                `http://localhost:5001/api/workflow/tasks/${editingTask.id}`,
                updatedTask,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            message.success('Görev başarıyla güncellendi!');
            fetchTasks();
            setStatisticsKey(prev => prev + 1);
            setIsModalVisible(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Error updating task:', error);
            message.error('Görev güncellenirken bir hata oluştu');
        }
    };

    // Add useEffect for initial fetch
    useEffect(() => {
        fetchTasks();
    }, [filters]);

    const columns = [
        { 
            title: 'Görev Açıklaması', 
            dataIndex: 'description', 
            key: 'description',
            render: (text, record) => (
                <Space direction="vertical" size={0}>
                    <span>{text}</span>
                    {getTaskProgress(record.id) && (
                        <Progress 
                            percent={getTaskProgress(record.id).percentage}
                            size="small" 
                            style={{ marginTop: 8, width: 120 }}
                        />
                    )}
                </Space>
            )
        },
        { 
            title: 'Alt Görevler', 
            key: 'subtasks',
            width: 120,
            render: (_, record) => {
                const progress = getTaskProgress(record.id);
                return progress ? (
                    <Tooltip title={`${progress.completed}/${progress.total} tamamlandı`}>
                        <Badge 
                            count={progress.total} 
                            style={{ 
                                backgroundColor: progress.percentage === 100 ? '#52c41a' : '#1890ff'
                            }}
                        />
                    </Tooltip>
                ) : '-';
            }
        },
        { 
            title: 'Atanan Kişi', 
            dataIndex: 'assigned_to_name', 
            key: 'assigned_to_name' 
        },
        { 
            title: 'Bitiş Tarihi', 
            dataIndex: 'due_date', 
            key: 'due_date',
            render: (date) => moment(date).format('DD.MM.YYYY'),
            sorter: (a, b) => moment(a.due_date).unix() - moment(b.due_date).unix(),
        },
        {
            title: 'Öncelik',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority) => (
                <Tag color={
                    priority === 'High' ? 'red' : 
                    priority === 'Medium' ? 'orange' : 
                    'blue'
                }>
                    {priority}
                </Tag>
            ),
            sorter: (a, b) => a.priority.localeCompare(b.priority),
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag icon={status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                    color={status === 'completed' ? 'green' : 'orange'}>
                    {status === 'completed' ? 'Tamamlandı' : 'Beklemede'}
                </Tag>
            ),
            sorter: (a, b) => a.status.localeCompare(b.status),
        },
        {
            title: 'İşlemler',
            key: 'actions',
            render: (_, task) => (
                <Space>
                    <Button 
                        onClick={() => {
                            setSelectedTask(task);
                            setIsDetailModalVisible(true);
                        }}
                        type="primary"
                        icon={<EyeOutlined />}
                    >
                        Detaylar
                    </Button>
                </Space>
            ),
        }
    ];

    // Satır genişletildiğinde alt görevleri getir
    const handleExpand = (expanded, record) => {
        // Alt görevler zaten yüklenmiş olduğu için tekrar yüklemeye gerek yok
        if (expanded) {
            setExpandedRows(prev => [...prev, record.id]);
        } else {
            setExpandedRows(prev => prev.filter(id => id !== record.id));
        }
    };

    return (
        <div>
            <h2>İş Takibi</h2>
            <StatisticsCards key={statisticsKey} />
            
            {/* Filters */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Input
                        placeholder="Arama..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        allowClear
                    />
                </Col>
                <Col span={6}>
                    <Select
                        value={filters.priority}
                        onChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}
                        placeholder="Öncelik Filtresi"
                        style={{ width: '100%' }}
                    >
                        <Option value="all">Tüm Öncelikler</Option>
                        <Option value="High">Yüksek</Option>
                        <Option value="Medium">Orta</Option>
                        <Option value="Low">Düşük</Option>
                    </Select>
                </Col>
                <Col span={6}>
                    <Select
                        value={filters.status}
                        onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                        placeholder="Durum Filtresi"
                        style={{ width: '100%' }}
                    >
                        <Option value="all">Tüm Durumlar</Option>
                        <Option value="pending">Beklemede</Option>
                        <Option value="completed">Tamamlandı</Option>
                    </Select>
                </Col>
                <Col span={6}>
                    <Space>
                        <RangePicker
                            value={filters.dateRange}
                            onChange={(dates) => setFilters(prev => ({ ...prev, dateRange: dates }))}
                            style={{ width: '100%' }}
                        />
                        <Button onClick={() => setFilters({
                            priority: 'all',
                            status: 'all',
                            dateRange: null,
                            search: ''
                        })}>Sıfırla</Button>
                    </Space>
                </Col>
            </Row>

            {/* Task Table */}
            {isLoading ? (
    <Spin size="large" />
) : (
    <Table 
        columns={columns} 
        dataSource={tasks} 
        rowKey="id"
        expandable={{
            expandedRowRender,
            onExpand: handleExpand,
        }}
    />
)}

            {/* Edit Modal */}
            <Modal
                title="Görev Düzenle"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                    initialValues={{
                        description: editingTask?.description,
                        priority: editingTask?.priority,
                        due_date: editingTask?.due_date ? moment(editingTask.due_date) : null,
                        status: editingTask?.status,
                    }}
                >
                    <Form.Item
                        name="description"
                        label="Açıklama"
                        rules={[{ required: true, message: 'Açıklama gereklidir' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="priority"
                        label="Öncelik"
                        rules={[{ required: true, message: 'Öncelik gereklidir' }]}
                    >
                        <Select>
                            <Option value="High">Yüksek</Option>
                            <Option value="Medium">Orta</Option>
                            <Option value="Low">Düşük</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item
                        name="due_date"
                        label="Bitiş Tarihi"
                        rules={[{ required: true, message: 'Bitiş tarihi gereklidir' }]}
                    >
                        <DatePicker />
                    </Form.Item>
                    <Form.Item
                        name="status"
                        label="Durum"
                        rules={[{ required: true, message: 'Durum gereklidir' }]}
                    >
                        <Select>
                            <Option value="pending">Beklemede</Option>
                            <Option value="completed">Tamamlandı</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title="Görev Detayları"
                open={isDetailModalVisible}
                onCancel={() => {
                    setIsDetailModalVisible(false);
                    setSelectedTask(null);
                }}
                width={800}
                footer={null}
            >
                {selectedTask && (
                    <TaskDetail 
                        task={selectedTask} 
                        onUpdate={() => {
                            fetchTasks();
                            setIsDetailModalVisible(false);
                            setSelectedTask(null);
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default JobWorkflowPage;