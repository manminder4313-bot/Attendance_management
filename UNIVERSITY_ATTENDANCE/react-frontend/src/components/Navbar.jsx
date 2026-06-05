import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFloatingBtn, setShowFloatingBtn] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowFloatingBtn(true);
      } else {
        setShowFloatingBtn(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleFloatingClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setIsMobileMenuOpen(true);
  };

  return (
    <header>
      <div className="navbar">
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-container">
            <div className="logo">
              <img src="/IMAGES/logo.webp" alt="Logo" width="90" />
            </div>
            <div className="logo-text">
              ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ<br />
              Maharaja Ranjit Singh Punjab Technical University, BATHINDA<br />
              <h6>(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015 and Approved Under Section 2(f) & 12 (B) of UGC)</h6>
            </div>
          </div>
          <div className="contact-info">
            <strong>Contact Us:</strong> +91-1644-239205<br />
            <strong>Email:</strong> info@mrsptu.ac.in
          </div>
          <div className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`} onClick={toggleMobileMenu}>
            <div className="bar1"></div>
            <div className="bar2"></div>
            <div className="bar3"></div>
          </div>
        </div>
      </div>
      <nav className="navbar2">
        <div className="container">
          <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
            <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
            <div className="dropdown">
              <span>Academics ▾</span>
              <div className="dropdown-content">
                <Link to="/dean-office" onClick={() => setIsMobileMenuOpen(false)}>Dean Office</Link>
                <Link to="/notices" onClick={() => setIsMobileMenuOpen(false)}>Notices</Link>
                <Link to="/notifications" onClick={() => setIsMobileMenuOpen(false)}>Notifications</Link>
                <Link to="/information-brochure" onClick={() => setIsMobileMenuOpen(false)}>Information Brochure</Link>
                <Link to="/meeting" onClick={() => setIsMobileMenuOpen(false)}>Meeting </Link>
                <Link to="/bos-notification" onClick={() => setIsMobileMenuOpen(false)}>BOS Notification</Link>
                <Link to="/faculty-notification" onClick={() => setIsMobileMenuOpen(false)}>Faculty Notification</Link>
                <Link to="/admission" onClick={() => setIsMobileMenuOpen(false)}>Admission</Link>
                <Link to="/programmes-offered" onClick={() => setIsMobileMenuOpen(false)}>Programmes Offered</Link>
                <Link to="/nopn-aicte-programe-offered" onClick={() => setIsMobileMenuOpen(false)}>Nopn-AICTE Programe Offered</Link>
                <Link to="/syllabus" onClick={() => setIsMobileMenuOpen(false)}>Syllabus</Link>
                <Link to="/academic-calendar" onClick={() => setIsMobileMenuOpen(false)}>Academic Calendar</Link>
                <Link to="/choice-based-credit-system" onClick={() => setIsMobileMenuOpen(false)}>Choice Based Credit System</Link>
                <Link to="/mrsptu-holiday-calendar" onClick={() => setIsMobileMenuOpen(false)}>MRSPTU Holiday Calendar</Link>

              </div>
            </div>
            <div className="dropdown">
              <span>Deans & Directors ▾</span>
              <div className="dropdown-content">
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Deans of Faculty</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Dean Research & Development</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Dean Student Welfare</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Dean Planning & Development</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Dean Distance Education Program</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Director College Development</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Dean consultancy & Industrial Linkage</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Director Internal Quality Assurance Cell(IQAC)</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Proffessor Incharge IT enabled services</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Proffessor Incharge finance</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Proffessor Incharge Purchases</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Director sports & youth</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Professor Incharge CRC </Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Director Training and placement</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Director public relations</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Guru Nanak Dev Chair</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>IPR Cell</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Grants Cell</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Scholarship Cell</Link>
              </div>
            </div>

            <div className="dropdown">
              <span>Departments ▾</span>
              <div className="dropdown-content">
                <div className="sub-dropdown">
                  <span>Main Campus ▾</span>
                  <div className="sub-dropdown-content">
                    <Link to="/agri" onClick={() => setIsMobileMenuOpen(false)}>Agricultural Engineering</Link>
                    <Link to="/arch" onClick={() => setIsMobileMenuOpen(false)}>Architecture</Link>
                    <Link to="/chem" onClick={() => setIsMobileMenuOpen(false)}>Chemical Engineering</Link>
                    <Link to="/civil" onClick={() => setIsMobileMenuOpen(false)}>Civil Engineering</Link>
                    <Link to="/cse" onClick={() => setIsMobileMenuOpen(false)}>Computer Science & Engineering</Link>
                    <Link to="/ca" onClick={() => setIsMobileMenuOpen(false)}>computatioinal science</Link>
                    <Link to="/ee" onClick={() => setIsMobileMenuOpen(false)}>Electrical Engineering</Link>
                    <Link to="/ece" onClick={() => setIsMobileMenuOpen(false)}>Electronics & Communication Engineering</Link>
                    <Link to="/food" onClick={() => setIsMobileMenuOpen(false)}>Food Science & Technology</Link>
                    <Link to="/me" onClick={() => setIsMobileMenuOpen(false)}>Mechanical Engineering</Link>
                    <Link to="/textile" onClick={() => setIsMobileMenuOpen(false)}>Textile Engineering</Link>
                    <Link to="/applied" onClick={() => setIsMobileMenuOpen(false)}>Applied Sciences</Link>
                    <Link to="/pharmacy" onClick={() => setIsMobileMenuOpen(false)}>Pharmacy</Link>
                    <Link to="/management" onClick={() => setIsMobileMenuOpen(false)}>Management Studies</Link>
                  </div>
                </div>
                <Link to="/ece" onClick={() => setIsMobileMenuOpen(false)}>GZSCCET</Link>
              </div>
            </div>
            <div className="dropdown">
              <span>Deans & Directors ▾</span>
              <div className="dropdown-content">
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Central Library </Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>University instrunmentation Facility</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Animal house facility</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Museum</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Business Lab</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Institute Innovation Council</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>ED-BIC</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>BCL-AICTE IDEA Lab</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>FOOD Testing Lab</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Open Air Theatre</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Estate </Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Medical Center </Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>Hostel </Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}>transport</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}> gym & sports</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}> Workshops</Link>
                <Link to="/deans-directors" onClick={() => setIsMobileMenuOpen(false)}> Guest House</Link>
              </div>
            </div>

            <Link to="#" onClick={() => setIsMobileMenuOpen(false)}>Colleges</Link>
            <Link to="#" onClick={() => setIsMobileMenuOpen(false)}>Sports & Youth</Link>
            <Link to="#" onClick={() => setIsMobileMenuOpen(false)}>Facilities</Link>
            <a href="http://alumni.mrsptu.ac.in/" target="_blank" rel="noopener noreferrer">Alumni</a>
            <Link to="/student-services" onClick={() => setIsMobileMenuOpen(false)}>Student Services</Link>
            <Link to="/Attendance_Management" onClick={() => setIsMobileMenuOpen(false)}>Admin & Teachers Login</Link>
          </div>
        </div>
      </nav>

      {/* Floating Scroll-to-Top / Menu Button */}
      {showFloatingBtn && (
        <div className="floating-menu-btn" onClick={handleFloatingClick}>
          <div className="btn-icon">☰</div>
          <span className="btn-text">Menu</span>
        </div>
      )}
    </header>
  );
}

export default Navbar;
