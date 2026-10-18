import { NavLink, Outlet } from 'react-router-dom';

export default function AdminLayout() {
  return (
    <div>
      <div className="admin-banner">Administrator console — visible to admin accounts only</div>
      <div className="admin-shell">
        <aside className="admin-side">
          <div className="side-title">Manage</div>
          <NavLink to="/admin" end>Overview</NavLink>
          <NavLink to="/admin/clients">Clients</NavLink>
          <NavLink to="/admin/orders">Orders</NavLink>
          <NavLink to="/admin/filings">Filings</NavLink>
          <NavLink to="/admin/products">Catalogue</NavLink>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
