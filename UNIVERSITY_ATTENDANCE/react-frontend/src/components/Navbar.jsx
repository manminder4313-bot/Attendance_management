import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <header>
      <div className="navbar">
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
      </div>
      <nav className="navbar2">
        <div className="nav-links">
          <Link to="/">Home</Link>
          <div className="dropdown">
            <span>Academics ▾</span>
            <div className="dropdown-content">
              <Link to="/dean-office">Dean Office</Link>
              <Link to="/notices">Notices</Link>
              <Link to="/notifications">Notifications</Link>
              <Link to="/information-brochure">Information Brochure</Link>
              <Link to="/meeting">Meeting </Link>
              <Link to="/bos-notification">BOS Notification</Link>
              <Link to="/faculty-notification">Faculty Notification</Link>
              <Link to="/admission">Admission</Link>
              <Link to="/programmes-offered">Programmes Offered</Link>
              <Link to="/nopn-aicte-programe-offered">Nopn-AICTE Programe Offered</Link>
              <Link to="/syllabus">Syllabus</Link>
              <Link to="/academic-calendar">Academic Calendar</Link>
              <Link to="/choice-based-credit-system">Choice Based Credit System</Link>
              <Link to="/mrsptu-holiday-calendar">MRSPTU Holiday Calendar</Link>
            
            </div>
          </div>
          <div className="dropdown">
            <span>Deans & Directors ▾</span>
            <div className="dropdown-content">
              <Link to="/deans-directors">Deans of Faculty</Link>
              <Link to="/deans-directors">Dean Research & Development</Link>
              <Link to="/deans-directors">Dean Student Welfare</Link>
              <Link to="/deans-directors">Dean Planning & Development</Link>
              <Link to="/deans-directors">Dean Distance Education Program</Link>
              <Link to="/deans-directors">Director College Development</Link>
              <Link to="/deans-directors">Dean consultancy & Industrial Linkage</Link>
              <Link to="/deans-directors">Director Internal Quality Assurance Cell(IQAC)</Link>
              <Link to="/deans-directors">Proffessor Incharge IT enabled services</Link>
              <Link to="/deans-directors">Proffessor Incharge finance</Link>
              <Link to="/deans-directors">Proffessor Incharge Purchases</Link>
              <Link to="/deans-directors">Director sports & youth</Link>
              <Link to="/deans-directors">Professor Incharge CRC </Link>
              <Link to="/deans-directors">Director Training and placement</Link>
              <Link to="/deans-directors">Director public relations</Link>
              <Link to="/deans-directors">Guru Nanak Dev Chair</Link>
              <Link to="/deans-directors">IPR Cell</Link>
              <Link to="/deans-directors">Grants Cell</Link>
              <Link to="/deans-directors">Scholarship Cell</Link>
            </div>
          </div>
          
          <div className="dropdown">
            <span>Departments ▾</span>
            <div className="dropdown-content">
              <div className="sub-dropdown">
                <span>Main Campus ▾</span>
                <div className="sub-dropdown-content">
                  <Link to="/cse">Chemical</Link>
                  <Link to="/ece">Mathematics</Link>
                  <Link to="/me">Physics</Link>
                  <Link to="/me">computational Science</Link>
                  <Link to="/me">University Business School</Link>
                  <Link to="/me">food science and technology</Link>
                  <Link to="/me">Pharmaceutical Sciences & Technology</Link>
                  <Link to="/me">Gzs school of Architecture and planning</Link>
                  <Link to="/me">School of Agriculture</Link>
                </div>
              </div> 
              <Link to="/ece">GZSCCET</Link>
            </div>
          </div>
           <div className="dropdown">
            <span>Deans & Directors ▾</span>
            <div className="dropdown-content">
              <Link to="/deans-directors">Central Library </Link>
              <Link to="/deans-directors">University instrunmentation Facility</Link>
              <Link to="/deans-directors">Animal house facility</Link>
              <Link to="/deans-directors">Museum</Link>
              <Link to="/deans-directors">Business Lab</Link>
              <Link to="/deans-directors">Institute Innovation Council</Link>
              <Link to="/deans-directors">ED-BIC</Link>
              <Link to="/deans-directors">BCL-AICTE IDEA Lab</Link>
              <Link to="/deans-directors">FOOD Testing Lab</Link>
              <Link to="/deans-directors">Open Air Theatre</Link>
              <Link to="/deans-directors">Estate </Link>
              <Link to="/deans-directors">Medical Center </Link>
              <Link to="/deans-directors">Hostel </Link>
              <Link to="/deans-directors">transport</Link>
              <Link to="/deans-directors"> gym & sports</Link>
              <Link to="/deans-directors"> Workshops</Link>
              <Link to="/deans-directors"> Guest House</Link>
            </div>
          </div>
          
          <Link to="#">Colleges</Link>
          <Link to="#">Sports & Youth</Link>
          <Link to="#">Facilities</Link>
          <a href="http://alumni.mrsptu.ac.in/" target="_blank" rel="noopener noreferrer">Alumni</a>
          <Link to="/student-services">Student Services</Link>
          <Link to="/Attendance_Management">Attendance Management</Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
