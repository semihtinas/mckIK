// ExpenseRequestForm.js

import React, { useState, useEffect } from 'react';
import { Form, InputNumber, Select, Button, Upload, message, Input } from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';

const { Option } = Select;
const API_URL = 'http://localhost:5001/api/expenses-management';

export const ExpenseRequestForm = ({ onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [selectedContentType, setSelectedContentType] = useState(null);

  useEffect(() => {
    fetchCategories();
    fetchContentTypes();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Kategoriler yüklenemedi');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      message.error('Kategoriler yüklenirken hata oluştu');
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await fetch(`${API_URL}/content-types`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Döküman tipleri yüklenemedi');
      const data = await response.json();
      setContentTypes(data);
    } catch (error) {
      message.error('Döküman tipleri yüklenirken hata oluştu');
    }
  };

  const analyzeDocument = async (file) => {
    try {
      setAnalyzing(true);
      const formData = new FormData();
      formData.append('file', file);
  
      const response = await fetch('http://localhost:5001/api/expenses/analyze-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
  
      if (!response.ok) throw new Error('Analiz başarısız');
      const data = await response.json();
  
      if (data.success) {
        form.setFieldsValue({
          amount: data.data.amount,
          description: `Satıcı: ${data.data.vendor || 'Bilinmiyor'}\n${
            data.data.items?.map(item => `${item.description}: ${item.amount} TL`).join('\n') || ''
          }`,
        });
        message.success('Belge başarıyla analiz edildi');
      }
    } catch (error) {
      console.error('Analiz hatası:', error);
      message.error('Belge analizi başarısız oldu');
    } finally {
      setAnalyzing(false);
    }
  };

  const validateFile = async (file, contentTypeId) => {
    try {
      const response = await fetch(
        `${API_URL}/content-types/${contentTypeId}/validate?` +
        `filename=${encodeURIComponent(file.name)}&filesize=${file.size}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Dosya doğrulama hatası');
      const validation = await response.json();

      if (!validation.isValid.extension) {
        message.error(validation.errors.extension);
        return false;
      }
      if (!validation.isValid.size) {
        message.error(validation.errors.size);
        return false;
      }
      if (!validation.isValid.active) {
        message.error(validation.errors.active);
        return false;
      }

      return true;
    } catch (error) {
      message.error('Dosya doğrulama başarısız');
      return false;
    }
  };

  const handleUploadChange = async ({ file, fileList: newFileList }) => {
    const contentTypeId = form.getFieldValue('content_type_id');
    if (!contentTypeId) {
      message.error('Lütfen önce döküman tipini seçin');
      return;
    }

    if (file.status !== 'removed') {
      const isValid = await validateFile(file, contentTypeId);
      if (!isValid) {
        return;
      }

      if (file.type && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        analyzeDocument(file);
      }
    }

    setFileList(newFileList);
  };

  const renderCategoryOptions = (categories, level = 0) => {
    return categories.map(category => {
      const prefix = '\u00A0'.repeat(level * 4);
      
      const options = [
        <Option key={category.id} value={category.id}>
          {prefix + category.name}
          {category.budget_limit && (
            <span style={{ float: 'right', color: '#888' }}>
              Limit: ₺{category.budget_limit.toLocaleString()}
            </span>
          )}
        </Option>
      ];

      if (category.children?.length > 0) {
        options.push(...renderCategoryOptions(category.children, level + 1));
      }

      return options;
    });
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      // Form değerlerini ekle
      Object.keys(values).forEach(key => {
        if (key !== 'files') {
          if (key === 'amount') {
            formData.append(key, parseFloat(values[key]));
          } else {
            formData.append(key, values[key]);
          }
        }
      });
  
      // Content type ID'yi dosyalar için kullan
      const contentTypeId = values.content_type_id;
  
      // Dosyaları ekle
      fileList.forEach(file => {
        formData.append('files', file.originFileObj);
      });
  
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Oturum bilgisi bulunamadı');
  
      const response = await fetch('http://localhost:5001/api/expenses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'İşlem başarısız');
      }
      
      message.success('Harcama talebi başarıyla oluşturuldu');
      form.resetFields();
      setFileList([]);
      setSelectedContentType(null);
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Hata:', error);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form 
      form={form} 
      onFinish={handleSubmit} 
      layout="vertical" 
      className="expense-request-form"
    >
      <Form.Item
        name="title"
        label="Harcama Başlığı"
        rules={[{ required: true, message: 'Lütfen harcama başlığı girin' }]}
      >
        <Input placeholder="Harcama başlığını girin" />
      </Form.Item>
      
      <Form.Item
        name="type"
        label="Harcama Tipi"
        rules={[{ required: true, message: 'Lütfen harcama tipini seçin' }]}
      >
        <Select placeholder="Harcama tipini seçin">
          <Option value="claim">Gerçekleşen Harcama</Option>
          <Option value="request">Harcama Talebi</Option>
        </Select>
      </Form.Item>

      <Form.Item
        name="category_id"
        label="Kategori"
        rules={[{ required: true, message: 'Lütfen kategori seçin' }]}
      >
        <Select 
          placeholder="Kategori seçin"
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children?.toString().toLowerCase().includes(input.toLowerCase())
          }
        >
          {renderCategoryOptions(categories)}
        </Select>
      </Form.Item>

      <Form.Item
        name="amount"
        label="Tutar"
        rules={[
          { required: true, message: 'Lütfen tutar girin' },
          {
            validator: async (_, value) => {
              if (!value || value <= 0) {
                return Promise.reject('Tutar 0\'dan büyük olmalıdır');
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <InputNumber
          style={{ width: '100%' }}
          min={0.01}
          step={0.01}
          precision={2}
          formatter={value => `₺ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={value => value.replace(/₺\s?|(,*)/g, '')}
          placeholder="0.00"
        />
      </Form.Item>

      <Form.Item
        name="content_type_id"
        label="Döküman Tipi"
        rules={[{ required: true, message: 'Lütfen döküman tipini seçin' }]}
      >
        <Select 
          placeholder="Döküman tipini seçin"
          onChange={(value) => {
            const contentType = contentTypes.find(ct => ct.id === value);
            setSelectedContentType(contentType);
            if (fileList.length > 0) {
              setFileList([]); // Döküman tipi değiştiğinde yüklü dosyaları temizle
              message.info('Döküman tipi değiştiği için yüklü dosyalar temizlendi');
            }
          }}
        >
          {contentTypes.map(type => (
            <Option key={type.id} value={type.id}>
              {type.name}
              <span style={{ float: 'right', color: '#888', fontSize: '12px' }}>
                ({type.file_extensions.join(', ')})
              </span>
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="description"
        label="Açıklama"
        rules={[{ required: true, message: 'Lütfen açıklama girin' }]}
      >
        <Input.TextArea 
          rows={4}
          placeholder="Harcama detaylarını açıklayın"
        />
      </Form.Item>

      <Form.Item
        name="files"
        label="Belgeler"
        extra={
          selectedContentType ? 
            `Desteklenen formatlar: ${selectedContentType.file_extensions.join(', ')} - 
             Maksimum dosya boyutu: ${(selectedContentType.max_file_size / (1024 * 1024)).toFixed(1)}MB` :
            'Lütfen önce döküman tipini seçin'
        }
      >
        <Upload.Dragger
          multiple={true}
          beforeUpload={() => false}
          fileList={fileList}
          onChange={handleUploadChange}
          disabled={!selectedContentType}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            Dosyaları buraya sürükleyin veya seçin
          </p>
          <p className="ant-upload-hint">
            {analyzing ? 
              'Dosya analiz ediliyor...' : 
              'PDF ve resim dosyaları otomatik olarak analiz edilecektir'
            }
          </p>
        </Upload.Dragger>
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
        >
          Harcama Talebini Gönder
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ExpenseRequestForm;