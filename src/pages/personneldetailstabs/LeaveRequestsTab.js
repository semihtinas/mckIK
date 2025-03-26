import React, { useEffect, useState } from 'react';
import { Tabs, List } from 'antd';
import axios from 'axios';

const LeaveRequestsTab = ({ personnelId }) => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);
  const [rejectedLeaves, setRejectedLeaves] = useState([]);

  useEffect(() => {
    // Onay bekleyen izinleri getir
    axios.get(`http://localhost:5001/api/leave/leaves/pending/${personnelId}`)
      .then(response => setPendingLeaves(response.data))
      .catch(error => console.error('Error fetching pending leaves:', error));
  
    // Onaylanan izinleri getir
    axios.get(`http://localhost:5001/api/leave/leaves/approved/${personnelId}`)
      .then(response => setApprovedLeaves(response.data))
      .catch(error => console.error('Error fetching approved leaves:', error));
  
    // Reddedilen izinleri getir
    axios.get(`http://localhost:5001/api/leave/leaves/rejected/${personnelId}`)
      .then(response => setRejectedLeaves(response.data))
      .catch(error => console.error('Error fetching rejected leaves:', error));
  }, [personnelId]);
  
  const renderLeaveList = (leaves) => (
    <List
      bordered
      dataSource={leaves}
      renderItem={leave => (
        <List.Item>
          <div>
            <strong>{leave.personnel_name}</strong> - {leave.leave_type_name}
            <div>Start Date: {new Date(leave.start_date).toLocaleDateString()}</div>
            <div>End Date: {new Date(leave.end_date).toLocaleDateString()}</div>
            <div>Status: {leave.status}</div>
          </div>
        </List.Item>
      )}
    />
  );

  const tabItems = [
    {
      key: '1',
      label: 'Pending',
      children: renderLeaveList(pendingLeaves),
    },
    {
      key: '2',
      label: 'Approved',
      children: renderLeaveList(approvedLeaves),
    },
    {
      key: '3',
      label: 'Rejected',
      children: renderLeaveList(rejectedLeaves),
    },
  ];

  return <Tabs defaultActiveKey="1" items={tabItems} />;
};

export default LeaveRequestsTab;
