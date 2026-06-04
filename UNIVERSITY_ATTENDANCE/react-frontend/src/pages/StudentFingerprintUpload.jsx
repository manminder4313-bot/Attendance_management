import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';

function StudentFingerprintUpload() {
  const [rollNo, setRollNo] = useState('');
  const [student, setStudent] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qRoll = searchParams.get('rollNo');
    if (qRoll) {
      setRollNo(qRoll);
      findStudent(qRoll);
    }
  }, [searchParams]);

  const playBeep = (freq = 800, duration = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio feedback error:', e);
    }
  };

  const findStudent = async (queryRoll) => {
    let roll = (queryRoll && typeof queryRoll === 'string' ? queryRoll : rollNo || '').toString().trim();
    if (!roll) return;
    
    setLoading(true);
    setStatus({ text: 'Verifying Roll Number...', type: 'info' });

    try {
      const studentsList = await api.students.getAll();
      const found = studentsList.find(s => {
        const sEnroll = (s.enrollmentNumber || '').toString().trim();
        const sRoll = (s.rollNumber || '').toString().trim();
        return sEnroll === roll || sRoll === roll;
      });

      if (found) {
        setStudent(found);
        setStatus({ text: `Identity Verified: ${found.fullName || found.name}`, type: 'success' });
      } else {
        setStudent(null);
        setStatus({ text: `Roll Number "${roll}" not found in database.`, type: 'error' });
      }
    } catch (err) {
      console.error('Error finding student:', err);
      setStatus({ text: 'Error connecting to database. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const startFingerprintEnrollment = () => {
    setIsScanning(true);
    setScanProgress(0);
    setStatus({ text: 'Initializing biometric scanner...', type: 'info' });
    playBeep(600, 0.1);
    
    const steps = [
      { progress: 15, msg: 'Biometric hardware online. Ready.' },
      { progress: 35, msg: 'Scanner active. Please place your finger on the sensor...' },
      { progress: 60, msg: 'Capturing minutiae point templates...' },
      { progress: 85, msg: 'Verifying image resolution and core pattern...' },
      { progress: 100, msg: 'Enrollment successful! Storing in secure database...' }
    ];
    
    let currentStep = 0;
    const interval = setInterval(async () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        setScanProgress(step.progress);
        setStatus({ text: step.msg, type: 'info' });
        playBeep(800 + step.progress * 2, 0.05);
        currentStep++;
      } else {
        clearInterval(interval);
        
        try {
          const id = student._id || student.id;
          const mockFingerprintData = `FP_SIG_${Math.random().toString(36).substring(2, 10).toUpperCase()}_${Date.now()}`;
          
          await api.students.update(id, {
            ...student,
            enrolledFingerprint: 'Active',
            fingerprintData: mockFingerprintData
          });
          
          playBeep(1200, 0.35);
          setStatus({ text: `Success! Fingerprint profile for ${student.fullName || student.name} is now Active.`, type: 'success' });
          setIsScanning(false);
          
          setTimeout(() => {
            setStudent(null);
            setRollNo('');
            setStatus({ text: '', type: '' });
          }, 4000);
        } catch (err) {
          console.error('Biometric enrollment failed:', err);
          setStatus({ text: 'Biometric database update failed: ' + err.message, type: 'error' });
          setIsScanning(false);
          playBeep(400, 0.4);
        }
      }
    }, 900);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0b1528 0%, #030712 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'rgba(10, 25, 47, 0.8)', 
        backdropFilter: 'blur(20px)', 
        padding: '40px', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '500px',
        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
        border: '1px solid rgba(0, 230, 118, 0.15)',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2rem', color: '#00e676', letterSpacing: '1px' }}>Biometric Fingerprint Enrollment</h1>
        <p style={{ marginBottom: '30px', opacity: 0.8, color: '#8892b0' }}>Biometric identity registration portal for Attendance Management</p>

        {status.text && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '25px', 
            background: status.type === 'success' ? 'rgba(0, 230, 118, 0.15)' : status.type === 'error' ? 'rgba(231, 76, 60, 0.15)' : 'rgba(52, 152, 219, 0.15)',
            border: `1px solid ${status.type === 'success' ? '#00e676' : status.type === 'error' ? '#e74c3c' : '#3498db'}`,
            fontSize: '14px',
            color: status.type === 'success' ? '#00e676' : status.type === 'error' ? '#ff7675' : '#74b9ff'
          }}>
            {status.text}
          </div>
        )}

        {!student ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#8892b0' }}>University Roll No / Enrollment No</label>
              <input 
                type="text" 
                placeholder="Enter Roll Number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '16px',
                  transition: 'border 0.3s'
                }} 
              />
            </div>
            <button 
              onClick={() => findStudent()}
              disabled={loading}
              style={{ 
                background: '#00e676', 
                color: '#0b1528', 
                fontWeight: 'bold', 
                padding: '15px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'all 0.3s',
                fontSize: '16px',
                boxShadow: '0 4px 15px rgba(0, 230, 118, 0.2)'
              }}
            >
              {loading ? 'Verifying...' : 'Verify Student Profile'}
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ 
              width: '140px', 
              height: '160px', 
              margin: '0 auto 25px', 
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#040d21',
              borderRadius: '20px',
              border: '2px solid rgba(0, 230, 118, 0.2)',
              overflow: 'hidden'
            }}>
              <svg width="100" height="120" viewBox="0 0 24 28" fill="none" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round" style={{ filter: isScanning ? 'drop-shadow(0 0 8px #00e676)' : 'none', opacity: isScanning ? 1 : 0.6 }}>
                <path d="M12 2C6.48 2 2 6.48 2 12C2 13.92 2.55 15.7 3.5 17.2M22 12C22 6.48 17.52 2 12 2" />
                <path d="M5.5 19.5C6.75 21 8.5 22 10.5 22.3M18.5 19.5C19.38 18.5 20 17.2 20.3 15.8" />
                <path d="M8.5 7.5C10 6.5 12 6.5 13.5 7.5M6.5 11C7 9.5 8.5 8.5 10.5 8.2M15.5 12.5C15 14 13.5 15 11.5 15.3" />
                <path d="M10 11C10 11.5 10.5 12 11 12C11.5 12 12 11.5 12 11C12 10.5 11.5 10 11 10C10.5 10 10 10.5 10 11" />
              </svg>
              {isScanning && (
                <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: '#00e676', boxShadow: '0 0 15px #00e676', animation: 'laserScan 1.5s infinite ease-in-out', borderRadius: '2px' }}></div>
              )}
            </div>

            {isScanning && (
              <div style={{ width: '80%', height: '8px', background: '#112240', borderRadius: '4px', margin: '0 auto 25px', overflow: 'hidden' }}>
                <div style={{ width: `${scanProgress}%`, height: '100%', background: '#00e676', transition: 'width 0.1s linear', boxShadow: '0 0 10px #00e676' }}></div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {!isScanning && (
                <>
                  <button 
                    onClick={startFingerprintEnrollment}
                    style={{ background: '#00e676', color: '#0b1528', padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 15px rgba(0, 230, 118, 0.2)' }}
                  >
                    Start Fingerprint Registration
                  </button>
                  <button 
                    onClick={() => { setStudent(null); setRollNo(''); setStatus({ text: '', type: '' }); }}
                    style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    Wrong Student? Verify Another
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        <style>{`
          @keyframes laserScan {
            0% { top: 5%; opacity: 0.3; }
            50% { top: 95%; opacity: 1; }
            100% { top: 5%; opacity: 0.3; }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          input::placeholder { color: rgba(255,255,255,0.4); }
        `}</style>
      </div>
    </div>
  );
}

export default StudentFingerprintUpload;
