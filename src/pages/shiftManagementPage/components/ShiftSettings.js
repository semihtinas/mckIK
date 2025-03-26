import React, { useState, useEffect } from 'react';
import { Tabs, Table, Form, Select, TimePicker, Switch, Button, Modal, Input, Space, Tag, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Option } = Select;

const ShiftSettings = ({ departments, onSettingsUpdate }) => {
    const [shiftTypes, setShiftTypes] = useState([]);
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [departmentSettings, setDepartmentSettings] = useState([]);
    const [isShiftTypeModalVisible, setIsShiftTypeModalVisible] = useState(false);
    const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
    const [isDepartmentSettingModalVisible, setIsDepartmentSettingModalVisible] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [shiftTypeForm] = Form.useForm();
    const [scheduleForm] = Form.useForm();
    const [departmentSettingForm] = Form.useForm();

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const [typesRes, schedulesRes, settingsRes] = await Promise.all([
                axios.get('http://localhost:5001/api/shifts/shift-types', config),
                axios.get('http://localhost:5001/api/shifts/shift-schedules', config),
                axios.get('http://localhost:5001/api/shifts/department-shift-settings', config),
            ]);
            
            setShiftTypes(typesRes.data);
            setShiftSchedules(schedulesRes.data);
            setDepartmentSettings(settingsRes.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            message.error('Ayarlar yüklenirken hata oluştu');
        }
    };

    const handleOpenModal = (type, record = null) => {
        setEditingRecord(record);
        switch(type) {
          case 'shiftType':
            shiftTypeForm.setFieldsValue(record || {});
            setIsShiftTypeModalVisible(true);
            break;
          case 'schedule':
            if (record) {
              scheduleForm.setFieldsValue({
                ...record,
                shift_type_id: record.shift_type_id, // Eklendi
                start_time: dayjs(record.start_time, 'HH:mm'),
                end_time: dayjs(record.end_time, 'HH:mm'),
              });
            }
            setIsScheduleModalVisible(true);
            break;
          // Diğer durumlar...
        }
      };
      

    const handleDelete = async (type, id) => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const endpoints = {
                shiftType: '/shift-types/',
                schedule: '/shift-schedules/',
                departmentSetting: '/department-shift-settings/'
            };
            
            await axios.delete(`http://localhost:5001/api/shifts${endpoints[type]}${id}`, config);
            message.success('Başarıyla silindi');
            fetchSettings();
            onSettingsUpdate?.();
        } catch (error) {
            message.error('Silme işlemi başarısız oldu');
        }
    };

    const handleFormSubmit = async (type, values) => {
        try {
          const token = localStorage.getItem('token');
          const config = { headers: { Authorization: `Bearer ${token}` } };
          
          let endpoint = '';
          let formattedValues = values;
      
          switch(type) {
            case 'shiftType':
              endpoint = '/shift-types';
              break;
            case 'schedule':
              endpoint = '/shift-schedules';
              formattedValues = {
                ...values,
                start_time: values.start_time.format('HH:mm'),
                end_time: values.end_time.format('HH:mm'),
              };
              break;
            case 'departmentSetting':
              // Diğer kodlar...
              break;
          }
      
          // Kayıt veya güncelleme işlemi
          if (editingRecord?.id) {
            await axios.put(
              `http://localhost:5001/api/shifts${endpoint}/${editingRecord.id}`,
              formattedValues,
              config
            );
          } else {
            await axios.post(
              `http://localhost:5001/api/shifts${endpoint}`,
              formattedValues,
              config
            );
          }
      
          message.success('Başarıyla kaydedildi');
          fetchSettings();
          onSettingsUpdate?.();
          handleCloseModal(type);
        } catch (error) {
          message.error('Kayıt işlemi başarısız oldu');
        }
      };
      

    const handleCloseModal = (type) => {
        switch(type) {
            case 'shiftType':
                setIsShiftTypeModalVisible(false);
                shiftTypeForm.resetFields();
                break;
            case 'schedule':
                setIsScheduleModalVisible(false);
                scheduleForm.resetFields();
                break;
            case 'departmentSetting':
                setIsDepartmentSettingModalVisible(false);
                departmentSettingForm.resetFields();
                break;
        }
        setEditingRecord(null);
    };

    const items = [
        {
            key: '1',
            label: 'Vardiya Türleri',
            children: (
                <>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenModal('shiftType')}
                        style={{ marginBottom: 16 }}
                    >
                        Yeni Vardiya Türü
                    </Button>
                    <Table
                        columns={[
                            { title: 'Vardiya Türü', dataIndex: 'name' },
                            { title: 'Açıklama', dataIndex: 'description' },
                            {
                                title: 'İşlemler',
                                key: 'actions',
                                render: (_, record) => (
                                    <Space>
                                        <Button
                                            icon={<EditOutlined />}
                                            onClick={() => handleOpenModal('shiftType', record)}
                                        />
                                        <Button
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDelete('shiftType', record.id)}
                                        />
                                    </Space>
                                ),
                            },
                        ]}
                        dataSource={shiftTypes}
                        rowKey="id"
                    />
                </>
            ),
        },
        {
            key: '2',
            label: 'Vardiya Planları',
            children: (
                <>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleOpenModal('schedule')}
                        style={{ marginBottom: 16 }}
                    >
                        Yeni Vardiya Planı
                    </Button>
                    <Table
  columns={[
    { title: 'Vardiya Adı', dataIndex: 'name' },
    { title: 'Vardiya Türü', dataIndex: 'shift_type_name' }, // Yeni sütun
    { title: 'Başlangıç', dataIndex: 'start_time' },
    { title: 'Bitiş', dataIndex: 'end_time' },
    {
      title: 'Renk',
      dataIndex: 'color',
      render: color => (
        <Tag color={color} style={{ width: 50, height: 20 }} />
      ),
    },
    {
      title: 'İşlemler',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleOpenModal('schedule', record)}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete('schedule', record.id)}
          />
        </Space>
      ),
    },
  ]}
  dataSource={shiftSchedules}
  rowKey="id"
