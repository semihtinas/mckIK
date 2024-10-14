import React, { useEffect, useState } from 'react';
import { Row, Col, Button, Card, Avatar, Typography, Modal, Select, Tag, Input, Table, Switch } from 'antd';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import PersonnelForm from './PersonnelForm'; // Personel ekleme formu
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
  const [searchTerm, setSearchTerm] = useState(''); // Arama terimi için state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGridView, setIsGridView] = useState(true); // Grid view mı liste mi olduğunu kontrol eden state
  const navigate = useNavigate();

  // Backend'den personel verilerini ve departman/title verilerini çekme
  useEffect(() => {
    axios.get('http://localhost:5001/api/personnel')
      .then(response => {
        setPersonnel(response.data);
        setFilteredPersonnel(response.data); // İlk başta tüm personel gösterilecek
      })
      .catch(error => {
        console.error('There was an error fetching the personnel data!', error);
      });

    axios.get('http://localhost:5001/api/departments')
      .then(response => setDepartments(response.data))
      .catch(error => console.error('Error fetching departments:', error));

    axios.get('http://localhost:5001/api/titles')
      .then(response => setTitles(response.data))
      .catch(error => console.error('Error fetching titles:', error));
  }, []);

  // Filtreleme işlemi
  useEffect(() => {
    let filtered = personnel.filter(person => {
      const departmentMatch = selectedDepartments.length === 0 || selectedDepartments.includes(person.department);
      const titleMatch = selectedTitles.length === 0 || selectedTitles.includes(person.title);
      const searchMatch = `${person.first_name} ${person.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()); // Arama terimi eşleşmesi
      return departmentMatch && titleMatch && searchMatch;
    });
    setFilteredPersonnel(filtered);
  }, [selectedDepartments, selectedTitles, searchTerm, personnel]);

  // Seçili filtreleri temizleme
  const clearFilters = () => {
    setSelectedDepartments([]);
    setSelectedTitles([]);
    setSearchTerm(''); // Arama terimini temizleme
    setFilteredPersonnel(personnel);
  };

  // Tag silindiğinde filtreyi güncelleme
  const removeTag = (tag, type) => {
    if (type === 'department') {
      setSelectedDepartments(prev => prev.filter(dept => dept !== tag));
    } else if (type === 'title') {
      setSelectedTitles(prev => prev.filter(title => title !== tag));
    }
  };

  // Tıklanılan personeli detaya yönlendirme
  const handlePersonnelClick = (personnel) => {
    onPersonnelClick(personnel);
    navigate(`/personnel/${personnel.id}`);
  };

  // Yeni personel ekleme işlevi
  const handleAddPersonnel = async (values, file) => {
    try {
      const response = await axios.post('http://localhost:5001/api/personnel', values);
      const newPersonnel = response.data;

      if (file) {
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('personnelId', newPersonnel.id);

        await axios.post('http://localhost:5001/api/upload-photo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      setPersonnel([...personnel, newPersonnel]);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error adding personnel or uploading photo:', error);
    }
  };

  // Modal açma ve kapama işlevleri
  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  // Tablodaki kolonlar
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
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
      {/* Görünüm değiştirme switch'i */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Select
            mode="multiple"
            placeholder="Select Departments"
            style={{ width: 200, marginRight: '16px' }}
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
            style={{ width: 200 }}
            value={selectedTitles}
            onChange={(value) => setSelectedTitles(value)}
          >
            {titles.map(title => (
              <Option key={title.id} value={title.name}>
                {title.name}
              </Option>
            ))}
          </Select>
        </div>

        {/* Görünümü değiştirmek için switch */}
        <Switch
          checkedChildren="Grid"
          unCheckedChildren="List"
          checked={isGridView}
          onChange={() => setIsGridView(!isGridView)}
        />
      </div>

      {/* İsme göre arama alanı */}
      <div style={{ marginBottom: '16px' }}>
        <Search
          placeholder="Search by Name"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} // Arama terimini güncelle
          style={{ width: 400 }}
        />
      </div>

      {/* Seçilen filtreleri etiket (tag) olarak gösterme */}
      <div style={{ marginBottom: '16px' }}>
        {selectedDepartments.map(dept => (
          <Tag
            closable
            key={dept}
            onClose={() => removeTag(dept, 'department')}
          >
            Department: {dept}
          </Tag>
        ))}
        {selectedTitles.map(title => (
          <Tag
            closable
            key={title}
            onClose={() => removeTag(title, 'title')}
          >
            Title: {title}
          </Tag>
        ))}
      </div>

      {/* Görünüm: Grid veya Liste */}
      {isGridView ? (
        <Row gutter={[16, 16]}>
          {filteredPersonnel.map(person => (
            <Col key={person.id} xs={24} sm={12} md={8} lg={6}>
              <Card
                hoverable
                onClick={() => handlePersonnelClick(person)}
                style={{ textAlign: 'center' }}
              >
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
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    {person.department || 'No Department'}
                  </Text>
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {person.title || 'No Title'}
                  </Text>
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

      {/* Yeni personel ekleme butonu */}
      <Button type="primary" onClick={showModal} style={{ position: 'absolute', top: 16, right: 16 }}>
        Add New Personnel
      </Button>

      {/* Personel ekleme formunu içeren modal */}
      <Modal
        title="Add New Personnel"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <PersonnelForm onAddPersonnel={handleAddPersonnel} />
      </Modal>
    </div>
  );
}

export default PersonnelList;
