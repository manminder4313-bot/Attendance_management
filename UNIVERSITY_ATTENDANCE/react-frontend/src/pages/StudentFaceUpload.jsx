import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function StudentFaceUpload() {
  const [rollNo, setRollNo] = useState('');
  const [student, setStudent] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [status, setStatus] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const qRoll = searchParams.get('rollNo');
    if (qRoll) {
      setRollNo(qRoll);
      // Auto-trigger finding the student
      const students = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
      const found = students.find(s => s.enrollmentNumber === qRoll);
      if (found) {
        setStudent(found);
        setStatus({ text: `Identity Verified: ${found.fullName}`, type: 'success' });
      }
    }
  }, [searchParams]);

  const findStudent = () => {
    if (!rollNo) return;
    const studentsList = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
    const found = studentsList.find(s => s.enrollmentNumber === rollNo);
    if (found) {
      setStudent(found);
      setStatus({ text: `Student found: ${found.fullName}`, type: 'success' });
    } else {
      setStudent(null);
      setStatus({ text: 'Roll Number not found. Please check and try again.', type: 'error' });
    }
  };

  const startCamera = async () => {
    try {
      setStatus({ text: 'Initializing Camera...', type: 'info' });
      
      // Robust constraints for better compatibility
      const constraints = {
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 640 }, 
          facingMode: 'user' 
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setIsCameraOpen(true);
      setCapturedImage(null);
      setStatus({ text: '', type: '' });
      
      // We'll use a small timeout to ensure the video element is rendered before attaching
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.error("Video play error:", e));
        }
      }, 100);
    } catch (err) {
      console.error("Camera access error:", err);
      let errorMsg = "Could not access camera.";
      if (err.name === 'NotAllowedError') errorMsg = "Camera permission denied!";
      else if (err.name === 'NotFoundError') errorMsg = "No camera found on this device.";
      else errorMsg += " " + err.message;
      
      alert(errorMsg);
      setStatus({ text: errorMsg, type: 'error' });
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    
    // Capture at a high but manageable resolution
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Calculate square crop from center
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const minDim = Math.min(videoWidth, videoHeight);
    const sx = (videoWidth - minDim) / 2;
    const sy = (videoHeight - minDim) / 2;
    
    // Mirror the capture to match the preview
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    
    ctx.drawImage(video, sx, sy, minDim, minDim, 0, 0, size, size);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 0.7 quality saves space
    setCapturedImage(dataUrl);
    stopCamera();
    setStatus({ text: 'Photo captured! Ready for enrollment.', type: 'success' });
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const handleUpload = () => {
    if (!capturedImage || !student) return;
    setLoading(true);
    setStatus({ text: 'Securing student data...', type: 'info' });

    setTimeout(() => {
      try {
        const studentsList = JSON.parse(localStorage.getItem('studentSubmissions')) || [];
        
        // Use a more robust match (ID or Enrollment Number)
        const studentIndex = studentsList.findIndex(s => 
          String(s.id) === String(student.id) || 
          s.enrollmentNumber === student.enrollmentNumber
        );

        if (studentIndex !== -1) {
          // Update the specific student in the list
          studentsList[studentIndex] = {
            ...studentsList[studentIndex],
            enrolledFace: capturedImage,
            lastEnrollmentUpdate: new Date().toISOString()
          };

          localStorage.setItem('studentSubmissions', JSON.stringify(studentsList));
          
          setLoading(false);
          setStatus({ text: `Success! ${student.fullName}'s face profile is now active.`, type: 'success' });
          
          // Clear states after a short delay
          setTimeout(() => {
            setCapturedImage(null);
            setStudent(null);
            setRollNo('');
          }, 3000);
        } else {
          throw new Error("Student record was moved or deleted.");
        }
      } catch (err) {
        console.error('Upload Error:', err);
        setLoading(false);
        const errorMsg = err.name === 'QuotaExceededError' 
          ? "Storage full! Please tell your teacher to clear old records." 
          : "Update failed: " + err.message;
        setStatus({ text: errorMsg, type: 'error' });
      }
    }, 1500);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #8a2c20 0%, #333 100%)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(15px)', 
        padding: '40px', 
        borderRadius: '24px', 
        width: '100%', 
        maxWidth: '500px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ marginBottom: '10px', fontSize: '2rem' }}>Face Enrollment</h1>
        <p style={{ marginBottom: '30px', opacity: 0.8 }}>Identity verification portal for Smart Attendance</p>

        {status.text && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '12px', 
            marginBottom: '20px', 
            background: status.type === 'success' ? 'rgba(46, 125, 50, 0.3)' : 'rgba(198, 40, 40, 0.3)',
            border: `1px solid ${status.type === 'success' ? '#4caf50' : '#f44336'}`,
            fontSize: '14px'
          }}>
            {status.text}
          </div>
        )}

        {!student ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>University Roll No / Enrollment No</label>
              <input 
                type="text" 
                placeholder="Enter Roll Number"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '15px', 
                  borderRadius: '12px', 
                  border: 'none', 
                  background: 'rgba(255,255,255,0.2)', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '16px'
                }} 
              />
            </div>
            <button 
              onClick={findStudent}
              style={{ 
                background: '#white', 
                color: '#8a2c20', 
                fontWeight: 'bold', 
                padding: '15px', 
                borderRadius: '12px', 
                border: 'none', 
                cursor: 'pointer',
                transition: 'all 0.3s',
                backgroundColor: 'white'
              }}
            >
              Verify Identity
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={{ 
              width: '200px', 
              height: '200px', 
              borderRadius: '50%', 
              margin: '0 auto 25px', 
              overflow: 'hidden',
              border: '4px solid #fff',
              background: '#000',
              position: 'relative'
            }}>
              {isCameraOpen ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                />
              ) : capturedImage ? (
                <img src={capturedImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Captured" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '4rem' }}>👤</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {!isCameraOpen && !capturedImage && (
                <button 
                  onClick={startCamera}
                  style={{ background: '#3498db', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Open Camera
                </button>
              )}
              
              {isCameraOpen && (
                <button 
                  onClick={capturePhoto}
                  style={{ background: '#e74c3c', color: 'white', padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Capture Face
                </button>
              )}

              {capturedImage && (
                <>
                  <button 
                    onClick={handleUpload}
                    disabled={loading}
                    style={{ background: '#2ecc71', color: 'white', padding: '15px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                  >
                    {loading ? 'Securing Data...' : 'Enroll My Face'}
                  </button>
                  <button 
                    onClick={startCamera}
                    style={{ background: 'transparent', color: 'white', border: '1px solid white', padding: '10px', borderRadius: '12px', cursor: 'pointer' }}
                  >
                    Retake Photo
                  </button>
                </>
              )}

              <button 
                onClick={() => { setStudent(null); setCapturedImage(null); setRollNo(''); stopCamera(); }}
                style={{ background: 'none', border: 'none', color: 'white', opacity: 0.6, cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel / Wrong Student?
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          input::placeholder { color: rgba(255,255,255,0.5); }
        `}</style>
      </div>
    </div>
  );
}

export default StudentFaceUpload;
