import React, { useEffect, useState } from 'react';
import { List, Select, Button, message } from 'antd';
import axios from 'axios';

const { Option } = Select;

const CareerTab = ({ personnelId, departments, titles, refreshPersonnelData }) => {
  const [careerHistory, setCareerHistory] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:5001/api/personnel/${personnelId}/career`)
      .then(response => setCareerHistory(response.data))
      .catch(error => console.error('Error fetching career data:', error));
  }, [personnelId]);

  const handleUpdateDepartmentTitle = async () => {
    try {
      await axios.post(`http://localhost:5001/api/personnel/${personnelId}/update-department-title`, {
        department_id: selectedDepartment,
        title_id: selectedTitle,
      });
      
      message.success('Department and title updated successfully!');
      
      // Profil ve kariyer geçmişini yeniliyoruz
      refreshPersonnelData();  // Profil verilerini yenile
      axios.get(`http://localhost:5001/api/personnel/${personnelId}/career`)
        .then(response => setCareerHistory(response.data))  // Kariyer geçmişini yenile
        .catch(error => console.error('Error fetching career data:', error));
    } catch (error) {
      message.error('Failed to update department and title');
      console.error('Error updating department and title:', error);
    }
  };

  return (
    <div>
      <h3>Update Department and Title</h3>
      <Select
        placeholder="Select Department"
        style={{ width: '100%', marginBottom: 16 }}
        onChange={setSelectedDepartment}
        value={selectedDepartment}
      >
        {departments.map(dep => (
          <Option key={dep.id} value={dep.id}>{dep.name}</Option>
        ))}
      </Select>

      <Select
        placeholder="Select Title"
        style={{ width: '100%', marginBottom: 16 }}
        onChange={setSelectedTitle}
        value={selectedTitle}
      >
        {titles.map(title => (
          <Option key={title.id} value={title.id}>{title.name}</Option>
        ))}
      </Select>

      <Button type="primary" onClick={handleUpdateDepartmentTitle}>Update Department and Title</Button>

      <h3>Career History</h3>
      <List
        bordered
        dataSource={careerHistory}
        renderItem={item => (
          <List.Item>
            {item.hire_date && <div>Date: {new Date(item.hire_date).toLocaleDateString()}</div>}
            {item.department && <div>Department Updated: {item.department}</div>}
            {item.title && <div>Title Updated: {item.title}</div>}
          </List.Item>
        )}
      />
    </div>
  );
};

export default CareerTab;
