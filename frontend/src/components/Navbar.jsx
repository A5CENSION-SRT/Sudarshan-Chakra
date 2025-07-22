import { Link, useLocation } from 'react-router-dom';
import { Shield, Target, Lock, Menu, X } from 'lucide-react';
import { useState } from 'react';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Close menu when a link is clicked
  const closeMenu = () => {
    setIsMenuOpen(false);
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* === LEFT SIDE: BRAND === */}
        <div className="navbar-brand">
          <Shield className="brand-icon" />
          <span className="brand-text">SUDARSHAN CHAKRA</span>
          {/* Re-added the red classified tag */}
          <span className="classification">CLASSIFIED</span>
        </div>
        
        {/* Mobile menu button */}
        <button className="mobile-menu-toggle" onClick={toggleMenu}>
          {isMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
        </button>

        {/* === RIGHT SIDE: LINKS & STATUS (Wrapped for layout & mobile) === */}
        <div className={`navbar-right-group ${isMenuOpen ? 'mobile-open' : ''}`}>
          <div className="navbar-links">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Target className="nav-icon" />
              DASHBOARD
            </Link>
            <Link 
              to="/classified" 
              className={`nav-link ${location.pathname === '/classified' ? 'active' : ''}`}
              onClick={closeMenu}
            >
              <Lock className="nav-icon" />
              CLASSIFIED
            </Link>
          </div>

          <div className="navbar-status">
            <div className="status-indicator online"></div>
            <span className="status-text">SYSTEM ONLINE</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;