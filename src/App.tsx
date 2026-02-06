import { BrowserRouter, useNavigate } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { useEffect, useState } from 'react';
import { useAuth } from './providers/AuthProvider';
import toast from 'react-hot-toast';
import { showNotificationToast, getNotificationIcon } from './components/ui/NotificationToast';
import StarryNightEffect from './components/marketing/StarryNightEffect';
import SnowEffect from './components/marketing/SnowEffect';
import RainEffect from './components/marketing/RainEffect';
import FogEffect from './components/marketing/FogEffect';
import LightningEffect from './components/marketing/LightningEffect';
import MeteorEffect from './components/marketing/MeteorEffect';
import LightningRainEffect from './components/marketing/LightningRainEffect';
import BugEffect from './components/marketing/BugEffect';
import FishEffect from './components/marketing/FishEffect';
import CloudEffect from './components/marketing/CloudEffect';
import ConfettiEffect from './components/marketing/ConfettiEffect';
import HeartsEffect from './components/marketing/HeartsEffect';
import FireworksEffect from './components/marketing/FireworksEffect';
import SakuraEffect from './components/marketing/SakuraEffect';
import FirefliesEffect from './components/marketing/FirefliesEffect';
import ButterfliesEffect from './components/marketing/ButterfliesEffect';
import BubblesEffect from './components/marketing/BubblesEffect';

// Initialize icon caching
import './database/iconInit';

type VisualEffect = 'none' | 'starrynight' | 'snow' | 'rain' | 'fog' | 'clouds' | 'lightning' | 'meteor' | 'storm' | 'bugs' | 'fish' | 'confetti' | 'hearts' | 'fireworks' | 'sakura' | 'fireflies' | 'butterflies' | 'bubbles';

const getEffectDisplayName = (effect: VisualEffect): string => {
  const names: Record<string, string> = {
    'starrynight': 'Starry Night',
    'snow': 'Snow',
    'rain': 'Rain',
    'fog': 'Fog',
    'clouds': 'Clouds',
    'lightning': 'Lightning',
    'meteor': 'Meteor',
    'storm': 'Storm',
    'bugs': 'Bugs',
    'fish': 'Fish',
    'confetti': 'Confetti',
    'hearts': 'Hearts',
    'fireworks': 'Fireworks',
    'sakura': 'Sakura',
    'fireflies': 'Fireflies',
    'butterflies': 'Butterflies',
    'bubbles': 'Bubbles',
    'none': 'None'
  };
  return names[effect] || effect;
};

