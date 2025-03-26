import React, { useEffect, useState } from 'react';
import { List, Select, Button, message, Spin } from 'antd';
import axios from 'axios';

const { Option } = Select;

const CareerTab = ({ personnelId, refreshPersonnelData }) => {
  const [careerHistory, setCareerHistory] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState(null);
  const [loading, setLoading] = useState(false);

  // Axios instance oluştur
  const axiosInstance = axios.create({
    baseURL: 'http://localhost:5001',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    }
  });

  // Departman ve title verilerini çek
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [deptRes, titleRes] = await Promise.all([
        axiosInstance.get('/api/departments'),
        axiosInstance.get('/api/titles')
      ]);

      console.log('Departments data:', deptRes.data);
      console.log('Titles data:', titleRes.data);

      setDepartments(deptRes.data);
      setTitles(titleRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      message.error('Departman ve unvan bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Kariyer geçmişini çek
  const fetchCareerHistory = async () => {
    try {
      const response = await axiosInstance.get(`/api/personnel/${personnelId}/career`);
      setCareerHistory(response.data);
    } catch (error) {
      console.error('Error fetching career data:', error);
      message.error('Kariyer geçmişi yüklenirken hata oluştu');
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchCareerHistory();
  }, [personnelId]);

  const handleUpdateDepartmentTitle = async () => {
    try {
      setLoading(true);
      console.log(`Sending request to update department_id: ${selectedDepartment}, title_id: ${selectedTitle} for personnelId: ${personnelId}`);
      
      await axiosInstance.post(`/api/personnel/${personnelId}/update-department-title`, {
        department_id: selectedDepartment,
        title_id: selectedTitle,
      });

      message.success('Departman ve unvan başarıyla güncellendi!');

      // Seçimleri temizle
      setSelectedDepartment(null);
      setSelectedTitle(null);

      // Verileri yenile
      refreshPersonnelData();
      fetchCareerHistory();
    } catch (error) {
      console.error('Error updating department and title:', error);
      message.error(error.response?.data?.message || 'Güncelleme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '50px'
      }}>
        <Spin>
          <div style={{ padding: '50px', textAlign: 'center' }}>
            <p>Yükleniyor...</p>
          </div>
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <h3>Departman ve Unvan Güncelleme</h3>
      
      <Select
        placeholder="Departman Seçin"
        style={{ width: '100%', marginBottom: 16 }}
        onChange={setSelectedDepartment}
        value={selectedDepartment}
        allowClear
        loading={loading}
        showSearch
        optionFilterProp="children"
      >
        {departments.map(dep => (
          <Option key={dep.id} value={dep.id}>{dep.name}</Option>
        ))}
      </Select>

      <Select
        placeholder="Unvan Seçin"
        style={{ width: '100%', marginBottom: 16 }}
        onChange={setSelectedTitle}
        value={selectedTitle}
        allowClear
        loading={loading}
        showSearch
        optionFilterProp="children"
      >
        {titles.map(title => (
          <Option key={title.id} value={title.id}>{title.name}</Option>
        ))}
      </Select>

      <Button 
        type="primary" 
        onClick={handleUpdateDepartmentTitle} 
        loading={loading}
        disabled={!selectedDepartment || !selectedTitle}
      >
        Departman ve Unvanı Güncelle
      </Button>

      <h3>Kariyer Geçmişi</h3>
      <List
        bordered
        loading={loading}
        dataSource={careerHistory}
        renderItem={item => (
          <List.Item>
            {item.hire_date && (
              <div>Tarih: {new Date(item.hire_date).toLocaleDateString('tr-TR')}</div>
            )}
            {item.department && <div>Departman: {item.department}</div>}
            {item.title && <div>Unvan: {item.title}</div>}
          </List.Item>
        )}
        locale={{ emptyText: 'Kariyer geçmişi bulunamadı' }}
      />
    </div>
  );
};

export default CareerTab;