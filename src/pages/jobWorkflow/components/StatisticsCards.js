// components/StatisticsCards.js

import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Spin, Tooltip } from 'antd';
import {
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    HistoryOutlined,
    LineChartOutlined,
    AlertOutlined,
    CarryOutOutlined,
    SyncOutlined
} from '@ant-design/icons';
import axios from 'axios';

const StatisticsCards = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStatistics();
    }, []);

// components/StatisticsCards.js
// components/StatisticsCards.js

const fetchStatistics = async () => {
    try {
        console.log('Fetching statistics...'); // Debug için
        const response = await axios.get('http://localhost:5001/api/workflow/statistics', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        console.log('Statistics response:', response.data); // Debug için
        
        if (response.data) {
            setStats(response.data);
        }
    } catch (error) {
        console.error('Error fetching statistics:', error.response?.data || error);
        message.error('İstatistikler yüklenirken bir hata oluştu');
    } finally {
        setLoading(false);
    }
};

    if (loading) {
        return <Spin size="large" />;
    }

    return (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Toplam Görevler"
                        value={stats?.total_tasks || 0}
                        prefix={<CarryOutOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Tamamlanan Görevler"
                        value={stats?.completed_tasks || 0}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                        suffix={
                            <Tooltip title="Tamamlanma Oranı">
                                {stats?.total_tasks ? 
                                    ` (${((stats.completed_tasks / stats.total_tasks) * 100).toFixed(1)}%)` 
                                    : ' (0%)'
                                }
                            </Tooltip>
                        }
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Bekleyen Görevler"
                        value={stats?.pending_tasks || 0}
                        prefix={<SyncOutlined spin />}
                        valueStyle={{ color: '#faad14' }}
                        suffix={
                            <Tooltip title="Bekleyen Oran">
                                {stats?.total_tasks ? 
                                    ` (${((stats.pending_tasks / stats.total_tasks) * 100).toFixed(1)}%)` 
                                    : ' (0%)'
                                }
                            </Tooltip>
                        }
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Yüksek Öncelikli"
                        value={stats?.high_priority_tasks || 0}
                        prefix={<AlertOutlined />}
                        valueStyle={{ color: '#ff4d4f' }}
                        suffix={
                            <Tooltip title="Yüksek Öncelikli Oran">
                                {stats?.total_tasks ? 
                                    ` (${((stats.high_priority_tasks / stats.total_tasks) * 100).toFixed(1)}%)` 
                                    : ' (0%)'
                                }
                            </Tooltip>
                        }
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Tooltip title="Tamamlanan görevlerin ortalama tamamlanma süresi">
                        <Statistic
                            title="Ort. Tamamlanma Süresi"
                            value={stats?.avg_completion_days || 0}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                            suffix="gün"
                            precision={1}
                        />
                    </Tooltip>
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Bu Ay Tamamlanan"
                        value={stats?.completed_this_month || 0}
                        prefix={<HistoryOutlined />}
                        valueStyle={{ color: '#13c2c2' }}
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Geciken Görevler"
                        value={stats?.overdue_tasks || 0}
                        prefix={<ExclamationCircleOutlined />}
                        valueStyle={{ color: '#f5222d' }}
                        suffix={
                            <Tooltip title="Gecikme Oranı">
                                {stats?.total_tasks ? 
                                    ` (${((stats.overdue_tasks / stats.total_tasks) * 100).toFixed(1)}%)` 
                                    : ' (0%)'
                                }
                            </Tooltip>
                        }
                    />
                </Card>
            </Col>

            <Col xs={24} sm={12} lg={6}>
                <Card hoverable>
                    <Statistic
                        title="Ortalama İlerleme"
                        value={stats?.avg_progress || 0}
                        prefix={<LineChartOutlined />}
                        valueStyle={{ color: '#eb2f96' }}
                        suffix="%"
                        precision={1}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default StatisticsCards;