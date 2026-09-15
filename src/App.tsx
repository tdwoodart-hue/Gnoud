/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppShell } from './components/layout/AppShell';
import { TodayView } from './components/today/TodayView';
import { TasksView } from './components/tasks/TasksView';
import { CalendarView } from './components/calendar/CalendarView';
import { PersonalView } from './components/personal/PersonalView';
import { ReportsView } from './components/reports/ReportsView';
import { TaskEditModal } from './components/common/TaskEditModal';
import { FocusSessionModal } from './components/common/FocusSessionModal';
import { ToastContainer } from './components/common/ToastContainer';
import { CommandMenuModal } from './components/common/CommandMenuModal';
import { MorningPlanningModal } from './components/flows/MorningPlanningModal';
import { EveningReviewModal } from './components/flows/EveningReviewModal';

const MainContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <>
      {activeTab === 'today' && <TodayView />}
      {activeTab === 'tasks' && <TasksView />}
      {activeTab === 'calendar' && <CalendarView />}
      {activeTab === 'personal' && <PersonalView />}
      {activeTab === 'reports' && <ReportsView />}
    </>
  );
};

const GlobalModals: React.FC = () => {
  const {
    isCommandMenuOpen,
    setIsCommandMenuOpen,
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
      <AppShell>
        <MainContent />
      </AppShell>
      <GlobalModals />
    </AppProvider>
  );
}
