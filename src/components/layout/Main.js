import React from 'react';
import { Layout, Menu } from 'antd';
import { Link } from 'react-router-dom';

const { Header, Content } = Layout;

function Main({ children }) {
  // Menu items'ları burada tanımlıyoruz
  const menuItems = [
    {
      key: '/dashboard',
      label: <Link to="/dashboard">Dashboard</Link>,
    },
    {
      key: '/reports',
      label: <Link to="/reports">Reports</Link>,
    },
    {
      key: '/personnel',
      label: <Link to="/personnel">Personnel List</Link>,
    },
    {
      key: '/settings',
      label: <Link to="/settings">Settings</Link>,
    },
  ];

  return (
    <Layout>
      <Header>
        <Menu theme="dark" mode="horizontal" defaultSelectedKeys={['/dashboard']} items={menuItems} />
      </Header>
      <Content style={{ padding: '0 50px', marginTop: '16px' }}>
        <div style={{ padding: 24, background: '#fff', minHeight: 380 }}>
          {children}
        </div>
      </Content>
    </Layout>
  );
}

export default Main;