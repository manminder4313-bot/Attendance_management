import React from 'react';
import './home.css';
import Login from '../pages/Login';

function Attendence_home() {
  return (
    <div className="attendance-page-wrapper" style={{ backgroundColor: '#f9f9f9', minHeight: '100vh', paddingBottom: '3rem' }}>
      
      {/* Header Section */}
      <div style={{ padding: '2rem', paddingTop: '10px', textAlign: 'center', color: '#333' }}>
        <h1 style={{ color: '#8A1538', marginBottom: '1rem', fontSize: '2.5rem', fontWeight: 'bold' }}></h1>
      </div>
      
      {/* Main Content Layout */}
      <div className="attendance-home" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '0 2rem', 
        gap: '40px',
        flexWrap: 'wrap',
        maxWidth: '1500px',
        margin: '0 auto'
      }}>
        {/* Left Side: Login Form */}
        <div className="attendance-left" style={{ flex: '1', minWidth: '350px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px', transform: 'scale(0.95)', transformOrigin: 'top center' }}>
            <Login />
          </div>
        </div>

        {/* Right Side: University Image */}
        <div className="attendance-right" style={{ flex: '1', minWidth: '350px', display: 'flex', justifyContent: 'center' }}>
          <img 
            src="/IMAGES/mrsptu.webp" 
            alt="Maharaja Ranjit Singh Punjab Technical University" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '450px',
              height: 'auto', 
              borderRadius: '15px', 
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
              objectFit: 'cover'
            }} 
          />
        </div>
      </div>
      
    </div>
  );
}

export default Attendence_home;
