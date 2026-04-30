import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="main-footer">
      <div className="footer-container">
        {/* Left Section: Logo and Address */}
        <div className="footer-section brand-section">
          <img src="/IMAGES/logo.webp" alt="MRSPTU Logo" className="footer-logo" />
          <p className="footer-address">
            Maharaja Ranjit Singh Punjab Technical University,<br />
            Dabwali Road, Bathinda - 151001,<br />
            Punjab, India
          </p>
        </div>

        {/* Middle Section: Quick Links */}
        <div className="footer-section links-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="https://www.aicte-india.org/" target="_blank" rel="noopener noreferrer">AICTE New Delhi</a></li>
            <li><a href="https://www.ugc.ac.in/" target="_blank" rel="noopener noreferrer">UGC New Delhi</a></li>
            <li><a href="https://www.mrsptu.ac.in/" target="_blank" rel="noopener noreferrer">MRSPTU Bathinda</a></li>
            <li><a href="#" target="_blank" rel="noopener noreferrer">DTF&IT Punjab</a></li>
          </ul>
        </div>

        {/* Right Section: Contact Us */}
        <div className="footer-section contact-section">
          <h3>Contact Us</h3>
          <p>Maharaja Ranjit Singh Punjab Technical University, Badal Road, Bathinda</p>
          <p><strong>Email:</strong> admissions@mrsptu.ac.in</p>
          <p><strong>Mob:</strong> 1800-121-1833 (TOLL FREE NO.), +91 87250-72402, +91 87250-72407, +91 87250-72443</p>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="copyright-bar">
        <p>Copyright ©2026 <strong>MRSPTU, Bathinda</strong>. All Rights Reserved</p>
        <p>Designed and Developed by IT Enabled Services Department | MRSPTU, Bathinda</p>
      </div>
    </footer>
  );
}

export default Footer;
