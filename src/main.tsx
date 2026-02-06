import ReactDOM from 'react-dom/client';
import './index.css';
// Bryntum Scheduler styles deshabilitados temporalmente hasta tener licencia/paquete
/* import '@bryntum/scheduler/scheduler.css';
import '@bryntum/scheduler/stockholm-light.css';
import '@bryntum/scheduler/fontawesome/css/fontawesome.css';
import '@bryntum/scheduler/fontawesome/css/solid.css'; */
import App from './App';
import { AuthProvider } from './providers/AuthProvider';
import { ThemeProvider } from './providers/ThemeProvider';
import { BrandingProvider } from './providers/BrandingProvider';
import { LanguageProvider } from './providers/LanguageProvider';
import { LaserPointerProvider } from './providers/LaserPointerProvider';
import { LaserPointer } from './components/LaserPointer';
import { Toaster } from 'react-hot-toast';
import { initFontStyle } from './utils/fontStyle';

// Initialize font style
initFontStyle();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  // <React.StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="whagons-ui-theme">
      <LanguageProvider>
        <BrandingProvider>
          <AuthProvider>
            <LaserPointerProvider>
              <App />
              <LaserPointer />
            </LaserPointerProvider>
            <Toaster
              position="bottom-right"
              containerStyle={{
                bottom: '20px',
                right: '100px',
              }}
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 8000,
                  iconTheme: {
                    primary: '#4ade80',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </AuthProvider>
        </BrandingProvider>
      </LanguageProvider>
    </ThemeProvider>
  // {/* </React.StrictMode>, */}
);

// Dev-only: expose the sandbox so you can test from the console quickly.
// Dev-only: expose the sandbox for console testing
if (import.meta.env.DEV) {
  import('./sandbox/devExpose')
    .then((m) => m.exposeSandboxToWindow())
    .catch(() => {});
}
