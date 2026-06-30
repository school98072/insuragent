import React from 'react';
import { Card, Typography, Row, Col, Statistic, Divider, Space } from 'antd';
import { AreaChartOutlined, LineChartOutlined, DotChartOutlined, ApiOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const serverLoadData = [
  { name: 'Mon', load: 45, reqs: 1200 },
  { name: 'Tue', load: 52, reqs: 1400 },
  { name: 'Wed', load: 38, reqs: 1100 },
  { name: 'Thu', load: 65, reqs: 1800 },
  { name: 'Fri', load: 85, reqs: 2400 },
  { name: 'Sat', load: 40, reqs: 1050 },
  { name: 'Sun', load: 35, reqs: 900 },
];

const { Title, Text } = Typography;

export default function ReportingPage() {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role || 'ROLE_BROKER';

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Title level={2} className="!mb-1">Analytics & Reporting</Title>
          <Text className="text-gray-500">
            {role === 'ROLE_ADMIN' && "System Performance and Technical Metrics"}
            {role === 'ROLE_ADJUSTER' && "SLA and Case Resolution Metrics"}
            {role === 'ROLE_BROKER' && "Sales Channel and Claim Intake Metrics"}
          </Text>
        </div>
      </div>

      {role === 'ROLE_ADMIN' && (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="API Latency (ms)" value={45} prefix={<ApiOutlined />} valueStyle={{ color: '#2563eb' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="System Uptime" value={99.99} suffix="%" valueStyle={{ color: '#16a34a' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Error Rate (5xx)" value={0.01} suffix="%" valueStyle={{ color: '#dc2626' }} />
              </Card>
            </Col>
          </Row>
          <Card className="mt-6 shadow-sm" title="Server Load (7 Days)" bordered={false}>
            <div className="h-64 w-full bg-white rounded">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={serverLoadData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} unit="%" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="load" name="CPU Load" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {role === 'ROLE_ADJUSTER' && (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Average Resolution Time" value={2.4} suffix=" Days" valueStyle={{ color: '#2563eb' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="SLA Compliance" value={94.5} suffix="%" valueStyle={{ color: '#16a34a' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Pending Escalations" value={5} valueStyle={{ color: '#f59e0b' }} />
              </Card>
            </Col>
          </Row>
          <Card className="mt-6 shadow-sm" title="Resolution Trend (Monthly)" bordered={false}>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
              <Space direction="vertical" align="center">
                <LineChartOutlined className="text-4xl text-gray-300" />
                <Text type="secondary">SLA trend chart visualization goes here</Text>
              </Space>
            </div>
          </Card>
        </>
      )}

      {role === 'ROLE_BROKER' && (
        <>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Total Policies Sold" value={1420} valueStyle={{ color: '#2563eb' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Claim Intake Rate" value={4.2} suffix="%" valueStyle={{ color: '#64748b' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} className="shadow-sm">
                <Statistic title="Approved Claims Value" value={125000} prefix="$" valueStyle={{ color: '#16a34a' }} />
              </Card>
            </Col>
          </Row>
          <Card className="mt-6 shadow-sm" title="Premium Growth (YTD)" bordered={false}>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded border border-gray-100">
              <Space direction="vertical" align="center">
                <DotChartOutlined className="text-4xl text-gray-300" />
                <Text type="secondary">Premium growth chart visualization goes here</Text>
              </Space>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
