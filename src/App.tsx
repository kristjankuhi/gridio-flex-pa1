import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { Layout } from './components/Layout';
import { PriceCurveProvider } from './store/priceCurveStore';
import { SettingsProvider } from './store/settingsStore';
import { Dashboard } from './pages/Dashboard';
import { PriceEditor } from './pages/PriceEditor';
import { Settlement } from './pages/Settlement';
import { EvUsers } from './pages/EvUsers';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'price-editor', element: <PriceEditor /> },
      { path: 'settlement', element: <Settlement /> },
      { path: 'ev-users', element: <EvUsers /> },
    ],
  },
]);

export default function App() {
  return (
    <SettingsProvider>
      <PriceCurveProvider>
        <RouterProvider router={router} />
      </PriceCurveProvider>
    </SettingsProvider>
  );
}
