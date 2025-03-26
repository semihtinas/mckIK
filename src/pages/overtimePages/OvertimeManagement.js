import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Form, DatePicker, InputNumber, message, Card, Select, Space, Tabs } from 'antd';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/tr';
import tr_TR from 'antd/es/date-picker/locale/tr_TR';
import OvertimeView from './OvertimeView';




// Configure moment locale at the top of file
moment.updateLocale('tr', {
    week: {
        dow: 1, // Pazartesi
        doy: 4  // ISO 8601 standardına daha yakın
    },
    weekdaysMin: ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"]
});

const OvertimeManagement = () => {
    const [form] = Form.useForm();
    const [departments, setDepartments] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [selectedWeek, setSelectedWeek] = useState(null);


    // Memoized week days calculation
    const weekDays = useMemo(() => {
        if (!selectedWeek) return [];
        const days = [];
        const startOfWeek = selectedWeek.clone().startOf('isoWeek'); // Pazartesi
        for (let i = 0; i < 7; i++) {
          days.push(startOfWeek.clone().add(i, 'days'));
        }
        return days;
      }, [selectedWeek]);
      

    // Memoized table columns
    const weeklyColumns = useMemo(() => [
        {
            title: 'Personel',
            dataIndex: 'full_name',
            key: 'name',
            fixed: 'left',
            width: 200
        },
        ...weekDays.map((day, index) => ({
            title: day.format('DD/MM/YYYY dddd'),
            key: `day${index}`,
            width: 120,
            render: (text, record, rowIndex) => (
                <Form.Item
                    name={['weeklyData', rowIndex, `day${index}`]}
                    style={{ margin: 0 }}
                >
                    <InputNumber
                        min={0}
                        max={24}
                        placeholder="0"
                        style={{ width: '100%' }}
                    />
                </Form.Item>
            )
        }))
    ], [weekDays]);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (selectedDepartment && selectedWeek) {
            fetchExistingOvertimes();
        }
    }, [selectedDepartment, selectedWeek]);

    const handleWeekChange = (date) => {
        if (!date) {
          setSelectedWeek(null);
          form.resetFields(['weeklyData']);
          return;
        }
        // Haftanın hangi gününe tıklanırsa tıklansın, bunu ISO hafta başına (Pazartesi) çekiyoruz
        const isoWeekStart = date.clone().startOf('isoWeek');
        setSelectedWeek(isoWeekStart);
        form.resetFields(['weeklyData']);
      };
      

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5001/api/departments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(response.data);
        } catch (error) {
            message.error('Departmanlar yüklenirken bir hata oluştu');
        }
    };

    const fetchDepartmentPersonnel = async (departmentId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `http://localhost:5001/api/departments/${departmentId}/personnel`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPersonnel(response.data);
        } catch (error) {
            message.error('Personel listesi yüklenirken bir hata oluştu');
        }
    };

    const fetchExistingOvertimes = async () => {
        if (!selectedWeek || !selectedDepartment) return;
        
        try {
            const token = localStorage.getItem('token');
            const startDate = selectedWeek.clone().startOf('isoWeek');
            const endDate = selectedWeek.clone().endOf('isoWeek');

            const response = await axios.get(
                `http://localhost:5001/api/overtime/weekly/${selectedDepartment}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        startDate: startDate.format('YYYY-MM-DD'),
                        endDate: endDate.format('YYYY-MM-DD')
                    }
                }
            );

            const formData = { weeklyData: [] };
            personnel.forEach((person, personIndex) => {
                formData.weeklyData[personIndex] = {};
                weekDays.forEach((day, dayIndex) => {
                    const currentDate = day.format('YYYY-MM-DD');
                    const overtimeRecord = response.data.find(record => 
                        record.personnel_id === person.id && 
                        moment(record.start_time).format('YYYY-MM-DD') === currentDate
                    );
                    if (overtimeRecord) {
                        formData.weeklyData[personIndex][`day${dayIndex}`] = overtimeRecord.total_hours;
                    }
                });
            });

            form.setFieldsValue(formData);
        } catch (error) {
            message.error('Mevcut mesai kayıtları yüklenirken bir hata oluştu');
        }
    };

    const handleDepartmentChange = (value) => {
        setSelectedDepartment(value);
        fetchDepartmentPersonnel(value);
        form.resetFields(['weeklyData']);
    };

    const handleSubmit = async (values) => {
        if (!selectedWeek || !selectedDepartment) {
            message.warning('Lütfen departman ve hafta seçin');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const overtimeRecords = [];

            personnel.forEach((person, personIndex) => {
                weekDays.forEach((day, dayIndex) => {
                    const hours = values.weeklyData?.[personIndex]?.[`day${dayIndex}`];
                    if (hours && hours > 0) {
                        overtimeRecords.push({
                            personnel_id: person.id,
                            date: day.format('YYYY-MM-DD'),
                            hours: hours,
                            start_time: day.format('YYYY-MM-DD 00:00:00'),
                            end_time: day.format('YYYY-MM-DD 23:59:59'),
                            reason: 'Haftalık mesai girişi'
                        });
                    }
                });
            });

            if (overtimeRecords.length === 0) {
                message.warning('En az bir mesai girişi yapılmalıdır');
                return;
            }

            await axios.post('http://localhost:5001/api/overtime/bulk', overtimeRecords, {
                headers: { Authorization: `Bearer ${token}` }
            });

            message.success('Mesai kayıtları başarıyla oluşturuldu');
            await fetchExistingOvertimes();
        } catch (error) {
            message.error('Mesai kayıtları oluşturulurken bir hata oluştu');
        }
        setLoading(false);
    };

    const WeeklyOvertimeContent = () => (
        <Form form={form} onFinish={handleSubmit} layout="vertical">
            <Card>
                <Space style={{ marginBottom: 16 }}>
                    <Form.Item label="Departman" required style={{ marginBottom: 0 }}>
                        <Select
                            placeholder="Departman seçin"
                            onChange={handleDepartmentChange}
                            options={departments.map(dept => ({
                                value: dept.id,
                                label: dept.name
                            }))}
                            style={{ width: 200 }}
                        />
                    </Form.Item>

                    <Form.Item label="Hafta" required style={{ marginBottom: 0 }}>
                    <DatePicker
  picker="week"
  onChange={handleWeekChange}
  format="DD/MM/YYYY"
  locale={tr_TR}
  value={selectedWeek}
  allowClear
  style={{ width: 200 }}
/>


                    </Form.Item>
                </Space>

                <Table
                    columns={weeklyColumns}
                    dataSource={personnel}
                    rowKey="id"
                    pagination={false}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                />

                <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    style={{ marginTop: 16 }}
                    disabled={!selectedDepartment || !selectedWeek}
                >
                    Mesaileri Kaydet
                </Button>
            </Card>
        </Form>
    );

    return (
        <div style={{ padding: '20px' }}>
            <Tabs 
                defaultActiveKey="1" 
                type="card"
                items={[
                    {
                        key: '1',
                        label: 'Haftalık Mesai Girişi',
                        children: <WeeklyOvertimeContent />
                    },
                    {
                        key: '2',
                        label: 'Mesai Kayıtları',
                        children: <OvertimeView />
                    }
                ]}
            />
        </div>
    );
};

export default OvertimeManagement;