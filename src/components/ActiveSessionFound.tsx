import { PlayCircleOutlined, StopOutlined, DeleteOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Col, Row, Space, Statistic, Typography } from "antd";
import type { Session } from "../types";
import { formatTime } from "../utils/format";

interface ActiveSessionFoundProps {
  session: Session;
  onResume: () => void;
  onEnd: () => void;
  onDelete: () => void;
}

export function ActiveSessionFound({
  session,
  onResume,
  onEnd,
  onDelete,
}: ActiveSessionFoundProps) {
  return (
    <Alert
      type="success"
      showIcon
      message={
        <Typography.Text strong style={{ fontSize: 16, color: "rgba(255,255,255,0.92)" }}>
          Active Session Found
        </Typography.Text>
      }
      description={
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary">
            {session.entries.length} entr{session.entries.length === 1 ? "y" : "ies"} recorded ·
            started {formatTime(session.startedAt)}
          </Typography.Text>

          <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: "10px 12px" } }}>
                <Statistic
                  title="Facility"
                  value={session.facilityName}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: "10px 12px" } }}>
                <Statistic
                  title="Room"
                  value={session.roomName ?? "—"}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card size="small" styles={{ body: { padding: "10px 12px" } }}>
                <Statistic
                  title="Supervisor"
                  value={session.supervisorName}
                  valueStyle={{ fontSize: 14, fontWeight: 600 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
          </Row>

          <Space wrap style={{ marginTop: 16 }}>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={onResume}>
              Resume Session
            </Button>
            <Button size="large" icon={<StopOutlined />} onClick={onEnd}>
              End Session
            </Button>
            <Button danger size="large" icon={<DeleteOutlined />} onClick={onDelete}>
              Delete Session
            </Button>
          </Space>
        </div>
      }
      style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)",
        border: "1px solid rgba(34, 197, 94, 0.35)",
        borderRadius: 16,
        padding: "16px 20px",
      }}
    />
  );
}
