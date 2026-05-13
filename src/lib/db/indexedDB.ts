import { openDB, IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from './schema';

let dbInstance: IDBPDatabase | null = null;

export async function getDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      console.log(`🔄 Upgrading database from version ${oldVersion} to ${newVersion}`);

      // ===== USERS STORE =====
      if (!db.objectStoreNames.contains(STORES.users)) {
        const userStore = db.createObjectStore(STORES.users, { keyPath: 'id' });
        userStore.createIndex('pin', 'pin');
        console.log('✅ Created users store');
      } else {
        console.log('📁 Users store already exists');
      }

      // ===== COURSE CATALOG STORE (NEW) =====
      if (!db.objectStoreNames.contains(STORES.courseCatalog)) {
        const catalogStore = db.createObjectStore(STORES.courseCatalog, { keyPath: 'id' });
        catalogStore.createIndex('courseCode', 'courseCode', { unique: true });
        catalogStore.createIndex('createdBy', 'createdBy');
        catalogStore.createIndex('isVerified', 'isVerified');
        catalogStore.createIndex('lecturerId', 'lecturerId');
        console.log('✅ Created courseCatalog store');
      } else {
        console.log('📁 CourseCatalog store already exists');
      }

      // ===== LECTURER COURSES STORE (NEW) =====
      if (!db.objectStoreNames.contains(STORES.lecturerCourses)) {
        const lecturerStore = db.createObjectStore(STORES.lecturerCourses, { keyPath: 'id' });
        lecturerStore.createIndex('catalogId', 'catalogId');
        lecturerStore.createIndex('lecturerId', 'lecturerId');
        console.log('✅ Created lecturerCourses store');
      } else {
        console.log('📁 LecturerCourses store already exists');
      }

      // ===== ENROLLMENTS STORE =====
      if (!db.objectStoreNames.contains(STORES.enrollments)) {
        const enrollmentStore = db.createObjectStore(STORES.enrollments, { keyPath: 'id' });
        enrollmentStore.createIndex('studentId', 'studentId');
        enrollmentStore.createIndex('catalogId', 'catalogId');
        enrollmentStore.createIndex('lecturerCourseId', 'lecturerCourseId');
        enrollmentStore.createIndex('studentId_catalogId', ['studentId', 'catalogId']);
        enrollmentStore.createIndex('status', 'status');
        console.log('✅ Created enrollments store');
      } else {
        console.log('📁 Enrollments store already exists');
      }

      // ===== TASKS STORE =====
      if (!db.objectStoreNames.contains(STORES.tasks)) {
        const taskStore = db.createObjectStore(STORES.tasks, { keyPath: 'id' });
        taskStore.createIndex('catalogId', 'catalogId');
        taskStore.createIndex('lecturerCourseId', 'lecturerCourseId');
        taskStore.createIndex('userId', 'userId');
        taskStore.createIndex('dueDate', 'dueDate');
        taskStore.createIndex('status', 'status');
        taskStore.createIndex('priority', 'priority');
        taskStore.createIndex('urgencyScore', 'urgencyScore');
        taskStore.createIndex('isDone', 'isDone');
        console.log('✅ Created tasks store');
      } else {
        console.log('📁 Tasks store already exists');
      }

      // ===== ROUTINES STORE =====
      if (!db.objectStoreNames.contains(STORES.routines)) {
        const routineStore = db.createObjectStore(STORES.routines, { keyPath: 'id' });
        routineStore.createIndex('userId', 'userId');
        routineStore.createIndex('affectsWakeUp', 'affectsWakeUp');
        console.log('✅ Created routines store');
      } else {
        console.log('📁 Routines store already exists');
      }

      // Add to upgrade function in indexedDB.ts:
      // Inside the upgrade function, add:
      if (!db.objectStoreNames.contains(STORES.streaks)) {
        const streakStore = db.createObjectStore(STORES.streaks, { keyPath: 'id' });
        streakStore.createIndex('currentStreak', 'currentStreak');
        streakStore.createIndex('lastLoginDate', 'lastLoginDate');
        console.log('✅ Created streaks store');
      }

      if (!db.objectStoreNames.contains(STORES.notificationQueue)) {
        const notifStore = db.createObjectStore(STORES.notificationQueue, { keyPath: 'id' });
        notifStore.createIndex('sent', 'sent');
        notifStore.createIndex('scheduledFor', 'scheduledFor');
        console.log('✅ Created notificationQueue store');
      }
    },
  });

  return dbInstance;
}

// Get all items from a store
export async function getItems<T>(
  store: string,
  index?: string,
  value?: any
): Promise<T[]> {
  const db = await getDB();
  if (index && value !== undefined) {
    return db.getAllFromIndex(store, index, value);
  }
  return db.getAll(store);
}

// Get single item
export async function getItem<T>(store: string, id: string): Promise<T | undefined> {
  const db = await getDB();
  return db.get(store, id);
}

// Add an item
export async function addItem<T>(store: string, item: T): Promise<void> {
  const db = await getDB();
  await db.add(store, item);
}

// Update an item
export async function updateItem<T>(
  store: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get(store, id);

  if (!existing) {
    throw new Error(`Item not found in ${store} with id ${id}`);
  }

  await db.put(store, { ...existing, ...updates });
}

// Delete an item
export async function deleteItem(store: string, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

// Safe update (doesn't throw)
export async function safeUpdateItem<T>(
  store: string,
  id: string,
  updates: Partial<T>
): Promise<boolean> {
  try {
    await updateItem(store, id, updates);
    return true;
  } catch {
    return false;
  }
}

// Clear all data from a store (for debugging)
export async function clearStore(store: string): Promise<void> {
  const db = await getDB();
  const keys = await db.getAllKeys(store);
  const tx = db.transaction(store, 'readwrite');
  const storeObj = tx.objectStore(store);
  for (const key of keys) {
    storeObj.delete(key);
  }
  await tx.done;
}