import React, { useEffect, useState } from 'react';
import { Form, Input, Button, DatePicker, message, Table } from 'antd';
import axios from 'axios';
import moment from 'moment';

const PublicHolidaysTab = () => {
  const [holidays, setHolidays] = useState([]);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      const startDate = values.start_date;
      const endDate = values.end_date;

      if (!startDate || !endDate) {
        message.error("Başlangıç ve bitiş tarihlerini seçmelisiniz.");
        return;
      }

      const formattedStartDate = startDate.format('YYYY-MM-DD');
      const formattedEndDate = endDate.format('YYYY-MM-DD');

      const holidays = [];
      let currentDate = moment(formattedStartDate);
      const endMoment = moment(formattedEndDate);

      while (currentDate.isSameOrBefore(endMoment)) {
        holidays.push({
          holiday_name: values.name,
          holiday_date: currentDate.format('YYYY-MM-DD'),
        });
        currentDate = currentDate.add(1, 'days');
      }

      console.log('Holidays to be sent:', holidays);

      await axios.post('http://localhost:5001/api/public-holidays', holidays);
      message.success('Tatil başarıyla eklendi');
      form.resetFields();
      loadHolidays();
    } catch (error) {
      console.error('Error:', error);
      message.error('Tatil eklenirken bir hata oluştu');
    }
  };

  const loadHolidays = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/public-holidays');
      console.log('Raw data from backend:', response.data);
      
      // Backend'den gelen verileri işle ve formatla
      const formattedHolidays = response.data.map(holiday => ({
        ...holiday,
        holiday_date: moment(holiday.holiday_date).format('YYYY-MM-DD')
      }));
      
      console.log('Formatted holidays:', formattedHolidays);
      setHolidays(formattedHolidays);
    } catch (error) {
      console.error('Error loading holidays:', error);
      message.error('Tatiller yüklenemedi');
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const columns = [
    { title: 'Tatil Adı', dataIndex: 'holiday_name', key: 'holiday_name' },
    { 
      title: 'Tarih', 
      dataIndex: 'holiday_date', 
      key: 'holiday_date',
      render: (text) => moment(text).format('YYYY-MM-DD') // Tarih formatını burada da düzeltiyoruz
    },
  ];

  return (
    <>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="name" label="Tatil Adı" rules={[{ required: true, message: 'Lütfen tatil adını girin' }]}>
          <Input placeholder="Tatil adını girin" />
        </Form.Item>

        <Form.Item name="start_date" label="Başlangıç Tarihi" rules={[{ required: true, message: 'Lütfen başlangıç tarihi seçin' }]}>
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="end_date" label="Bitiş Tarihi" rules={[{ required: true, message: 'Lütfen bitiş tarihi seçin' }]}>
          <DatePicker format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Tatil Ekle
          </Button>
        </Form.Item>
      </Form>

      <Table dataSource={holidays} columns={columns} rowKey={(record) => `${record.holiday_name}-${record.holiday_date}`} />
    </>
  );
};

export default PublicHolidaysTab;