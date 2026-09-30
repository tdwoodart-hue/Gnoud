/** 
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { TodayView } from './components/today/TodayView';
import { TasksView } from './components/tasks/TasksView';
import { NutritionView } from './components/nutrition/NutritionView';
import { ReaderView } from './components/reader/ReaderView';
import { ReportsView } from './components/reports/ReportsView';
import { TaskEditModal } from './components/common/TaskEditModal';
import { FocusSessionModal } from './components/common/FocusSessionModal';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandMenuModal } from './components/common/CommandMenuModal';
import { AssistantModal } from './components/common/AssistantModal';
import { MorningPlanningModal } from './components/flows/MorningPlanningModal';
import { EveningReviewModal } from './components/flows/EveningReviewModal';
import { DailyActivityDock } from './components/activities/DailyActivityDock';
import {
  ACCOUNT_DATA_REFRESH_EVENT,
  AccountDataSyncBridge,
} from './components/common/AccountDataSyncBridge';
import { SecurityProvider } from './context/SecurityContext';
import { PinLockScreen } from './components/security/PinLockScreen';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();
  const [dataRevision, setDataRevision] = useState(0);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const domain = (event as CustomEvent<{ domain?: string }>).detail?.domain;
      const affectsCurrentView =
        (domain === 'nutrition' && (activeTab === 'nutrition' || activeTab === 'reports')) ||
        (domain === 'foods' && activeTab === 'nutrition');
      if (affectsCurrentView) setDataRevision((value) => value + 1);
    };
    window.addEventListener(ACCOUNT_DATA_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(ACCOUNT_DATA_REFRESH_EVENT, handleRefresh);
  }, [activeTab]);

  return (
    <>
      {activeTab === 'today' && (
        <>
          <DailyActivityDock />
          <TodayView />
        </>
      )}
      {activeTab === 'tasks' && <TasksView />}
      {activeTab === 'nutrition' && <NutritionView key={`nutrition-${dataRevision}`} />}
      {activeTab === 'reader' && <ReaderView />}
      {activeTab === 'reports' && <ReportsView key={`reports-${dataRevision}`} />}
    </>
  );
};

const GlobalModals: React.FC = () => {
  const {
    isCommandMenuOpen,
    setIsCommandMenuOpen,
    isAssistantOpen,
    setIsAssistantOpen,
    isMorningPlanningOpen,
    setIsMorningPlanningOpen,
    isEveningReviewOpen,
    setIsEveningReviewOpen,
  } = useApp();

  return (
    <>
      <TaskEditModal />
      <FocusSessionModal />
      <CommandMenuModal
        isOpen={isCommandMenuOpen}
        onClose={() => setIsCommandMenuOpen(false)}
      />
      <AssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
      <MorningPlanningModal
        isOpen={isMorningPlanningOpen}
        onClose={() => setIsMorningPlanningOpen(false)}
      />
      <EveningReviewModal
        isOpen={isEveningReviewOpen}
        onClose={() => setIsEveningReviewOpen(false)}
      />
      <ToastContainer />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <SecurityProvider>
        <AccountDataSyncBridge />
        <AppShell>
          <MainContent />
        </AppShell>
        <GlobalModals />
        <PinLockScreen />
      </SecurityProvider>
    </AppProvider>
  );
}
