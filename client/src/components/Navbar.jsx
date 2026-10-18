import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to={isAdmin ? '/admin' : '/'} className="brand">
          Tax<span className="dot">Desk</span>
        </Link>

        <div className="nav-links">
          {!isAdmin && (
            <>
              <NavLink to="/" end>
                Catalogue
              </NavLink>
              {user && (
                <>
                  <NavLink to="/dashboard">Dashboard</NavLink>
                  <NavLink to="/orders">Orders</NavLink>
                  <NavLink to="/filings">Filings</NavLink>
                  <NavLink to="/profile">Profile</NavLink>
                </>
              )}
            </>
          )}

          {isAdmin && <NavLink to="/admin">Admin console</NavLink>}

          {user ? (
            <>
              {!isAdmin && (
                <NavLink to="/cart">
                  Cart
                  {count > 0 && <span className="cart-pill">{count}</span>}
                </NavLink>
              )}
              <span className="nav-user">{user.name}</span>
              <button className="linklike" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Log in</NavLink>
              <Link to="/register" className="btn btn-sm">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
