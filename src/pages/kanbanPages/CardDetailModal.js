import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Upload, 
  Button, 
  Space, 
  Tag, 
  Avatar, 
  List, 
  message,
  Card,
  Progress,
  Collapse,
  Timeline,
  Typography,
  Row,
  Col
} from 'antd';
import { 
  PlusOutlined, 
  InboxOutlined, 
  UploadOutlined, 
  DownloadOutlined,
  UserOutlined,
  HistoryOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  MessageOutlined,
  FolderOutlined,
  FileZipOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';
import CardChecklist from './CardChecklist';

const { Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

const CardDetailModal = ({ visible, card, onClose, onUpdate }) => {
  const [form] = Form.useForm();
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [labels, setLabels] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [archives, setArchives] = useState([]);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    if (card?.id) {
      fetchComments();
      fetchActivities();
      fetchAttachments();
    }
  }, [card]);

  useEffect(() => {
    fetchUsers();
    fetchLabels();
  }, []);

  // Fetch functions
  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/users');
      const usersData = response.data;
  
      // Her kullanıcı için fotoğraf bilgisini al
      const usersWithPhotos = await Promise.all(
        usersData.map(async (user) => {
          try {
            const photoResponse = await axios.get(`http://localhost:5001/api/kanban/users/${user.id}/photo`);
            const photoUrl = photoResponse.data.photo_url;
            return {
              ...user,
              photo_url: photoUrl ? `http://localhost:5001${photoUrl}` : null
            };
          } catch (error) {
            console.error(`Error fetching photo for user ${user.id}:`, error);
            return {
              ...user,
              photo_url: null
            };
          }
        })
      );
  
      console.log('Users with photos:', usersWithPhotos);
      setUsers(usersWithPhotos);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Kullanıcılar yüklenirken hata oluştu');
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/kanban/labels');
      setLabels(response.data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/comments`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchAttachments = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/attachments`);
      setAttachments(response.data);
    } catch (error) {
      console.error('Error fetching attachments:', error);
    }
  };

  const fetchArchives = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/archives`);
      setArchives(response.data);
    } catch (error) {
      console.error('Error fetching archives:', error);
    }
  };

  const fetchListings = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/listings`);
      setListings(response.data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  useEffect(() => {
    if (card?.id) {
      fetchArchives();
      fetchListings();
    }
  }, [card]);

  // Action handlers
  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Eski ve yeni değerleri karşılaştırarak değişiklik aktiviteleri oluşturma
      const oldValues = {
        title: card.content,
        description: card.description || '',
        assigned_to: card.assigned_to || null,
        due_date: card.due_date ? dayjs(card.due_date).format('YYYY-MM-DD') : null,
        priority: card.priority || null,
        labels: card.labels?.map(lbl => lbl.id) || []
      };
  
      const newValues = {
        title: values.title,
        description: values.description || '',
        assigned_to: values.assigned_to || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        priority: values.priority || null,
        labels: values.labels || []
      };
  
      // Kartı güncelleme isteği
      const formData = {
        ...values,
        content: card.content,
        title: card.content,   
        labels: values.labels || [], // Etiketleri doğru şekilde gönder
        priority: values.priority || null,
        due_date: newValues.due_date,
        archive_number: card.archive_number,
        created_by: card.created_by
      };
  
      const response = await axios.put(`http://localhost:5001/api/kanban/cards/${card.id}`, formData);
      
      const changes = [];
  
      // Değişiklikleri teker teker kontrol edip "activities" loguna ekleyelim
      if (oldValues.title !== newValues.title) {
        changes.push({
          type: 'title_update',
          description: `Başlık değiştirildi: "${oldValues.title}" → "${newValues.title}"`
        });
      }
      if (oldValues.description !== newValues.description) {
        changes.push({
          type: 'description_update',
          description: newValues.description 
            ? `Açıklama güncellendi: "${newValues.description}"`
            : 'Açıklama kaldırıldı'
        });
      }
      if (oldValues.assigned_to !== newValues.assigned_to) {
        const assignedUser = users.find(u => u.id === newValues.assigned_to);
        changes.push({
          type: 'assignment_update',
          description: assignedUser 
            ? `Kart ${assignedUser.username} kişisine atandı`
            : 'Atanan kişi kaldırıldı'
        });
      }
      if (String(oldValues.due_date) !== String(newValues.due_date)) {
        changes.push({
          type: 'due_date_update',
          description: newValues.due_date 
            ? `Son tarih ${dayjs(newValues.due_date).format('DD.MM.YYYY')} olarak güncellendi`
            : 'Son tarih kaldırıldı'
        });
      }
      if (oldValues.priority !== newValues.priority) {
        const priorityLabels = { low: 'Düşük', medium: 'Orta', high: 'Yüksek' };
        changes.push({
          type: 'priority_update',
          description: newValues.priority
            ? `Öncelik ${priorityLabels[newValues.priority]} olarak değiştirildi`
            : 'Öncelik kaldırıldı'
        });
      }
      const oldLabelsStr = [...oldValues.labels].sort().join(',');
      const newLabelsStr = [...newValues.labels].sort().join(',');
      if (oldLabelsStr !== newLabelsStr) {
        const removedLabels = oldValues.labels.filter(l => !newValues.labels.includes(l));
        const addedLabels = newValues.labels.filter(l => !oldValues.labels.includes(l));
  
        if (removedLabels.length > 0) {
          const removedLabelNames = removedLabels
            .map(id => labels.find(l => l.id === id)?.name)
            .filter(Boolean);
          changes.push({
            type: 'labels_removed',
            description: `Kaldırılan etiketler: ${removedLabelNames.join(', ')}`
          });
        }
  
        if (addedLabels.length > 0) {
          const addedLabelNames = addedLabels
            .map(id => labels.find(l => l.id === id)?.name)
            .filter(Boolean);
          changes.push({
            type: 'labels_added',
            description: `Eklenen etiketler: ${addedLabelNames.join(', ')}`
          });
        }
      }
  
      if (changes.length > 0) {
        await Promise.all(changes.map(activity => 
          axios.post(`http://localhost:5001/api/kanban/cards/${card.id}/activities`, activity)
        ));
      }
  
      message.success('Kart başarıyla güncellendi');
      onUpdate(response.data);
      fetchActivities();
  
    } catch (error) {
      console.error('Error updating card:', error);
      message.error('Kart güncellenirken bir hata oluştu');
    }
    setLoading(false);
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    
    try {
      await axios.post(`http://localhost:5001/api/kanban/cards/${card.id}/comments`, {
        comment: commentText
      });
      // Yorum eklendikten sonra aktivite ekle
      await axios.post(`http://localhost:5001/api/kanban/cards/${card.id}/activities`, {
        type: 'comment',
        description: `Yorum eklendi: ${commentText}`
      });
  
      setCommentText('');
      fetchComments();
      fetchActivities();
      message.success('Yorum eklendi');
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Yorum eklenirken bir hata oluştu');
    }
  };

  const handleFileUpload = async (info) => {
    if (info.file.status === 'done') {
      message.success(`${info.file.name} başarıyla yüklendi`);
  
      // Dosya yüklenince aktivite ekle
      await axios.post(`http://localhost:5001/api/kanban/cards/${card.id}/activities`, {
        type: 'attachment_upload',
        description: `Dosya eklendi: ${info.file.name}`
      });
  
      fetchAttachments();
      fetchActivities();
    } else if (info.file.status === 'error') {
      message.error(`${info.file.name} yüklenirken hata oluştu`);
    }
  };

  return (
    <Modal
    title={card.archive_number ? `${card.archive_number} ${card.content}` : "Yeni Kart"}
    open={visible}
    onCancel={onClose}
    width={800}
    footer={null}
    styles={{
      body: {
        maxHeight: '80vh',
        overflow: 'auto'
      }
    }}
  >
    <Card style={{ marginBottom: 16 }}>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          description: card.description,
          assigned_to: card.assigned_to,
          due_date: card.due_date ? dayjs(card.due_date) : null,
          priority: card.priority,
          labels: card.labels?.map(lbl => lbl.id) || []
        }}
      >
        {/* Arşiv Numarası */}
        {card.archive_number && (
          <div style={{ marginBottom: 16 }}>
            <strong>Arşiv No:</strong>{' '}
            <Tag color="blue">{card.archive_number}</Tag>
          </div>
        )}

          {/* Açıklama */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="description" label="Açıklama">
                <TextArea rows={4} />
              </Form.Item>
            </Col>
          </Row>

          {/*
            Arşiv ve Listing'i AÇIKLAMA alanının hemen altına ekliyoruz
            Böylece form içindeki description'dan hemen sonra gelecek.
          */}
          <Collapse
            style={{ marginTop: 8 }}
            accordion
            defaultActiveKey={[]}
          >
            {/* Arşiv Dosyaları */}
            <Panel 
              header={
                <Space>
                  <FolderOutlined />
                  <span>Arşiv Dosyaları</span>
                  <Tag color="purple">{archives.length}</Tag>
                </Space>
              } 
              key="archives"
            >
              <Upload.Dragger
                name="file"
                accept=".zip"
                action={`http://localhost:5001/api/kanban/cards/${card.id}/archives`}
                headers={{
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }}
                onChange={info => {
                  if (info.file.status === 'done') {
                    message.success('Arşiv dosyası yüklendi!');
                    fetchArchives();
                    fetchActivities();
                  } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} yükleme hatası.`);
                  }
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  ZIP dosyası yüklemek için tıklayın veya sürükleyin
                </p>
              </Upload.Dragger>

              <List
                style={{ marginTop: 16 }}
                dataSource={archives}
                renderItem={archive => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(`http://localhost:5001/${archive.file_path}`, '_blank')}
                      >
                        İndir
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={archive.file_name}
                      description={
                        <>
                          <div>Yükleyen: {archive.uploaded_by_name}</div>
                          <div>Tarih: {dayjs(archive.uploaded_at).format('DD.MM.YYYY HH:mm')}</div>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Panel>

            {/* Listing Dosyaları */}
            <Panel
              header={
                <Space>
                  <FileZipOutlined />
                  <span>Listing Dosyaları</span>
                  <Tag color="cyan">{listings.length}</Tag>
                </Space>
              }
              key="listings"
            >
              <Upload.Dragger
                name="file"
                accept=".zip"
                action={`http://localhost:5001/api/kanban/cards/${card.id}/listings`}
                headers={{
                  Authorization: `Bearer ${localStorage.getItem('token')}`
                }}
                onChange={info => {
                  if (info.file.status === 'done') {
                    message.success('Listing dosyası yüklendi!');
                    fetchListings();
                    fetchActivities();
                  } else if (info.file.status === 'error') {
                    message.error(`${info.file.name} yükleme hatası.`);
                  }
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  ZIP dosyası yüklemek için tıklayın veya sürükleyin
                </p>
              </Upload.Dragger>

              <List
                style={{ marginTop: 16 }}
                dataSource={listings}
                renderItem={listing => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        icon={<DownloadOutlined />}
                        onClick={() => window.open(`http://localhost:5001/${listing.file_path}`, '_blank')}
                      >
                        İndir
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={listing.file_name}
                      description={
                        <>
                          <div>Yükleyen: {listing.uploaded_by_name}</div>
                          <div>Tarih: {dayjs(listing.uploaded_at).format('DD.MM.YYYY HH:mm')}</div>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Panel>
          </Collapse>

          {/* Form'un geri kalan bölümleri (Atanan Kişi, Tarih, vb.) */}
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Form.Item name="assigned_to" label="Atanan Kişi">
                <Select placeholder="Kişi seçin">
                  {users.map(user => (
                    <Select.Option key={user.id} value={user.id}>
                      <Space>
                        <Avatar 
                          size="small" 
                          src={user.photo_url}
                          icon={!user.photo_url && <UserOutlined />}
                        />
                        {user.username}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="due_date" label="Bitiş Tarihi">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="priority" label="Öncelik">
                <Select>
                  <Select.Option value="low">Düşük</Select.Option>
                  <Select.Option value="medium">Orta</Select.Option>
                  <Select.Option value="high">Yüksek</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="labels" label="Etiketler">
                <Select mode="multiple" placeholder="Etiket seçin">
                  {labels.map(label => (
                    <Select.Option key={label.id} value={label.id}>
                      <Tag color={label.color}>{label.name}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              Kaydet
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Checklist */}
      <CardChecklist 
        card={card} 
        onUpdate={onUpdate}  
      />

      {/* Ekler */}
      <Collapse defaultActiveKey={[]} style={{ marginTop: 16 }}>
        <Panel
          header={
            <Space>
              <PaperClipOutlined />
              <span>Ekler</span>
              <Tag color="blue">{attachments.length}</Tag>
            </Space>
          }
          key="attachments"
        >
          <Upload.Dragger
            name="file"
            action={`http://localhost:5001/api/kanban/cards/${card.id}/attachments`}
            headers={{
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }}
            onChange={info => {
              if (info.file.status === 'done') {
                message.success('Dosya yüklendi!');
                fetchAttachments();
                fetchActivities();
              } else if (info.file.status === 'error') {
                message.error(`${info.file.name} yükleme hatası.`);
              }
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Dosya yüklemek için tıklayın veya sürükleyin
            </p>
          </Upload.Dragger>

          <List
            style={{ marginTop: 16 }}
            dataSource={attachments}
            renderItem={attachment => (
              <List.Item
                actions={[
                  <Button 
                    type="link" 
                    icon={<DownloadOutlined />}
                    onClick={() => window.open(`http://localhost:5001/${attachment.file_path}`, '_blank')}
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
                      <div>Tarih: {dayjs(attachment.uploaded_at).format('DD.MM.YYYY HH:mm')}</div>
                    </>
                  }
                />
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>

      {/* Yorumlar */}
      <Collapse defaultActiveKey={['2']} style={{ marginTop: 16 }}>
        <Panel 
          header={
            <Space>
              <MessageOutlined />
              <span>Yorumlar</span>
              <Tag color="blue">{comments.length}</Tag>
            </Space>
          } 
          key="2"
        >
          <div style={{ marginBottom: 16 }}>
            <TextArea
              rows={4}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Yorumunuzu yazın..."
            />
            <Button 
              type="primary" 
              onClick={handleAddComment}
              style={{ marginTop: 8 }}
            >
              Yorum Ekle
            </Button>
          </div>

          <List
            itemLayout="horizontal"
            dataSource={comments}
            renderItem={comment => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar 
                      src={users.find(u => u.username === comment.user_name)?.photo_url}
                      icon={!users.find(u => u.username === comment.user_name)?.photo_url && comment.user_name?.[0]}
                    />
                  }
                  title={comment.user_name}
                  description={
                    <div>
                      <p>{comment.comment}</p>
                      <small style={{ color: '#8c8c8c' }}>
                        {dayjs(comment.created_at).format('DD.MM.YYYY HH:mm')}
                      </small>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>

      {/* Aktivite Geçmişi */}
      <Collapse style={{ marginTop: 16 }}>
        <Panel 
          header={
            <Space>
              <HistoryOutlined />
              <span>Aktivite Geçmişi</span>
            </Space>
          } 
          key="3"
        >
          <Timeline
            items={activities.map((activity, index) => ({
              key: index,
              color: activity.type === 'update' ? 'blue' : 'green',
              children: (
                <>
                  <div>{activity.description}</div>
                  <small style={{ color: '#8c8c8c' }}>
                    {activity.user_name} - {dayjs(activity.created_at).format('DD.MM.YYYY HH:mm')}
                  </small>
                </>
              )
            }))}
          />
        </Panel>
      </Collapse>
    </Modal>
  );
};

export default CardDetailModal;
