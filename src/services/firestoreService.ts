import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, Project, CalendarEvent, Goal, Habit, AiSuggestion } from '../types';
import {
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_GOALS,
  INITIAL_HABITS,
  INITIAL_AI_SUGGESTIONS,
} from '../data/mockData';

export const firestoreService = {
  // Check and seed initial data for a brand new user
  async initUserData(userId: string) {
    try {
      const tasksSnapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
      if (tasksSnapshot.empty) {
        // First-time user seed
        const batch = writeBatch(db);

        // Seed tasks
        INITIAL_TASKS.forEach((task) => {
          const ref = doc(db, 'users', userId, 'tasks', task.id);
          batch.set(ref, { ...task, userId });
        });

        // Seed projects
        INITIAL_PROJECTS.forEach((proj) => {
          const ref = doc(db, 'users', userId, 'projects', proj.id);
          batch.set(ref, { ...proj, userId });
        });

        // Seed calendar events
        INITIAL_CALENDAR_EVENTS.forEach((ev) => {
          const ref = doc(db, 'users', userId, 'calendarEvents', ev.id);
          batch.set(ref, { ...ev, userId });
        });

        // Seed goals
        INITIAL_GOALS.forEach((goal) => {
          const ref = doc(db, 'users', userId, 'goals', goal.id);
          batch.set(ref, { ...goal, userId });
        });

        // Seed habits
        INITIAL_HABITS.forEach((habit) => {
          const ref = doc(db, 'users', userId, 'habits', habit.id);
          batch.set(ref, { ...habit, userId });
        });

        // Seed AI suggestions
        INITIAL_AI_SUGGESTIONS.forEach((sug) => {
          const ref = doc(db, 'users', userId, 'aiSuggestions', sug.id);
          batch.set(ref, { ...sug, userId });
        });

        await batch.commit();
        console.log('Successfully initialized sample data for new user in Firestore');
      }
    } catch (err) {
      console.warn('Could not initialize user data in Firestore (offline mode active):', err);
    }
  },

  // Fetch all user data
  async fetchUserData(userId: string) {
    try {
      const [tasksSnap, projectsSnap, eventsSnap, goalsSnap, habitsSnap, suggestionsSnap] =
        await Promise.all([
          getDocs(collection(db, 'users', userId, 'tasks')),
          getDocs(collection(db, 'users', userId, 'projects')),
          getDocs(collection(db, 'users', userId, 'calendarEvents')),
          getDocs(collection(db, 'users', userId, 'goals')),
          getDocs(collection(db, 'users', userId, 'habits')),
          getDocs(collection(db, 'users', userId, 'aiSuggestions')),
        ]);

      return {
        tasks: tasksSnap.docs.map((d) => d.data() as Task),
        projects: projectsSnap.docs.map((d) => d.data() as Project),
        events: eventsSnap.docs.map((d) => d.data() as CalendarEvent),
        goals: goalsSnap.docs.map((d) => d.data() as Goal),
        habits: habitsSnap.docs.map((d) => d.data() as Habit),
        suggestions: suggestionsSnap.docs.map((d) => d.data() as AiSuggestion),
      };
    } catch (err) {
      console.warn('Error fetching data from Firestore, relying on local state:', err);
      return null;
    }
  },

  // Tasks
  async saveTask(userId: string, task: Task) {
    try {
      await setDoc(doc(db, 'users', userId, 'tasks', task.id), { ...task, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving task to Firestore:', e);
    }
  },

  async deleteTask(userId: string, taskId: string) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
    } catch (e) {
      console.warn('Error deleting task from Firestore:', e);
    }
  },

  // Projects
  async saveProject(userId: string, project: Project) {
    try {
      await setDoc(doc(db, 'users', userId, 'projects', project.id), { ...project, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving project to Firestore:', e);
    }
  },

  // Calendar Events
  async saveCalendarEvent(userId: string, event: CalendarEvent) {
    try {
      await setDoc(doc(db, 'users', userId, 'calendarEvents', event.id), { ...event, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving event to Firestore:', e);
    }
  },

  async deleteCalendarEvent(userId: string, eventId: string) {
    try {
      await deleteDoc(doc(db, 'users', userId, 'calendarEvents', eventId));
    } catch (e) {
      console.warn('Error deleting event from Firestore:', e);
    }
  },

  // Goals
  async saveGoal(userId: string, goal: Goal) {
    try {
      await setDoc(doc(db, 'users', userId, 'goals', goal.id), { ...goal, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving goal to Firestore:', e);
    }
  },

  // Habits
  async saveHabit(userId: string, habit: Habit) {
    try {
      await setDoc(doc(db, 'users', userId, 'habits', habit.id), { ...habit, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving habit to Firestore:', e);
    }
  },

  // Suggestions
  async saveAiSuggestion(userId: string, suggestion: AiSuggestion) {
    try {
      await setDoc(doc(db, 'users', userId, 'aiSuggestions', suggestion.id), { ...suggestion, userId }, { merge: true });
    } catch (e) {
      console.warn('Error saving suggestion to Firestore:', e);
    }
  },
};
