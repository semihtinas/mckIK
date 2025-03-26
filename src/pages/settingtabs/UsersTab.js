// UsersTab.js
import React, { useState } from 'react';
import { Select, Input, Button, message, Divider } from 'antd';
import axios from 'axios';

const { Option } = Select;

const UsersTab = ({ users, fetchUsers, personnelList }) => {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPersonnelId, setNewPersonnelId] = useState(null); // Yeni kullanıcı için personel ID
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Şifre güncelleme işlemi
  const handlePasswordChange = async () => {
    if (!selectedUserId || !newPassword) {
      message.warning('Kullanıcıyı ve yeni şifreyi girin');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/users/update-password', {
        userId: selectedUserId,
        password: newPassword,
      });

      if (response.status === 200) {
        message.success('Şifre başarıyla güncellendi!');
        setSelectedUserId(null);
        setNewPassword('');
        fetchUsers(); // Kullanıcı listesini güncelle
      }
    } catch (error) {
      message.error('Şifre güncellenirken bir hata oluştu');
    }
  };

  // Yeni kullanıcı ekleme işlemi
  const handleAddUser = async () => {
    if (!newPersonnelId || !newUsername || !newUserPassword) {
      message.warning('Personel, kullanıcı adı ve şifre bilgilerini eksiksiz doldurun');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5001/api/users/add', {
        personnelId: newPersonnelId,
        username: newUsername,
        password: newUserPassword,
      });

      if (response.status === 201) {
        message.success('Yeni kullanıcı başarıyla eklendi!');
        setNewPersonnelId(null);
        setNewUsername('');
        setNewUserPassword('');
        fetchUsers(); // Kullanıcı listesini güncelle
      }
    } catch (error) {
      message.error('Kullanıcı eklenirken bir hata oluştu');
    }
  };

  return (
    <div>
      <Divider orientation="left">Kullanıcı Şifresi Güncelle</Divider>
      <Select
        style={{ width: '100%', marginBottom: '1rem' }}
        placeholder="Kullanıcı Seç"
        onChange={(value) => setSelectedUserId(value)}
        value={selectedUserId}
      >
        {users.map((user) => (
          <Option key={user.id} value={user.id}>
            {user.username}
          </Option>
        ))}
      </Select>
      <Input.Password
        style={{ width: '100%', marginBottom: '1rem' }}
        placeholder="Yeni Şifre"
        onChange={(e) => setNewPassword(e.target.value)}
        value={newPassword}
      />
      <Button type="primary" onClick={handlePasswordChange}>
        Şifreyi Güncelle
      </Button>

      <Divider orientation="left">Yeni Kullanıcı Ekle</Divider>
      <Select
        style={{ width: '100%', marginBottom: '1rem' }}
        placeholder="Personel Seç"
        onChange={(value) => setNewPersonnelId(value)}
        value={newPersonnelId}
      >
        {personnelList.map((personnel) => (
          <Option key={personnel.id} value={personnel.id}>
            {personnel.first_name} {personnel.last_name}
          </Option>
        ))}
      </Select>
      <Input
        style={{ width: '100%', marginBottom: '1rem' }}
        placeholder="Kullanıcı Adı"
        onChange={(e) => setNewUsername(e.target.value)}
        value={newUsername}
      />
      <Input.Password
        style={{ width: '100%', marginBottom: '1rem' }}
        placeholder="Şifre"
        onChange={(e) => setNewUserPassword(e.target.value)}
        value={newUserPassword}
      />
      <Button type="primary" onClick={handleAddUser}>
        Kullanıcı Ekle
      </Button>
    </div>
  );
};

export default UsersTab;
