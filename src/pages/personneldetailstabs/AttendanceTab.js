import React, { useEffect, useState } from 'react';
import { List, DatePicker, TimePicker, Button, message } from 'antd';
import axios from 'axios';


const AttendanceTab = ({ personnelId, refreshPersonnelData }) => {
  const [attendanceHistory, setAttendanceHistory] = useState([]);


  // Giriş-çıkış geçmişini yükleme
  useEffect(() => {
    axios.get(`http://localhost:5001/api/personnel/${personnelId}/attendance`)
      .then(response => setAttendanceHistory(response.data))
      .catch(error => console.error('Error fetching attendance data:', error));
  }, [personnelId]);



  return (
    <div>

      <h3>Attendance History</h3>
      <List
        bordered
        dataSource={attendanceHistory}
        renderItem={item => (
          <List.Item>
            {item.entry_date && <div>Entry Date: {new Date(item.entry_date).toLocaleDateString()}</div>}
            {item.entry_time && <div>Entry Time: {item.entry_time}</div>}
            {item.exit_date && <div>Exit Date: {new Date(item.exit_date).toLocaleDateString()}</div>}
            {item.exit_time && <div>Exit Time: {item.exit_time}</div>}
          </List.Item>
        )}
      />
    </div>
  );
};

export default AttendanceTab;
