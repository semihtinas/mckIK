import React, { useState, useEffect, useCallback } from 'react';
import { Card, Space, Typography, Button, Empty, Select, Badge, Tag, Modal, Drawer, Radio, Checkbox, message, List } from 'antd';
import { 
  ClockCircleOutlined, 
  UserOutlined, 
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import _ from 'lodash';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const AgendaView = ({ events, meetings, leaves }) => {
  const [selectedDate, setSelectedDate] = useState(moment());
  const [viewType, setViewType] = useState('day');
  const [viewMode, setViewMode] = useState('agenda'); // 'agenda', 'timeline', 'list'
  const [mergedEvents, setMergedEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isFilterDrawerVisible, setIsFilterDrawerVisible] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(true);
  const [filters, setFilters] = useState({
    types: ['event', 'meeting', 'leave'],
    timeRange: 'all'
  });
  const [theme, setTheme] = useState('light');

  const themes = {
    light: {
      background: '#f0f2f5',
      cardBackground: '#ffffff',
      textColor: '#000000',
    },
    dark: {
      background: '#141414',
      cardBackground: '#1f1f1f',
      textColor: '#ffffff',
    },
    colorful: {
      background: '#e6f7ff',
      cardBackground: '#ffffff',
      textColor: '#000000',
    }
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => 
    moment().startOf('day').add(i, 'hours')
  );

  const handleDragStart = useCallback((event, eventData) => {
    event.dataTransfer.setData('text/plain', JSON.stringify(eventData));
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    const card = event.currentTarget;
    card.style.backgroundColor = '#f0f0f0';
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    const card = event.currentTarget;
    card.style.backgroundColor = '';
  }, []);

  const handleDrop = useCallback((event, targetDate) => {
    event.preventDefault();
    const card = event.currentTarget;
    card.style.backgroundColor = '';

    try {
      const eventData = JSON.parse(event.dataTransfer.getData('text/plain'));
      const startTime = moment(targetDate)
        .hour(moment(eventData.start).hour())
        .minute(moment(eventData.start).minute());
      const duration = moment.duration(moment(eventData.end).diff(moment(eventData.start)));
      const endTime = moment(startTime).add(duration);

      console.log('Event moved:', {
        event: eventData,
        newStart: startTime.format(),
        newEnd: endTime.format()
      });
      message.success('Etkinlik taşındı');
    } catch (error) {
      console.error('Drop error:', error);
      message.error('Etkinlik taşınamadı');
    }
  }, []);

  useEffect(() => {
    const processDate = (date) => {
      if (!date) return moment();
      try {
        const m = moment(date);
        return m.isValid() ? m : moment();
      } catch (e) {
        console.error('Invalid date:', date);
        return moment();
      }
    };

    const mappedMeetings = (meetings || []).map(meeting => ({
      ...meeting,
      type: 'meeting',
      start: processDate(meeting.start_time || meeting.start_date),
      end: processDate(meeting.end_time || meeting.end_date),
      title: meeting.meeting_title || meeting.title,
      color: '#722ed1'
    }));

    const mappedLeaves = (leaves || []).map(leave => ({
      ...leave,
      type: 'leave',
      start: processDate(leave.start_date),
      end: processDate(leave.end_date),
      title: `${leave.personnel_name} - ${leave.leave_type}`,
      color: '#faad14'
    }));

    const mappedEvents = (events || []).map(event => ({
      ...event,
      type: 'event',
      start: processDate(event.start_date),
      end: processDate(event.end_date),
      title: event.title || 'Untitled Event',
      color: '#1890ff'
    }));

    const filtered = [...mappedEvents, ...mappedMeetings, ...mappedLeaves].filter(event => {
      if (!filters.types.includes(event.type)) return false;
      
      if (filters.timeRange === 'future') {
        return event.start.isAfter(moment());
      } else if (filters.timeRange === 'past') {
        return event.start.isBefore(moment());
      }
      return true;
    });

    const sorted = _.sortBy(filtered, [
      item => item.start.valueOf(),
      item => item.end.valueOf()
    ]);

    setMergedEvents(sorted);
  }, [events, meetings, leaves, filters]);

  const checkOverlappingEvents = (event, dayEvents) => {
    return dayEvents.some(otherEvent => 
      event.id !== otherEvent.id && 
      moment(event.start).isBefore(moment(otherEvent.end)) &&
      moment(event.end).isAfter(moment(otherEvent.start))
    );
  };

  const getDateRange = () => {
    switch (viewType) {
      case 'week':
        return Array.from({ length: 7 }, (_, i) => 
          moment(selectedDate).startOf('week').add(i, 'days')
        );
      case 'workWeek':
        return Array.from({ length: 5 }, (_, i) => 
          moment(selectedDate).startOf('week').add(i, 'days')
        );
      default:
        return [moment(selectedDate)];
    }
  };

  const filterEventsByDate = (date) => {
    return mergedEvents.filter(event => {
      const eventStart = moment(event.start).startOf('day');
      const eventEnd = moment(event.end).startOf('day');
      const targetDate = moment(date).startOf('day');
      return targetDate.isBetween(eventStart, eventEnd, 'day', '[]');
    });
  };

  const renderTimeBlock = (event, hasOverlap) => (
    <div 
      draggable
      onDragStart={(e) => handleDragStart(e, event)}
      className="mb-4 border-l-4 pl-4 py-2" 
      style={{ 
        borderLeftColor: event.color,
        backgroundColor: themes[theme].cardBackground,
        borderRadius: '0 4px 4px 0',
        boxShadow: hasOverlap ? '0 0 0 2px #ff4d4f' : '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer'
      }}
      onClick={() => {
        setSelectedEvent(event);
        setIsDetailVisible(true);
      }}
    >
      <Space direction="vertical" size={1} className="w-full">
        <Space align="center">
          <Badge color={event.color} />
          <Text strong className="text-lg" style={{ color: themes[theme].textColor }}>
            {event.title}
          </Text>
          <Tag color={event.color}>
            {event.type === 'meeting' ? 'Toplantı' : 
             event.type === 'event' ? 'Etkinlik' : 'İzin'}
          </Tag>
          {hasOverlap && (
            <Tag color="error">Çakışma Var!</Tag>
          )}
        </Space>
        <Space size="large" className="mt-2">
          <Space>
            <ClockCircleOutlined className="text-gray-400" />
            <Text type="secondary">
              {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
            </Text>
          </Space>
          {event.type === 'meeting' && event.participants && (
            <Space>
              <UserOutlined className="text-gray-400" />
              <Text type="secondary">
                {event.participants.length} Katılımcı
              </Text>
            </Space>
          )}
        </Space>
      </Space>
    </div>
  );

  const renderTimelineView = (date, dayEvents) => {
    const timelineHeight = 60; // Her saat dilimi için yükseklik (piksel)
    
    return (
      <div className="timeline-view" style={{ position: 'relative', height: `${24 * timelineHeight}px`, overflow: 'hidden' }}>
        {timeSlots.map((time, index) => (
          <div 
            key={time.format('HH:mm')}
            className="time-slot"
            style={{
              position: 'relative',
              height: `${timelineHeight}px`,
              borderBottom: '1px solid #f0f0f0',
              padding: '4px'
            }}
          >
            <Text type="secondary" className="text-xs">
              {time.format('HH:mm')}
            </Text>
          </div>
        ))}
        {dayEvents.map((event, index) => {
          const startTime = moment(event.start);
          const endTime = moment(event.end);
          const startMinutes = startTime.hours() * 60 + startTime.minutes();
          const duration = moment.duration(endTime.diff(startTime)).asMinutes();
          const hasOverlap = checkOverlappingEvents(event, dayEvents);

          // Yükseklik hesaplaması için maksimum süreyi sınırla
          const maxDuration = Math.min(duration, 24 * 60 - startMinutes); // Günün sonunu geçemez
          const eventHeight = (maxDuration / 60) * timelineHeight;

          return (
            <div
              key={`${event.id}-${index}`}
              style={{
                position: 'absolute',
                top: `${(startMinutes / 60) * timelineHeight}px`,
                left: hasOverlap ? '100px' : '60px',
                right: '10px',
                height: `${eventHeight}px`,
                backgroundColor: hasOverlap ? `${event.color}dd` : event.color,
                borderRadius: '4px',
                padding: '4px 8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: hasOverlap ? '2px dashed #fff' : 'none',
                zIndex: hasOverlap ? 2 : 1
              }}
              onClick={() => {
                setSelectedEvent(event);
                setIsDetailVisible(true);
              }}
            >
              <Text strong style={{ color: '#fff' }}>
                {event.title}
              </Text>
              <Text style={{ color: '#fff', fontSize: '12px' }}>
                {startTime.format('HH:mm')} - {endTime.format('HH:mm')}
              </Text>
              {hasOverlap && (
                <Tag color="error" className="mt-1">
                  Çakışma Var!
                </Tag>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderListView = (date, dayEvents) => (
    <List
      dataSource={dayEvents}
      renderItem={(event) => {
        const hasOverlap = checkOverlappingEvents(event, dayEvents);
        return (
          <List.Item
            className="hover:bg-gray-50 cursor-pointer"
            onClick={() => {
              setSelectedEvent(event);
              setIsDetailVisible(true);
            }}
          >
            <List.Item.Meta
              avatar={
                <Badge 
                  color={event.color} 
                  style={{ width: '40px', height: '40px', lineHeight: '40px' }}
                />
              }
              title={
                <Space>
                  <Text strong>{event.title}</Text>
                  {hasOverlap && (
                    <Tag color="error">Çakışma Var!</Tag>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={1}>
                  <Space>
                    <ClockCircleOutlined />
                    <Text type="secondary">
                      {moment(event.start).format('HH:mm')} - {moment(event.end).format('HH:mm')}
                    </Text>
                  </Space>
                  {event.type === 'meeting' && event.participants && (
                    <Space>
                      <UserOutlined />
                      <Text type="secondary">
                        {event.participants.length} Katılımcı
                      </Text>
                    </Space>
                  )}
                </Space>
              }
            />
          </List.Item>
        );
      }}
    />
  );

  const renderAgendaView = (date, dayEvents) => (
    <div>
      {dayEvents.length > 0 ? (
        dayEvents.map((event, index) => {
          const hasOverlap = checkOverlappingEvents(event, dayEvents);
          return (
            <div key={`${event.type}-${index}`}>
              {renderTimeBlock(event, hasOverlap)}
            </div>
          );
        })
      ) : (
        <Empty 
          description={
            <Text style={{ color: themes[theme].textColor }}>
              Bu tarihte etkinlik bulunmuyor
            </Text>
          } 
          className="my-8"
        />
      )}
    </div>
  );

  const renderEventDetail = () => (
    <Drawer
      title="Etkinlik Detayları"
      placement="right"
      onClose={() => setIsDetailVisible(false)}
      open={isDetailVisible}
      width={500}
    >
      {selectedEvent && (
        <Space direction="vertical" size="large" className="w-full">
          <Title level={3}>{selectedEvent.title}</Title>
          
          <Space direction="vertical">
            <Tag color={selectedEvent.color}>
              {selectedEvent.type === 'meeting' ? 'Toplantı' : 
               selectedEvent.type === 'event' ? 'Etkinlik' : 'İzin'}
            </Tag>
            
            <Space>
              <ClockCircleOutlined />
              <Text>
                {moment(selectedEvent.start).format('DD MMMM YYYY, HH:mm')} - 
                {moment(selectedEvent.end).format('HH:mm')}
              </Text>
            </Space>

            {selectedEvent.type === 'meeting' && selectedEvent.participants && (
              <div>
                <Text strong>Katılımcılar:</Text>
                <div className="mt-2">
                  {selectedEvent.participants.map((participant, index) => (
                    <Tag key={index} className="mb-2">
                      <UserOutlined /> {participant.name || participant.personnel_name || participant}
                      {participant.attendance_status && (
                        <Tag 
                          color={
                            participant.attendance_status === 'accepted' ? 'success' :
                            participant.attendance_status === 'declined' ? 'error' :
                            'warning'
                          }
                          className="ml-2"
                        >
                          {participant.attendance_status === 'accepted' ? 'Katılıyor' :
                           participant.attendance_status === 'declined' ? 'Katılmıyor' :
                           'Yanıt Bekleniyor'}
                        </Tag>
                      )}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.type === 'leave' && (
              <div>
                <Text strong>İzin Durumu:</Text>
                <Tag color={selectedEvent.status === 'Approved' ? 'success' : 'processing'}>
                  {selectedEvent.status}
                </Tag>
              </div>
            )}

            {selectedEvent.description && (
              <div>
                <Text strong>Açıklama:</Text>
                <Paragraph>{selectedEvent.description}</Paragraph>
              </div>
            )}
          </Space>
        </Space>
      )}
    </Drawer>
  );

  const renderFilterDrawer = () => (
    <Drawer
      title="Filtreleme Seçenekleri"
      placement="right"
      onClose={() => setIsFilterDrawerVisible(false)}
      open={isFilterDrawerVisible}
    >
      <Space direction="vertical" size="large" className="w-full">
        <div>
          <Title level={5}>Etkinlik Türleri</Title>
          <Checkbox.Group
            options={[
              { label: 'Etkinlikler', value: 'event' },
              { label: 'Toplantılar', value: 'meeting' },
              { label: 'İzinler', value: 'leave' }
            ]}
            value={filters.types}
            onChange={types => setFilters(prev => ({ ...prev, types }))}
          />
        </div>

        <div>
          <Title level={5}>Zaman Aralığı</Title>
          <Radio.Group
            value={filters.timeRange}
            onChange={e => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
          >
            <Space direction="vertical">
              <Radio value="all">Tümü</Radio>
              <Radio value="future">Gelecek Etkinlikler</Radio>
              <Radio value="past">Geçmiş Etkinlikler</Radio>
            </Space>
          </Radio.Group>
        </div>

        <div>
          <Title level={5}>Tema</Title>
          <Radio.Group
            value={theme}
            onChange={e => setTheme(e.target.value)}
          >
            <Space direction="vertical">
              <Radio value="light">Açık Tema</Radio>
              <Radio value="dark">Koyu Tema</Radio>
              <Radio value="colorful">Renkli Tema</Radio>
            </Space>
          </Radio.Group>
        </div>
      </Space>
    </Drawer>
  );

  return (
    <div className="agenda-view" style={{ 
      backgroundColor: themes[theme].background,
      minHeight: '100vh'
    }}>
      {/* Header Section */}
      <div className="p-6 mb-6 shadow-sm" style={{ backgroundColor: themes[theme].cardBackground }}>
        <div className="container mx-auto">
          <Space className="w-full justify-between items-center">
            <Space size="large">
              <Select 
                value={viewType} 
                onChange={setViewType}
                className="w-32"
                dropdownMatchSelectWidth={false}
              >
                <Option value="day">Günlük</Option>
                <Option value="workWeek">İş Haftası</Option>
                <Option value="week">Haftalık</Option>
              </Select>

              <Radio.Group 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="agenda">Ajanda</Radio.Button>
                <Radio.Button value="timeline">Zaman Çizelgesi</Radio.Button>
                <Radio.Button value="list">Liste</Radio.Button>
              </Radio.Group>

              <Button 
                icon={<FilterOutlined />}
                onClick={() => setIsFilterDrawerVisible(true)}
              >
                Filtrele
              </Button>

              <Button 
                type="default"
                onClick={() => setSelectedDate(moment())}
                icon={<CalendarOutlined />}
              >
                Bugün
              </Button>
            </Space>
            
            <Space size="large" align="center">
              <Button 
                type="text" 
                icon={<LeftOutlined />} 
                onClick={() => setSelectedDate(prev => moment(prev).subtract(1, viewType === 'day' ? 'days' : 'weeks'))}
              />
              <Title level={2} style={{ margin: 0, color: themes[theme].textColor }}>
                {selectedDate.format('DD MMMM YYYY')}
              </Title>
              <Button 
                type="text" 
                icon={<RightOutlined />} 
                onClick={() => setSelectedDate(prev => moment(prev).add(1, viewType === 'day' ? 'days' : 'weeks'))}
              />
            </Space>
          </Space>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8">
          {getDateRange().map(date => {
            const dayEvents = filterEventsByDate(date);
            return (
              <Card 
                key={date.format()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, date)}
                title={
                  <Space>
                    <CalendarOutlined />
                    <Text style={{ color: themes[theme].textColor }}>
                      {date.format('dddd')}
                    </Text>
                    {date.isSame(moment(), 'day') && (
                      <Badge status="processing" text="Bugün" />
                    )}
                  </Space>
                }
                style={{ 
                  backgroundColor: themes[theme].cardBackground,
                }}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                {viewMode === 'agenda' && renderAgendaView(date, dayEvents)}
                {viewMode === 'timeline' && renderTimelineView(date, dayEvents)}
                {viewMode === 'list' && renderListView(date, dayEvents)}
              </Card>
            );
          })}
        </div>
      </div>

      {renderEventDetail()}
      {renderFilterDrawer()}
    </div>
  );
};

export default AgendaView;