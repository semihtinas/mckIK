import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, message, Select } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Option } = Select;

const FilesTab = ({ personnelId }) => {
  const [fileList, setFileList] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFileType, setSelectedFileType] = useState(null);
  const [contentTypes, setContentTypes] = useState([]); // İçerik türleri

  // Dosyaları yenilemek için fonksiyon
  const refreshUploadedFiles = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/personnel/${personnelId}/files`);
      setUploadedFiles(response.data);  // Yeni dosya listesini güncelle
    } catch (error) {
      console.error('Error refreshing files:', error);
    }
  };

  useEffect(() => {
    // İlk yüklemede dosyaları ve içerik türlerini getir
    refreshUploadedFiles();  // Dosyaları getir
    axios.get('http://localhost:5001/api/contents')
      .then(response => {
        setContentTypes(response.data);
      })
      .catch(error => {
        console.error('Error fetching content types:', error);
      });
  }, [personnelId]);  // personnelId değiştiğinde yeniden çağır

  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
  };

  const handleUpload = async () => {
    const formData = new FormData();
    fileList.forEach(file => {
      formData.append('files', file.originFileObj);
    });
    formData.append('contentTypeId', selectedFileType);  // Seçilen içerik türünü formData'ya ekliyoruz
  
    try {
      const response = await axios.post(`http://localhost:5001/api/personnel/${personnelId}/upload-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      message.success('Files uploaded successfully!');
      setFileList([]);  // Dosya listesini temizliyoruz
      refreshUploadedFiles();  // Dosyaları yenile
    } catch (error) {
      message.error('Failed to upload files');
      console.error('Error uploading files:', error);
    }
  };

  const columns = [
    {
      title: 'Content Type',  // İçerik türü sütunu
      dataIndex: 'content_type_name',  // Veritabanından dönen content_type_name sütununu kullanıyoruz
      key: 'content_type_name',
    },
    {
      title: 'File',  // Dosya sütunu
      dataIndex: 'originalname',
      key: 'originalname',
      render: (text, record) => (
        <a href={`http://localhost:5001/uploads/${record.filename}`} target="_blank" rel="noopener noreferrer">
          {text}
        </a>
      ),
    },
  ];

  return (
    <div>
      <h3>Upload Files</h3>

      <Select
        placeholder="Select Content Type"
        style={{ width: '100%', marginBottom: 16 }}
        onChange={setSelectedFileType}
        value={selectedFileType}
      >
        {contentTypes.map(type => (
          <Option key={type.id} value={type.id}>{type.name}</Option>
        ))}
      </Select>

      <Upload
        multiple
        beforeUpload={() => false}
        fileList={fileList}
        onChange={handleFileChange}
      >
        <Button icon={<UploadOutlined />}>Select Files</Button>
      </Upload>

      <Button
        type="primary"
        onClick={handleUpload}
        style={{ marginTop: 16 }}
        disabled={fileList.length === 0 || !selectedFileType}
      >
        Upload Files
      </Button>

      <h3>Uploaded Files</h3>
      <Table
        dataSource={uploadedFiles}
        columns={columns}
        rowKey="filename"
      />
    </div>
  );
};

export default FilesTab;
