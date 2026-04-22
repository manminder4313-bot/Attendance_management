import { useState, useEffect } from 'react';

function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
const slides = [
  "https://mrsptu.ac.in/uploadsPress/MRSPTUEvent/22/IMG-20230412-WA0046.jpg",
  "https://images.shiksha.com/mediadata/images/articles/1589190372phpougpyL.jpeg",
  "https://www.mrsptu.ac.in/uploads2025/slider/vc_01.jpeg",
  "https://www.mrsptu.ac.in/uploads2025/images/VC_Snap.jpg",
  "https://mrsptu.ac.in/uploads2025/slider/AirForce2.jpg",
  "https://mrsptu.ac.in/uploads2026/slider/3rd_convocation.jpeg",
  "https://mrsptu.ac.in/uploads2026/slider/vc_001.jpg"
  ];
  

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <>
     <div className="marquee-container">
        <div className="marquee-content">
          <div className="marquee-item">Advertisement for Appointment of Chairman Board of Governors</div>
          <div className="marquee-item">(ICMESS-2026)Organized by the university business school on march 11-12,2026</div>
          <div className="marquee-item">walk in interview for the post of assistant professor (purely on lecture basis)</div>
        </div>
      </div>
      <section className="home-container">
        {/* LEFT COLUMN: IMPORTANT LINKS */}
        <div className="home-column left-column">
          <h3 className="column-title">Important Links</h3>
          <ul className="link-list">
            <li><a href="#">ICPMAS-2026</a></li>
            <li><a href="#">About MRSPTU</a></li>
            <li><a href="#">University Act</a></li>
            <li><a href="#">From the Desk of Chancellor</a></li>
            <li><a href="#">BOG</a></li>
            <li><a href="#">From of Vice Chancellor</a></li>
            <li><a href="#">Vision & Mission</a></li>
            <li><a href="#">Approval & Ranking</a></li>
            <li><a href="#">Organogram</a></li>
            <li><a href="#">Administration Contact</a></li>
            <li><a href="#">Administration Staff</a></li>
          </ul>
        </div>

        {/* CENTER COLUMN: CAROUSEL & NOTICES */}
        <div className="home-column center-column">
          <div className="carousel">
            {slides.map((slide, index) => (
              <div 
                key={index}
                className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
              >
                <img src={slide} alt={`University slide ${index + 1}`} />
              </div>
            ))}
            <div className="carousel-indicators">
              {slides.map((_, index) => (
                <span 
                  key={index} 
                  className={`indicator ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></span>
              ))}
            </div>
            <div className="carousel-caption">
              <h2>Welcome to MRSPTU</h2>
              <p>Empowering minds with knowledge and discipline</p>
            </div>
          </div>

          {/* NOTICE BOARD BELOW IMAGES */}
          <div className="notice-board-container">
            <div className="notice-board-header">
              <h3>Notices</h3>
            </div>
            <div className="notice-board-tabs">
              <span>DAA</span>
              <span>Sports</span>
              <span>Youth Welfare</span>
              <span>R&D</span>
              <span>Student Welfare</span>
              <span>General Notices</span>
              <span className="active-tab">Notifications</span>
              <span>PMSS</span>
              <span>Recruitment</span>
              <span>Tenders</span>
            </div>
            <div className="notice-board-content">
              <marquee direction="up" scrollamount="3" style={{ height: '100%' }} onMouseEnter={(e) => { if(e.target.stop) e.target.stop(); else if(e.currentTarget.stop) e.currentTarget.stop(); }} onMouseLeave={(e) => { if(e.target.start) e.target.start(); else if(e.currentTarget.start) e.currentTarget.start(); }}>
                <div className="notice-item">
                  <p>Notification-237-Implementation of Scholarship Scheme & Relaxation in deposit of Counselling & Security Fees for students of all PITs</p>
                  <div className="notice-date">
                    <span role="img" aria-label="calendar">📅</span> March 06, 2026
                  </div>
                </div>
                <div className="notice-item">
                  <p>Notification no. Reg-233 dt 15-01-2026 Provisional Admission Process for the Session 2026-27</p>
                  <div className="notice-date">
                    <span role="img" aria-label="calendar">📅</span> January 15, 2026
                  </div>
                </div>
                <div className="notice-item">
                  <p>Addendum Notification 236 - Guidelines regarding B.Tech Final Year students to join internship during 8th semester</p>
                  <div className="notice-date">
                    <span role="img" aria-label="calendar">📅</span> December 16, 2025
                  </div>
                </div>
                <div className="notice-item">
                  <p>Notification 235. Guidelines regarding B.Tech Final Year students to join internship during 8th semester</p>
                  <div className="notice-date">
                    <span role="img" aria-label="calendar">📅</span> November 11, 2025
                  </div>
                </div>
              </marquee>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ANNOUNCEMENTS & HIGHLIGHTS */}
      <div className="home-column right-column" style={{ display: 'flex', flexDirection: 'column', gap: '30px' ,alignItems: 'center'}}>
        <div>
          <h3 className="column-title">For admission</h3>
          <ul className="link-list">
            <li><h2 style={{marginBottom: '5px', fontWeight: '500', fontSize: '18px'}}>Session 2026-27</h2></li>
            <li><a href="#">Click Here</a></li>
            <li><h3 style={{marginBottom: '5px', fontWeight: '500', fontSize: '16px'}}>For Any query releted to admission contact</h3></li>
          </ul>
        </div>
        
        {/* Highlights Box with Vertical Marquee */}
        <div className="highlights-box">
          <h3 className="highlights-title">Highlights</h3>
          <div className="vertical-marquee-container">
            <marquee 
              direction="up" 
              scrollamount="3" 
              className="vertical-marquee"
              onMouseEnter={(e) => { if(e.target.stop) e.target.stop(); else if(e.currentTarget.stop) e.currentTarget.stop(); }}
              onMouseLeave={(e) => { if(e.target.start) e.target.start(); else if(e.currentTarget.start) e.currentTarget.start(); }}
            >
               <div className="highlight-item">
                  <strong>Course Coordinators</strong>
                  <p>Course Coordinators of Second Semester 2026 batch of various programmes have been appointed</p>
               </div>
               <hr style={{borderTop: '1px dashed #ccc', margin: '10px 0'}}/>
               <div className="highlight-item">
                  <strong>Choice Based Credit System</strong>
                  <p>MRSPTU, BATHINDA is implementing Choice Based Credit System</p>
               </div>
               <hr style={{borderTop: '1px dashed #ccc', margin: '10px 0'}}/>
               <div className="highlight-item">
                  <strong>MOU's Signed by University</strong>
                  <p>New partnerships forged with global tech leaders for Student Placements</p>
               </div>
               <hr style={{borderTop: '1px dashed #ccc', margin: '10px 0'}}/>
               <div className="highlight-item">
                  <strong>Convocation Updates</strong>
                  <p>The dates for the upcoming annual convocation will be announced soon.</p>
               </div>
            </marquee>
          </div>
        </div>
      </div>
    </section>

      <section className="important-links-section">
        <div className="section-header">
          <h2>Important Links</h2>
        </div>
        <div className="links-grid">
          <ul className="link-col">
            <li><a href="#">Alumni Connect</a></li>
            <li><a href="#">Student Support</a></li>
            <li><a href="#">Policy Documents</a></li>
            <li><a href="#">NAAC SSR</a></li>
            <li><a href="#">IIC Events</a></li>
            <li><a href="#">NCC</a></li>
            <li><a href="#">NSS</a></li>
            <li><a href="#">Internal Complaints Committee (ICC)</a></li>
          </ul>
          <ul className="link-col">
            <li><a href="#">PMSS</a></li>
            <li><a href="#">Equal Opportunity Cell</a></li>
            <li><a href="#">Facilities for Differently Abled</a></li>
            <li><a href="#">Scholarship Cell</a></li>
            <li><a href="#">Programmes Offered</a></li>
            <li><a href="#">Placement Data</a></li>
            <li><a href="#">Social Cause To Save Youth</a></li>
            <li><a href="#">Vidya Lakshmi Portal</a></li>
          </ul>
          <ul className="link-col">
            <li><a href="#">Grievances/Complaints</a></li>
            <li><a href="#">Anti Ragging Committee</a></li>
            <li><a href="#">Spoken Tutorials</a></li>
            <li><a href="#">Convocation April-2022</a></li>
            <li><a href="#">MOU's</a></li>
            <li><a href="#">RTI</a></li>
            <li><a href="#">Legal Cell</a></li>
          </ul>
          <ul className="link-col">
            <li><a href="#">Public Self Disclosure</a></li>
            <li><a href="#">Consultancy Work</a></li>
            <li><a href="#">Jobs@MRSPTU</a></li>
            <li><a href="#">Press Release</a></li>
            <li><a href="#">Events</a></li>
            <li><a href="#">News & Events</a></li>
            <li><a href="#">Tenders & Quotations</a></li>
            <li><a href="#">Blacklisting Firms</a></li>
          </ul>
        </div>
      </section>
    </>
  );
}

export default Home;
