import React, { useEffect, useState } from 'react';
import { Tabs, Table, Form, Input, Button, Upload, message, Modal, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const SettingsForm = () => {
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [contentTypes, setContentTypes] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [invalidEntries, setInvalidEntries] = useState([]); // Hatalı kart numaralarını saklamak için
  const [personnelList, setPersonnelList] = useState([]); // Personel listesi için
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal görünürlük durumu
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(null); // Seçilen personel ID'si
  const [selectedEntry, setSelectedEntry] = useState(null); // Seçilen hatalı satır

  useEffect(() => {
    fetchDepartments();
    fetchTitles();
    fetchContentTypes();
    fetchPersonnel(); // Personel listesini getir
  }, []);



  // Benzersiz kart numaralarını filtreleyelim
const uniqueInvalidEntries = Array.from(new Set(invalidEntries.map(entry => entry['Kart No'])))
.map(kartNo => {
  return invalidEntries.find(entry => entry['Kart No'] === kartNo);
});


  const fetchDepartments = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/departments');
      setDepartments(response.data);
    } catch (error) {
      message.error('Failed to load departments');
    }
  };

  const fetchTitles = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/titles');
      setTitles(response.data);
    } catch (error) {
      message.error('Failed to load titles');
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/content-types');
      setContentTypes(response.data);
    } catch (error) {
      message.error('Failed to load content types');
    }
  };

  const fetchPersonnel = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/personnel');
      setPersonnelList(response.data); // Tüm personel listesini getir
    } catch (error) {
      message.error('Failed to load personnel list');
    }
  };

  // Modal'ı açma ve seçilen satırı işleme
  const handleRowClick = (record) => {
    setSelectedEntry(record); // Hatalı satırı sakla
    setIsModalVisible(true); // Modal'ı aç
  };