const EffectsLayer = () => {
  const [activeEffect, setActiveEffect] = useState<VisualEffect>('none');
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains('dark')
  );
  const { user } = useAuth();

  // Only show effects if user is authenticated
  const effectsEnabled = !!user;

  // Track dark mode changes
  useEffect(() => {
    const updateTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener('change', updateTheme);
    return () => { observer.disconnect(); mql.removeEventListener('change', updateTheme); };
  }, []);

  useEffect(() => {
    if (!effectsEnabled) return; // Don't attach listeners if not authenticated

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input field (e.g., assistant)
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('role') === 'textbox' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // Ctrl+Shift+S - stop all effects
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's') && !isInputFocused) {
        e.preventDefault();
        setActiveEffect('none');
        return;
      }
      
      // Ctrl+Shift+M - cycle through all visual effects
      // Starry Night is first but only available in dark mode
      if (e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm') && !isInputFocused) {
        e.preventDefault();
        const dark = document.documentElement.classList.contains('dark');
        setActiveEffect(prev => {
          let next: VisualEffect;
          if (prev === 'none') next = dark ? 'starrynight' : 'snow';
          else if (prev === 'starrynight') next = 'snow';
          else if (prev === 'snow') next = 'rain';
          else if (prev === 'rain') next = 'fog';
          else if (prev === 'fog') next = 'clouds';
          else if (prev === 'clouds') next = 'lightning';
          else if (prev === 'lightning') next = 'meteor';
          else if (prev === 'meteor') next = 'storm';
          else if (prev === 'storm') next = 'bugs';
          else if (prev === 'bugs') next = 'fish';
          else if (prev === 'fish') next = 'confetti';
          else if (prev === 'confetti') next = 'hearts';
          else if (prev === 'hearts') next = 'fireworks';
          else if (prev === 'fireworks') next = 'sakura';
          else if (prev === 'sakura') next = 'fireflies';
          else if (prev === 'fireflies') next = 'butterflies';
          else if (prev === 'butterflies') next = 'bubbles';
          else if (prev === 'bubbles') next = 'none';
          else next = 'none';
          
          if (next !== 'none') {
            toast.success(getEffectDisplayName(next));
          }
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectsEnabled]);

  // Only render effects if user is authenticated
  if (!effectsEnabled) return null;

  const closeEffect = () => setActiveEffect('none');

  return (
    <>
      {activeEffect === 'starrynight' && isDarkMode && <StarryNightEffect onClose={closeEffect} />}
      {activeEffect === 'snow' && <SnowEffect onClose={closeEffect} />}
      {activeEffect === 'rain' && <RainEffect onClose={closeEffect} />}
      {activeEffect === 'fog' && <FogEffect onClose={closeEffect} />}
      {activeEffect === 'clouds' && <CloudEffect onClose={closeEffect} />}
      {activeEffect === 'lightning' && <LightningEffect onClose={closeEffect} />}
      {activeEffect === 'meteor' && <MeteorEffect onClose={closeEffect} />}
      {activeEffect === 'storm' && <LightningRainEffect onClose={closeEffect} />}
      {activeEffect === 'bugs' && <BugEffect onClose={closeEffect} />}
      {activeEffect === 'fish' && <FishEffect onClose={closeEffect} />}
      {activeEffect === 'confetti' && <ConfettiEffect onClose={closeEffect} />}
      {activeEffect === 'hearts' && <HeartsEffect onClose={closeEffect} />}
      {activeEffect === 'fireworks' && <FireworksEffect onClose={closeEffect} />}
      {activeEffect === 'sakura' && <SakuraEffect onClose={closeEffect} />}
      {activeEffect === 'fireflies' && <FirefliesEffect onClose={closeEffect} />}
      {activeEffect === 'butterflies' && <ButterfliesEffect onClose={closeEffect} />}
      {activeEffect === 'bubbles' && <BubblesEffect onClose={closeEffect} />}
    </>
  );
};

// Component to handle service worker messages
const ServiceWorkerListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for in-app navigation events (used by FCM foreground notifications)
    const handleSpaNavigate = (event: Event) => {
      const custom = event as CustomEvent<any>;
      const url = custom?.detail?.url;
      if (typeof url === 'string' && url.length > 0) {
        navigate(url);
      }
    };

    // Listen for messages from service worker
    const handleMessage = async (event: MessageEvent) => {
      if (!event.data) return;

      // Handle notification clicks
      if (event.data.type === 'NOTIFICATION_CLICKED') {
        if (event.data.url) {
          navigate(event.data.url);
        }
      }

      // Handle new notifications - refresh from IndexedDB and show toast
      if (event.data.type === 'NEW_NOTIFICATION') {
        const notification = event.data.notification;
        
        // Show beautiful toast notification
        showNotificationToast({
          title: notification?.title || 'New Notification',
          body: notification?.body || '',
          onClick: notification?.url ? () => navigate(notification.url) : undefined,
          icon: getNotificationIcon(notification?.data?.type),
          duration: 6000,
        });
        
        // Dynamically import to avoid circular dependencies
        const { store } = await import('./store/store');
        const { genericInternalActions } = await import('./store/genericSlices');
        
        await store.dispatch(genericInternalActions.notifications.getFromIndexedDB({ force: true }) as any);
      }
    };

    window.addEventListener('wh:navigate', handleSpaNavigate as any);
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('wh:navigate', handleSpaNavigate as any);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  return null;
};

export const App = () => {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ServiceWorkerListener />
      <AppRouter />
      <EffectsLayer />
    </BrowserRouter>
  );
};

export default App;
