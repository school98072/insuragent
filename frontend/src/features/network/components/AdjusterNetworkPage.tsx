import React, { useState } from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Drawer, Space, Divider, Badge } from 'antd';
import { TeamOutlined, SafetyCertificateOutlined, WarningOutlined, CompassOutlined, FileDoneOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';

const { Title, Text } = Typography;

export default function AdjusterNetworkPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedAdjuster, setSelectedAdjuster] = useState<any>(null);

  // Mock data representing the adjuster network and compliance statuses
  const adjusterData = [
    {
      key: '1',
      name: 'Marcus Vance',
      id: 'ADJ-1024',
      region: 'East Coast (US)',
      level: 'Level 3 (Senior)',
      load: 18,
      loadMax: 20,
      approvalRate: 72,
      aiOverrideRate: 4,
      status: 'Active',
      licenseValidUntil: '2027-04-12'
    },
    {
      key: '2',
      name: 'Eleanor Shellstrop',
      id: 'ADJ-0931',
      region: 'West Coast (US)',
      level: 'Level 2 (Mid)',
      load: 24,
      loadMax: 20, // Exceeds load max -> Warning
      approvalRate: 85,
      aiOverrideRate: 15, // High override rate
      status: 'Warning',
      licenseValidUntil: '2026-07-20' // Expiring soon
    },
    {
      key: '3',
      name: 'Chidi Anagonye',
      id: 'ADJ-1156',
      region: 'Midwest (US)',
      level: 'Level 1 (Junior)',
      load: 5,
      loadMax: 15,
      approvalRate: 99, // Suspiciously high approval
      aiOverrideRate: 2,
      status: 'Suspended',
      licenseValidUntil: '2028-01-05'
    },
    {
      key: '4',
      name: 'Tahani Al-Jamil',
      id: 'ADJ-0842',
      region: 'Europe (UK)',
      level: 'Level 3 (Senior)',
      load: 12,
      loadMax: 20,
      approvalRate: 65,
      aiOverrideRate: 5,
      status: 'Active',
      licenseValidUntil: '2027-11-30'
    }
  ];

  const columns = [
    {
      title: 'Adjuster Info',
      key: 'info',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{isAdmin ? '***' : record.name}</Text>
          <Text type="secondary" className="font-mono text-xs">{record.id}</Text>
        </Space>
      ),
    },
    {
      title: 'Authority Level',
      dataIndex: 'level',
      key: 'level',
      render: (level: string) => <Tag color={level.includes('3') ? 'purple' : level.includes('2') ? 'blue' : 'default'}>{level}</Tag>,
    },
    {
      title: 'Jurisdiction',
      dataIndex: 'region',
      key: 'region',
      render: (region: string) => <Text><CompassOutlined className="mr-2 text-gray-400" />{region}</Text>,
    },
    {
      title: 'Current Load (SoD Check)',
      key: 'load',
      render: (_: any, record: any) => {
        const percent = Math.round((record.load / record.loadMax) * 100);
        const isOverloaded = percent > 100;
        return (
          <div className="w-32">
            <div className="flex justify-between mb-1">
              <Text className="text-xs">{record.load} / {record.loadMax} Cases</Text>
              {isOverloaded && <WarningOutlined className="text-red-500" />}
            </div>
            <Progress 
              percent={percent > 100 ? 100 : percent} 
              size="small" 
              status={isOverloaded ? 'exception' : percent > 80 ? 'normal' : 'success'} 
              showInfo={false} 
              strokeColor={isOverloaded ? '#dc2626' : percent > 80 ? '#f59e0b' : '#10b981'}
            />
          </div>
        );
      }
    },
    {
      title: 'Compliance Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'Active') return <Badge status="success" text={<Text strong className="text-green-600">Active</Text>} />;
        if (status === 'Warning') return <Badge status="warning" text={<Text strong className="text-yellow-600">Warning</Text>} />;
        if (status === 'Suspended') return <Badge status="error" text={<Text strong className="text-red-600">Suspended</Text>} />;
        return <Badge status="default" text={status} />;
      },
    }
  ];

  const handleRowClick = (record: any) => {
    setSelectedAdjuster(record);
    setDrawerVisible(true);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Title level={2} className="!mb-1">
            <TeamOutlined className="mr-3 text-blue-600" />
            Adjuster Network & Compliance
          </Title>
          <Text className="text-gray-500">
            Monitor jurisdiction limits, separation of duties (SoD), and operational risk scoring.
          </Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title={<span className="text-gray-500 font-semibold tracking-wide uppercase text-xs">Active Adjusters</span>} 
              value={124} 
              prefix={<SafetyCertificateOutlined className="text-green-500" />} 
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm bg-yellow-50 border border-yellow-100">
            <Statistic 
              title={<span className="text-yellow-700 font-semibold tracking-wide uppercase text-xs">License Expiring (30 Days)</span>} 
              value={3} 
              prefix={<WarningOutlined className="text-yellow-600" />} 
              valueStyle={{ color: '#ca8a04' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title={<span className="text-gray-500 font-semibold tracking-wide uppercase text-xs">Avg Caseload</span>} 
              value={14.2} 
              suffix="/ 20 MAX"
              valueStyle={{ color: '#1f2937' }}
            />
            <Progress percent={71} showInfo={false} size="small" className="mt-2 m-0" strokeColor="#3b82f6" />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="shadow-sm mt-6" bodyStyle={{ padding: 0 }}>
        <Table 
          columns={columns} 
          dataSource={adjusterData} 
          pagination={false} 
          rowClassName="hover:bg-blue-50 transition-colors cursor-pointer"
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
          })}
        />
      </Card>

      <Drawer
        title={<span className="text-lg font-bold">Audit Detail: {selectedAdjuster ? (isAdmin ? '***' : selectedAdjuster.name) : ''}</span>}
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
      >
        {selectedAdjuster && (
          <div className="space-y-6">
            <div>
              <Text type="secondary" className="uppercase text-xs font-bold tracking-widest">Operator Context</Text>
              <div className="mt-2 bg-gray-50 p-4 rounded border border-gray-100">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Text type="secondary" className="text-xs">ID Number</Text><br/>
                    <Text strong className="font-mono">{selectedAdjuster.id}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary" className="text-xs">License Validity</Text><br/>
                    <Text strong className={selectedAdjuster.licenseValidUntil < '2027' ? 'text-orange-500' : 'text-green-600'}>
                      {selectedAdjuster.licenseValidUntil}
                    </Text>
                  </Col>
                </Row>
              </div>
            </div>

            <Divider />

            <div>
              <Text type="secondary" className="uppercase text-xs font-bold tracking-widest">Risk & Compliance Flags</Text>
              
              <div className="mt-4 space-y-5">
                <div>
                  <div className="flex justify-between mb-1">
                    <Text>Historical Approval Rate</Text>
                    <Text strong className={selectedAdjuster.approvalRate > 90 ? 'text-red-500' : ''}>{selectedAdjuster.approvalRate}%</Text>
                  </div>
                  <Progress 
                    percent={selectedAdjuster.approvalRate} 
                    showInfo={false} 
                    strokeColor={selectedAdjuster.approvalRate > 90 ? '#ef4444' : '#3b82f6'} 
                  />
                  {selectedAdjuster.approvalRate > 90 && (
                    <Text type="danger" className="text-xs mt-1 block">
                      <WarningOutlined /> Warning: Approval rate significantly higher than baseline (65%). High risk of collusion or rubber-stamping.
                    </Text>
                  )}
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <Text>AI Pre-judgment Override Rate</Text>
                    <Text strong className={selectedAdjuster.aiOverrideRate > 10 ? 'text-orange-500' : ''}>{selectedAdjuster.aiOverrideRate}%</Text>
                  </div>
                  <Progress 
                    percent={selectedAdjuster.aiOverrideRate} 
                    showInfo={false} 
                    strokeColor={selectedAdjuster.aiOverrideRate > 10 ? '#f97316' : '#10b981'} 
                  />
                  {selectedAdjuster.aiOverrideRate > 10 && (
                    <Text type="warning" className="text-xs mt-1 block text-orange-600">
                      <WarningOutlined /> Notice: High frequency of overturning AI fraud warnings. Audit trail recommended.
                    </Text>
                  )}
                </div>
              </div>
            </div>
            
            {selectedAdjuster.status === 'Suspended' && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mt-8">
                <Text type="danger" strong><WarningOutlined className="mr-2" />System Suspension</Text>
                <p className="text-red-600 text-sm mt-2 mb-0">
                  This operator's permissions have been temporarily revoked by the Risk Engine due to severe compliance threshold breaches. Manual clearance by Chief Compliance Officer required.
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
