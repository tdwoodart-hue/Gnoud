import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, Project, CalendarEvent, Goal, Habit, AiSuggestion } from '../types';

export type DeletedTask = Task & { deletedAt: string };
import {
  INITIAL_TASKS,
  INITIAL_PROJECTS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_GOALS,
  INITIAL_HABITS,
  INITIAL_AI_SUGGESTIONS,
} from '../data/mockData';

const DEMO_DOCUMENTS: Record<string, string[]> = {
  tasks: ['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7', 'task-8'],
  projects: ['proj-senko', 'proj-lego', 'proj-luvin', 'proj-content', 'proj-personal'],
  calendarEvents: ['ev-1', 'ev-2', 'ev-3', 'ev-4', 'ev-5', 'ev-6'],
  habits: ['hab-1', 'hab-2', 'hab-3', 'hab-4'],
  goals: ['goal-1', 'goal-2', 'goal-3', 'goal-4'],
  aiSuggestions: ['sug-1', 'sug-2', 'sug-3'],
};

export interface UserSyncData {
  tasks: Task[];
  deletedTasks: DeletedTask[];
  projects: Project[];
  events: CalendarEvent[];
  goals: Goal[];
  habits: Habit[];
  suggestions: AiSuggestion[];
}

function firestoreSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fromFirestore<T>(value: Record<string, unknown>): T {
  const { userId: _userId, ...rest } = value;
  return rest as T;
}

async function saveEntity<T extends { id: string }>(
  userId: string,
  collectionName: string,
  entity: T,
): Promise<void> {
  const payload = firestoreSafe({ ...entity, userId });
  await setDoc(doc(db, 'users', userId, collectionName, entity.id), payload);
}

async function deleteEntity(userId: string, collectionName: string, id: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, collectionName, id));
}

