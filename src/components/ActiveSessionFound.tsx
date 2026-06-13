import { PlayCircleOutlined, StopOutlined, DeleteOutlined } from "@ant-design/icons";
import { Alert, Button, Col, Row, Space, Typography } from "antd";
import type { Session } from "../types";
import { formatTime } from "../utils/format";
import { formatRoomHeader, formatSupervisorHeader } from "../utils/sessionDisplay";

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
      className="tt-active-session-alert"
      message={
        <Typography.Text strong className="text-base text-white/90">
          Active Session Found
        </Typography.Text>
      }
      description={
        <div className="mt-2">
          <Typography.Text className="text-white/55">
            {session.entries.length} entr{session.entries.length === 1 ? "y" : "ies"} recorded ·
            started {formatTime(session.startedAt)}
          </Typography.Text>

          <Row gutter={[10, 10]} className="mt-4">
            <Col xs={12} sm={8}>
              <div className="tt-info-chip">
                <p className="tt-info-chip__label">Facility</p>
                <p className="tt-info-chip__value truncate">{session.facilityName}</p>
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <div className="tt-info-chip">
                <p className="tt-info-chip__label">Room</p>
                <p className="tt-info-chip__value truncate">{formatRoomHeader(session)}</p>
              </div>
            </Col>
            <Col xs={12} sm={8}>
              <div className="tt-info-chip">
                <p className="tt-info-chip__label">Supervisors</p>
                <p className="tt-info-chip__value truncate">{formatSupervisorHeader(session)}</p>
              </div>
            </Col>
          </Row>

          <Space wrap className="mt-4">
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
        background: "linear-gradient(160deg, rgba(52, 211, 153, 0.12) 0%, rgba(52, 211, 153, 0.03) 100%)",
        border: "1px solid rgba(52, 211, 153, 0.28)",
        borderRadius: 18,
        padding: "16px 20px",
      }}
    />
  );
}
