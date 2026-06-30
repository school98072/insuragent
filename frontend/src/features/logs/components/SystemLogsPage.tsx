import React from 'react';
import { Card, Table, Tag, Typography, Input, Space, Button, Row, Col, Statistic, Progress } from 'antd';
import { SearchOutlined, DownloadOutlined, SafetyCertificateOutlined, AlertOutlined, RadarChartOutlined, StopOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';

const { Title, Text } = Typography;

export default function SystemLogsPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'ROLE_ADMIN';

  if (!isAdmin) {
    return <div className="p-6">Access Denied</div>;
  }

  const logData = [
    {
      key: '1',
      timestamp: '2026-06-25 12:45:12.304',
      level: 'WARN',
      actor: 'system',
      action: 'LOGIN_FAILED',
      target: 'adjuster@kaggle.com',
      ip: '192.168.1.105 (San Jose, CA)',
      details: 'Invalid password attempt (3/5)',
      signature: '0x8f2a...39c1'
    },
    {
      key: '2',
      timestamp: '2026-06-25 12:44:01.811',
      level: 'INFO',
      actor: 'admin@kaggle.com',
      action: 'UPDATE_CONFIG',
      target: 'Fraud Model V2',
      ip: '10.0.0.5 (Internal)',
      details: 'Threshold updated to 0.85',
      signature: '0xa14b...00f8'
    },
    {
      key: '3',
      timestamp: '2026-06-25 12:40:22.015',
      level: 'ERROR',
      actor: 'broker@kaggle.com',
      action: 'UNAUTHORIZED_ACCESS',
      target: '/api/v1/ai/analyze',
      ip: '172.16.2.33 (VPN)',
      details: 'Role ROLE_BROKER blocked by RBAC middleware',
      signature: '0x44cd...11aa'
    },
    {
      key: '4',
      timestamp: '2026-06-25 12:35:10.992',
      level: 'CRITICAL',
      actor: 'adjuster@kaggle.com',
      action: 'AI_OVERRIDE_APPROVE',
      target: 'CLM-2026-081',
      ip: '10.0.1.20 (Internal)',
      details: 'Approved Claim despite AI High Risk score (89%)',
      signature: '0x99dd...7bb2'
    },
    {
      key: '5',
      timestamp: '2026-06-25 11:15:00.000',
      level: 'INFO',
      actor: 'system',
      action: 'DATA_EXPORT',
      target: 'Policies DB',
      ip: '10.0.0.10 (Batch Worker)',
      details: 'Daily encrypted backup generated',
      signature: '0x5cc1...4aa4'
    }
  ];

  const columns = [
    {
      title: 'Timestamp (UTC)',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (text: string) => <Text type="secondary" className="font-mono text-xs">{text}</Text>,
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
      render: (level: string) => {
        let color = 'blue';
        if (level === 'WARN') color = 'orange';
        if (level === 'ERROR') color = 'volcano';
        if (level === 'CRITICAL') color = 'red';
        return <Tag color={color} className="font-mono font-bold tracking-wider text-[10px]">{level}</Tag>;
      },
    },
    {
      title: 'Action Vector',
      dataIndex: 'action',
      key: 'action',
      width: 200,
      render: (text: string) => <Text strong className={`font-mono text-xs ${text.includes('OVERRIDE') ? 'text-red-600' : ''}`}>{text}</Text>,
    },
    {
      title: 'Actor & IP Geolocation',
      key: 'actor_ip',
      width: 220,
      render: (_: any, record: any) => (
        <div className="flex flex-col">
          <Text className="font-mono text-xs text-gray-700">{record.actor}</Text>
          <Text className="font-mono text-[10px] text-gray-400">{record.ip}</Text>
        </div>
      )
    },
    {
      title: 'Target Entity',
      dataIndex: 'target',
      key: 'target',
      width: 180,
      render: (text: string) => <Text className="font-mono text-xs text-blue-600">{text}</Text>,
    },
    {
      title: 'Cryptographic Signature',
      dataIndex: 'signature',
      key: 'signature',
      width: 140,
      render: (text: string) => <Text className="font-mono text-[10px] text-green-600 bg-green-50 px-1 border border-green-200 rounded">{text}</Text>,
    },
    {
      title: 'Audit Details',
      dataIndex: 'details',
      key: 'details',
      render: (text: string) => <Text className="text-xs text-gray-500">{text}</Text>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Title level={2} className="!mb-1">
            <SafetyCertificateOutlined className="mr-3 text-blue-600" />
            Security Information and Event Management (SIEM)
          </Title>
          <Text className="text-gray-500">
            Immutable system operation records. Compliant with NFRA / CBIRC tracking regulations.
          </Text>
        </div>
        <div className="flex flex-col items-end">
          <Text className="text-xs text-gray-400 font-mono tracking-widest uppercase mb-1">Global Security Score</Text>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600 font-mono">98/100</span>
            <Tag color="success">SECURE</Tag>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm border-t-4 border-t-red-500">
            <div className="flex flex-col">
              <span className="text-gray-500 font-semibold tracking-wide uppercase text-[10px] mb-2"><StopOutlined className="mr-1"/> RBAC Violation Attempts (7D)</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900 leading-none">12</span>
                <span className="text-xs text-red-500 mb-1">↑ 4</span>
              </div>
              <div className="h-8 mt-4 flex items-end gap-1">
                {/* Mocking a mini bar chart */}
                {[2, 1, 0, 4, 1, 0, 4].map((h, i) => (
                  <div key={i} className="flex-1 bg-red-200 rounded-t" style={{ height: `${h * 20}%` }}></div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card bordered={false} className="shadow-sm border-t-4 border-t-orange-500">
            <div className="flex flex-col">
              <span className="text-gray-500 font-semibold tracking-wide uppercase text-[10px] mb-2"><AlertOutlined className="mr-1"/> AI Override Tracking</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900 leading-none">4.2%</span>
                <span className="text-xs text-orange-500 mb-1">Warning: Above 3%</span>
              </div>
              <Progress percent={4.2} showInfo={false} size="small" className="mt-6" strokeColor="#f97316" trailColor="#fef3c7" />
            </div>
          </Card>
        </Col>

        <Col span={8}>
          <Card bordered={false} className="shadow-sm border-t-4 border-t-blue-500">
            <div className="flex flex-col">
              <span className="text-gray-500 font-semibold tracking-wide uppercase text-[10px] mb-2"><RadarChartOutlined className="mr-1"/> Data Export Operations</span>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-gray-900 leading-none">14</span>
                <span className="text-xs text-gray-400 mb-1">Routine Backups Only</span>
              </div>
              <div className="h-8 mt-4 flex items-end gap-1">
                 {/* Mocking a mini bar chart */}
                 {[2, 2, 2, 2, 2, 2, 2].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-200 rounded-t" style={{ height: `${h * 30}%` }}></div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card 
        bordered={false} 
        className="shadow-sm mt-6" 
        bodyStyle={{ padding: 0 }}
        title={<span className="text-sm font-bold text-gray-700">Immutable Audit Trail</span>}
        extra={
          <Space>
            <Input 
              placeholder="Search logs by Signature, IP, or Actor..." 
              prefix={<SearchOutlined />} 
              style={{ width: 300 }}
              size="small"
            />
            <Button size="small" icon={<DownloadOutlined />}>Signed CSV Export</Button>
          </Space>
        }
      >
        <Table 
          columns={columns} 
          dataSource={logData} 
          size="small"
          pagination={{ pageSize: 15 }} 
          rowClassName={(record) => record.level === 'CRITICAL' ? 'bg-red-50/50 hover:bg-red-50 transition-colors' : record.level === 'ERROR' ? 'bg-orange-50/30 hover:bg-orange-50 transition-colors' : 'hover:bg-slate-50 transition-colors'}
        />
      </Card>
    </div>
  );
}
