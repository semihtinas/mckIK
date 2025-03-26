import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  Tabs, 
  Input, 
  Button, 
  List, 
  Tag, 
  message, 
  Space,
  Select,
  Card,
  Collapse,
  Modal,
  Form
} from 'antd';
import { 
  DeleteOutlined, 
  SettingOutlined, 
  PlusOutlined,
  EditOutlined
} from '@ant-design/icons';
import axios from 'axios';
import DesignCompanyTab from './components/DesignCompanyTab';
import ProductionTypeTab from './components/ProductionTypeTab';
import ProductFamilyTab from './components/ProductFamilyTab';
import ConceptTab from './components/ConceptTab';

const { Panel } = Collapse;
const { TabPane } = Tabs;

const KanbanSettings = ({ visible, onClose }) => {
  const [labels, setLabels] = useState([]);
  const [lists, setLists] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#1890ff');
  const [automationRules, setAutomationRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [isAutomationModalVisible, setIsAutomationModalVisible] = useState(false);
  const [selectedSourceListId, setSelectedSourceListId] = useState(null);
  const [automationForm] = Form.useForm();
  
  // Eksik state'leri ekleyelim
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [selectedListId, setSelectedListId] = useState(null);
  const [templateForm] = Form.useForm();

  useEffect(() => {
    if (visible) {
      fetchLabels();
      fetchLists();
      fetchAutomationRules();
      fetchTemplates();
    }
  }, [visible]);

  // Otomasyon kurallarını getir
  const fetchAutomationRules = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/kanban/automation-rules');
      setAutomationRules(response.data);
    } catch (error) {
      message.error('Otomasyon kuralları yüklenirken hata oluştu');
    }
  };

  const fetchLabels = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/kanban/labels');
      setLabels(response.data);
    } catch (error) {
      message.error('Etiketler yüklenirken hata oluştu');
    }
  };

  const fetchLists = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/kanban');
      setLists(response.data);
    } catch (error) {
      message.error('Listeler yüklenirken hata oluştu');
    }
  };

// Şablonları getir
const fetchTemplates = async () => {
  try {
    const response = await axios.get('http://localhost:5001/api/kanban/checklist-templates');
    setTemplates(response.data);
  } catch (error) {
    message.error('Şablonlar yüklenirken hata oluştu');
  }
};

const showAutomationModal = (listId) => {
  setSelectedSourceListId(listId);
  setIsAutomationModalVisible(true);
};


const handleAddAutomationRule = async (values) => {
  try {
    await axios.post('http://localhost:5001/api/kanban/lists/automation-rules', {
      source_list_id: selectedSourceListId,
      target_list_id: values.target_list_id,
      condition_type: values.condition_type,
      checklist_template_ids: values.checklist_template_ids || []
    });
    
    fetchAutomationRules();
    setIsAutomationModalVisible(false);
    automationForm.resetFields();
    message.success('Otomasyon kuralı eklendi');
  } catch (error) {
    message.error('Otomasyon kuralı eklenirken hata oluştu');
  }
};

