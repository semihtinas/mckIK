import React, { useCallback, useMemo } from 'react';
import { Layout, Menu, Button, Spin, Dropdown } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { DownOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

const Main = React.memo(({ children, onShowLeaveRequest, onShowAdvanceRequest, onShowExpenseRequest, userInfo }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }, []);

  const goToMyAccount = useCallback(() => {
    if (userInfo?.id) {
      navigate(`/personnel/${userInfo.id}`);
    }
  }, [userInfo, navigate]);

  const menuItems = useMemo(() => [
    { key: '/dashboard', label: <Link to="/dashboard">Dashboard</Link> },
    { key: '/leaves', label: <Link to="/leaves">Leaves</Link> },
    { key: '/calendar', label: <Link to="/calendar">Calendar</Link> },
    { key: '/meetings', label: <Link to="/meetings">Toplantılar</Link> },
    { key: '/shifts', label: <Link to="/shifts">Vardiya Yönetimi</Link> },
    { key: '/workflow', label: <Link to="/workflow">Job Workflow</Link> },
    
    
    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
      ?{ key: '/advances', label: <Link to="/advances">Advances</Link> }
      : null,

    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'  
      ?{ key: '/expenses', label: <Link to="/expenses">Expenses</Link> }
      : null,

    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
      ?{ key: '/kanban', label: <Link to="/kanban">Kanban Board</Link> }
      : null,
    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
      ? { key: '/reports', label: <Link to="/reports">Reports</Link> }
      : null,
    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
      ? { key: '/settings', label: <Link to="/settings">Settings</Link> }
      : null,
    userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
      ? { key: '/personnel', label: <Link to="/personnel">Personnel List</Link> }
      : null,
 userInfo?.role === 'admin' || userInfo?.role === 'superadmin'
 ?{ key: '/overtime', label: <Link to="/overtime">Mesai Yönetimi</Link> }
 : null,
    {
      key: 'my-account',
      label: (
        <span onClick={goToMyAccount} style={{ cursor: 'pointer', color: 'inherit' }}>
          Hesabım
        </span>
      ),
    }
  ].filter(Boolean), [userInfo, goToMyAccount]);

  const dropdownItems = [
    {
      key: '1',
      label: 'İzin Talebi',
      onClick: onShowLeaveRequest
    },
    {
      key: '2',
      label: 'Avans Talebi',
      onClick: onShowAdvanceRequest
    },
    {
      key: '3',
      label: 'Harcama Talebi',
      onClick: onShowExpenseRequest
    }
  ];

  return (
    <Layout>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1 }}
        />
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Dropdown
            menu={{ items: dropdownItems }}
            placement="bottomRight"
          >
            <Button type="primary" style={{ marginRight: '10px' }}>
              Talep <DownOutlined />
            </Button>
          </Dropdown>
          <Button type="default" danger ghost onClick={handleLogout}>
            Çıkış Yap
          </Button>
        </div>
      </Header>
      <Content style={{ padding: '0 50px', marginTop: '16px' }}>
        <div style={{ padding: 24, background: '#fff', minHeight: 380 }}>
          <React.Suspense fallback={<Spin size="large" />}>
            {children}
          </React.Suspense>
        </div>
      </Content>
    </Layout>
  );
});

export default Main;