// Modal'da personel seçimi ve kaydetme
const handleSave = async () => {
  if (!selectedPersonnelId) {
    message.warning('Lütfen bir personel seçin.');
    return;
  }

  try {
    const response = await axios.post('http://localhost:5001/api/update-attendance', {
      personnelId: selectedPersonnelId,
      cardNumber: selectedEntry['Kart No'],
    });

    if (response.status === 200) {
      message.success('Personel başarıyla eşleştirildi!');

      // Eşleştirilen kaydı hatalılar listesinden kaldırıyoruz
      const updatedEntries = invalidEntries.filter(entry => entry['Kart No'] !== selectedEntry['Kart No']);
      setInvalidEntries(updatedEntries);

      // Modal'ı kapat
      setIsModalVisible(false);
    }
  } catch (error) {
    message.error('Güncelleme sırasında bir hata oluştu');
  }
};


  // Yeni departman ekleme fonksiyonu
  const onAddDepartment = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/departments', values);
      message.success('Department added successfully!');
      fetchDepartments(); // Yeni departman eklemek için listeyi yenile
    } catch (error) {
      if (error.response && error.response.status === 400) {
        message.error(error.response.data.error);  // Backend'den gelen hata mesajını göster
      } else {
        console.error('Error adding department:', error);
        message.error('There was an error adding the department');
      }
    }
  };

  // Yeni title ekleme fonksiyonu
  const onAddTitle = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/titles', values);
      message.success('Title added successfully!');
      fetchTitles(); // Yeni title eklemek için listeyi yenile
    } catch (error) {
      if (error.response && error.response.status === 400) {
        message.error(error.response.data.error);  // Backend'den gelen hata mesajını göster
      } else {
        console.error('Error adding title:', error);
        message.error('There was an error adding the title');
      }
    }
  };

  // Yeni içerik türü ekleme fonksiyonu
  const onAddContentType = async (values) => {
    try {
      await axios.post('http://localhost:5001/api/content-types', values);
      message.success('Content type added successfully!');
      fetchContentTypes(); // Yeni content type eklemek için listeyi yenile
    } catch (error) {
      if (error.response && error.response.status === 400) {
        message.error(error.response.data.error);  // Backend'den gelen hata mesajını göster
      } else {
        console.error('Error adding content type:', error);
        message.error('There was an error adding the content type');
      }
    }
  };

  // Dosya yükleme ve hatalı kart numaralarını gösterme
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', fileList[0]); // İlk dosyayı alıyoruz
  
    try {
      const response = await axios.post('http://localhost:5001/api/upload-attendance', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      // Eşleştirilemeyen kartlar ve tekrarlanan kayıtlar için farklı bildirimler veriyoruz
      if (response.data.invalidEntries && response.data.invalidEntries.length > 0) {
        setInvalidEntries(response.data.invalidEntries);
        message.warning('Bazı kart numaraları eşleştirilemedi.');
      }
  
      if (response.data.skippedEntries && response.data.skippedEntries.length > 0) {
        message.info('Bazı kayıtlar zaten mevcut olduğu için atlandı.');
      }
  
      if (!response.data.invalidEntries && !response.data.skippedEntries) {
        message.success('Dosya başarıyla yüklendi.');
        setInvalidEntries([]);
      }
  
      setFileList([]);
    } catch (error) {
      message.error('Dosya yüklenirken hata oluştu.');
    }
  };
  

  const invalidColumns = [
    { title: 'Kart No', dataIndex: 'Kart No', key: 'Kart No' },
    { title: 'Adı', dataIndex: 'Adı', key: 'Adı' },
    { title: 'Soyadı', dataIndex: 'Soyadı', key: 'Soyadı' },
    { title: 'Giriş Tarihi', dataIndex: 'Giriş Tarihi', key: 'Giriş Tarihi' },
    { title: 'Sebep', dataIndex: 'reason', key: 'reason' },
    {
      title: 'İşlem',
      render: (_, record) => (
        <Button type="link" onClick={() => handleRowClick(record)}>
          Personel Eşleştir
        </Button>
      ),
    },
  ];

  // Tabs için items yapılandırması
  const tabItems = [
    {
      key: '1',
      label: 'Departments',
      children: (
        <>
          <Form layout="vertical" onFinish={onAddDepartment}>
            <Form.Item
              name="name"
              label="Department Name"
              rules={[{ required: true, message: 'Please input the department name!' }]}
            >
              <Input placeholder="Enter department name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Department
              </Button>
            </Form.Item>
          </Form>

          {/* Departmanları Listeleme */}
          <Table
            dataSource={departments}
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id' },
              { title: 'Department Name', dataIndex: 'name', key: 'name' },
            ]}
            rowKey="id"
          />
        </>
      ),
    },
    {
      key: '2',
      label: 'Titles',
      children: (
        <>
          <Form layout="vertical" onFinish={onAddTitle}>
            <Form.Item
              name="name"
              label="Title Name"
              rules={[{ required: true, message: 'Please input the title name!' }]}
            >
              <Input placeholder="Enter title name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Title
              </Button>
            </Form.Item>
          </Form>

          {/* Title'ları Listeleme */}
          <Table
            dataSource={titles}
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id' },
              { title: 'Title Name', dataIndex: 'name', key: 'name' },
            ]}
            rowKey="id"
          />
        </>
      ),
    },
    {
      key: '3',
      label: 'Content Types',
      children: (
        <>
          <Form layout="vertical" onFinish={onAddContentType}>
            <Form.Item
              name="name"
              label="Content Type Name"
              rules={[{ required: true, message: 'Please input the content type name!' }]}
            >
             
             <Input placeholder="Enter content type name" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Add Content Type
              </Button>
            </Form.Item>
          </Form>

          {/* İçerik Türlerini Listeleme */}
          <Table
            dataSource={contentTypes}
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id' },
              { title: 'Content Type Name', dataIndex: 'name', key: 'name' },
            ]}
            rowKey="id"
          />
        </>
      ),
    },
    {
      key: '4',
      label: 'Import Attendance',
      children: (
        <>
          <Upload
            beforeUpload={(file) => {
              setFileList([file]);
              return false; // Dosyanın otomatik yüklenmesini engelliyoruz
            }}
            fileList={fileList}
            onRemove={() => setFileList([])}
          >
            <Button icon={<UploadOutlined />}>Select File</Button>
          </Upload>
          <Button
            type="primary"
            onClick={handleUpload}
            disabled={fileList.length === 0}
            style={{ marginTop: 16 }}
          >
            Upload and Import Attendance
          </Button>

          {/* Hatalı Kart Numaraları Tabloda Gösterme */}

          {uniqueInvalidEntries.length > 0 && (
            <>
              <h3>Hatalı Kayıtlar</h3>
              <Table
                dataSource={uniqueInvalidEntries}  // Filtrelenmiş benzersiz kart numaraları
                columns={invalidColumns}
                rowKey="Kart No"
              />
            </>
          )}
                    
        </>
      ),
    },
  ];

  return (
    <>
      <Tabs items={tabItems} defaultActiveKey="1" />


      {/* Personel Seçim Modal'ı */}
      <Modal
        title="Personel Seç"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={handleSave}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Personel Seç"
          onChange={(value) => setSelectedPersonnelId(value)}
          value={selectedPersonnelId} // value ayarlanmış olmalı
        >
          {personnelList.map((personnel) => (
            <Option key={personnel.id} value={personnel.id}>
              {personnel.first_name} {personnel.last_name}
            </Option>
          ))}
        </Select>
      </Modal>
    </>
  );
};


export default SettingsForm;
