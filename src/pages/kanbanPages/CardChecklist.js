import React, { useState, useEffect } from 'react';
import { Card, Collapse, Button, Input, Checkbox, Space, message, Tag, Progress } from 'antd';
import { CheckSquareOutlined, PlusOutlined, CaretRightOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Panel } = Collapse;

const CardChecklist = ({ card, onUpdate }) => {
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [expandedChecklists, setExpandedChecklists] = useState([]);
  
    // Checklist'in tamamlanıp tamamlanmadığını kontrol et
    const isChecklistCompleted = (checklist) => {
      if (!checklist.items || checklist.items.length === 0) return false;
      return checklist.items.every(item => item.is_completed);
    };
  
    // Tüm checklist'leri başlangıçta açık tut
    useEffect(() => {
      if (checklists.length > 0) {
        const allChecklistIds = checklists.map(checklist => checklist.id);
        setExpandedChecklists(allChecklistIds);
      }
    }, [checklists]);



    
      // Otomasyon kurallarını kontrol et
      const checkAutomationRules = async (cardId, listId) => {
        try {
          console.log('Checking automation rules for card:', cardId, 'in list:', listId);
          
          // Listenin otomasyon kurallarını al
          const { data: rules } = await axios.get(`http://localhost:5001/api/kanban/lists/${listId}/automation-rules`);
          console.log('Found automation rules:', rules);
          
          // Kartın checklist'lerini al
          const { data: checklists } = await axios.get(`http://localhost:5001/api/kanban/cards/${cardId}/checklists`);
          console.log('Card checklists:', checklists);
      
          for (const rule of rules) {
            let shouldMove = false;
      
            if (rule.condition_type === 'specific_checklists') {
              const targetChecklists = checklists.filter(checklist => 
                rule.checklist_template_ids.includes(checklist.template_id)
              );
              console.log('Target checklists:', targetChecklists);
              console.log('Template IDs to check:', rule.checklist_template_ids);
      
              shouldMove = targetChecklists.length > 0 && targetChecklists.every(checklist => {
                const isCompleted = checklist.items.every(item => item.is_completed);
                console.log(`Checklist ${checklist.id} completion status:`, isCompleted);
                return isCompleted;
              });
              
              console.log('Should move card:', shouldMove);
            }
      
            if (shouldMove && rule.target_list_id !== listId) {
                await axios.put(`http://localhost:5001/api/kanban/cards/${cardId}/position`, {
                  list_id: rule.target_list_id,
                  position: 0
                });
        
      
                message.success('Kart otomatik olarak taşındı');
        
                if (onUpdate) {
                  await onUpdate();  // Prop olarak gelen fonksiyonu çağır
                }
              return true;
            }
          }
      
          return false;
        } catch (error) {
          console.error('Error checking automation rules:', error);
          return false;
        }
      };

 // Checklist'leri getir
 const fetchChecklists = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/cards/${card.id}/checklists`);
      setChecklists(response.data || []);
    } catch (error) {
      console.error('Error fetching checklists:', error);
      message.error('Yapılacaklar listesi yüklenirken hata oluştu');
    }
  };

  // Maddeleri işaretle/işareti kaldır
  const handleToggleItem = async (itemId, isCompleted, checklistId) => {
    try {
      // Maddeyi güncelle
      await axios.put(`http://localhost:5001/api/kanban/checklist-items/${itemId}`, {
        is_completed: isCompleted
      });

      // Mevcut checklist'i bul
      const currentChecklist = checklists.find(cl => cl.id === checklistId);
      if (currentChecklist) {
        const updatedItems = currentChecklist.items.map(item => 
          item.id === itemId ? { ...item, is_completed: isCompleted } : item
        );

        const allCompleted = updatedItems.every(item => item.is_completed);
        
        if (allCompleted) {
          // Checklist'i kapat
          setExpandedChecklists(prev => prev.filter(id => id !== checklistId));
        }
      }

      // Güncel checklist'leri getir
      await fetchChecklists();
      
      // Otomasyon kurallarını kontrol et
      await checkAutomationRules(card.id, card.list_id);
    } catch (error) {
      console.error('Error toggling item:', error);
      message.error('İşlem güncellenirken hata oluştu');
    }
  };

    // useEffect ile başlangıçta tüm checklistleri aç
    useEffect(() => {
        if (checklists.length > 0) {
          const uncompleteChecklistIds = checklists
            .filter(checklist => !isChecklistCompleted(checklist))
            .map(checklist => checklist.id);
          setExpandedChecklists(uncompleteChecklistIds);
        }
      }, [checklists]);
  
  const checkCardAutomation = async (listId, cardId) => {
    try {
      // Listenin otomasyon kurallarını al
      const rulesResponse = await axios.get(`http://localhost:5001/api/kanban/lists/${listId}/automation-rules`);
      const rules = rulesResponse.data;
  
      // Kartın tüm checklist'lerini al
      const checklistResponse = await axios.get(`http://localhost:5001/api/kanban/cards/${cardId}/checklists`);
      const cardChecklists = checklistResponse.data;
  
      for (const rule of rules) {
        let shouldMove = false;
  
        if (rule.condition_type === 'all_checklists') {
          // Tüm checklistler tamamlanmış mı kontrol et
          shouldMove = cardChecklists.every(checklist => 
            checklist.items.every(item => item.is_completed)
          );
        } else if (rule.condition_type === 'specific_checklists') {
          // Sadece belirli şablonlardan oluşturulan checklistler tamamlanmış mı kontrol et
          const targetChecklists = cardChecklists.filter(checklist => 
            rule.checklist_template_ids.includes(checklist.template_id)
          );
          
          shouldMove = targetChecklists.length > 0 && targetChecklists.every(checklist =>
            checklist.items.every(item => item.is_completed)
          );
        }
  
        if (shouldMove) {
          // Kartı hedef listeye taşı
          await axios.put(`http://localhost:5001/api/kanban/cards/${cardId}/position`, {
            list_id: rule.target_list_id,
            position: 0
          });
  
          message.success('Kart otomatik olarak taşındı');
          break; // İlk eşleşen kuralda dur
        }
      }
    } catch (error) {
      console.error('Automation check error:', error);
    }
  };
  


  // Checklist'i aç/kapat
  const toggleChecklist = (checklistId) => {
    setExpandedChecklists(prev => {
      if (prev.includes(checklistId)) {
        return prev.filter(id => id !== checklistId);
      }
      return [...prev, checklistId];
    });
  };



  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/kanban/checklist-templates`);
      setTemplates(response.data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      message.error('Şablonlar yüklenirken hata oluştu');
    }
  };

  useEffect(() => {
    if (card?.id) {
      fetchChecklists();
      fetchTemplates();
    }
  }, [card?.id]);

  const handleAddChecklist = async () => {
    if (!selectedTemplate) {
      message.error('Lütfen bir şablon seçin');
      return;
    }

    try {
      setLoading(true);
      await axios.post(`http://localhost:5001/api/kanban/cards/${card.id}/checklists`, {
        template_id: parseInt(selectedTemplate)
      });
      fetchChecklists();
      message.success('Checklist eklendi');
      setIsModalVisible(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error adding checklist:', error);
      message.error('Checklist eklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };



  return (
    <Collapse defaultActiveKey={['checklist']}>
      <Panel 
        header={
          <Space>
            <CheckSquareOutlined />
            <span>Yapılacaklar Listesi</span>
          </Space>
        }
        key="checklist"
      >
        {checklists.map((checklist) => {
          const isCompleted = isChecklistCompleted(checklist);
          const isExpanded = expandedChecklists.includes(checklist.id);

          return (
            <Card 
              key={checklist.id} 
              size="small" 
              style={{ 
                marginBottom: 16,
                backgroundColor: isCompleted ? '#f6ffed' : 'white',
                border: isCompleted ? '1px solid #b7eb8f' : '1px solid #d9d9d9'
              }}
            >
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => toggleChecklist(checklist.id)}
              >
                <Space>
                  <CaretRightOutlined
                    rotate={isExpanded ? 90 : 0}
                    style={{ transition: 'all 0.3s' }}
                  />
                  <span>{checklist.title}</span>
                  {isCompleted && (
                    <Tag color="success">Tamamlandı</Tag>
                  )}
                  {!isCompleted && (
                    <Tag color="processing">
                      {checklist.items?.filter(item => item.is_completed).length || 0}/
                      {checklist.items?.length || 0}
                    </Tag>
                  )}
                  {checklist.auto_applied && (
                    <Tag color="blue">Otomatik Eklendi</Tag>
                  )}
                </Space>
                <div>
                  {!isCompleted && (
                    <Progress 
                      percent={Math.round(
                        (checklist.items?.filter(item => item.is_completed).length || 0) / 
                        (checklist.items?.length || 1) * 100
                      )} 
                      size="small" 
                      style={{ width: 100 }}
                    />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 16 }}>
                  {checklist.items?.map((item) => (
                    <div key={item.id} style={{ marginBottom: 8 }}>
                      <Checkbox
                        checked={item.is_completed}
                        onChange={(e) => handleToggleItem(item.id, e.target.checked, checklist.id)}
                      >
                        <span style={{ 
                          textDecoration: item.is_completed ? 'line-through' : 'none',
                          color: item.is_completed ? '#999' : 'inherit'
                        }}>
                          {item.content}
                        </span>
                      </Checkbox>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        ...
      </Panel>
    </Collapse>
  );
};

export default CardChecklist;