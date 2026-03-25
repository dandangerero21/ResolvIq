import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import TargetCursor from '../components/TargetCursor';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <TargetCursor targetSelector="button, a, [role='button'], .cursor-target" hideDefaultCursor={true} spinDuration={2} parallaxOn={true} />
        <RouterProvider router={router} />
      </AppProvider>
    </AuthProvider>
  );
}
