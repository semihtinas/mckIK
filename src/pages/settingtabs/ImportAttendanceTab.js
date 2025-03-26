import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Modal, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const ImportAttendanceTab = () => {
  const [fileList, setFileList] = useState([]);
  const [invalidEntries, setInvalidEntries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [personnelList, setPersonnelList] = useState([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchInvalidEntries();
    fetchPersonnelList();
  }, []);

  const fetchInvalidEntries = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/invalid-entries');
      console.log('Invalid entries response:', response.data);
      setInvalidEntries(response.data);
    } catch (error) {
      console.error('Error fetching invalid entries:', error);
      message.error('Hatalı kayıtlar alınırken bir sorun oluştu.');
    }
  };

  const fetchPersonnelList = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/personnel');
      if (response.data && response.data.length > 0) {
        setPersonnelList(response.data);
      } else {
        message.warning('Personel listesi boş.');
      }
    } catch (error) {
      console.error('Error fetching personnel list:', error);
      message.error('Personel listesi alınırken bir sorun oluştu.');
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.error('Lütfen bir dosya seçin');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    const file = fileList[0];

    console.log('Selected file details:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    formData.append('file', file);

    // FormData içeriğini kontrol et
    for (let pair of formData.entries()) {
      console.log('FormData content:', pair[0], pair[1]);
    }

    try {
      console.log('Sending upload request...');
      const response = await axios.post(
        'http://localhost:5001/api/upload-attendance',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log('Upload progress:', percentCompleted + '%');
          },
        }
      );

      console.log('Upload response:', response);

      if (response.status === 200) {
        if (response.data.invalidEntriesCount > 0) {
          message.warning(`${response.data.invalidEntriesCount} kart numarası eşleştirilemedi.`);
          await fetchInvalidEntries();
        } else {
          message.success('Dosya başarıyla yüklendi ve işlendi.');
        }

        if (response.data.skippedEntries?.length > 0) {
          message.info(`${response.data.skippedEntries.length} kayıt zaten mevcut olduğu için atlandı.`);
        }

        setFileList([]);
      }
    } catch (error) {
      console.error('Upload error details:', error);
      if (error.response) {
        // Sunucudan gelen hata yanıtı
        console.error('Server error response:', error.response.data);
        message.error(error.response.data.message || 'Dosya yüklenirken bir hata oluştu');
      } else if (error.request) {
        // İstek yapıldı ama yanıt alınamadı
        console.error('No response from server:', error.request);
        message.error('Sunucudan yanıt alınamadı. Lütfen bağlantınızı kontrol edin.');
      } else {
        // İstek oluşturulurken hata oluştu
        console.error('Request error:', error.message);
        message.error('Dosya yükleme isteği oluşturulamadı.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handlePersonnelMatch = (record) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleModalOk = async () => {
    if (!selectedPersonnelId) {
      message.error('Lütfen bir personel seçin.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/update-attendance', {
        personnelId: parseInt(selectedPersonnelId),
        cardNumber: selectedRecord.card_number,
        entryDate: selectedRecord.entry_date,
        entryTime: selectedRecord.entry_time,
        exitDate: selectedRecord.exit_date,
        exitTime: selectedRecord.exit_time
      });

      message.success(response.data);
      fetchInvalidEntries();
      setIsModalOpen(false);
      setSelectedPersonnelId(null);
    } catch (error) {
      console.error('Error matching personnel:', error);
      message.error('Personel eşleştirme sırasında bir hata oluştu.');
    }
  };

  const handleModalCancel = () => {
    setIsModalOpen(false);
    setSelectedPersonnelId(null);
  };

  const invalidColumns = [
    { title: 'Kart No', dataIndex: 'card_number', key: 'card_number' },
    { title: 'Giriş Tarihi', dataIndex: 'entry_date', key: 'entry_date' },
    { title: 'Giriş Saati', dataIndex: 'entry_time', key: 'entry_time' },
    { title: 'Çıkış Tarihi', dataIndex: 'exit_date', key: 'exit_date' },
    { title: 'Çıkış Saati', dataIndex: 'exit_time', key: 'exit_time' },
    { title: 'Hata Mesajı', dataIndex: 'error_message', key: 'error_message' },
    {
      title: 'İşlem',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => handlePersonnelMatch(record)}>
          Personel Eşleştir
        </Button>
      ),
    },
  ];

  return (
    <>
      <Upload
        beforeUpload={(file) => {
          console.log('Selected file:', file.name);
          if (!file.name.endsWith('.xlsx')) {
            message.error('Sadece .xlsx dosyaları yüklenebilir!');
            return false;
          }
          setFileList([file]);
          return false;
        }}
        fileList={fileList}
        onRemove={() => {
          console.log('Removing file');
          setFileList([]);
        }}
        accept=".xlsx"
      >
        <Button icon={<UploadOutlined />}>Dosya Seç</Button>
      </Upload>

      <Button
        type="primary"
        onClick={handleUpload}
        disabled={fileList.length === 0 || isUploading}
        loading={isUploading}
        style={{ marginTop: 16 }}
      >
        {isUploading ? 'Yükleniyor...' : 'Yoklamayı Yükle ve İçe Aktar'}
      </Button>

      {invalidEntries.length > 0 && (
        <>
          <h3>Hatalı Kayıtlar</h3>
          <Table
            dataSource={invalidEntries}
            columns={invalidColumns}
            rowKey="id"
          />
        </>
      )}

      <Modal
        title="Personel Eşleştirme"
        open={isModalOpen}
        onOk={handleModalOk}
        onCancel={handleModalCancel}
      >
        {selectedRecord ? (
          <>
            <p>Kart No: {selectedRecord.card_number}</p>
            <Select
              style={{ width: '100%' }}
              placeholder="Personel Seç"
              onChange={(value) => setSelectedPersonnelId(value)}
              value={selectedPersonnelId}
            >
              {personnelList.map((personnel) => (
                <Option key={personnel.id} value={personnel.id}>
                  {personnel.first_name} {personnel.last_name}
                </Option>
              ))}
            </Select>
            <p>Bu kart numarasını seçilen personel ile eşleştirmek istediğinizden emin misiniz?</p>
          </>
        ) : (
          <p>Seçili bir kayıt bulunamadı.</p>
        )}
      </Modal>
    </>
  );
};

export default ImportAttendanceTab;