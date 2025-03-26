import React, { useState, useEffect } from 'react';
import { Tabs, Table, Input, Button, Select, message, Space, List, Tag } from 'antd';
import axios from 'axios';

const { Option } = Select;

const RolePermissionsTab = () => {
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [selectedPermission, setSelectedPermission] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedRolePermissions, setSelectedRolePermissions] = useState([]);
    const [availablePermissions, setAvailablePermissions] = useState([]);
    const [users, setUsers] = useState([]);
    
    useEffect(() => {
        fetchRoles();
        fetchPermissions();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            updateAvailablePermissions();
        }
    }, [selectedRole, permissions]);

    const fetchRoles = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get('http://localhost:5001/api/roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(response.data);
        } catch (error) {
            console.error('Roller alınırken hata:', error);
            message.error('Roller alınamadı');
        } finally {
            setLoading(false);
        }
    };

    

    const fetchPermissions = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get('http://localhost:5001/api/permissions', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPermissions(response.data);
        } catch (error) {
            console.error('İzinler alınırken hata:', error);
            message.error('İzinler alınamadı');
        }
    };


    const fetchUsers = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get('http://localhost:5001/api/users/with-roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Kullanıcılar alınırken hata:', error);
            message.error('Kullanıcılar alınamadı');
        }
    };


    const handleAssignRole = async (userId, roleId) => {
        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `http://localhost:5001/api/users/${userId}/role`,
                { roleId },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            message.success('Rol başarıyla atandı');
            fetchUsers();
        } catch (error) {
            console.error('Rol atanırken hata:', error);
            message.error('Rol atanamadı');
        }
    };


    const updateAvailablePermissions = () => {
        const selectedRoleData = roles.find(role => role.id === selectedRole);
        if (selectedRoleData) {
            const currentPermissions = selectedRoleData.permissions || [];
            setSelectedRolePermissions(currentPermissions);

            const availablePerms = permissions.filter(permission => 
                !currentPermissions.some(p => p.id === permission.id)
            );
            setAvailablePermissions(availablePerms);
        }
    };

    const handleRoleSelect = (roleId) => {
        setSelectedRole(roleId);
        setSelectedPermission(null);
    };

    const handleAddRole = async () => {
        if (!newRole.trim()) {
            message.warning('Rol ismi boş olamaz');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:5001/api/roles', 
                { name: newRole },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            message.success('Rol başarıyla eklendi');
            setNewRole('');
            fetchRoles();
        } catch (error) {
            console.error('Rol eklenirken hata:', error);
            message.error('Rol eklenemedi');
        }
    };

    const handleAddPermissionToRole = async () => {
        if (!selectedRole || !selectedPermission) {
            message.warning('Lütfen rol ve izin seçin');
            return;
        }

        const token = localStorage.getItem('token');
        try {
            await axios.post(
                `http://localhost:5001/api/roles/${selectedRole}/permissions`,
                { permissionId: selectedPermission },
                { headers: { Authorization: `Bearer ${token}` }}
            );
            message.success('İzin başarıyla role eklendi');
            await fetchRoles();
            updateAvailablePermissions();
            setSelectedPermission(null);
        } catch (error) {
            console.error('İzin eklenirken hata:', error);
            message.error('İzin eklenemedi');
        }
    };


    

    const roleColumns = [
        {
            title: 'Rol Adı',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Mevcut İzinler',
            dataIndex: 'permissions',
            key: 'permissions',
            render: (permissions) => (
                <Space wrap>
                    {permissions && permissions.filter(p => p).map((perm) => (
                        <Tag color="blue" key={perm.id}>
                            {perm.name}
                        </Tag>
                    ))}
                </Space>
            ),
        }
    ];


    const userColumns = [
        {
            title: 'Kullanıcı Adı',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Ad Soyad',
            key: 'fullName',
            render: (record) => `${record.first_name || ''} ${record.last_name || ''}`,
        },
        {
            title: 'Mevcut Rol',
            dataIndex: 'role_name',
            key: 'role_name',
            render: (role_name) => role_name ? <Tag color="blue">{role_name}</Tag> : '-'
        },
        {
            title: 'Rol Ata',
            key: 'assign',
            render: (record) => (
                <Select
                    style={{ width: 200 }}
                    value={record.role_id}
                    onChange={(value) => handleAssignRole(record.id, value)}
                    placeholder="Rol seç"
                >
                    {roles.map((role) => (
                        <Option key={role.id} value={role.id}>{role.name}</Option>
                    ))}
                </Select>
            )
        }
    ];

    const items = [
        {
            key: '1',
            label: 'Roller',
            children: (
                <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                        <Input
                            placeholder="Yeni Rol Adı"
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            style={{ width: 200 }}
                        />
                        <Button 
                            type="primary" 
                            onClick={handleAddRole}
                            disabled={!newRole.trim()}
                        >
                            Rol Ekle
                        </Button>
                    </div>
                    <Table
                        loading={loading}
                        dataSource={roles}
                        columns={roleColumns}
                        rowKey="id"
                    />
                </Space>
            )
        },
        {
            key: '2',
            label: 'İzin Atama',
            children: (
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ marginBottom: 16 }}>
                        <Select
                            placeholder="Rol Seçin"
                            style={{ width: 200, marginBottom: 8 }}
                            value={selectedRole}
                            onChange={handleRoleSelect}
                        >
                            {roles.map((role) => (
                                <Option key={role.id} value={role.id}>{role.name}</Option>
                            ))}
                        </Select>
                    </div>

                    {selectedRole && (
                        <>
                            <div style={{ marginBottom: 16 }}>
                                <h4>Mevcut İzinler:</h4>
                                <List
                                    dataSource={selectedRolePermissions}
                                    renderItem={permission => (
                                        <List.Item>
                                            <Tag color="blue">{permission.name}</Tag>
                                        </List.Item>
                                    )}
                                    locale={{ emptyText: 'Bu role henüz izin atanmamış' }}
                                />
                            </div>

                            <div>
                                <h4>Yeni İzin Ekle:</h4>
                                <Space>
                                    <Select
                                        placeholder="İzin Seçin"
                                        style={{ width: 200 }}
                                        value={selectedPermission}
                                        onChange={setSelectedPermission}
                                    >
                                        {availablePermissions.map((permission) => (
                                            <Option key={permission.id} value={permission.id}>
                                                {permission.name}
                                            </Option>
                                        ))}
                                    </Select>

                                    <Button 
                                        type="primary" 
                                        onClick={handleAddPermissionToRole}
                                        disabled={!selectedPermission}
                                    >
                                        İzin Ekle
                                    </Button>
                                </Space>
                            </div>
                        </>
                    )}
                </Space>
            )
        },

        {
            key: '3',
            label: 'Kullanıcı Rolleri',
            children: (
                <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="id"
                />
            )
        }
    ];

    return (
        <div className="role-permissions-container">
            <Tabs defaultActiveKey="1" items={items} />
        </div>
    );
};

export default RolePermissionsTab;