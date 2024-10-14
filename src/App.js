import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import PersonnelList from './pages/PersonnelList';
import PersonnelDetail from './pages/PersonnelDetail';
import Main from './components/layout/Main'; // Ana layout bileşeni
import { Layout } from 'antd';
import SettingsForm from './pages/SettingsForm';

function App() {
  const [selectedPersonnel, setSelectedPersonnel] = useState(null);

  return (
    <Main>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} /> {/* Ana rota */}
          {/*<Route path="/dashboard" element={<Dashboard />} /> */}
          <Route path="/settings" element={<SettingsForm />} />
          {/*<Route path="/reports" element={<Reports />} /> */}




          {/* Personel Listesi */}
          <Route 
            path="/personnel" 
            element={
              <PersonnelList 
                onPersonnelClick={(personnel) => {
                  setSelectedPersonnel(personnel);
                }} 
              />
            } 
          />

          {/* Personel Detayı */}
          <Route 
            path="/personnel/:id" 
            element={<PersonnelDetail personnel={selectedPersonnel} />} // Eğer selectedPersonnel yoksa API'den veri çekilecek
          />
        </Routes>
      </Layout>
    </Main>
  );
}

export default App;
