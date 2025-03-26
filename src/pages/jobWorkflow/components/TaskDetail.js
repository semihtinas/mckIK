import React, { useState, useEffect } from 'react';
import { 
    Card, 
    Timeline, 
    Progress, 
    Form, 
    Input, 
    Button, 
    List,
    Checkbox,
    Avatar,
    Typography,
    Upload,
    Collapse,
    Select,
    DatePicker,
    Tag,  // Tag'i ekledik
    message,
    Row,
    Col,
    Empty
} from 'antd';
import { 
    UserOutlined, 
    UploadOutlined,
    DownloadOutlined,
    HistoryOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;




const CustomComment = ({ author, content, datetime }) => (
    <div style={{ borderBottom: '1px solid #f0f0f0', padding: '16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <Avatar icon={<UserOutlined />} />
            <Text strong style={{ marginLeft: '8px' }}>{author}</Text>
            <Text type="secondary" style={{ marginLeft: '8px' }}>{datetime}</Text>
        </div>
        <div style={{ marginLeft: '40px' }}>
            <Text>{content}</Text>
        </div>
    </div>
);

// Checklist bileşeni
// Checklist bileşeni - Güncellemiş hali
const TaskChecklist = ({ taskId, subtaskId = null, title = "Yapılacaklar Listesi" }) => {
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState('');

    useEffect(() => {
        if (taskId) {
            fetchChecklistItems();
        }
    }, [taskId, subtaskId]);

    const getProgress = () => {
        if (items.length === 0) return 0;
        const completed = items.filter(item => item.is_completed).length;
        return Math.round((completed / items.length) * 100);
    };

    const fetchChecklistItems = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/checklist/${taskId}${subtaskId ? `/${subtaskId}` : ''}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setItems(response.data);
        } catch (error) {
            console.error('Error fetching checklist items:', error);
            message.error('Yapılacaklar listesi yüklenirken bir hata oluştu');
        }
    };

    const handleAddItem = async () => {
        if (!newItem.trim()) return;

        try {
            const response = await axios.post(
                `http://localhost:5001/api/workflow/checklist/${taskId}${subtaskId ? `/${subtaskId}` : ''}`,
                { description: newItem },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setItems([...items, response.data]);
            setNewItem('');
            message.success('Yapılacak iş eklendi');
        } catch (error) {
            console.error('Error adding checklist item:', error);
            message.error('Yapılacak iş eklenirken bir hata oluştu');
        }
    };

    const handleToggleItem = async (itemId, completed) => {
        try {
            await axios.put(
                `http://localhost:5001/api/workflow/checklist/item/${itemId}`,
                { is_completed: completed },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            const updatedItems = items.map(item => 
                item.id === itemId ? { ...item, is_completed: completed } : item
            );
            setItems(updatedItems);
        } catch (error) {
            console.error('Error updating checklist item:', error);
            message.error('Yapılacak iş güncellenirken bir hata oluştu');
        }
    };

    const handleDeleteItem = async (itemId) => {
        try {
            await axios.delete(
                `http://localhost:5001/api/workflow/checklist/item/${itemId}`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setItems(items.filter(item => item.id !== itemId));
            message.success('Yapılacak iş silindi');
        } catch (error) {
            console.error('Error deleting checklist item:', error);
            message.error('Yapılacak iş silinirken bir hata oluştu');
        }
    };

    return (
        <div>
            {/* Başlık ve Progress Bar */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: 16,
                padding: '8px 0'
            }}>
                <Text strong>{title}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color="blue">{`${items.filter(i => i.is_completed).length}/${items.length}`}</Tag>
                    <Progress 
                        percent={getProgress()} 
                        size="small" 
                        style={{ width: 100, marginBottom: 0 }}
                    />
                </div>
            </div>

            {/* Input ve Ekle Butonu */}
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                <Input.TextArea
                    placeholder="Yeni yapılacak iş ekle"
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onPressEnter={e => {
                        e.preventDefault();
                        handleAddItem();
                    }}
                    autoSize={{ minRows: 1, maxRows: 3 }}
                    style={{ flex: 1 }}
                />
                <Button type="primary" onClick={handleAddItem}>
                    Ekle
                </Button>
            </div>

            {/* Yapılacaklar Listesi */}
            {items.length === 0 ? (
    <Empty 
        description="Henüz yapılacak iş eklenmemiş" 
        style={{ margin: '20px 0' }}
    />
) : (
                <List
                    size="small"
                    dataSource={items}
                    renderItem={item => (
                        <List.Item
                            actions={[
                                <Button 
                                    type="text" 
                                    danger 
                                    size="small"
                                    onClick={() => handleDeleteItem(item.id)}
                                >
                                    Sil
                                </Button>
                            ]}
                            style={{
                                backgroundColor: item.is_completed ? '#f6ffed' : 'transparent',
                                transition: 'background-color 0.3s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <Checkbox
                                    checked={item.is_completed}
                                    onChange={e => handleToggleItem(item.id, e.target.checked)}
                                />
                                <Text 
                                    style={{ 
                                        textDecoration: item.is_completed ? 'line-through' : 'none',
                                        color: item.is_completed ? '#8c8c8c' : 'inherit',
                                        flex: 1
                                    }}
                                >
                                    {item.description}
                                </Text>
                                {item.completed_at && (
                                    <Tag color="green" style={{ marginLeft: 'auto' }}>
                                        {moment(item.completed_at).format('DD.MM.YYYY')}
                                    </Tag>
                                )}
                            </div>
                        </List.Item>
                    )}
                />
            )}
        </div>
    );
};


const TaskDetail = ({ task, onUpdate }) => {
    const [comments, setComments] = useState([]);
    const [history, setHistory] = useState([]);
    const [subtasks, setSubtasks] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [overallProgress, setOverallProgress] = useState(0);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [statusForm] = Form.useForm();
    const [personnel, setPersonnel] = useState([]); // Personel listesi için yeni state


    const getFileNameFromPath = (filePath) => {
        // URL'den dosya adını al
        return filePath.split('/').pop();
    };
    
    // İlk yükleme için form değerlerini ayarla
    useEffect(() => {
        statusForm.setFieldsValue({
            status: task.status,
            priority: task.priority,
            due_date: moment(task.due_date)
        });
    }, [task]);

    // Veriler yüklendiğinde
// useEffect içine personel listesini çekmeyi ekleyelim
useEffect(() => {
    if (task?.id) {
        fetchComments();
        fetchHistory();
        fetchSubtasks();
        fetchAttachments();
        fetchPersonnel(); // Personel listesini çek
    }
}, [task?.id]);




// Personel listesini çeken fonksiyon
const fetchPersonnel = async () => {
    try {
        const response = await axios.get(
            'http://localhost:5001/api/personnel',
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        setPersonnel(response.data);
    } catch (error) {
        console.error('Personel listesi alınırken hata oluştu:', error);
        message.error('Personel listesi yüklenirken bir hata oluştu');
    }
};



    // Yorumları çek
    const fetchComments = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/tasks/${task.id}/comments`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setComments(response.data);
        } catch (error) {
            console.error('Yorumlar alınırken hata oluştu:', error);
            message.error('Yorumlar yüklenirken bir hata oluştu');
        }
    };

    // Geçmişi çek
    const fetchHistory = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/tasks/${task.id}/history`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setHistory(response.data);
        } catch (error) {
            console.error('Geçmiş alınırken hata oluştu:', error);
            message.error('Görev geçmişi yüklenirken bir hata oluştu');
        }
    };

    // Alt görevleri çek
    const fetchSubtasks = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/tasks/${task.id}/subtasks`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            console.log('Fetched Subtasks:', response.data);
            setSubtasks(response.data);
            updateProgress(response.data);
        } catch (error) {
            console.error('Alt görevler alınırken hata oluştu:', error);
            message.error('Alt görevler yüklenirken bir hata oluştu');
        }
    };
    

    // Ekleri çek
    const fetchAttachments = async () => {
        try {
            const response = await axios.get(
                `http://localhost:5001/api/workflow/tasks/${task.id}/attachments`,
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setAttachments(response.data);
        } catch (error) {
            console.error('Ekler alınırken hata oluştu:', error);
            message.error('Ekler yüklenirken bir hata oluştu');
        }
    };

    // İlerleme durumunu güncelle
// İlerleme durumunu güncelle - sadece state'i güncelleyecek
// İlerleme durumunu güncelle
const updateProgress = (currentSubtasks) => {
    if (currentSubtasks.length === 0) return;
    const completedTasks = currentSubtasks.filter(task => task.status === 'completed').length;
    const progressPercentage = (completedTasks / currentSubtasks.length) * 100;
    setOverallProgress(progressPercentage);
};


    // Ana görevin ilerlemesini güncelle
    const updateTaskProgress = async (progress) => {
        try {
            await axios.post(
                `http://localhost:5001/api/workflow/tasks/${task.id}/comments`,
                {
                    comment: 'Alt görevler güncellendi',
                    progress_percentage: progress
                },
                {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }
            );
            fetchComments();
        } catch (error) {
            console.error('İlerleme güncellenirken hata oluştu:', error);
        }
    };

    // Yorum ekleme
// handleCommentSubmit fonksiyonunu güncelle
// Yorum ekleme - sadece yorumu gönderecek
const handleCommentSubmit = async (values) => {
    try {
        await axios.post(
            `http://localhost:5001/api/workflow/tasks/${task.id}/comments`,
            {
                comment: values.comment
            },
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        message.success('Yorum başarıyla eklendi');
        form.resetFields();
        fetchComments();
    } catch (error) {
        console.error('Yorum eklenirken hata oluştu:', error);
        message.error('Yorum eklenirken bir hata oluştu');
    }
};
    // Alt görev ekleme
// Yeni alt görev ekleme - eklendikten sonra geçmişi de güncelleyecek
const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;

    try {
        await axios.post(
            `http://localhost:5001/api/workflow/tasks/${task.id}/subtasks`,
            {
                description: newSubtask,
                status: 'pending'
            },
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        setNewSubtask('');
        fetchSubtasks();
        fetchHistory();
        message.success('Alt görev eklendi');
    } catch (error) {
        console.error('Alt görev eklenirken hata oluştu:', error);
        message.error('Alt görev eklenirken bir hata oluştu');
    }
};


// Alt görev güncelleme fonksiyonu
const handleSubtaskUpdate = async (subtaskId, values) => {
    try {
        await axios.put(
            `http://localhost:5001/api/workflow/tasks/${task.id}/subtasks/${subtaskId}`,
            values,
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        fetchSubtasks(); // Alt görevleri yeniden getir
        message.success('Alt görev güncellendi');
    } catch (error) {
        console.error('Alt görev güncellenirken hata oluştu:', error);
        message.error('Alt görev güncellenirken bir hata oluştu');
    }
};





    // Alt görev durumunu değiştirme
// Alt görev durumunu değiştirme fonksiyonu
// handleSubtaskToggle fonksiyonu - backend'den gelen yanıttan sonra geçmişi güncelleyecek
const handleSubtaskToggle = async (subtaskId, checked) => {
    try {
        await axios.put(
            `http://localhost:5001/api/workflow/tasks/${task.id}/subtasks/${subtaskId}`,
            {
                status: checked ? 'completed' : 'pending',
                description: `Alt görev ${checked ? 'tamamlandı' : 'beklemeye alındı'}`
            },
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );
        
        fetchSubtasks();
        fetchHistory();
    } catch (error) {
        console.error('Alt görev güncellenirken hata oluştu:', error);
        message.error('Alt görev güncellenirken bir hata oluştu');
    }
};



// Task güncelleme fonksiyonu
const handleTaskUpdate = async (values) => {
    try {
        await axios.put(
            `http://localhost:5001/api/workflow/tasks/${task.id}`,
            {
                ...task,
                ...values,
                due_date: values.due_date.format('YYYY-MM-DD'),
            },
            {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            }
        );

        message.success('Görev başarıyla güncellendi');
        onUpdate?.();
        fetchHistory(); // Geçmişi yenile
        
        // Form alanlarını güncelle
        statusForm.setFieldsValue({
            status: values.status,
            priority: values.priority,
            due_date: moment(values.due_date)
        });

    } catch (error) {
        console.error('Görev güncellenirken hata oluştu:', error);
        message.error('Görev güncellenirken bir hata oluştu');
    }
};

    // Dosya yükleme işleyicisi
    const handleFileUpload = async (info) => {
        if (info.file.status === 'uploading') {
            setLoading(true);
            return;
        }
        
        if (info.file.status === 'done') {
            setLoading(false);
            message.success(`${info.file.name} başarıyla yüklendi`);
            // Dosya yüklendikten sonra listeyi güncelle
            await fetchAttachments();
        } else if (info.file.status === 'error') {
            setLoading(false);
            message.error(`${info.file.name} yüklenirken hata oluştu`);
        }
    };

    const uploadProps = {
        name: 'file',
        action: `http://localhost:5001/api/workflow/tasks/${task.id}/attachments`,
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        beforeUpload: (file) => {
            const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
            if (!isValidSize) {
                message.error('Dosya boyutu 10MB\'dan küçük olmalıdır!');
                return false;
            }
            return true;
        },
        onChange: handleFileUpload,
        multiple: false
    };

    // Dosya listesini render eden kısım
const renderAttachments = () => (
    <List
        dataSource={attachments}
        renderItem={file => (
            <List.Item
                actions={[
                    <Button
                        type="link"
                        onClick={() => window.open(`http://localhost:5001/api/workflow/tasks/${task.id}/attachments/${path.basename(file.file_path)}`, '_blank')}
                    >
                        İndir
                    </Button>
                ]}
            >
                <List.Item.Meta
                    title={file.file_name}
                    description={
                        <>
                            <div>Yükleyen: {file.uploaded_by_name}</div>
                            <div>Boyut: {Math.round(file.file_size / 1024)} KB</div>
                            <div>Tarih: {moment(file.created_at).format('DD.MM.YYYY HH:mm')}</div>
                        </>
                    }
                />
            </List.Item>
        )}
    />
);

return (
    <div>
        <Card title="Alt Görev İlerlemesi" style={{ marginBottom: 16 }}>
            <Progress
                percent={overallProgress}
                status="active"
                strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                }}
            />
        </Card>

 {/* Yeni durum güncelleme kartı */}
 <Card title="Görev Durumu" style={{ marginBottom: 16 }}>
                <Form
                    form={statusForm}
                    layout="vertical"
                    onFinish={handleTaskUpdate}
                >
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item
                                name="status"
                                label="Durum"
                                rules={[{ required: true, message: 'Durum seçiniz' }]}
                            >
                                <Select>
                                    <Select.Option value="pending">Beklemede</Select.Option>
                                    <Select.Option value="completed">Tamamlandı</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="priority"
                                label="Öncelik"
                                rules={[{ required: true, message: 'Öncelik seçiniz' }]}
                            >
                                <Select>
                                    <Select.Option value="High">Yüksek</Select.Option>
                                    <Select.Option value="Medium">Orta</Select.Option>
                                    <Select.Option value="Low">Düşük</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="due_date"
                                label="Bitiş Tarihi"
                                rules={[{ required: true, message: 'Tarih seçiniz' }]}
                            >
                                <DatePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Güncelle
                        </Button>
                    </Form.Item>
                </Form>
            </Card>




           

  {/* Ana Yapılacaklar Listesi */}
  <Card title="Görev Yapılacaklar Listesi" style={{ marginBottom: 16 }}>
                <TaskChecklist 
                    taskId={task.id} 
                    title="Görev Yapılacaklar"
                />
            </Card>

            {/* Alt Görevler ve Yapılacaklar Listeleri */}
            <Card title="Alt Görevler ve Yapılacaklar" style={{ marginBottom: 16 }}>
                <List
                    dataSource={subtasks}
                    renderItem={subtask => (
                        <div style={{ marginBottom: 24 }}>
                            {/* Alt Görev Başlığı ve Detayları */}
                            <List.Item
                                actions={[
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Select
                                            placeholder="Kişi ata"
                                            value={subtask.assigned_to}
                                            style={{ width: 150 }}
                                            onChange={(value) => handleSubtaskUpdate(subtask.id, { assigned_to: value })}
                                            allowClear
                                        >
                                            {personnel.map(person => (
                                                <Select.Option key={person.id} value={person.id}>
                                                    {`${person.first_name} ${person.last_name}`}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                        <DatePicker
                                            placeholder="Bitiş tarihi"
                                            value={subtask.due_date ? moment(subtask.due_date) : null}
                                            onChange={(date) => handleSubtaskUpdate(subtask.id, { due_date: date ? date.format('YYYY-MM-DD') : null })}
                                            style={{ width: 130 }}
                                        />
                                    </div>
                                ]}
                            >
                                <Checkbox
                                    checked={subtask.status === 'completed'}
                                    onChange={e => handleSubtaskToggle(subtask.id, e.target.checked)}
                                >
                                    <Text style={{ 
                                        textDecoration: subtask.status === 'completed' ? 'line-through' : 'none',
                                        color: subtask.status === 'completed' ? '#8c8c8c' : 'inherit'
                                    }}>
                                        {subtask.description}
                                        {subtask.assigned_to_name && (
                                            <Tag color="blue" style={{ marginLeft: 8 }}>
                                                {subtask.assigned_to_name}
                                            </Tag>
                                        )}
                                        {subtask.due_date && (
                                            <Tag color="orange" style={{ marginLeft: 8 }}>
                                                {moment(subtask.due_date).format('DD.MM.YYYY')}
                                            </Tag>
                                        )}
                                    </Text>
                                </Checkbox>
                            </List.Item>

                            {/* Alt Görevin Yapılacaklar Listesi */}
                            <div style={{ 
                                marginLeft: 40, 
                                marginTop: 8,
                                padding: 16,
                                backgroundColor: '#fafafa',
                                borderRadius: 8
                            }}>
                                <TaskChecklist 
                                    taskId={task.id} 
                                    subtaskId={subtask.id}
                                    title={`${subtask.description} - Yapılacaklar`}
                                />
                            </div>
                        </div>
                    )}
                />

                {/* Yeni Alt Görev Ekleme */}
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                    <Input
                        placeholder="Yeni alt görev ekle"
                        value={newSubtask}
                        onChange={e => setNewSubtask(e.target.value)}
                        onPressEnter={handleAddSubtask}
                        style={{ flex: 1 }}
                    />
                    <Button type="primary" onClick={handleAddSubtask}>
                        Alt Görev Ekle
                    </Button>
                </div>
            </Card>



        <Card style={{ marginBottom: 16 }}>
            <Collapse defaultActiveKey={[]}>
                <Collapse.Panel 
                    header={
                        <span style={{ display: 'flex', alignItems: 'center', color: '#1890ff' }}>
                            <UploadOutlined style={{ marginRight: 8 }} />
                            Dosyalar
                        </span>
                    }
                    key="1"
                >
                    <div style={{ padding: '16px 0' }}>
                        <Upload {...uploadProps}>
                            <Button icon={<UploadOutlined />} loading={loading}>
                                Dosya Yükle
                            </Button>
                        </Upload>
                        <List
                            style={{ marginTop: 16 }}
                            dataSource={attachments}
                            renderItem={attachment => (
                                <List.Item
                                    actions={[
                                        <Button 
                                            type="link" 
                                            onClick={() => window.open(`http://localhost:5001/uploads${attachment.file_path}`, '_blank')}
                                            icon={<DownloadOutlined />}
                                        >
                                            İndir
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={attachment.file_name}
                                        description={
                                            <>
                                                <div>Yükleyen: {attachment.uploaded_by_name}</div>
                                                <div>Boyut: {(attachment.file_size / 1024).toFixed(2)} KB</div>
                                                <div>Tarih: {moment(attachment.uploaded_at).format('DD.MM.YYYY HH:mm')}</div>
                                            </>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </div>
                </Collapse.Panel>
            </Collapse>
        </Card>

        <Card style={{ marginBottom: 16 }}>
            <Collapse defaultActiveKey={[]}>
                <Collapse.Panel 
                    header={
                        <span style={{ display: 'flex', alignItems: 'center', color: '#1890ff' }}>
                            <UserOutlined style={{ marginRight: 8 }} />
                            Yorumlar
                        </span>
                    }
                    key="1"
                >
                    <div style={{ padding: '16px 0' }}>
                        <Form 
                            form={form} 
                            onFinish={handleCommentSubmit}
                            layout="vertical"
                        >
                            <Form.Item
                                name="comment"
                                rules={[{ required: true, message: 'Lütfen bir yorum yazın' }]}
                            >
                                <TextArea 
                                    rows={4} 
                                    placeholder="Yorumunuzu buraya yazın..."
                                />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit">
                                    Yorum Ekle
                                </Button>
                            </Form.Item>
                        </Form>

                        <List
                            dataSource={comments}
                            renderItem={comment => (
                                <CustomComment
                                    author={comment.created_by_name}
                                    content={comment.comment}
                                    datetime={moment(comment.created_at).format('DD.MM.YYYY HH:mm')}
                                />
                            )}
                            locale={{ emptyText: 'Henüz yorum yapılmamış' }}
                        />
                    </div>
                </Collapse.Panel>
            </Collapse>
        </Card>

        <Card style={{ marginBottom: 16 }}>
            <Collapse defaultActiveKey={[]}>
                <Collapse.Panel 
                    header={
                        <span style={{ display: 'flex', alignItems: 'center', color: '#1890ff' }}>
                            <HistoryOutlined style={{ marginRight: 8 }} />
                            Görev Geçmişi
                        </span>
                    }
                    key="1"
                >
                    <Timeline
                        style={{ marginTop: 16, marginBottom: 16, padding: '0 16px' }}
                        items={history.map((record, index) => ({
                            key: index,
                            color: record.new_status === 'completed' ? 'green' : 'blue',
                            children: (
                                <>
                                    {record.description ? (
                                        <Text>{record.description}</Text>
                                    ) : (
                                        <Text>
                                            Durum {' '}
                                            <Text type="secondary">{record.old_status}</Text>
                                            {' '}durumundan{' '}
                                            <Text strong>{record.new_status}</Text>
                                            {' '}durumuna değiştirildi
                                        </Text>
                                    )}
                                    <br />
                                    <Text type="secondary">
                                        {record.changed_by_name} tarafından
                                        <br />
                                        {moment(record.changed_at).format('DD.MM.YYYY HH:mm')}
                                    </Text>
                                </>
                            )
                        }))}
                    />
                </Collapse.Panel>
            </Collapse>
        </Card>
    </div>
);
};

export default TaskDetail;