import React, { useEffect, useState } from 'react';
import { List, Card, Avatar, Row, Col, Statistic, Tag, Space, Empty } from 'antd';
import { 
  CalendarOutlined, 
  GiftOutlined, 
  UserOutlined, 
  BarChartOutlined, 
  DollarOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  MoneyCollectOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  SmileOutlined,
  RiseOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [userInfo, setUserInfo] = useState(null);
  const [advanceStats, setAdvanceStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    totalAmount: 0
  });
  const [expenseStats, setExpenseStats] = useState({
    totalExpenses: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    monthlyChange: 0
  });
  const [pendingAdvances, setPendingAdvances] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    Promise.all([
      axios.get('http://localhost:5001/api/leave/leaves/pending', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/personnel/birthdays/upcoming', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/advance-requests/statistics', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/expenses/statistics', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/advance-requests/pending', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      axios.get('http://localhost:5001/api/expenses?status=pending', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    .then(([
      leavesRes,
      birthdaysRes,
      userRes,
      advanceStatsRes,
      expenseStatsRes,
      pendingAdvancesRes,
      pendingExpensesRes
    ]) => {
      setPendingLeaves(leavesRes.data);
      setUpcomingBirthdays(birthdaysRes.data);
      setUserInfo(userRes.data);
      setAdvanceStats(advanceStatsRes.data);
      setExpenseStats(expenseStatsRes.data);
      setPendingAdvances(pendingAdvancesRes.data);
      setPendingExpenses(pendingExpensesRes.data);
    })
    .catch(error => console.error('Error fetching dashboard data:', error));
  }, [navigate]);

  const handleAdvanceClick = () => {
    navigate('/advances');
  };

  const handleExpenseClick = () => {
    navigate('/expenses');
  };

  const handleLeaveClick = () => {
    navigate('/leaves');
  };

  const customEmptyImage = (message) => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span style={{ color: '#666' }}>
          {message}
        </span>
      }
    />
  );

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* Kullanıcı Bilgi Kartı */}
        <Col span={6}>
          <Card style={{ height: '100%' }} className="user-card">
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={100}
                src={userInfo?.photo_url ? `http://localhost:5001${userInfo.photo_url}` : null}
                icon={!userInfo?.photo_url && <UserOutlined />}
              />
              <h3 style={{ margin: '16px 0 8px' }}>{`${userInfo?.first_name} ${userInfo?.last_name}`}</h3>
              <p><UserOutlined /> {userInfo?.department}</p>
              <p><BarChartOutlined /> {userInfo?.title}</p>
            </div>
          </Card>
        </Col>

        {/* Avans İstatistikleri */}
        <Col span={18}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><MoneyCollectOutlined /> Toplam Avans Talepleri</>}
                  value={advanceStats.totalRequests}
                  prefix={<DollarOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><ClockCircleOutlined /> Bekleyen Avans Talepleri</>}
                  value={advanceStats.pendingRequests}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><CreditCardOutlined /> Toplam Avans Tutarı</>}
                  value={advanceStats.totalAmount}
                  precision={2}
                  prefix="₺"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><CheckCircleOutlined /> Onaylanan Avans Tutarı</>}
                  value={advanceStats.approvedAmount}
                  precision={2}
                  prefix="₺"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Harcama İstatistikleri */}
          <Row gutter={[16, 16]} style={{ marginTop: '16px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><FileTextOutlined /> Toplam Harcamalar</>}
                  value={expenseStats.totalExpenses}
                  precision={2}
                  prefix="₺"
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><ClockCircleOutlined /> Bekleyen Harcamalar</>}
                  value={expenseStats.pendingAmount}
                  precision={2}
                  prefix="₺"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><CheckCircleOutlined /> Onaylanan Harcamalar</>}
                  value={expenseStats.approvedAmount}
                  precision={2}
                  prefix="₺"
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={<><RiseOutlined /> Aylık Değişim</>}
                  value={expenseStats.monthlyChange}
                  precision={2}
                  prefix={expenseStats.monthlyChange >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  valueStyle={{ color: expenseStats.monthlyChange >= 0 ? '#3f8600' : '#cf1322' }}
                  suffix="%"
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Onay Bekleyen Talepler */}
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card 
            title={<><CalendarOutlined style={{ color: '#1890ff' }} /> Onay Bekleyen İzinler</>}
            extra={<a onClick={handleLeaveClick}>Tümünü Gör</a>}
          >
            {pendingLeaves.length > 0 ? (
              <List
                dataSource={pendingLeaves}
                renderItem={leave => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={leave.personnel_name}
                      description={
                        <>
                          <CalendarOutlined /> {`${moment(leave.start_date).format('DD.MM.YYYY')} - ${moment(leave.end_date).format('DD.MM.YYYY')}`}
                          <br />
                          <Tag color="blue">{leave.leave_type_name}</Tag>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : customEmptyImage('Bekleyen izin talebi bulunmuyor ✨')}
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={<><MoneyCollectOutlined style={{ color: '#52c41a' }} /> Onay Bekleyen Avans Talepleri</>}
            extra={<a onClick={handleAdvanceClick}>Tümünü Gör</a>}
          >
            {pendingAdvances.length > 0 ? (
              <List
                dataSource={pendingAdvances}
                renderItem={advance => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<DollarOutlined />} />}
                      title={advance.personnel_name}
                      description={
                        <>
                          <DollarOutlined /> {`₺${advance.amount.toLocaleString()}`}
                          <br />
                          <Tag color="orange">Beklemede</Tag>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : customEmptyImage('Bekleyen avans talebi bulunmuyor 💸')}
          </Card>
        </Col>

        <Col span={8}>
          <Card 
            title={<><FileTextOutlined style={{ color: '#722ed1' }} /> Onay Bekleyen Harcama Talepleri</>}
            extra={<a onClick={handleExpenseClick}>Tümünü Gör</a>}
          >
            {pendingExpenses.length > 0 ? (
              <List
                dataSource={pendingExpenses}
                renderItem={expense => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<CreditCardOutlined />} />}
                      title={expense.personnel_name}
                      description={
                        <>
                          <FileTextOutlined /> {expense.title}
                          <br />
                          <DollarOutlined /> {`₺${expense.amount.toLocaleString()}`}
                          <Tag color="orange" style={{ marginLeft: '8px' }}>Beklemede</Tag>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : customEmptyImage('Bekleyen harcama talebi bulunmuyor 📝')}
          </Card>
        </Col>
      </Row>

      {/* Yaklaşan Doğum Günleri */}
      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            title={<><GiftOutlined style={{ color: '#ff4d4f' }} /> Yaklaşan Doğum Günleri 🎂</>}
            className="birthday-card"
          >
            {upcomingBirthdays.length > 0 ? (
              <List
                grid={{ gutter: 16, column: 4 }}
                dataSource={upcomingBirthdays}
                renderItem={person => (
                  <List.Item>
                    <Card>
                      <List.Item.Meta
                        avatar={<Avatar icon={<SmileOutlined />} style={{ backgroundColor: '#1890ff' }}/>}
                        title={`${person.first_name} ${person.last_name}`}
                        description={
                          <>
                            <GiftOutlined style={{ color: '#ff4d4f' }} /> {`Doğum Günü: ${moment(person.birthdate).format('DD MMMM')}`} 🎈 🎉 🎁
                          </>
                        }
                      />
                    </Card>
                  </List.Item>
                )}
              />
            ) : customEmptyImage('Yaklaşan doğum günü bulunmuyor 🎈 🎊')}
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .user-card {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s;
        }
        
        .user-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .birthday-card {
          background: linear-gradient(to right, #fff, #f0f2f5);
        }

        .ant-card {
          border-radius: 8px;
          transition: all 0.3s;
        }

        .ant-card:hover {
          transform: translateY(-2px);
        }

        .ant-list-item {
          transition: all 0.3s;
        }

        .ant-list-item:hover {
          background: #f0f2f5;
          transform: translateX(4px);
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;