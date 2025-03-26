// components/personneldetailstabs/AdvanceRequestsTab.js
import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, message } from 'antd';
import axios from 'axios';
import moment from 'moment';

const AdvanceRequestsTab = ({ personnelId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await axios.get(
                `http://localhost:5001/api/advance-requests/personnel/${personnelId}`,
                {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                }
            );
            setRequests(response.data);
        } catch (error) {
            console.error('Error fetching advance requests:', error);
            message.error('Avans talepleri yüklenirken hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (personnelId) {
            fetchRequests();
        }
    }, [personnelId]);

    const columns = [
        {
            title: 'Talep Tarihi',
            dataIndex: 'request_date',
            key: 'request_date',
            render: date => moment(date).format('DD.MM.YYYY HH:mm')
        },
        {
            title: 'Tutar',
            dataIndex: 'amount',
            key: 'amount',
            render: amount => `₺${amount?.toLocaleString()}`
        },
        {
            title: 'Durum',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                const colors = {
                    pending: 'gold',
                    approved: 'green',
                    rejected: 'red'
                };
                const texts = {
                    pending: 'Bekliyor',
                    approved: 'Onaylandı',
                    rejected: 'Reddedildi'
                };
                return <Tag color={colors[status]}>{texts[status]}</Tag>;
            }
        },
        {
            title: 'Talep Nedeni',
            dataIndex: 'reason',
            key: 'reason'
        },
        {
            title: 'Onaylayan',
            dataIndex: 'personnel_name',
            key: 'personnel_name'
        },
        {
            title: 'Onay/Red Nedeni',
            dataIndex: 'approval_reason',
            key: 'approval_reason'
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={requests}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
    );
};

export default AdvanceRequestsTab;