/>

                    
                </>
            ),
        },
    ];

    return (
        <div>
            <Tabs items={items} />

            {/* Vardiya Türü Modal */}
            <Modal
                title={`${editingRecord ? 'Vardiya Türü Düzenle' : 'Yeni Vardiya Türü'}`}
                open={isShiftTypeModalVisible}
                onCancel={() => handleCloseModal('shiftType')}
                footer={null}
            >
                <Form 
                    form={shiftTypeForm}
                    onFinish={(values) => handleFormSubmit('shiftType', values)}
                    layout="vertical"
                >
                    <Form.Item
                        name="name"
                        label="Vardiya Türü Adı"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Açıklama">
                        <Input.TextArea />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Kaydet
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>

          {/* Vardiya Planı Modal */}
<Modal
  title={`${editingRecord ? 'Vardiya Planı Düzenle' : 'Yeni Vardiya Planı'}`}
  open={isScheduleModalVisible}
  onCancel={() => handleCloseModal('schedule')}
  footer={null}
>
  <Form
    form={scheduleForm}
    onFinish={(values) => handleFormSubmit('schedule', values)}
    layout="vertical"
  >
    <Form.Item
      name="name"
      label="Vardiya Adı"
      rules={[{ required: true }]}
    >
      <Input />
    </Form.Item>
    {/* Yeni eklenen shift_type_id alanı */}
    <Form.Item
      name="shift_type_id"
      label="Vardiya Türü"
      rules={[{ required: true, message: 'Lütfen bir vardiya türü seçin' }]}
    >
      <Select placeholder="Vardiya Türü Seçin">
        {shiftTypes.map((type) => (
          <Option key={type.id} value={type.id}>
            {type.name}
          </Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item
      name="start_time"
      label="Başlangıç Saati"
      rules={[{ required: true }]}
    >
      <TimePicker format="HH:mm" />
    </Form.Item>
    <Form.Item
      name="end_time"
      label="Bitiş Saati"
      rules={[{ required: true }]}
    >
      <TimePicker format="HH:mm" />
    </Form.Item>
    <Form.Item
      name="color"
      label="Renk"
      rules={[{ required: true }]}
    >
      <Input type="color" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit">
        Kaydet
      </Button>
    </Form.Item>
  </Form>
</Modal>
        </div>
    );
};

export default ShiftSettings;