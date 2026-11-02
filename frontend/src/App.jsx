import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LiveScanner from './pages/LiveScanner';
import Dashboard from './pages/Dashboard';
import RegisteredPeople from './pages/RegisteredPeople';
import PersonDetails from './pages/PersonDetails';
import FacialAnalytics from './pages/FacialAnalytics';
import VerificationHistory from './pages/VerificationHistory';
import CameraSettings from './pages/CameraSettings';
import { useCamera } from './hooks/useCamera';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [currentPage, setCurrentPage] = useState('scanner');
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme from system or class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Camera hook
  const {
    cameraStatus,
    setCameraStatus,
    cameras,
    browserCameras,
    selectedDeviceId,
    startCamera,
    stopCamera,
    selectCamera,
    refreshCameras,
  } = useCamera();

  // WebSocket hook connecting to backend streaming endpoint
  const { isConnected, lastMessage: lastWsMessage, sendMessage } = useWebSocket('/ws/camera');

  // Handle client-side frame sending if browser camera stream is active
  const handleSendClientFrame = React.useCallback((dataUrl) => {
    sendMessage({
      type: 'browser_frame',
      image: dataUrl,
    });
  }, [sendMessage]);

  const handleSelectPerson = (id) => {
    setSelectedPersonId(id);
    setCurrentPage('person_details');
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'scanner':
        return (
          <LiveScanner
            cameraStatus={cameraStatus}
            cameras={cameras}
            selectedDeviceId={selectedDeviceId}
            onSelectCamera={selectCamera}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onNavigate={(page) => setCurrentPage(page)}
            lastWsMessage={lastWsMessage}
            onSendClientFrame={handleSendClientFrame}
          />
        );
      case 'dashboard':
        return (
          <Dashboard
            onNavigate={(page) => setCurrentPage(page)}
            cameraStatus={cameraStatus}
          />
        );
      case 'people':
        return (
          <RegisteredPeople
            onSelectPerson={handleSelectPerson}
          />
        );
      case 'person_details':
        return (
          <PersonDetails
            personId={selectedPersonId}
            onBack={() => setCurrentPage('people')}
          />
        );
      case 'analytics':
        return <FacialAnalytics />;
      case 'verification':
        return <VerificationHistory />;
      case 'settings':
        return (
          <CameraSettings
            cameraStatus={cameraStatus}
            cameras={cameras}
            browserCameras={browserCameras}
            onSelectCamera={selectCamera}
            onRefreshCameras={refreshCameras}
          />
        );
      default:
        return (
          <LiveScanner
            cameraStatus={cameraStatus}
            cameras={cameras}
            selectedDeviceId={selectedDeviceId}
            onSelectCamera={selectCamera}
            onStartCamera={startCamera}
            onStopCamera={stopCamera}
            onNavigate={(page) => setCurrentPage(page)}
            lastWsMessage={lastWsMessage}
            onSendClientFrame={handleSendClientFrame}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-[#0B1120] text-gray-900 dark:text-gray-100 font-['Inter',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage === 'person_details' ? 'people' : currentPage}
        onNavigate={(page) => {
          setSelectedPersonId(null);
          setCurrentPage(page);
        }}
        cameraActive={Boolean(cameraStatus?.is_running || lastWsMessage?.telemetry?.is_running)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          cameraStatus={cameraStatus}
          cameras={cameras}
          onSelectCamera={selectCamera}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onNavigate={(page) => setCurrentPage(page)}
          activeFaceCount={lastWsMessage?.faces?.length || 0}
          telemetry={lastWsMessage?.telemetry}
        />

        <main className="flex-1 overflow-y-auto">
          {renderCurrentPage()}
        </main>
      </div>
    </div>
  );
}
