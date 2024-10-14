// PhotoUploadModal.js
import React, { useState } from 'react';
import { Modal, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Dragger } = Upload;

const PhotoUploadModal = ({ personnelId, isModalOpen, setIsModalOpen, refreshPersonnelData }) => {
  const [fileList, setFileList] = useState([]);

  const handleUpload = async () => {
    if (fileList.length > 0) {
      const formData = new FormData();
      formData.append('photo', fileList[0].originFileObj);
      formData.append('personnelId', personnelId);

      try {
        await axios.post('http://localhost:5001/api/upload-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success('Photo uploaded successfully!');
        setIsModalOpen(false);
        setFileList([]);
        refreshPersonnelData(); // Veriyi güncelle
      } catch (error) {
        message.error('Failed to upload photo');
        console.error('Error uploading photo:', error);
      }
    } else {
      message.error('Please select a photo to upload.');
    }
  };

  return (
    <Modal
      title="Upload Photo"
      open={isModalOpen}
      onOk={handleUpload}
      onCancel={() => setIsModalOpen(false)}
    >
      <Dragger
        beforeUpload={() => false}
        fileList={fileList}
        onChange={({ fileList }) => setFileList(fileList)}
        accept="image/*"
        multiple={false}
        style={{ padding: '20px', border: '2px dashed #d9d9d9', backgroundColor: '#fafafa' }}
      >
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p className="ant-upload-text">Click or drag file to this area to upload</p>
      </Dragger>
    </Modal>
  );
};

export default PhotoUploadModal;
