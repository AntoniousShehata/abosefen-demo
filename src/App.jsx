import { HashRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { PERMISSIONS } from './lib/permissions.js';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import AllCategories from './pages/AllCategories.jsx';
import CategoryPage from './pages/CategoryPage.jsx';
import ProductPage from './pages/ProductPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import OrderPage from './pages/OrderPage.jsx';
import MyOrders from './pages/MyOrders.jsx';
import SignIn from './pages/SignIn.jsx';
import NotFound from './pages/NotFound.jsx';
import OutagePage from './pages/OutagePage.jsx';
import Engineering from './pages/Engineering.jsx';
import ReelsPage from './pages/ReelsPage.jsx';
import AdminLayout, { RequirePermission } from './pages/admin/AdminLayout.jsx';
import AdminHome from './pages/admin/AdminHome.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminCategories from './pages/admin/AdminCategories.jsx';
import AdminStock from './pages/admin/AdminStock.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';

const guarded = (permission, element) => <RequirePermission permission={permission}>{element}</RequirePermission>;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="categories" element={<AllCategories />} />
        <Route path="c/:slug" element={<CategoryPage />} />
        <Route path="p/:slug" element={<ProductPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route path="my-orders" element={<MyOrders />} />
        <Route path="signin" element={<SignIn />} />
        <Route path="engineering" element={<Engineering />} />
        <Route path="reels" element={<ReelsPage />} />
        <Route path="reels/:id" element={<ReelsPage />} />
        <Route path="outage" element={<OutagePage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path="products" element={guarded(PERMISSIONS.products, <AdminProducts />)} />
          <Route path="categories" element={guarded(PERMISSIONS.categories, <AdminCategories />)} />
          <Route path="stock" element={guarded(PERMISSIONS.stock, <AdminStock />)} />
          <Route path="orders" element={guarded(PERMISSIONS.orders, <AdminOrders />)} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

/** Everything a page needs around it (language, messages, the signed-in demo role). */
export function Providers({ children, initialLanguage }) {
  return (
    <I18nProvider initialLanguage={initialLanguage}>
      <ToastProvider>
        <SessionProvider>{children}</SessionProvider>
      </ToastProvider>
    </I18nProvider>
  );
}

// HashRouter: the published site is a set of static files (GitHub Pages) — no server to answer deep links.
export default function App() {
  return (
    <HashRouter>
      <Providers>
        <AppRoutes />
      </Providers>
    </HashRouter>
  );
}
