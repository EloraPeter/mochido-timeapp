// components/ServiceWorkerRegister.tsx

'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    async function registerSW() {
      if (!('serviceWorker' in navigator)) return;
      
      // Unregister any existing broken service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        console.log('🗑️ Unregistering old SW:', registration.scope);
        await registration.unregister();
      }
      
      // Register the new one
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('✅ Service Worker registered:', registration);
        
        // Check if it's activated
        if (registration.active) {
          console.log('✅ SW is active');
        } else {
          console.log('⏳ SW is installing...');
        }
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
    
    registerSW();
    
    // Request notification permission on first visit
    if ('Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        Notification.requestPermission().then(permission => {
          console.log('📢 Notification permission:', permission);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  return null;
}