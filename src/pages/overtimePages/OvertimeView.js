import React, { useState, useEffect } from 'react';
import {
  Table,
  Select,
  DatePicker,
  Card,
  Space,
  message,
  Tag,
  Statistic,
  Row,
  Col,
  Input
} from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  SmileOutlined,
  FireOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import 'moment/locale/tr';
import tr_TR from 'antd/es/date-picker/locale/tr_TR';

moment.locale('tr');


const { RangePicker } = DatePicker;

const OvertimeView = () => {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [overtimeData, setOvertimeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [publicHolidays, setPublicHolidays] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDayTypes, setSelectedDayTypes] = useState([]);
  const [dateRange, setDateRange] = useState(null);
  const [depDropdownOpen, setDepDropdownOpen] = useState(false);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  // İstatistik verilerini tutmak için state
  const [statData, setStatData] = useState({
    totalOvertime: 0,
    weekendOvertime: 0,
    holidayOvertime: 0,
    workdayOvertime: 0,
  });

  moment.locale('tr');
  moment.updateLocale('tr', {
      week: {
          dow: 1,
          doy: 4
      },
      weekdaysMin: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  });
  
  const customLocale = {
      ...tr_TR,
      DatePicker: {
          ...tr_TR.DatePicker,
          firstDayOfWeek: 1
      }
  };

  useEffect(() => {
    fetchDepartments();
    fetchPublicHolidays();
  }, []);

  useEffect(() => {
    if (selectedDepartments.length > 0 && dateRange) {
      fetchOvertimeData();
    }
  }, [selectedDepartments, dateRange]);

  useEffect(() => {
    filterData(overtimeData);
  }, [selectedDayTypes]);

  // Tümünü seç/kaldır fonksiyonları
  const handleSelectAllDepartments = () => {
    if (selectedDepartments.length === departments.length) {
      setSelectedDepartments([]);
    } else {
      setSelectedDepartments(departments.map(dept => dept.id));
    }
    setDepDropdownOpen(false);
  };

  const handleSelectAllDayTypes = () => {
    const allDayTypes = ['workday', 'weekend', 'holiday'];
    if (selectedDayTypes.length === allDayTypes.length) {
      setSelectedDayTypes([]);
    } else {
      setSelectedDayTypes(allDayTypes);
    }
    setTypeDropdownOpen(false);
  };

  // Dropdown menü öğeleri
  const depDropdownRender = (menu) => (
    <div>
      <div
        style={{
          padding: '8px',
          borderBottom: '1px solid #e8e8e8',
          cursor: 'pointer',
          color: '#1890ff',
        }}
        onClick={handleSelectAllDepartments}
      >
        {selectedDepartments.length === departments.length ? 'Tüm Seçimleri Kaldır' : 'Tümünü Seç'}
      </div>
      {menu}
    </div>
  );

  const typeDropdownRender = (menu) => (
    <div>
      <div
        style={{
          padding: '8px',
          borderBottom: '1px solid #e8e8e8',
          cursor: 'pointer',
          color: '#1890ff',
        }}
        onClick={handleSelectAllDayTypes}
      >
        {selectedDayTypes.length === 3 ? 'Tüm Seçimleri Kaldır' : 'Tümünü Seç'}
      </div>
      {menu}
    </div>
  );

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDepartments(response.data);
    } catch (error) {
      message.error('Departmanlar yüklenirken bir hata oluştu');
    }
  };

  const fetchPublicHolidays = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/public-holidays', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublicHolidays(response.data);
    } catch (error) {
      message.error('Resmi tatil günleri yüklenirken bir hata oluştu');
    }
  };

  const isPublicHoliday = (date) => {
    const formattedDate = moment(date).format('YYYY-MM-DD');
    return publicHolidays.find(
      (holiday) =>
        moment(holiday.holiday_date).format('YYYY-MM-DD') === formattedDate
    );
  };

  const isWeekend = (date) => {
    const day = moment(date).day();
    return day === 0 || day === 6;
  };

  const getDayType = (date) => {
    const holiday = isPublicHoliday(date);
    if (holiday) {
      return {
        type: 'holiday',
        name: holiday.holiday_name,
        color: '#f50',
      };
    }
    if (isWeekend(date)) {
      return {
        type: 'weekend',
        name: 'Haftasonu',
        color: '#108ee9',
      };
    }
    return null;
  };

  const fetchOvertimeData = async () => {
    if (!selectedDepartments.length || !dateRange) return;
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const [startDate, endDate] = dateRange;

      const promises = selectedDepartments.map((deptId) =>
        axios.get(`http://localhost:5001/api/overtime/weekly/${deptId}`, {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            startDate: startDate.format('YYYY-MM-DD'),
            endDate: endDate.format('YYYY-MM-DD'),
          },
        })
      );

      const responses = await Promise.all(promises);
      const allData = responses.flatMap((response) => response.data);

      const formattedData = allData.map((record) => {
        const dayType = getDayType(record.start_time);
        return {
          ...record,
          key: record.id,
          personnel_name: `${record.first_name} ${record.last_name}`,
          overtime_hours: parseFloat(record.total_hours) || 0,
          date: moment(record.start_time).format('DD/MM/YYYY'),
          status_text: formatStatus(record.status),
          day_type: dayType,
          start_time: record.start_time
        };
      });

      setOvertimeData(formattedData);
      filterData(formattedData);
    } catch (error) {
      message.error('Mesai kayıtları yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const filterData = (data) => {
    if (!data.length) {
      setFilteredData([]);
      setStatData({
        totalOvertime: 0,
        weekendOvertime: 0,
        holidayOvertime: 0,
        workdayOvertime: 0,
      });
      return;
    }

    let filteredResult = data;
    if (selectedDayTypes.length) {
      filteredResult = data.filter((record) => {
        const date = record.start_time;
        const holidayCheck = isPublicHoliday(date);
        const weekendCheck = isWeekend(date);

        if (selectedDayTypes.includes('workday') && !weekendCheck && !holidayCheck) {
          return true;
        }
        if (selectedDayTypes.includes('weekend') && weekendCheck) {
          return true;
        }
        if (selectedDayTypes.includes('holiday') && holidayCheck) {
          return true;
        }
        return false;
      });
    }

    setFilteredData(filteredResult);
    calculateStats(filteredResult);
  };

  const calculateStats = (data) => {
    let totalOvertime = 0;
    let weekendOvertime = 0;
    let holidayOvertime = 0;
    let workdayOvertime = 0;

    data.forEach((record) => {
      const hours = record.overtime_hours || 0;
      const dayType = record.day_type?.type;

      totalOvertime += hours;

      switch (dayType) {
        case 'weekend':
          weekendOvertime += hours;
          break;
        case 'holiday':
          holidayOvertime += hours;
          break;
        default:
          workdayOvertime += hours;
          break;
      }
    });

    setStatData({
      totalOvertime,
      weekendOvertime,
      holidayOvertime,
      workdayOvertime,
    });
  };

  const formatStatus = (status) => {
    const statusMap = {
      pending: 'Bekliyor',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
    };
    return statusMap[status] || status;
  };

  const columns = [
    {
      title: 'Personel',
      dataIndex: 'personnel_name',
      key: 'personnel_name',
      width: 200,
    },
    {
      title: 'Tarih',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (text, record) => (
        <Space>
          {text}
          {record.day_type && (
            <Tag color={record.day_type.color}>{record.day_type.name}</Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Mesai Saati',
      dataIndex: 'overtime_hours',
      key: 'overtime_hours',
      width: 120,
    },
    {
      title: 'Açıklama',
      dataIndex: 'description',
      key: 'description',
      width: 200,
    },
    {
      title: 'Sebep',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
    },
    {
      title: 'Durum',
      dataIndex: 'status_text',
      key: 'status_text',
      width: 120,
      render: (text) => {
        const colorMap = {
          Bekliyor: 'gold',
          Onaylandı: 'green',
          Reddedildi: 'red',
        };
        return <Tag color={colorMap[text]}>{text}</Tag>;
      },
    },
  ];

  return (
    <Card title="Mesai Kayıtları Görüntüleme">
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title="Toplam Mesai"
              value={statData.totalOvertime}
              precision={2}
              suffix="saat"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title="Haftasonu Mesaisi"
              value={statData.weekendOvertime}
              precision={2}
              suffix="saat"
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#108ee9' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title="Resmi Tatil Mesaisi"
              value={statData.holidayOvertime}
              precision={2}
              suffix="saat"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#f50' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, textAlign: 'center' }}>
            <Statistic
              title="Normal Gün Mesaisi"
              value={statData.workdayOvertime}
              precision={2}
              suffix="saat"
              prefix={<SmileOutlined />}
              valueStyle={{ color: '#555' }}
            />
          </Card>
        </Col>
      </Row>

      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Space wrap>
          <Select
            mode="multiple"
            placeholder="Departman seçin"
            style={{ width: 300 }}
            onChange={setSelectedDepartments}
            maxTagCount="responsive"
            value={selectedDepartments}
            open={depDropdownOpen}
            onDropdownVisibleChange={setDepDropdownOpen}
            dropdownRender={depDropdownRender}
            options={departments.map((dept) => ({
              value: dept.id,
              label: dept.name,
            }))}
            listHeight={400}
          />

          <Select
            mode="multiple"
            placeholder="Mesai türü seçin"
            style={{ width: 300 }}
            onChange={setSelectedDayTypes}
            maxTagCount="responsive"
            value={selectedDayTypes}
            open={typeDropdownOpen}
            onDropdownVisibleChange={setTypeDropdownOpen}
            dropdownRender={typeDropdownRender}
            options={[
              { value: 'workday', label: 'Normal İş Günleri' },
              { value: 'weekend', label: 'Haftasonları' },
              { value: 'holiday', label: 'Resmi Tatiller' },
            ]}
            listHeight={300}
          />

<RangePicker 
    onChange={setDateRange} 
    format="DD/MM/YYYY"
    locale={tr_TR}
/>
        </Space>
      </Space>


          <Table
        columns={columns}
        dataSource={filteredData}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Toplam ${total} kayıt`,
        }}
      />
    </Card>
  );
};

export default OvertimeView;