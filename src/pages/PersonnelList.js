import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Card, Avatar, Typography, Modal, Select, Tag, Input, Table, Switch, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PersonnelForm from './PersonnelForm';
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;
const { Search } = Input;

function PersonnelList({ onPersonnelClick }) {
  const [personnel, setPersonnel] = useState([]);
  const [filteredPersonnel, setFilteredPersonnel] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [titles, setTitles] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedTitles, setSelectedTitles] = useState([]);
  const [selectedBloodTypes, setSelectedBloodTypes] = useState([]);
  const [selectedMaritalStatuses, setSelectedMaritalStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGridView, setIsGridView] = useState(true);
  const navigate = useNavigate();

  const handlePersonnelClick = (person) => {
    if (onPersonnelClick) {
      onPersonnelClick(person);
    }
    navigate(`/personnel/${person.id}`);
  };

  const showModal = () => setIsModalVisible(true);
  const handleCancel = () => setIsModalVisible(false);
  
  const clearFilters = () => {
    setSelectedDepartments([]);
    setSelectedTitles([]);
    setSelectedBloodTypes([]);
    setSelectedMaritalStatuses([]);
    setSearchTerm('');
    setFilteredPersonnel(personnel);
  };

  const removeTag = (tag, type) => {
    if (type === 'department') {
      setSelectedDepartments(prev => prev.filter(dept => dept !== tag));
    } else if (type === 'title') {
      setSelectedTitles(prev => prev.filter(title => title !== tag));
    } else if (type === 'bloodType') {
      setSelectedBloodTypes(prev => prev.filter(bloodType => bloodType !== tag));
    } else if (type === 'maritalStatus') {
      setSelectedMaritalStatuses(prev => prev.filter(status => status !== tag));
    }
  };

  const refreshPersonnelData = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/personnel');
      setPersonnel(response.data);
      setFilteredPersonnel(response.data);
    } catch (error) {
      console.error('Error refreshing personnel data:', error);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [personnelRes, departmentsRes, titlesRes] = await Promise.all([
          axios.get('http://localhost:5001/api/personnel'),
          axios.get('http://localhost:5001/api/departments'),
          axios.get('http://localhost:5001/api/titles'),
        ]);

        setPersonnel(personnelRes.data);
        setFilteredPersonnel(personnelRes.data);
        setDepartments(departmentsRes.data);
        setTitles(titlesRes.data);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const filtered = personnel.filter(person => {
      const departmentMatch = selectedDepartments.length === 0 || selectedDepartments.includes(person.department);
      const titleMatch = selectedTitles.length === 0 || selectedTitles.includes(person.title);
      const bloodTypeMatch = selectedBloodTypes.length === 0 || selectedBloodTypes.includes(person.blood_type);
      const maritalStatusMatch = selectedMaritalStatuses.length === 0 || selectedMaritalStatuses.includes(person.marital_status);
      
      // İsim aramasında büyük/küçük harf duyarlılığını kaldırmak için küçük harfe çeviriyoruz
      const searchMatch = `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      return departmentMatch && titleMatch && bloodTypeMatch && maritalStatusMatch && searchMatch;
    });
    
    setFilteredPersonnel(filtered);
  }, [selectedDepartments, selectedTitles, selectedBloodTypes, selectedMaritalStatuses, searchTerm, personnel]);

  const handleAddPersonnel = async (newPersonnel) => {
    try {
      const detailedPersonnel = await axios.get(`http://localhost:5001/api/personnel/${newPersonnel.id}`);
      setPersonnel(prevPersonnel => {
        const updatedPersonnel = [...prevPersonnel];
        const index = updatedPersonnel.findIndex(p => p.id === detailedPersonnel.data.id);
        
        if (index !== -1) {
          updatedPersonnel[index] = detailedPersonnel.data;
        } else {
          updatedPersonnel.push(detailedPersonnel.data);
        }
        
        return updatedPersonnel;
      });

      setFilteredPersonnel(prevFiltered => {
        const updatedFiltered = [...prevFiltered];
        const index = updatedFiltered.findIndex(p => p.id === detailedPersonnel.data.id);
        
        if (index !== -1) {
          updatedFiltered[index] = detailedPersonnel.data;
        } else {
          updatedFiltered.push(detailedPersonnel.data);
        }
        
        return updatedFiltered;
      });

      setIsModalVisible(false);
    } catch (error) {
      console.error('Error updating personnel list:', error);
      message.error('Failed to update personnel list');
    }
  };

  const columns = [
    {
      title: 'Photo',
      dataIndex: 'photo_url',
      key: 'photo_url',
      render: (text) => (
        <Avatar
          size={64}
          src={text ? `http://localhost:5001${text}` : null}
          icon={!text && <UserOutlined />}
        />
      ),
    },
    {
      title: 'Name',
      key: 'name',
      render: (text, record) => `${record.first_name.toUpperCase()} ${record.last_name.toUpperCase()}`,
      sorter: (a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.toLowerCase();
        return nameA.localeCompare(nameB);
      },
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
    },
    {
      title: 'Blood Type',
      dataIndex: 'blood_type',
      key: 'blood_type',
      sorter: (a, b) => (a.blood_type || '').localeCompare(b.blood_type || ''),
    },
    {
      title: 'Marital Status',
      dataIndex: 'marital_status',
      key: 'marital_status',
      sorter: (a, b) => (a.marital_status || '').localeCompare(b.marital_status || ''),
    }
  ];


  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Switch
          checkedChildren="Grid"
          unCheckedChildren="List"
          checked={isGridView}
          onChange={() => setIsGridView(!isGridView)}
        />
        <Button type="primary" onClick={showModal}>
          Add New Personnel
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <Select
          mode="multiple"
          placeholder="Select Departments"
          style={{ minWidth: 200 }}
          value={selectedDepartments}
          onChange={(value) => setSelectedDepartments(value)}
        >
          {departments.map(department => (
            <Option key={department.id} value={department.name}>
              {department.name}
            </Option>
          ))}
        </Select>

        <Select
          mode="multiple"
          placeholder="Select Titles"
          style={{ minWidth: 200 }}
          value={selectedTitles}
          onChange={(value) => setSelectedTitles(value)}
        >
          {titles.map(title => (
            <Option key={title.id} value={title.name}>
              {title.name}
            </Option>
          ))}
        </Select>

        <Select
          mode="multiple"
          placeholder="Select Blood Types"
          style={{ minWidth: 200 }}
          value={selectedBloodTypes}
          onChange={(value) => setSelectedBloodTypes(value)}
        >
          {Array.from(new Set(personnel.map(person => person.blood_type))).map(bloodType => (
            <Option key={bloodType} value={bloodType}>
              {bloodType}
            </Option>
          ))}
        </Select>

        <Select
          mode="multiple"
          placeholder="Select Marital Status"
          style={{ minWidth: 200 }}
          value={selectedMaritalStatuses}
          onChange={(value) => setSelectedMaritalStatuses(value)}
        >
          {Array.from(new Set(personnel.map(person => person.marital_status))).map(status => (
            <Option key={status} value={status}>
              {status}
            </Option>
          ))}
        </Select>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <Search
          placeholder="Search by Name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: 400 }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        {selectedDepartments.map(dept => (
          <Tag closable key={dept} onClose={() => removeTag(dept, 'department')}>Department: {dept}</Tag>
        ))}
        {selectedTitles.map(title => (
          <Tag closable key={title} onClose={() => removeTag(title, 'title')}>Title: {title}</Tag>
        ))}
        {selectedBloodTypes.map(bloodType => (
          <Tag closable key={bloodType} onClose={() => removeTag(bloodType, 'bloodType')}>Blood Type: {bloodType}</Tag>
        ))}
        {selectedMaritalStatuses.map(status => (
          <Tag closable key={status} onClose={() => removeTag(status, 'maritalStatus')}>Marital Status: {status}</Tag>
        ))}
      </div>

      {isGridView ? (
        <Row gutter={[16, 16]}>
          {filteredPersonnel.map(person => (
            <Col key={person.id} xs={24} sm={12} md={8} lg={6}>
              <Card hoverable onClick={() => handlePersonnelClick(person)} style={{ textAlign: 'center' }}>
                <Avatar
                  size={100}
                  src={person.photo_url ? `http://localhost:5001${person.photo_url}` : null}
                  icon={!person.photo_url && <UserOutlined />}
                  style={{ marginBottom: 16 }}
                />
                <div>
                  <Text strong>{`${person.first_name.toUpperCase()} ${person.last_name.toUpperCase()}`}</Text>
                </div>
                <div>
                  <Text type="secondary">{person.department || 'No Department'}</Text>
                </div>
                <div>
                  <Text type="secondary">{person.title || 'No Title'}</Text>
                </div>
                <div>
                  <Text type="secondary">Blood Type: {person.blood_type || 'Unknown'}</Text>
                </div>
                <div>
                  <Text type="secondary">Marital Status: {person.marital_status || 'Unknown'}</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredPersonnel}
          rowKey="id"
          pagination={false}
          onRow={(record) => ({
            onClick: () => handlePersonnelClick(record),
          })}
        />
      )}

      <Modal title="Add New Personnel" open={isModalVisible} onCancel={handleCancel} footer={null}>
        <PersonnelForm onAddPersonnel={refreshPersonnelData} />
      </Modal>
    </div>
  );
}

export default PersonnelList;
