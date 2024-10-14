import React, { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, Select, message, Row, Col, Card } from 'antd';
import axios from 'axios';
import '../styles/PersonalInfoTab.css';

const PersonalInfoTab = ({ personnelId }) => {
  const [personalDetails, setPersonalDetails] = useState({
    health: {},
    address: {},
    education: {},
    contact: {},
    family: {}, 
  });
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [isPersonalInfoModalOpen, setIsPersonalInfoModalOpen] = useState(false); 
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, [personnelId]);

  const fetchData = () => {
    axios.get(`http://localhost:5001/api/personnel/${personnelId}/details`)
      .then(response => {
        setPersonalDetails(prevDetails => ({
          ...prevDetails,
          health: response.data.health || {},
          address: response.data.address || {},
          education: response.data.education || {},
          contact: response.data.contact || {},
          family: response.data.family || {},
          gender: response.data.gender || prevDetails.gender || '',  // gender boşsa önceki değeri kullan
          birthdate: response.data.birthdate || prevDetails.birthdate || '',  // birthdate boşsa önceki değeri kullan
        }));
      })
      .catch(error => console.error('Error fetching personal details:', error));
  };
  
  

  // Modal açılmadan önce ilgili veriyi form alanlarına yerleştiriyoruz
  const openModalAndSetData = (fieldType) => {
    form.setFieldsValue(personalDetails[fieldType] || {});
  };

  const handleHealthEdit = () => {
    openModalAndSetData('health');
    setIsHealthModalOpen(true);
  };

  const handleEducationEdit = () => {
    openModalAndSetData('education');
    setIsEducationModalOpen(true);
  };

  const handleAddressEdit = () => {
    openModalAndSetData('address');
    setIsAddressModalOpen(true);
  };

  const handleContactEdit = () => {
    openModalAndSetData('contact');
    setIsContactModalOpen(true);
  };

  const handleFamilyEdit = () => {
    openModalAndSetData('family');
    setIsFamilyModalOpen(true);
  };

  // Kaydetme işlemi
  const handleHealthSave = () => {
    const updatedData = form.getFieldsValue();
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/health`, updatedData)
      .then(() => {
        message.success('Health information updated successfully!');
        setIsHealthModalOpen(false);
        fetchData();
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update health information');
      });
  };

  const handleEducationSave = () => {
    const updatedData = form.getFieldsValue();
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/education`, updatedData)
      .then(() => {
        message.success('Education information updated successfully!');
        setIsEducationModalOpen(false);
        fetchData();
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update education information');
      });
  };

  const handleAddressSave = () => {
    const updatedData = form.getFieldsValue();
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/address`, updatedData)
      .then(() => {
        message.success('Address information updated successfully!');
        setIsAddressModalOpen(false);
        fetchData();
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update address information');
      });
  };

  const handleContactSave = () => {
    const updatedData = form.getFieldsValue();
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/contact`, updatedData)
      .then(() => {
        message.success('Contact information updated successfully!');
        setIsContactModalOpen(false);
        fetchData();
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update contact information');
      });
  };

  const handleFamilySave = () => {
    const updatedData = form.getFieldsValue();
    if (updatedData.number_of_children === undefined) {
      updatedData.number_of_children = 0;
    }
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/family`, updatedData)
      .then(() => {
        message.success('Family information updated successfully!');
        setIsFamilyModalOpen(false);
        fetchData();
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update family information');
      });
  };


  const handlePersonalInfoSave = () => {
    const updatedData = form.getFieldsValue();
    axios.put(`http://localhost:5001/api/personnel/${personnelId}/personal-info`, updatedData)
      .then(() => {
        message.success('Personal information updated successfully!');
        setIsPersonalInfoModalOpen(false);
        fetchData();  // Yeniden veri çekmek için fetchData çağrısı yapılıyor
      })
      .catch(error => {
        console.error('Error updating details:', error);
        message.error('Failed to update personal information');
      });
  };
  


  const handlePersonalInfoEdit = () => {
    openModalAndSetData('personalInfo');  // PersonalInfo içindeki bilgileri set et
    setIsPersonalInfoModalOpen(true);
  };






  return (
    <div>
      <Row gutter={[16, 16]}>

        <Col span={8}>
          <Card title="Personal Information" bordered={true} className="custom-card">
            <p>Gender: {personalDetails.gender || 'N/A'}</p>
            <p>Birthdate: {personalDetails.birthdate ? new Date(personalDetails.birthdate).toLocaleDateString() : 'N/A'}</p>
            <Button onClick={handlePersonalInfoEdit} className="edit-button">Edit Personal Info</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Health Information" bordered={true} className="custom-card">
            <p>Blood Type: {personalDetails.health.blood_type || 'N/A'}</p>
            <p>Disability Status: {personalDetails.health.disability_status || 'N/A'}</p>
            <Button onClick={handleHealthEdit} className="edit-button">Edit Health Info</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Education Information" bordered={true} className="custom-card">
            <p>Education Level: {personalDetails.education.education_level || 'N/A'}</p>
            <p>Graduation Year: {personalDetails.education.graduation_year || 'N/A'}</p>
            <Button onClick={handleEducationEdit} className="edit-button">Edit Education Info</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Address Information" bordered={true} className="custom-card">
            <p>Home Address: {personalDetails.address.home_address || 'N/A'}</p>
            <p>City: {personalDetails.address.city || 'N/A'}</p>
            <p>District: {personalDetails.address.district || 'N/A'}</p>
            <p>Postal Code: {personalDetails.address.postal_code || 'N/A'}</p>
            <Button onClick={handleAddressEdit} className="edit-button">Edit Address Info</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Contact Information" bordered={true} className="custom-card">
            <p>Phone Number: {personalDetails.contact.phone_number || 'N/A'}</p>
            <p>Email: {personalDetails.contact.email || 'N/A'}</p>
            <p>Emergency Contact Name: {personalDetails.contact.emergency_contact_name || 'N/A'}</p>
            <p>Emergency Contact Phone: {personalDetails.contact.emergency_contact_phone || 'N/A'}</p>
            <Button onClick={handleContactEdit} className="edit-button">Edit Contact Info</Button>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Family Information" bordered={true} className="custom-card">
            <p>Marital Status: {personalDetails.family.marital_status || 'N/A'}</p>
            <p>Number of Children: {personalDetails.family.number_of_children || 'N/A'}</p>
            <Button onClick={handleFamilyEdit} className="edit-button">Edit Family Info</Button>
          </Card>
        </Col>
      </Row>
      {/* Sağlık bilgilerini düzenlemek için modal */}
      <Modal
        title="Edit Health Information"
        open={isHealthModalOpen}
        onOk={handleHealthSave}
        onCancel={() => setIsHealthModalOpen(false)}
      >
        <Form form={form}>
          <Form.Item name="blood_type" label="Blood Type">
            <Select>
              <Select.Option value="A+">A+</Select.Option>
              <Select.Option value="A-">A-</Select.Option>
              <Select.Option value="B+">B+</Select.Option>
              <Select.Option value="B-">B-</Select.Option>
              <Select.Option value="AB+">AB+</Select.Option>
              <Select.Option value="AB-">AB-</Select.Option>
              <Select.Option value="O+">O+</Select.Option>
              <Select.Option value="O-">O-</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="disability_status" label="Disability Status">
            <Select>
              <Select.Option value="No Disability">No Disability</Select.Option>
              <Select.Option value="1st Degree">1st Degree</Select.Option>
              <Select.Option value="2nd Degree">2nd Degree</Select.Option>
              <Select.Option value="3rd Degree">3rd Degree</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Eğitim bilgilerini düzenlemek için modal */}
      <Modal
        title="Edit Education Information"
        open={isEducationModalOpen}
        onOk={handleEducationSave}
        onCancel={() => setIsEducationModalOpen(false)}
      >
        <Form form={form}>
          <Form.Item name="education_level" label="Education Level">
            <Select>
              <Select.Option value="İlkokul">İlkokul</Select.Option>
              <Select.Option value="Ortaokul">Ortaokul</Select.Option>
              <Select.Option value="Lise">Lise</Select.Option>
              <Select.Option value="Ön Lisans">Ön Lisans</Select.Option>
              <Select.Option value="Lisans">Lisans</Select.Option>
              <Select.Option value="Lisansüstü">Lisansüstü</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="graduation_year" label="Graduation Year">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adres bilgilerini düzenlemek için modal */}
      <Modal
        title="Edit Address Information"
        open={isAddressModalOpen}
        onOk={handleAddressSave}
        onCancel={() => setIsAddressModalOpen(false)}
      >
        <Form form={form}>
          <Form.Item name="home_address" label="Home Address">
            <Input />
          </Form.Item>
          <Form.Item name="city" label="City">
            <Input />
          </Form.Item>
          <Form.Item name="district" label="District">
            <Input />
          </Form.Item>
          <Form.Item name="postal_code" label="Postal Code">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* İletişim bilgilerini düzenlemek için modal */}
      <Modal
        title="Edit Contact Information"
        open={isContactModalOpen}
        onOk={handleContactSave}
        onCancel={() => setIsContactModalOpen(false)}
      >
        <Form form={form}>
          <Form.Item name="phone_number" label="Phone Number">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input />
          </Form.Item>
          <Form.Item name="emergency_contact_name" label="Emergency Contact Name">
            <Input />
          </Form.Item>
          <Form.Item name="emergency_contact_phone" label="Emergency Contact Phone">
            <Input />
          </Form.Item>
        </Form>
      </Modal>


{/* cinsiyet ve d_tarihi düzenlemek için modal */}

      <Modal
  title="Edit Personal Information"
  open={isPersonalInfoModalOpen}
  onOk={handlePersonalInfoSave}
  onCancel={() => setIsPersonalInfoModalOpen(false)}
>
  <Form form={form}>
    <Form.Item name="gender" label="Gender">
      <Select>
        <Select.Option value="Male">Male</Select.Option>
        <Select.Option value="Female">Female</Select.Option>
      </Select>
    </Form.Item>
    <Form.Item name="birthdate" label="Birthdate">
      <Input type="date" />
    </Form.Item>
  </Form>
</Modal>


      {/* Aile bilgilerini düzenlemek için modal */}
      <Modal
        title="Edit Family Information"
        open={isFamilyModalOpen}
        onOk={handleFamilySave}
        onCancel={() => setIsFamilyModalOpen(false)}
      >
        <Form form={form}>
          <Form.Item name="marital_status" label="Marital Status">
            <Select>
              <Select.Option value="Single">Single</Select.Option>
              <Select.Option value="Married">Married</Select.Option>
              <Select.Option value="Divorced">Divorced</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="number_of_children" label="Number of Children">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PersonalInfoTab;