const handleDeleteRule = async (ruleId) => {
  try {
    await axios.delete(`http://localhost:5001/api/kanban/automation-rules/${ruleId}`);
    fetchAutomationRules();
    message.success('Kural silindi');
  } catch (error) {
    message.error('Kural silinirken hata oluştu');
  }
};

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      await axios.post('http://localhost:5001/api/kanban/labels', {
        name: newLabelName,
        color: newLabelColor
      });
      fetchLabels();
      setNewLabelName('');
      setNewLabelColor('#1890ff');
    } catch (error) {
      message.error('Etiket eklenirken hata oluştu');
    }
  };

  const handleDeleteLabel = async (labelId) => {
    try {
      await axios.delete(`http://localhost:5001/api/kanban/labels/${labelId}`);
      fetchLabels();
    } catch (error) {
      message.error('Etiket silinirken hata oluştu');
    }
  };

  const handleAddTemplate = async (values) => {
    try {
      // Form verilerini düzenle
      const formData = {
        list_id: parseInt(selectedListId), // string'i integer'a çevir
        title: values.title.trim(),
        items: values.items
          .filter(item => item && item.trim()) // Boş maddeleri filtrele
          .map(item => ({ // Her madde için bir obje oluştur
            content: item.trim()
          }))
      };
  
      console.log('Sending template data:', formData); // Debug için
  
      const response = await axios.post('http://localhost:5001/api/kanban/checklist-templates', formData);
  
      fetchTemplates();
      setIsTemplateModalVisible(false);
      templateForm.resetFields();
      message.success('Şablon başarıyla eklendi');
    } catch (error) {
      console.error('Template creation error:', error.response?.data || error);
      message.error(
        error.response?.data?.detail || 
        'Şablon eklenirken bir hata oluştu'
      );
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await axios.delete(`http://localhost:5001/api/kanban/checklist-templates/${templateId}`);
      fetchTemplates();
      message.success('Şablon silindi');
    } catch (error) {
      message.error('Şablon silinirken hata oluştu');
    }
  };

  const showTemplateModal = (listId) => {
    if (!listId || isNaN(listId)) {
      message.error('Geçerli bir liste seçilmedi');
      return;
    }
    setSelectedListId(parseInt(listId));
    setIsTemplateModalVisible(true);
  };

  const TemplateForm = () => (
    <Form form={templateForm} onFinish={handleAddTemplate} layout="vertical">
      <Form.Item
        name="title"
        label="Şablon Başlığı"
        rules={[{ required: true, message: 'Lütfen şablon başlığı girin' }]}
      >
        <Input placeholder="Şablon başlığı" />
      </Form.Item>

      <Form.List name="items">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name }) => (
              <Space key={key} style={{ display: 'flex', marginBottom: 8 }}>
                <Form.Item
                  name={name}
                  rules={[{ required: true, message: 'Boş madde olamaz' }]}
                >
                  <Input placeholder="Yapılacak iş" />
                </Form.Item>
                <DeleteOutlined onClick={() => remove(name)} />
              </Space>
            ))}
            <Form.Item>
              <Button
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
              >
                Yeni Madde Ekle
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>
    </Form>
  );

  return (
    <Drawer
      title="Kanban Ayarları"
      placement="right"
      onClose={onClose}
      open={visible}
      width={600}
    >
      <Tabs defaultActiveKey="labels">
        <TabPane tab="Etiketler" key="labels">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                placeholder="Etiket adı"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
              />
              <Input
                type="color"
                value={newLabelColor}
                onChange={e => setNewLabelColor(e.target.value)}
                style={{ width: 50 }}
              />
              <Button type="primary" onClick={handleAddLabel}>
                Ekle
              </Button>
            </div>

            <List
              dataSource={labels}
              renderItem={label => (
                <List.Item>
                  <Tag color={label.color}>{label.name}</Tag>
                  <Button 
                    type="text"
                    danger
                    icon={<DeleteOutlined />} 
                    onClick={() => handleDeleteLabel(label.id)}
                  />
                </List.Item>
              )}
            />
          </Space>
        </TabPane>

        <TabPane tab="Yapılacaklar Şablonları" key="templates">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {lists.map(list => (
              <Card 
                key={list.id}
                title={list.title}
                extra={
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => showTemplateModal(list.id)}
                  >
                    Şablon Ekle
                  </Button>
                }
              >
                <List
                  dataSource={templates.filter(t => t.list_id === list.id)}
                  renderItem={template => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteTemplate(template.id)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={template.title}
                        description={
                          <Collapse ghost>
                            <Panel header="Maddeler">
                              <ul>
                                {template.items.map((item, index) => (
                                  <li key={index}>{item.content}</li>
                                ))}
                              </ul>
                            </Panel>
                          </Collapse>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </Space>
        </TabPane>

       {/* Otomasyon tab'i */}
       <TabPane tab="Otomasyon Kuralları" key="automation">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {lists.map(sourceList => (
              <Card 
                key={sourceList.id}
                title={sourceList.title}
                extra={
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />}
                    onClick={() => showAutomationModal(sourceList.id)}
                  >
                    Kural Ekle
                  </Button>
                }
              >
                <List
                  dataSource={automationRules.filter(rule => rule.source_list_id === sourceList.id)}
                  renderItem={rule => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleDeleteRule(rule.id)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        title={`${rule.condition_type === 'all_checklists' ? 
                          'Tüm checklistler tamamlandığında' : 
                          'Seçili checklistler tamamlandığında'} →
                          ${lists.find(l => l.id === rule.target_list_id)?.title}`}
                        description={
                          rule.condition_type === 'specific_checklists' && (
                            <div>
                              İzlenen şablonlar:{' '}
                              {rule.checklist_template_ids.map(templateId => (
                                <Tag key={templateId}>
                                  {templates.find(t => t.id === templateId)?.title}
                                </Tag>
                              ))}
                            </div>
                          )
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </Space>
        </TabPane>


        <TabPane tab="Design Ayarları" key="designSettings">
    <Tabs tabPosition="left">
      <TabPane tab="Şirketler" key="companies">
        <DesignCompanyTab />
      </TabPane>
      <TabPane tab="Üretim Türleri" key="productionTypes">
        <ProductionTypeTab />
      </TabPane>
      <TabPane tab="Ürün Aileleri" key="productFamilies">
        <ProductFamilyTab />
      </TabPane>
      <TabPane tab="Konseptler" key="concepts">
        <ConceptTab />
      </TabPane>
    </Tabs>
  </TabPane>


      </Tabs>


      <Modal
        title="Yeni Yapılacaklar Şablonu"
        open={isTemplateModalVisible}
        onOk={templateForm.submit}
        onCancel={() => {
          setIsTemplateModalVisible(false);
          templateForm.resetFields();
        }}
        width={600}
      >
        <TemplateForm />
      </Modal>


    {/* Otomasyon Kuralı Ekleme Modal'ı */}
    <Modal
        title="Otomasyon Kuralı Ekle"
        open={isAutomationModalVisible}
        onOk={automationForm.submit}
        onCancel={() => {
          setIsAutomationModalVisible(false);
          automationForm.resetFields();
        }}
      >
        <Form form={automationForm} onFinish={handleAddAutomationRule} layout="vertical">
          <Form.Item
            name="target_list_id"
            label="Hedef Liste"
            rules={[{ required: true, message: 'Lütfen hedef liste seçin' }]}
          >
            <Select placeholder="Liste seçin">
              {lists.filter(l => l.id !== selectedSourceListId).map(list => (
                <Select.Option key={list.id} value={list.id}>
                  {list.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="condition_type"
            label="Koşul Tipi"
            rules={[{ required: true, message: 'Lütfen koşul tipi seçin' }]}
          >
            <Select placeholder="Koşul tipi seçin">
              <Select.Option value="all_checklists">
                Tüm checklistler tamamlandığında
              </Select.Option>
              <Select.Option value="specific_checklists">
                Seçili checklistler tamamlandığında
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.condition_type !== currentValues.condition_type
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('condition_type') === 'specific_checklists' && (
                <Form.Item
                  name="checklist_template_ids"
                  label="İzlenecek Şablonlar"
                  rules={[{ required: true, message: 'Lütfen en az bir şablon seçin' }]}
                >
                  <Select mode="multiple" placeholder="Şablonları seçin">
                    {templates.map(template => (
                      <Select.Option key={template.id} value={template.id}>
                        {template.title}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>


    </Drawer>
  );
};

export default KanbanSettings;