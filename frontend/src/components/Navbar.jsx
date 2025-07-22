import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css'; // Import the corresponding CSS file

// Using Font Awesome for icons is a common practice in React
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faCrosshairs, faLock } from '@fortawesome/free-solid-svg-icons';

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Left-aligned brand section */}
      <div className="navbar-brand">
        <FontAwesomeIcon icon={faShieldHalved} className="brand-icon" />
        <span className="brand-text">SUDARSHAN CHAKRA</span>
        <span className="brand-classification">CLASSIFIED</span>
      </div>
    
      {/* Center-aligned navigation and status */}
      <div className="navbar-center-group">
        {/* NavLink will automatically apply an 'active' class when the path matches */}
        <NavLink 
          to="/" 
          end // Use 'end' to prevent this from matching all child routes
          className={({ isActive }) => 
            "nav-link dashboard-link" + (isActive ? " active" : "")
          }
        >
          <FontAwesomeIcon icon={faCrosshairs} className="nav-icon dashboard-icon" />
          DASHBOARD
        </NavLink>
        
        <NavLink 
          to="http://127.0.0.1:5000/dashboard_ai_agent" 
          className={({ isActive }) => 
            "nav-link classified-link" + (isActive ? " active" : "")
          }
        >
          <FontAwesomeIcon icon={faLock} className="nav-icon" />
          CLASSIFIED
        </NavLink>
        
        <div className="navbar-status">
          <div className="status-indicator"></div>
          <span className="status-text">SYSTEM ONLINE</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;