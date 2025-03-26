import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, message, Space } from 'antd';
import axios from 'axios';
import dayjs from 'dayjs';

const { TextArea } = Input;

const TaskAssignmentForm = ({ visible, onClose, onCardCreated, users, lists }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [productionTypes, setProductionTypes] = useState([]);
  const [productFamilies, setProductFamilies] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedProductionType, setSelectedProductionType] = useState(null);

  useEffect(() => {
    // Request interceptor ekleyin
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
  
    // Response interceptor ekleyin
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productionTypesRes, conceptsRes, companiesRes] = await Promise.all([
          axios.get('http://localhost:5001/api/design/production-types'),
          axios.get('http://localhost:5001/api/design/concepts'),
          axios.get('http://localhost:5001/api/design/companies'),
        ]);
        setProductionTypes(productionTypesRes.data);
        setConcepts(conceptsRes.data);
        setCompanies(companiesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Veriler yüklenirken hata oluştu');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchProductFamilies = async () => {
      if (selectedProductionType) {
        try {
          const response = await axios.get('http://localhost:5001/api/design/product-families');
          setProductFamilies(response.data.filter(family => 
            family.production_type_id === selectedProductionType
          ));
        } catch (error) {
          console.error('Error fetching product families:', error);
        }
      } else {
        setProductFamilies([]);
      }
    };
    fetchProductFamilies();
  }, [selectedProductionType]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const firstListId = lists[0]?.id;
      if (!firstListId) {
        message.error('Liste bulunamadı');
        return;
      }
  
      const initialPayload = {
        list_id: firstListId,
        content: values.title,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
        priority: values.priority || null,
        created_by: localStorage.getItem('userId')
      };
  
      const response = await axios.post('http://localhost:5001/api/kanban/cards', initialPayload);
      const newCard = response.data;
  
      const idCode = `${values.production_type.toString().padStart(2, '0')}${values.product_family.toString().padStart(2, '0')}${values.concept.toString().padStart(2, '0')}-${newCard.id}`;
      
      const productionType = productionTypes.find(t => t.id === values.production_type)?.name;
      const productFamily = productFamilies.find(f => f.id === values.product_family)?.name;
      const concept = concepts.find(c => c.id === values.concept)?.name;
      const company = companies.find(c => c.id === values.company)?.name;
  
      const description = `İş No: ${idCode}\n\n${values.description || ''}\n\nÜretim Tipi: ${productionType}\nÜrün Ailesi: ${productFamily}\nDizayn Konsept: ${concept}\nŞirket: ${company}`;
  
      await axios.put(`http://localhost:5001/api/kanban/cards/${newCard.id}`, {
        title: values.title,
        content: values.title,
        description: description,
        archive_number: idCode,
        assigned_to: values.assigned_to || null,
        due_date: values.due_date ? dayjs(values.due_date).format('YYYY-MM-DD') : null,
        priority: values.priority || null,
        created_by: localStorage.getItem('userId')
      });

      // Get templates for the first list
      const templatesResponse = await axios.get(`http://localhost:5001/api/kanban/lists/${firstListId}/checklist-templates`);
      const templates = templatesResponse.data;

      if (templates?.length > 0) {
        for (const tpl of templates) {
          await axios.post(`http://localhost:5001/api/kanban/cards/${newCard.id}/checklists`, {
            template_id: tpl.id,
            auto_applied: true
          });
        }
      }

      message.success('Görev başarıyla oluşturuldu!');
      onCardCreated(newCard);
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Görev oluşturma hatası:', error);
      message.error('Görev oluşturulurken bir hata oluştu.');
    }
    setLoading(false);
  };

  return (
    <Modal title="Görev Atama" open={visible} onCancel={onClose} footer={null}>
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="production_type" label="Üretim Tipi" rules={[{ required: true }]}>
          <Select placeholder="Üretim tipi seçin" onChange={(value) => setSelectedProductionType(value)}>
            {productionTypes.map(type => (
              <Select.Option key={type.id} value={type.id}>{type.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="product_family" label="Ürün Ailesi" rules={[{ required: true }]}>
          <Select placeholder="Ürün ailesi seçin" disabled={!selectedProductionType}>
            {productFamilies.map(family => (
              <Select.Option key={family.id} value={family.id}>{family.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="concept" label="Dizayn Konsept" rules={[{ required: true }]}>
          <Select placeholder="Konsept seçin">
            {concepts.map(concept => (
              <Select.Option key={concept.id} value={concept.id}>{concept.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="company" label="Şirket" rules={[{ required: true }]}>
          <Select placeholder="Şirket seçin">
            {companies.map(company => (
              <Select.Option key={company.id} value={company.id}>{company.name}</Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Existing form items */}
        <Form.Item name="title" label="Görev Başlığı" rules={[{ required: true }]}>
          <Input placeholder="Görev başlığını girin" />
        </Form.Item>

        <Form.Item name="description" label="Açıklama">
          <TextArea rows={4} placeholder="Görev açıklamasını girin" />
        </Form.Item>

        <Form.Item name="assigned_to" label="Atanacak Kişi">
          <Select placeholder="Kişi seçin">
            {users.map(user => (
              <Select.Option key={user.id} value={user.id}>{user.username}</Select.Option>
            ))}
          </Select>
        </Form.Item>


        <Form.Item name="due_date" label="Bitiş Tarihi">
          <DatePicker style={{ width: '100%' }} placeholder="Bitiş tarihini seçin" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Görev Ata
            </Button>
            <Button onClick={onClose}>İptal</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskAssignmentForm;