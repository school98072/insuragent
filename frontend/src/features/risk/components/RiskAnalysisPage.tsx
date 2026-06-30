import React from 'react';
import { Card, Table, Tag, Typography, Row, Col, Statistic, Progress, Button } from 'antd';
import { SafetyCertificateOutlined, AlertOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';

const { Title, Text } = Typography;

export default function RiskAnalysisPage() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === 'ROLE_ADMIN';

  // Mock data for Risk Analysis
  const riskData = [
    {
      key: '1',
      claimId: 'CLM-2026-081',
      insuredName: isAdmin ? '***' : 'Sarah Jenkins',
      fraudScore: 89,
      status: 'High Risk',
      flags: ['Multiple Claims', 'Inconsistent Timeline'],
      modelConfidence: 94,
    },
    {
      key: '2',
      claimId: 'CLM-2026-092',
      insuredName: isAdmin ? '***' : 'Michael Chang',
      fraudScore: 42,
      status: 'Review Required',
      flags: ['Unusual Amount'],
      modelConfidence: 85,
    },
    {
      key: '3',
      claimId: 'CLM-2026-105',
      insuredName: isAdmin ? '***' : 'Emma Thompson',
      fraudScore: 12,
      status: 'Low Risk',
      flags: ['Verified History'],
      modelConfidence: 98,
    },
  ];

  const columns = [
    {
      title: 'Claim Reference',
      dataIndex: 'claimId',
      key: 'claimId',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Insured Entity',
      dataIndex: 'insuredName',
      key: 'insuredName',
    },
    {
      title: 'AI Fraud Score (0-100)',
      dataIndex: 'fraudScore',
      key: 'fraudScore',
      render: (score: number) => (
        <Progress 
          percent={score} 
          size="small" 
          status={score > 80 ? 'exception' : score > 40 ? 'normal' : 'success'} 
          format={() => `${score}`}
        />
      ),
    },
    {
      title: 'Risk Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'green';
        if (status === 'High Risk') color = 'red';
        if (status === 'Review Required') color = 'orange';
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Detection Flags',
      key: 'flags',
      dataIndex: 'flags',
      render: (flags: string[], record: any) => (
        <>
          {flags.map((flag: string) => {
            const color = record.fraudScore > 80 ? 'volcano' : 'geekblue';
            return (
              <Tag color={isAdmin ? 'default' : color} key={flag}>
                {isAdmin ? '***' : flag}
              </Tag>
            );
          })}
        </>
      ),
    },
    {
      title: 'Model Confidence',
      dataIndex: 'modelConfidence',
      key: 'modelConfidence',
      render: (conf: number) => <Text type="secondary">{conf}%</Text>,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Title level={2} className="!mb-1">Risk Analysis Engine</Title>
          <Text className="text-gray-500">
            {isAdmin 
              ? "System Mode: Technical configuration and model performance metrics. Business data is masked." 
              : "AI-driven fraud detection and claim risk scoring."}
          </Text>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Active Risk Models" 
              value={4} 
              prefix={<SafetyCertificateOutlined className="text-blue-500" />} 
              valueStyle={{ color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="High Risk Claims Detected" 
              value={isAdmin ? '***' : '12'} 
              prefix={<AlertOutlined className="text-red-500" />} 
              valueStyle={{ color: '#dc2626' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic 
              title="Model Accuracy (Last 30 days)" 
              value={96.4} 
              suffix="%" 
              prefix={<CheckCircleOutlined className="text-green-500" />} 
            />
          </Card>
        </Col>
      </Row>

      <Card 
        bordered={false} 
        title="Recent Risk Evaluations" 
        className="shadow-sm mt-6"
        extra={<Button type="text" icon={<SyncOutlined />}>Refresh Engine</Button>}
      >
        <Table 
          columns={columns} 
          dataSource={riskData} 
          pagination={{ pageSize: 5 }} 
          rowClassName="hover:bg-slate-50 transition-colors"
        />
      </Card>
    </div>
  );
}
