import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Statistic,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmployeeIdentity } from "../components/EmployeeIdentity";
import { Layout } from "../components/Layout";
import { SessionInfoHeader } from "../components/SessionInfoHeader";
import { useArchiveRefreshOnMount } from "../context/ArchiveContext";
import { useSession } from "../context/SessionContext";
import { useMasterData } from "../context/MasterDataContext";
import { getEmployeeTotals, getGrandTotal, getSessionTotals } from "../types";
import { sortEmployeesByNumber } from "../utils/employees";
import { exportRawDataCSV } from "../utils/export";
import { formatDate, formatDuration, formatLbs, formatWeight, formatWeightWithLbs } from "../utils/format";
import { getSessionEmployees } from "../utils/sessionEmployees";
import {
  HOURLY_TRACK_PATH,
  START_SESSION_PATH,
  TRIM_TRACK_LIVE_PATH,
} from "../lib/sessionRoutes";

const { Title, Text } = Typography;

const CATEGORY_COLORS = {
  regular: "#22c55e",
  stick: "#f59e0b",
  smalls: "#8b5cf6",
};

export function EndSessionPage() {
  useArchiveRefreshOnMount();
  const navigate = useNavigate();
  const { session, clearSession, resumeSession } = useSession();
  const { activeEmployees } = useMasterData();
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      navigate(START_SESSION_PATH, { replace: true });
    }
  }, [session, navigate]);

  const sessionEmployees = useMemo(() => {
    if (!session) return [];
    return getSessionEmployees(session, activeEmployees);
  }, [session, activeEmployees]);

  const sessionTotals = useMemo(
    () =>
      session ? getSessionTotals(session.entries) : { regular: 0, stick: 0, smalls: 0 },
    [session],
  );

  const sessionGrandTotal = getGrandTotal(sessionTotals);
  const sessionEndedAt = session?.endedAt ?? Date.now();

  function handleBack() {
    resumeSession();
    navigate(session?.workType === "trim" ? TRIM_TRACK_LIVE_PATH : HOURLY_TRACK_PATH);
  }

  function handleNewSession() {
    clearSession();
    navigate(START_SESSION_PATH);
  }

  async function handleEmployeeReceipts() {
    if (!session) return;
    setExportStatus("Generating employee receipts…");
    try {
      const { exportEmployeeReceiptPDFs } = await import("../utils/pdfExport");
      await exportEmployeeReceiptPDFs(session, activeEmployees);
      setExportStatus(
        sessionEmployees.length === 1
          ? "Employee receipt downloaded"
          : `Downloaded zip with ${sessionEmployees.length} employee receipts`,
      );
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : "Export failed");
    } finally {
      setTimeout(() => setExportStatus(null), 4000);
    }
  }

  async function handleSessionSummaryPdf() {
    if (!session) return;
    try {
      const { exportSessionSummaryPDF } = await import("../utils/pdfExport");
      exportSessionSummaryPDF(session, activeEmployees);
      setExportStatus("Session summary PDF downloaded");
    } catch (err) {
      setExportStatus(err instanceof Error ? err.message : "Export failed");
    }
    setTimeout(() => setExportStatus(null), 4000);
  }

  function handleRawDataCsv() {
    if (!session) return;
    exportRawDataCSV(session, activeEmployees);
    setExportStatus("Raw data CSV downloaded");
    setTimeout(() => setExportStatus(null), 4000);
  }

  if (!session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-900 text-white/50">
        Loading…
      </div>
    );
  }

  const sortedEmployees = sortEmployeesByNumber(sessionEmployees);

  return (
    <Layout
      title="Session Complete"
      onBack={handleBack}
      backLabel="Resume"
      headerCenter={<SessionInfoHeader session={session} compact />}
    >
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <Alert
            type="success"
            showIcon
            message="Production session completed"
            description="Review totals below and export reports for payroll handoff."
            style={{
              marginBottom: 24,
              borderRadius: 14,
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.03) 100%)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          />

          <Title level={5} style={{ marginBottom: 12, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            Session Overview
          </Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Session Date"
                  value={formatDate(session.startedAt)}
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Duration"
                  value={formatDuration(session.startedAt, sessionEndedAt)}
                  valueStyle={{ fontSize: 16, fontWeight: 600 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size="small" style={{ borderRadius: 14, height: "100%" }}>
                <Statistic
                  title="Total Entries"
                  value={session.entries.length}
                  valueStyle={{ fontSize: 24, fontWeight: 700 }}
                  className="tt-summary-stat"
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                style={{
                  borderRadius: 14,
                  height: "100%",
                  border: "1px solid rgba(34, 197, 94, 0.35)",
                  background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)",
                }}
              >
                <Statistic
                  title="Grand Total"
                  value={formatWeight(sessionGrandTotal)}
                  valueStyle={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}
                  className="tt-summary-stat"
                />
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 600 }}>
                  {formatLbs(sessionGrandTotal)}
                </Text>
              </Card>
            </Col>
          </Row>

          <Title level={5} style={{ marginBottom: 12, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            Category Breakdown
          </Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 28 }}>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderRadius: 14, borderTop: `3px solid ${CATEGORY_COLORS.regular}` }}
              >
                <Statistic
                  title="Regular Trim"
                  value={sessionTotals.regular}
                  suffix="g"
                  valueStyle={{ fontSize: 28, fontWeight: 700, color: CATEGORY_COLORS.regular }}
                  className="tt-summary-stat"
                />
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 600 }}>
                  {formatLbs(sessionTotals.regular)}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderRadius: 14, borderTop: `3px solid ${CATEGORY_COLORS.stick}` }}
              >
                <Statistic
                  title="Stick Trim"
                  value={sessionTotals.stick}
                  suffix="g"
                  valueStyle={{ fontSize: 28, fontWeight: 700, color: CATEGORY_COLORS.stick }}
                  className="tt-summary-stat"
                />
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 600 }}>
                  {formatLbs(sessionTotals.stick)}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card
                size="small"
                style={{ borderRadius: 14, borderTop: `3px solid ${CATEGORY_COLORS.smalls}` }}
              >
                <Statistic
                  title="Smalls"
                  value={sessionTotals.smalls}
                  suffix="g"
                  valueStyle={{ fontSize: 28, fontWeight: 700, color: CATEGORY_COLORS.smalls }}
                  className="tt-summary-stat"
                />
                <Text type="secondary" style={{ fontSize: 14, fontWeight: 600 }}>
                  {formatLbs(sessionTotals.smalls)}
                </Text>
              </Card>
            </Col>
          </Row>

          <Divider style={{ borderColor: "rgba(46, 61, 82, 0.5)", margin: "0 0 20px" }} />

          <Title level={5} style={{ marginBottom: 12, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            Employee Summary
          </Title>
          <Row gutter={[12, 12]} style={{ marginBottom: 28 }}>
            {sortedEmployees.map((employee) => {
              const totals = getEmployeeTotals(employee.id, session.entries);
              const total = getGrandTotal(totals);
              return (
                <Col key={employee.id} xs={24} sm={12}>
                  <Card
                    size="small"
                    style={{ borderRadius: 14, height: "100%" }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <EmployeeIdentity employee={employee} size="md" inlineName />
                    <Divider style={{ margin: "12px 0", borderColor: "rgba(46, 61, 82, 0.4)" }} />
                    <Row gutter={[8, 8]}>
                      <Col span={8}>
                        <Statistic
                          title="Regular"
                          value={totals.regular}
                          suffix="g"
                          valueStyle={{ fontSize: 14, color: CATEGORY_COLORS.regular }}
                          className="tt-summary-stat"
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Stick"
                          value={totals.stick}
                          suffix="g"
                          valueStyle={{ fontSize: 14, color: CATEGORY_COLORS.stick }}
                          className="tt-summary-stat"
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Smalls"
                          value={totals.smalls}
                          suffix="g"
                          valueStyle={{ fontSize: 14, color: CATEGORY_COLORS.smalls }}
                          className="tt-summary-stat"
                        />
                      </Col>
                    </Row>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(46, 61, 82, 0.4)",
                      }}
                    >
                      <Text strong style={{ color: "rgba(255,255,255,0.6)" }}>
                        Total
                      </Text>
                      <Text strong style={{ fontSize: 20, color: "#4ade80" }}>
                        {formatWeightWithLbs(total)}
                      </Text>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Divider style={{ borderColor: "rgba(46, 61, 82, 0.5)", margin: "0 0 20px" }} />

          <Title level={5} style={{ marginBottom: 12, color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
            Export Reports
          </Title>
          <Card
            style={{ borderRadius: 14, marginBottom: 16 }}
            styles={{ body: { padding: 20 } }}
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <Button
                  block
                  size="large"
                  icon={<FilePdfOutlined />}
                  onClick={handleEmployeeReceipts}
                  style={{ height: 56, borderRadius: 12 }}
                >
                  Employee Receipt PDF
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  block
                  size="large"
                  icon={<FilePdfOutlined />}
                  onClick={handleSessionSummaryPdf}
                  style={{ height: 56, borderRadius: 12 }}
                >
                  Session Summary PDF
                </Button>
              </Col>
              <Col xs={24} sm={8}>
                <Button
                  block
                  size="large"
                  icon={<FileExcelOutlined />}
                  onClick={handleRawDataCsv}
                  style={{ height: 56, borderRadius: 12 }}
                >
                  Raw Data CSV
                </Button>
              </Col>
            </Row>
            {exportStatus && (
              <Alert
                type="info"
                showIcon
                icon={<DownloadOutlined />}
                message={exportStatus}
                style={{ marginTop: 16, borderRadius: 10 }}
              />
            )}
          </Card>

          <Button
            type="primary"
            size="large"
            block
            icon={<PlayCircleOutlined />}
            onClick={handleNewSession}
            style={{ height: 56, fontSize: 17, fontWeight: 700, borderRadius: 14 }}
          >
            Start New Session
          </Button>
        </div>
      </div>
    </Layout>
  );
}
