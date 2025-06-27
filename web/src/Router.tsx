import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { HomePage } from './pages/Home.page';
import { PlayCraftPage } from './pages/Platcraft.page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/resizable-divider',
    element: <PlayCraftPage />,
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}