export const firestoreService = {
  async removeDemoData(userId: string) {
    try {
      const batch = writeBatch(db);
      Object.entries(DEMO_DOCUMENTS).forEach(([collectionName, ids]) => {
        ids.forEach((id) => batch.delete(doc(db, 'users', userId, collectionName, id)));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not remove legacy demo data from Firestore:', err);
    }
  },

  // Kept for backwards compatibility. AppContext no longer calls this automatically,
  // because an empty account must stay empty instead of being re-seeded with demo data.
  async initUserData(userId: string) {
    try {
      const tasksSnapshot = await getDocs(collection(db, 'users', userId, 'tasks'));
      if (!tasksSnapshot.empty) return;

      const batch = writeBatch(db);
      INITIAL_TASKS.forEach((task) => {
        batch.set(doc(db, 'users', userId, 'tasks', task.id), firestoreSafe({ ...task, userId }));
      });
      INITIAL_PROJECTS.forEach((project) => {
        batch.set(doc(db, 'users', userId, 'projects', project.id), firestoreSafe({ ...project, userId }));
      });
      INITIAL_CALENDAR_EVENTS.forEach((event) => {
        batch.set(doc(db, 'users', userId, 'calendarEvents', event.id), firestoreSafe({ ...event, userId }));
      });
      INITIAL_GOALS.forEach((goal) => {
        batch.set(doc(db, 'users', userId, 'goals', goal.id), firestoreSafe({ ...goal, userId }));
      });
      INITIAL_HABITS.forEach((habit) => {
        batch.set(doc(db, 'users', userId, 'habits', habit.id), firestoreSafe({ ...habit, userId }));
      });
      INITIAL_AI_SUGGESTIONS.forEach((suggestion) => {
        batch.set(doc(db, 'users', userId, 'aiSuggestions', suggestion.id), firestoreSafe({ ...suggestion, userId }));
      });
      await batch.commit();
    } catch (err) {
      console.warn('Could not initialize user data in Firestore:', err);
    }
  },

  async fetchUserData(userId: string): Promise<UserSyncData | null> {
    try {
      const [tasksSnap, deletedTasksSnap, projectsSnap, eventsSnap, goalsSnap, habitsSnap, suggestionsSnap] =
        await Promise.all([
          getDocs(collection(db, 'users', userId, 'tasks')),
          getDocs(collection(db, 'users', userId, 'deletedTasks')),
          getDocs(collection(db, 'users', userId, 'projects')),
          getDocs(collection(db, 'users', userId, 'calendarEvents')),
          getDocs(collection(db, 'users', userId, 'goals')),
          getDocs(collection(db, 'users', userId, 'habits')),
          getDocs(collection(db, 'users', userId, 'aiSuggestions')),
        ]);

      return {
        tasks: tasksSnap.docs.map((d) => fromFirestore<Task>(d.data())),
        deletedTasks: deletedTasksSnap.docs.map((d) => fromFirestore<DeletedTask>(d.data())),
        projects: projectsSnap.docs.map((d) => fromFirestore<Project>(d.data())),
        events: eventsSnap.docs.map((d) => fromFirestore<CalendarEvent>(d.data())),
        goals: goalsSnap.docs.map((d) => fromFirestore<Goal>(d.data())),
        habits: habitsSnap.docs.map((d) => fromFirestore<Habit>(d.data())),
        suggestions: suggestionsSnap.docs.map((d) => fromFirestore<AiSuggestion>(d.data())),
      };
    } catch (err) {
      console.warn('Error fetching data from Firestore, relying on local state:', err);
      return null;
    }
  },

  subscribeUserData(
    userId: string,
    onData: (data: UserSyncData) => void,
    onError?: (error: unknown) => void,
  ): () => void {
    const data: UserSyncData = {
      tasks: [],
      deletedTasks: [],
      projects: [],
      events: [],
      goals: [],
      habits: [],
      suggestions: [],
    };
    const ready = new Set<keyof UserSyncData>();

    const publish = () => {
      if (ready.size !== 7) return;
      onData({
        tasks: [...data.tasks],
        deletedTasks: [...data.deletedTasks],
        projects: [...data.projects],
        events: [...data.events],
        goals: [...data.goals],
        habits: [...data.habits],
        suggestions: [...data.suggestions],
      });
    };

    const fail = (error: unknown) => {
      console.warn('Realtime Firestore sync error:', error);
      onError?.(error);
    };

    const unsubscribers = [
      onSnapshot(
        collection(db, 'users', userId, 'tasks'),
        (snapshot) => {
          data.tasks = snapshot.docs.map((d) => fromFirestore<Task>(d.data()));
          ready.add('tasks');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'deletedTasks'),
        (snapshot) => {
          data.deletedTasks = snapshot.docs.map((d) => fromFirestore<DeletedTask>(d.data()));
          ready.add('deletedTasks');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'projects'),
        (snapshot) => {
          data.projects = snapshot.docs.map((d) => fromFirestore<Project>(d.data()));
          ready.add('projects');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'calendarEvents'),
        (snapshot) => {
          data.events = snapshot.docs.map((d) => fromFirestore<CalendarEvent>(d.data()));
          ready.add('events');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'goals'),
        (snapshot) => {
          data.goals = snapshot.docs.map((d) => fromFirestore<Goal>(d.data()));
          ready.add('goals');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'habits'),
        (snapshot) => {
          data.habits = snapshot.docs.map((d) => fromFirestore<Habit>(d.data()));
          ready.add('habits');
          publish();
        },
        fail,
      ),
      onSnapshot(
        collection(db, 'users', userId, 'aiSuggestions'),
        (snapshot) => {
          data.suggestions = snapshot.docs.map((d) => fromFirestore<AiSuggestion>(d.data()));
          ready.add('suggestions');
          publish();
        },
        fail,
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  },

  async mergeUserData(userId: string, data: UserSyncData) {
    try {
      await Promise.all([
        ...data.tasks.map((item) => saveEntity(userId, 'tasks', item)),
        ...data.deletedTasks.map((item) => saveEntity(userId, 'deletedTasks', item)),
        ...data.projects.map((item) => saveEntity(userId, 'projects', item)),
        ...data.events.map((item) => saveEntity(userId, 'calendarEvents', item)),
        ...data.goals.map((item) => saveEntity(userId, 'goals', item)),
        ...data.habits.map((item) => saveEntity(userId, 'habits', item)),
        ...data.suggestions.map((item) => saveEntity(userId, 'aiSuggestions', item)),
      ]);
    } catch (error) {
      console.warn('Could not migrate local data to Firestore:', error);
      throw error;
    }
  },

  async saveTask(userId: string, task: Task) {
    try {
      await saveEntity(userId, 'tasks', task);
    } catch (e) {
      console.warn('Error saving task to Firestore:', e);
    }
  },

  async deleteTask(userId: string, taskId: string) {
    try {
      await deleteEntity(userId, 'tasks', taskId);
    } catch (e) {
      console.warn('Error deleting task from Firestore:', e);
    }
  },

  async saveDeletedTask(userId: string, task: DeletedTask) {
    try {
      await saveEntity(userId, 'deletedTasks', task);
    } catch (e) {
      console.warn('Error saving deleted task to Firestore:', e);
    }
  },

  async deleteDeletedTask(userId: string, taskId: string) {
    try {
      await deleteEntity(userId, 'deletedTasks', taskId);
    } catch (e) {
      console.warn('Error permanently deleting task from Firestore:', e);
    }
  },

  async saveProject(userId: string, project: Project) {
    try {
      await saveEntity(userId, 'projects', project);
    } catch (e) {
      console.warn('Error saving project to Firestore:', e);
    }
  },

  async deleteProject(userId: string, projectId: string) {
    try {
      await deleteEntity(userId, 'projects', projectId);
    } catch (e) {
      console.warn('Error deleting project from Firestore:', e);
    }
  },

  async saveCalendarEvent(userId: string, event: CalendarEvent) {
    try {
      await saveEntity(userId, 'calendarEvents', event);
    } catch (e) {
      console.warn('Error saving event to Firestore:', e);
    }
  },

  async deleteCalendarEvent(userId: string, eventId: string) {
    try {
      await deleteEntity(userId, 'calendarEvents', eventId);
    } catch (e) {
      console.warn('Error deleting event from Firestore:', e);
    }
  },

  async saveGoal(userId: string, goal: Goal) {
    try {
      await saveEntity(userId, 'goals', goal);
    } catch (e) {
      console.warn('Error saving goal to Firestore:', e);
    }
  },

  async deleteGoal(userId: string, goalId: string) {
    try {
      await deleteEntity(userId, 'goals', goalId);
    } catch (e) {
      console.warn('Error deleting goal from Firestore:', e);
    }
  },

  async saveHabit(userId: string, habit: Habit) {
    try {
      await saveEntity(userId, 'habits', habit);
    } catch (e) {
      console.warn('Error saving habit to Firestore:', e);
    }
  },

  async deleteHabit(userId: string, habitId: string) {
    try {
      await deleteEntity(userId, 'habits', habitId);
    } catch (e) {
      console.warn('Error deleting habit from Firestore:', e);
    }
  },

  async saveAiSuggestion(userId: string, suggestion: AiSuggestion) {
    try {
      await saveEntity(userId, 'aiSuggestions', suggestion);
    } catch (e) {
      console.warn('Error saving suggestion to Firestore:', e);
    }
  },

  async deleteAiSuggestion(userId: string, suggestionId: string) {
    try {
      await deleteEntity(userId, 'aiSuggestions', suggestionId);
    } catch (e) {
      console.warn('Error deleting suggestion from Firestore:', e);
    }
  },
};
