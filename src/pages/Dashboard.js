import React from 'react';
import { Bar, Line } from '@ant-design/charts';

const Dashboard = () => {
  const barData = [
    { year: '2020', sales: 38 },
    { year: '2021', sales: 52 },
    { year: '2022', sales: 61 },
    { year: '2023', sales: 145 },
  ];

  const lineData = [
    { year: '2020', value: 30 },
    { year: '2021', value: 60 },
    { year: '2022', value: 80 },
    { year: '2023', value: 100 },
  ];

  // Bar grafiği için yapılandırma
  const barConfig = {
    data: barData,
    xField: 'sales',
    yField: 'year',
    label: {
      position: 'top', // `middle` yerine `top` kullanıyoruz
      style: { fill: '#FFFFFF', opacity: 0.6 },
    },
    xAxis: { label: { autoHide: true, autoRotate: false } },
    meta: { sales: { alias: 'Satış' }, year: { alias: 'Yıl' } },
  };

  // Line grafiği için yapılandırma
  const lineConfig = {
    data: lineData,
    xField: 'year',
    yField: 'value',
    label: {
      position: 'top', // `middle` yerine `top` kullanıyoruz
      style: { fill: '#FFFFFF', opacity: 0.6 },
    },
    point: { size: 5, shape: 'diamond' },
    meta: { year: { alias: 'Yıl' }, value: { alias: 'Değer' } },
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ padding: '20px' }}>
        <h3>Satış Verileri (Bar Grafik)</h3>
        <Bar {...barConfig} />
      </div>
      <div style={{ padding: '20px' }}>
        <h3>Yıllık Büyüme (Line Grafik)</h3>
        <Line {...lineConfig} />
      </div>
    </div>
  );
};

export default Dashboard;