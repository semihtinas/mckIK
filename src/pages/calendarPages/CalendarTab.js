import React, { useState, useEffect } from 'react';
import { Calendar, Badge, Modal, Form, Input, Select, DatePicker, Button, Space, Card, List, Tag, Tooltip, Empty, message, Tabs } from 'antd';
import { PlusOutlined, ClockCircleOutlined, UserOutlined, GiftOutlined, CalendarOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import AgendaView from './AgendaView';


const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;


const CalendarTab = ({ canEdit, canCreate, canDelete }) => {
    const [events, setEvents] = useState([]);
    const [leaves, setLeaves] = useState([]);
    const [birthdays, setBirthdays] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(moment().format('YYYY-MM')); // Yeni state
    const [meetings, setMeetings] = useState([]); // Yeni state ekleyelim
    const [activeTab, setActiveTab] = useState('month'); // Yeni state: 'month', 'year', veya 'agenda'

    const onYearCellClick = (date) => {
        // Seçilen ayın başlangıç tarihini belirle
        const selectedMonthStart = date.startOf('month');
        setCurrentMonth(selectedMonthStart.format('YYYY-MM')); // Seçilen ayı güncelle
        setActiveTab('month'); // Aylık görünüme geç
    };
    
    
    const axiosInstance = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });

  // Veri çekme işlemleri
  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
        const [eventsRes, leavesRes, birthdaysRes, meetingsRes] = await Promise.all([
            axiosInstance.get('/api/calendar/events'),
            axiosInstance.get('/api/calendar/leaves'),
            axiosInstance.get('/api/calendar/birthdays'),
            axiosInstance.get('/api/meetings') // Toplantıları da çekelim
        ]);

        setEvents(eventsRes.data || []);
        setLeaves(leavesRes.data || []);
        setBirthdays(birthdaysRes.data || []);
        setMeetings(meetingsRes.data || []);
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        message.error('Veri yüklenirken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};


    // Panel değişim fonksiyonunu güncelle
    const onPanelChange = (date, mode) => {
        const newMonth = date.format('YYYY-MM');
        setCurrentMonth(newMonth);
    };

  // Takvim hücre render fonksiyonu
// dateCellRender yerine cellRender kullanıyoruz
// Cellrenderer güncelleniyor
  // cellRender fonksiyonunu güncelle
 // Güncellenmiş cellRender fonksiyonu
 const cellRender = (current, info) => {
    if (info.type !== 'date') return null;
    
    const date = current.format('YYYY-MM-DD');
    
    const dayEvents = events.filter(event => {
        const eventStart = moment(event.start_date).format('YYYY-MM-DD');
        const eventEnd = moment(event.end_date).format('YYYY-MM-DD');
        return date >= eventStart && date <= eventEnd;
    });
    
    const dayLeaves = leaves.filter(leave => {
        const leaveStart = moment(leave.start_date).format('YYYY-MM-DD');
        const leaveEnd = moment(leave.end_date).format('YYYY-MM-DD');
        return date >= leaveStart && date <= leaveEnd;
    });
    
    const dayBirthdays = birthdays.filter(birthday => {
        if (!birthday.birth_date) return false;
        const birthDate = moment(birthday.birth_date).format('MM-DD');
        const currentDate = moment(date).format('MM-DD');
        return birthDate === currentDate;
    });


    // Toplantıları kontrol edelim
    const dayMeetings = meetings.filter(meeting => {
        const meetingStart = moment(meeting.start_time).format('YYYY-MM-DD');
        const meetingEnd = moment(meeting.end_time).format('YYYY-MM-DD');
        return date >= meetingStart && date <= meetingEnd;
    });

    const hasEvents = dayEvents.length > 0;
    const hasLeaves = dayLeaves.length > 0;
    const hasBirthdays = dayBirthdays.length > 0;
    const hasMeetings = dayMeetings.length > 0; // Yeni kontrol

        if (!hasEvents && !hasLeaves && !hasBirthdays && !hasMeetings) return null;



        return (
            <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {hasEvents && (
                    <li>
                        <Badge status="processing" text={`${dayEvents.length} Etkinlik`} />
                    </li>
                )}
                {hasMeetings && ( // Toplantıları gösterelim
                    <li>
                        <Badge 
                            status="warning" 
                            text={`${dayMeetings.length} Toplantı`}
                            style={{ color: '#722ed1' }}
                        />
                    </li>
                )}
                {hasLeaves && (
                <li>
                    <Badge 
                        status="warning" 
                        text={
                            <Space>
                                <UserOutlined style={{ color: '#faad14' }} />
                                {`${dayLeaves.length} İzin`}
                            </Space>
                        }
                    />
                </li>
            )}
            {hasBirthdays && (
                <li>
                    <Badge 
                        status="success" 
                        text={
                            <Space>
                                <span role="img" aria-label="birthday">🎂</span>
                                {`${dayBirthdays.length} Doğum Günü`}
                            </Space>
                        }
                    />
                </li>
            )}
        </ul>
    );
};

  // Etkinlik ekleme işlemi
 // handleAddEvent fonksiyonunu da güncelleyelim
 const handleAddEvent = async (values) => {
    try {
        setLoading(true);
        // Tarih formatını düzeltiyoruz
        const startDate = values.date_range[0].toISOString();
        const endDate = values.date_range[1].toISOString();
        
        const eventData = {
            title: values.title,
            description: values.description,
            event_type: values.event_type,
            start_date: startDate,
            end_date: endDate,
            participants: values.participants || []
        };

        console.log('Creating event with data:', eventData); // Debug için

        const response = await axiosInstance.post('/api/calendar/events', eventData);

        if (response.data) {
            message.success('Etkinlik başarıyla oluşturuldu');
            setEvents([...events, response.data]);
            setIsModalVisible(false);
            form.resetFields();
            fetchCalendarData(); // Verileri yenile
        }
    } catch (error) {
        console.error('Error adding event:', error);
        message.error('Etkinlik oluşturulurken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};
  const onSelectEvent = (event) => {
    setSelectedEvent(event);
  };
  
  const handleDeleteEvent = async () => {
    if (!selectedEvent) {
      return message.error('Silinecek bir etkinlik seçilmedi.');
    }
  
    Modal.confirm({
      title: 'Etkinliği silmek istediğinizden emin misiniz?',
      onOk: async () => {
        try {
          await axiosInstance.delete(`/api/calendar/events/${selectedEvent.id}`);
          setEvents(events.filter(event => event.id !== selectedEvent.id));
          setSelectedEvent(null);
          message.success('Etkinlik başarıyla silindi.');
        } catch (error) {
          console.error('Error deleting event:', error);
          message.error('Etkinlik silinirken bir hata oluştu.');
        }
      },
    });
  };
  
  
  // Gün seçme işlemi
 // Gün seçme işlemi güncelleniyor
  // onSelect fonksiyonunu güncelle
  // Tarih seçimi ve preview için onSelect fonksiyonunu güncelliyoruz
// Güncellenmiş onSelect fonksiyonu
 // Select fonksiyonunu güncelle
 const onSelect = (date) => {
    // Seçilen tarihin ayını kontrol et
    const selectedMonth = date.format('YYYY-MM-DD');
    const isCurrentMonthDate = selectedMonth.startsWith(currentMonth);
    
    const formattedDate = date.format('YYYY-MM-DD');
    
    const dayEvents = events.filter(event => {
        const eventStart = moment(event.start_date).format('YYYY-MM-DD');
        const eventEnd = moment(event.end_date).format('YYYY-MM-DD');
        return formattedDate >= eventStart && formattedDate <= eventEnd;
    });
    
    const dayLeaves = leaves.filter(leave => {
        const leaveStart = moment(leave.start_date).format('YYYY-MM-DD');
        const leaveEnd = moment(leave.end_date).format('YYYY-MM-DD');
        return formattedDate >= leaveStart && formattedDate <= leaveEnd;
    });
    
    const dayBirthdays = birthdays.filter(birthday => {
        if (!birthday.birth_date) return false;
        const birthDate = moment(birthday.birth_date).format('MM-DD');
        const currentDate = moment(formattedDate).format('MM-DD');
        return birthDate === currentDate;
    });

    // Toplantıları kontrol edelim
    const dayMeetings = meetings.filter(meeting => {
        const meetingStart = moment(meeting.start_time).format('YYYY-MM-DD');
        const meetingEnd = moment(meeting.end_time).format('YYYY-MM-DD');
        return formattedDate >= meetingStart && formattedDate <= meetingEnd;
    });

    if (dayEvents.length > 0 || dayLeaves.length > 0 || dayBirthdays.length > 0 || dayMeetings.length > 0) {
        Modal.info({
            title: `${date.format('DD MMMM YYYY')} - Detaylar`,
            width: 600,
            maskClosable: true,
            content: (
                <div>
                    {dayEvents.length > 0 && (
                        <Card title={
                            <Space>
                                <CalendarOutlined style={{ color: '#1890ff' }} />
                                Etkinlikler
                            </Space>
                        } size="small" style={{ marginBottom: 16 }}>
                            <List
                                size="small"
                                dataSource={dayEvents}
                                renderItem={event => (
                                    <List.Item>
                                        <Space>
                                            <span>{event.title}</span>
                                            {event.participants?.length > 0 && (
                                                <Tag color="blue">{event.participants.length} Katılımcı</Tag>
                                            )}
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}

                    {dayLeaves.length > 0 && (
                        <Card title={
                            <Space>
                                <UserOutlined style={{ color: '#faad14' }} />
                                İzinli Personel
                            </Space>
                        } size="small" style={{ marginBottom: 16 }}>
                            <List
                                size="small"
                                dataSource={dayLeaves}
                                renderItem={leave => (
                                    <List.Item>
                                        <Space>
                                            <span>{leave.personnel_name}</span>
                                            <Tag color="orange">{leave.leave_type}</Tag>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}

                    {dayBirthdays.length > 0 && (
                        <Card title={
                            <Space>
                                <GiftOutlined style={{ color: '#52c41a' }} />
                                Doğum Günleri
                            </Space>
                        } size="small">
                            <List
                                size="small"
                                dataSource={dayBirthdays}
                                renderItem={birthday => (
                                    <List.Item>
                                        <Space>
                                            <span role="img" aria-label="birthday">🎂</span>
                                            <span>{birthday.full_name}</span>
                                        </Space>
                                    </List.Item>
                                )}
                            />
                        </Card>
                    )}

{dayMeetings.length > 0 && (
                            <Card title="Toplantılar" size="small" style={{ marginBottom: 16 }}>
                                <List
                                    size="small"
                                    dataSource={dayMeetings}
                                    renderItem={meeting => (
                                        <List.Item>
                                            <Space>
                                                <CalendarOutlined style={{ color: '#722ed1' }} />
                                                <span>{meeting.title}</span>
                                                <Tag color="purple">
                                                    {moment(meeting.start_time).format('HH:mm')} - 
                                                    {moment(meeting.end_time).format('HH:mm')}
                                                </Tag>
                                                {meeting.participants?.length > 0 && (
                                                    <Tag color="blue">
                                                        {meeting.participants.length} Katılımcı
                                                    </Tag>
                                                )}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            </Card>
                            )}

                    {(dayEvents.length === 0 && dayLeaves.length === 0 && dayBirthdays.length === 0 && dayMeetings.length === 0) && (
                        <Empty description="Bu tarihte herhangi bir etkinlik bulunmuyor" />
                    )}
                </div>
            ),
            footer: canCreate ? (
                <Space>
                    <Button onClick={() => Modal.destroyAll()}>
                        Kapat
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => {
                            Modal.destroyAll();
                            setIsModalVisible(true);
                        }}
                    >
                        Etkinlik Ekle
                    </Button>
                </Space>
            ) : (
                <Button onClick={() => Modal.destroyAll()}>
                    Kapat
                </Button>
            )
        });

} else if (canCreate && isCurrentMonthDate) {
    setIsModalVisible(true);
}
};


return (
    <div>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {canCreate && (
                <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    onClick={() => setIsModalVisible(true)}
                >
                    Yeni Etkinlik
                </Button>
            )}

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                className="bg-white p-4 rounded-lg shadow"
            >
                <TabPane tab="Aylık Görünüm" key="month">
                    <Calendar 
                        cellRender={cellRender}
                        onSelect={onSelect}
                        onPanelChange={onPanelChange}
                        loading={loading}
                    />
                </TabPane>
                <TabPane tab="Yıllık Görünüm" key="year">
    <Calendar
        mode="year"
        onSelect={(date) => {
            const selectedMonthStart = date.startOf('month');
            setCurrentMonth(selectedMonthStart.format('YYYY-MM'));
            setActiveTab('month');
        }}
        onPanelChange={(date, mode) => {
            if (mode === 'month') {
                setCurrentMonth(date.format('YYYY-MM'));
                setActiveTab('month');
            }
        }}
    />
</TabPane>



                <TabPane tab="Ajanda" key="agenda">
                    <AgendaView 
                        events={events}
                        meetings={meetings}
                        leaves={leaves}
                    />
                </TabPane>
            </Tabs>

   

        <Modal
          title={selectedEvent ? "Etkinlik Düzenle" : "Yeni Etkinlik"}
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setSelectedEvent(null);
            form.resetFields();
          }}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddEvent}
            initialValues={selectedEvent && {
              ...selectedEvent,
              date_range: [
                moment(selectedEvent.start_date),
                moment(selectedEvent.end_date)
              ]
            }}
          >
            <Form.Item
              name="title"
              label="Etkinlik Başlığı"
              rules={[{ required: true, message: 'Lütfen etkinlik başlığı girin' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="event_type"
              label="Etkinlik Türü"
              rules={[{ required: true, message: 'Lütfen etkinlik türü seçin' }]}
            >
              <Select>
                <Option value="meeting">Toplantı</Option>
                <Option value="training">Eğitim</Option>
                <Option value="social">Sosyal Etkinlik</Option>
                <Option value="other">Diğer</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="date_range"
              label="Tarih Aralığı"
              rules={[{ required: true, message: 'Lütfen tarih aralığı seçin' }]}
            >
              <RangePicker 
                showTime={{ format: 'HH:mm' }}
                format="YYYY-MM-DD HH:mm"
                style={{ width: '100%' }}
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="Açıklama"
            >
              <TextArea rows={4} />
            </Form.Item>

            <Form.Item
                name="participants"
                label="Katılımcılar"
            >
                <Select
                    mode="multiple"
                    placeholder="Katılımcıları seçin"
                    optionFilterProp="label"
                    style={{ width: '100%' }}
                    options={personnel}
                    filterOption={(input, option) =>
                        option?.label?.toLowerCase().includes(input.toLowerCase())
                    }
                />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {selectedEvent ? 'Güncelle' : 'Kaydet'}
                </Button>
                <Button onClick={() => {
                  setIsModalVisible(false);
                  setSelectedEvent(null);
                  form.resetFields();
                }}>
                  İptal
                </Button>
                {canDelete && selectedEvent && (
                  <Button danger onClick={handleDeleteEvent}>
                    Sil
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
};

export default CalendarTab;