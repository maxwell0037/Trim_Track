import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { ArchiveProvider } from "./context/ArchiveContext";
import { MasterDataProvider } from "./context/MasterDataContext";
import { SessionProvider } from "./context/SessionContext";
import { SyncProvider } from "./context/SyncContext";
import { ArchiveDetailPage } from "./pages/ArchiveDetailPage";
import { ArchiveEditPage } from "./pages/ArchiveEditPage";
import { ArchiveEmployeeEditPage } from "./pages/ArchiveEmployeeEditPage";
import { ArchivePage } from "./pages/ArchivePage";
import { LiveSessionPage } from "./pages/LiveSessionPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StartSessionPage } from "./pages/StartSessionPage";
import { TrimTrackPage } from "./pages/TrimTrackPage";

const EndSessionPage = lazy(() =>
  import("./pages/EndSessionPage").then((m) => ({ default: m.EndSessionPage })),
);

const FacilitiesTestPage = lazy(() =>
  import("./pages/FacilitiesTestPage").then((m) => ({ default: m.FacilitiesTestPage })),
);

function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-900 text-white/60">
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SyncProvider>
        <MasterDataProvider>
          <ArchiveProvider>
            <SessionProvider>
              <BrowserRouter>
                <OfflineIndicator />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<StartSessionPage />} />
                    <Route path="/trim-track/:sessionId" element={<TrimTrackPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/supabase/facilities" element={<FacilitiesTestPage />} />
                    <Route path="/archive" element={<ArchivePage />} />
                    <Route path="/archive/:id" element={<ArchiveDetailPage />} />
                    <Route path="/archive/:id/edit" element={<ArchiveEditPage />} />
                    <Route
                      path="/archive/:id/employee/:employeeId"
                      element={<ArchiveEmployeeEditPage />}
                    />
                    <Route path="/session" element={<LiveSessionPage />} />
                    <Route path="/summary" element={<EndSessionPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </SessionProvider>
          </ArchiveProvider>
        </MasterDataProvider>
      </SyncProvider>
    </ErrorBoundary>
  );
}
