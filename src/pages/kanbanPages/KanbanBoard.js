import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Avatar, Tag, Tooltip, Space, Dropdown, message } from 'antd';
import { 
  PlusOutlined, 
  UserOutlined, 
  CalendarOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  FileZipOutlined,
  FolderOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import CardDetailModal from './CardDetailModal';
import KanbanSettings from './KanbanSettings';
import TaskAssignmentForm from './TaskAssignmentForm';

const KanbanBoard = () => {
  const [lists, setLists] = useState([]);
  const [draggedCard, setDraggedCard] = useState(null);
  const [newCardContent, setNewCardContent] = useState('');
  const [addingToListId, setAddingToListId] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isAddingList, setIsAddingList] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [users, setUsers] = useState([]);
  const [isTaskFormVisible, setIsTaskFormVisible] = useState(false);





  const getDueDateColor = (dueDate) => {
    const date = new Date(dueDate);
    const today = new Date();
    if (date < today) return 'red';
    if (date.getTime() - today.getTime() < 86400000 * 2) return 'orange';
    return 'blue';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    };
    return colors[priority] || 'blue';
  };

  useEffect(() => {
    axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }, []);

  const handleCardClick = (card) => {
    setSelectedCard(card);
    setIsModalVisible(true);
  };

  useEffect(() => {
    let interval;
    if (!settingsVisible) { // Settings açık değilse yenileme yap
      interval = setInterval(() => {
        fetchKanbanData();
      }, 2000);
    }
  
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [settingsVisible]); // settingsVisible dependency olarak ekledik

  // Kart taşındığında yenileme
  useEffect(() => {
    if (draggedCard) {
      fetchKanbanData();
    }
  }, [draggedCard]);

    // Kullanıcıları getir
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:5001/api/users');
        const usersData = response.data;
    
        const usersWithPhotos = await Promise.all(
          usersData.map(async (user) => {
            try {
              const photoResponse = await axios.get(`http://localhost:5001/api/kanban/users/${user.id}/photo`);
              const photoUrl = photoResponse.data.photo_url;
              return {
                ...user,
                // photo_url'yi tam URL olarak oluştur
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
    
       
        setUsers(usersWithPhotos);
      } catch (error) {
        console.error('Error fetching users:', error);
        message.error('Kullanıcılar yüklenirken hata oluştu');
      }
    };
    useEffect(() => {
      fetchUsers();
    }, []);

  // Yeni liste ekleme fonksiyonu
const handleAddList = async () => {
  if (!newListTitle.trim()) return;
  try {
    await axios.post('http://localhost:5001/api/kanban/lists', {
      title: newListTitle,
      position: lists.length + 1
    });
    setNewListTitle('');
    setIsAddingList(false);
    fetchKanbanData();
  } catch (error) {
    console.error('Error adding list:', error);
    message.error('Liste eklenirken hata oluştu');
  }
};


const handleDeleteList = (listId) => {
  Modal.confirm({
    title: 'Listeyi Sil',
    content: 'Bu listeyi silmek istediğinizden emin misiniz?',
    okText: 'Evet, Sil',
    okType: 'danger',
    cancelText: 'İptal',
    async onOk() {
      try {
        await axios.delete(`http://localhost:5001/api/kanban/lists/${listId}`);
        message.success('Liste silindi');
        fetchKanbanData();
      } catch (error) {
        message.error('Liste silinirken hata oluştu');
      }
    }
  });
};

const fetchKanbanData = async () => {
  try {
    const response = await axios.get('http://localhost:5001/api/kanban');
    const lists = response.data;

    const updatedLists = await Promise.all(lists.map(async list => {
      if (list.cards && list.cards.length > 0) {
        const updatedCards = await Promise.all(list.cards.map(async card => {
          const cardDetailResponse = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}`);
          
          return {
            ...card,
            ...cardDetailResponse.data
          };
        }));
        return { ...list, cards: updatedCards };
      }
      return list;
    }));

    setLists(updatedLists);
  } catch (error) {
    console.error('Error fetching kanban data:', error);
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
  }
};

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const handleAddCard = async (listId) => {
    if (!newCardContent.trim()) return;
    try {
      // Önce kartı oluştur
      const cardResponse = await axios.post('http://localhost:5001/api/kanban/cards', {
        list_id: listId,
        content: newCardContent
      });
  
      const newCard = cardResponse.data;
  
      // Listenin şablonlarını al
      const templatesResponse = await axios.get(`http://localhost:5001/api/kanban/lists/${listId}/checklist-templates`);
      const templates = templatesResponse.data;
  
      // Her şablonu yeni karta uygula
      if (templates && templates.length > 0) {
        for (const tpl of templates) {
          await axios.post(`http://localhost:5001/api/kanban/cards/${newCard.id}/checklists`, {
            template_id: tpl.id,
            auto_applied: true
          });
  
          // Aktivite kaydı oluştur
          await axios.post(`http://localhost:5001/api/kanban/cards/${newCard.id}/activities`, {
            type: 'checklist_added',
            description: `"${tpl.title}" şablonu otomatik olarak eklendi`
          });
        }
      }
  
      fetchKanbanData();
      setNewCardContent('');
      setAddingToListId(null);
    } catch (error) {
      console.error('Add card error:', error);
      message.error('Kart eklenirken bir hata oluştu');
    }
  };

  const handleDeleteCard = async (cardId, listId) => {
    try {
      await axios.delete(`http://localhost:5001/api/kanban/cards/${cardId}`);
      fetchKanbanData();
    } catch (error) {
      console.error('Error deleting card:', error);
      if (error.response?.status === 401) {
        window.location.href = '/login';
      }
    }
  };

  const handleDrop = async (targetListId) => {
    if (!draggedCard) return;
    try {
      // Kartı yeni listeye taşı
      await axios.put(`http://localhost:5001/api/kanban/cards/${draggedCard.card.id}/position`, {
        list_id: targetListId,
        position: 0
      });
  
      // Hedef listenin şablonunu al ve karta uygula
      const templatesResponse = await axios.get(`http://localhost:5001/api/kanban/lists/${targetListId}/checklist-templates`);
      const templates = templatesResponse.data;
  
      if (templates && templates.length > 0) {
        for (const tpl of templates) {
          await axios.post(`http://localhost:5001/api/kanban/cards/${draggedCard.card.id}/checklists`, {
            template_id: tpl.id,
            auto_applied: true
          });
      
          // Aktivite kaydı
          await axios.post(`http://localhost:5001/api/kanban/cards/${draggedCard.card.id}/activities`, {
            type: 'checklist_added',
            description: `"${tpl.title}" şablonu otomatik olarak eklendi`
          });
        }
      }
  
      fetchKanbanData();
    } catch (error) {
      console.error('Drop error:', error);
      message.error('Kart taşınırken bir hata oluştu');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDragStart = (card, sourceListId) => {
    setDraggedCard({ card, sourceListId });
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Design Kanban Board</h1>

  <Space>
    <Button 
      type="primary" 
      icon={<PlusOutlined />} 
      onClick={() => setIsTaskFormVisible(true)}
    >
      Görev Atama
    </Button>
    <Button 
      icon={<SettingOutlined />}
      onClick={() => setSettingsVisible(true)}
    >
      Ayarlar
    </Button>
  </Space>
</div>



      <KanbanSettings 
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '8px 0', }}>
        {lists.map(list => (
          <div 
            key={list.id}
            style={{ 
              width: '300px',
              flexShrink: 0,
              background: '#f0f0f0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 'calc(100vh - 160px)',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }
            }}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(list.id)}
          >
            {/* Liste Başlığı */}
            <div style={{ 
              padding: '12px 16px',
              borderBottom: '1px solid #e8e8e8',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f5f5f5',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <h3 style={{ margin: 0, fontWeight: 500 }}>{list.title}</h3>
                <Tag>{list.cards?.length || 0}</Tag>
              </div>
              <Dropdown
                menu={{
                  items: [{
                    key: 'delete',
                    label: 'Listeyi Sil',
                    icon: <DeleteOutlined />,
                    danger: true,
                    onClick: () => handleDeleteList(list.id)
                  }]
                }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<SettingOutlined />}
                  style={{ marginLeft: 'auto' }}
                  onClick={e => e.stopPropagation()}
                />
              </Dropdown>
            </div>

            {/* Kartlar Bölümü */}
            <div style={{ padding: '8px', flex: 1, overflowY: 'auto' }}>
            {list.cards?.map(card => (
  <div
  key={card.id}
  style={{
    background: 'white',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    position: 'relative'
  }}
  draggable
  onDragStart={() => handleDragStart(card, list.id)}
  onClick={() => handleCardClick(card)}
>


  {/* Etiketler */}
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
    {card.labels?.map(label => (
      <Tag key={label.id} color={label.color}>{label.name}</Tag>
    ))}
  </div>

    {/* Kart Başlığı - Arşiv No ile birlikte */}
    <div style={{ 
    marginBottom: '12px', 
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1.4'
  }}>
    {card.archive_number ? `${card.archive_number} ${card.content}` : card.content}
  </div>
  
  {/* Alt Bilgiler - Flex Column ile dikey sıralama */}
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    gap: '8px'
  }}>
    {/* Atanan Kişi */}
    {card.assigned_to && (
      <div>
        <Tag color="purple" style={{ padding: '2px 8px' }}>
          <Space size={4}>
            <Avatar 
              size="small" 
              src={users.find(u => u.id === card.assigned_to)?.photo_url}
              icon={!users.find(u => u.id === card.assigned_to)?.photo_url && <UserOutlined />}
            />
            {users.find(u => u.id === card.assigned_to)?.username}
          </Space>
        </Tag>
      </div>
    )}
    
    {/* Tarih ve Öncelik */}
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {card.due_date && (
        <Tag color={getDueDateColor(card.due_date)}>
          <CalendarOutlined /> {new Date(card.due_date).toLocaleDateString()}
        </Tag>
      )}
      {card.priority && (
        <Tag color={getPriorityColor(card.priority)}>{card.priority}</Tag>
      )}
    </div>

    {/* Arşiv ve Listing Dosya Bilgileri */}
    {(card.archives_count > 0 || card.listings_count > 0) && (
      <div style={{ display: 'flex', gap: '4px' }}>
        {card.archives_count > 0 && (
          <Tag color="darkblue">
            <Space>
              <FolderOutlined />
              {card.archives_count} Arşiv
            </Space>
          </Tag>
        )}
        {card.listings_count > 0 && (
          <Tag color="darkorange">
            <Space>
              <FileZipOutlined />
              {card.listings_count} Listing
            </Space>
          </Tag>
        )}
      </div>
    )}
  </div>

  {/* Silme Butonu */}
  <Button
    type="text"
    size="small"
    icon={<DeleteOutlined />}
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteCard(card.id, list.id);
    }}
    style={{ 
      opacity: 0,
      transition: 'opacity 0.2s',
      position: 'absolute',
      top: '8px',
      right: '8px'
    }}
    onMouseOver={(e) => e.currentTarget.style.opacity = 1}
    onMouseOut={(e) => e.currentTarget.style.opacity = 0}
  />
</div>
))}
            </div>

            {/* Kart Ekleme Bölümü */}
            <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
              {addingToListId === list.id ? (
                <div>
                  <Input.TextArea
                    autoSize
                    value={newCardContent}
                    onChange={(e) => setNewCardContent(e.target.value)}
                    placeholder="Kart başlığını girin..."
                    style={{ marginBottom: '8px' }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button type="primary" size="small" onClick={() => handleAddCard(list.id)}>
                      Ekle
                    </Button>
                    <Button size="small" onClick={() => setAddingToListId(null)}>
                      İptal
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  type="text" 
                  icon={<PlusOutlined />} 
                  block
                  onClick={() => setAddingToListId(list.id)}
                  style={{ textAlign: 'left' }}
                >
                  Kart Ekle
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Yeni Liste Ekleme Butonu */}
        {isAddingList ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Input
              placeholder="Liste başlığı"
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onPressEnter={handleAddList}
              style={{ width: '200px' }}
            />
            <Button type="primary" onClick={handleAddList}>
              Liste Ekle
            </Button>
            <Button onClick={() => {
              setIsAddingList(false);
              setNewListTitle('');
            }}>
              İptal
            </Button>
          </div>
        ) : (
          <Button 
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={() => setIsAddingList(true)}
          >
            Yeni Liste Ekle
          </Button>
        )}
      </div>

      <TaskAssignmentForm
  visible={isTaskFormVisible}
  onClose={() => setIsTaskFormVisible(false)}
  onCardCreated={fetchKanbanData} // Yeni görev oluşturulunca board'u güncelle
  users={users}
  lists={lists}
/>

      {/* Kart Detay Modalı */}
      {isModalVisible && (
        <CardDetailModal
          visible={isModalVisible}
          card={selectedCard}
          onClose={() => setIsModalVisible(false)}
          onUpdate={fetchKanbanData}
        />
      )}
    </div>
  );
};

export default KanbanBoard;