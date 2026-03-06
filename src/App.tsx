import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { Layout } from './components/Layout';
import { PriceCurveProvider } from './store/priceCurveStore';
import { Dashboard } from './pages/Dashboard';
import { FlexEditor } from './pages/FlexEditor';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'flex', element: <FlexEditor /> },
    ],
  },
]);

export default function App() {
  return (
    <PriceCurveProvider>
      <RouterProvider router={router} />
    </PriceCurveProvider>
  );
}
