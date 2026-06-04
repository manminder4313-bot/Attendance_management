import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import { subjectMapping } from '../utils/subjectMapping';

function TeacherProfile() {
  const [teacher, setTeacher] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [students, setStudents] = useState([]);
  const [semesterFilter, setSemesterFilter] = useState('');
  
  // Attendance Marking State
  const [attendanceMarks, setAttendanceMarks] = useState({}); // { studentId: 'Present' }
  const [attendanceRecords, setAttendanceRecords] = useState([]); // Loaded from API
  const [saveStatus, setSaveStatus] = useState({ text: '', type: '' });
  const [selectedHistory, setSelectedHistory] = useState(null); // Updated state for modal viewing
  const [historySemesterFilter, setHistorySemesterFilter] = useState('');
  const [historyCourseFilter, setHistoryCourseFilter] = useState('');
  const [historySubjectFilter, setHistorySubjectFilter] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSession, setSelectedSession] = useState('Lecture 1'); // Session selection state
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [targetRollNo, setTargetRollNo] = useState(''); // State for custom enrollment link
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Smart Attendance States
  const [markingMode, setMarkingMode] = useState('manual'); // 'manual' or 'smart'
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Password change states
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdUpdateMsg, setPwdUpdateMsg] = useState({ text: '', type: '' });

  // Secure Deletion and Proof States
  const [capturedImage, setCapturedImage] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deleteConfirmPwd, setDeleteConfirmPwd] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // High Tech Detection States
  const [detectionLog, setDetectionLog] = useState([]);
  const [lastDetectedStudent, setLastDetectedStudent] = useState('');
  const [lastDetectedPhoto, setLastDetectedPhoto] = useState(null);
  const [showScanResults, setShowScanResults] = useState(false);
  const [scanResultsData, setScanResultsData] = useState({ present: [], absent: [] });
  const [detectedIds, setDetectedIds] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isInitializingAI, setIsInitializingAI] = useState(false);
  const [faceMatchers, setFaceMatchers] = useState(null);
  const [groupPhoto, setGroupPhoto] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Biometric Fingerprint States
  const [isFingerScanning, setIsFingerScanning] = useState(false);
  const [scanningStudent, setScanningStudent] = useState(null);
  const [scanFingerProgress, setScanFingerProgress] = useState(0);
  const [biometricLog, setBiometricLog] = useState([]);
  const [enrollingStudent, setEnrollingStudent] = useState(null);
  const [isFingerEnrolling, setIsFingerEnrolling] = useState(false);
  const [enrollFingerProgress, setEnrollFingerProgress] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    const loggedInUser = sessionStorage.getItem('loggedInTeacher');
    if (!loggedInUser) {
      navigate('/login');
    } else {
      const teacherData = JSON.parse(loggedInUser);
      setTeacher(teacherData);
      loadSubmissions(teacherData);
      loadHistory(teacherData);
      initFaceAI();
    }
  }, [navigate, activeTab]);

  const initFaceAI = async () => {
    if (modelsLoaded || isInitializingAI) return;
    setIsInitializingAI(true);
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/';
      await Promise.all([
        window.faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      console.log("✅ Face-API Models Loaded Successfully");
    } catch (err) {
      console.error("❌ Failed to load Face-API models:", err);
    } finally {
      setIsInitializingAI(false);
    }
  };

  const prepareFaceMatchers = async (studentsList) => {
    if (!window.faceapi || !modelsLoaded) return;
    
    const labeledDescriptors = [];
    
    for (const s of studentsList) {
      if (s.enrolledFace) {
        try {
          const img = await window.faceapi.fetchImage(s.enrolledFace);
          // Use High Precision SSD Detector for enrollment processing
          const detection = await window.faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          
          if (detection) {
            labeledDescriptors.push(new window.faceapi.LabeledFaceDescriptors(
              s.id || s._id,
              [detection.descriptor]
            ));
          }
        } catch (err) {
          console.warn(`Could not process enrollment for ${s.fullName}:`, err);
        }
      }
    }

    if (labeledDescriptors.length > 0) {
      // Use a more forgiving threshold (0.6) for better matching in group photos
      setFaceMatchers(new window.faceapi.FaceMatcher(labeledDescriptors, 0.6));
    }
  };

  // Ensure FaceMatchers are prepared when models load or students list is updated
  useEffect(() => {
    if (modelsLoaded && students.length > 0) {
      prepareFaceMatchers(students);
    }
  }, [modelsLoaded, students]);

  const loadHistory = async (teacherData) => {
    setIsLoadingHistory(true);
    try {
      const id = teacherData._id || teacherData.id;
      // Optimize: Fetch ONLY this teacher's records
      const teacherHistory = await api.attendance.getAll({ teacherId: id });
      setAttendanceRecords(teacherHistory.sort((a,b) => new Date(b.date) - new Date(a.date)).map(r => ({ 
                                         ...r, 
                                         id: r._id || r.id,
                                         dateDisplay: r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'
                                       })));
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Live clock for camera overlay
  useEffect(() => {
    let timer;
    if (isCameraOpen) {
      timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCameraOpen]);

  const loadSubmissions = async (teacherData) => {
    setIsLoadingStudents(true);
    try {
      const allStudents = await api.students.getAll();
      const filteredStudents = allStudents.filter(s => {
        const dept = teacherData.department?.trim().toLowerCase();
        const studentDept = s.department?.trim().toLowerCase();
        
        // 1. Primary Check: Direct Department Match
        if (studentDept && dept && studentDept.includes(dept)) {
          return true;
        }

        // 2. Secondary Check: Course Mapping
        const course = s.course;
        const deptCourses = api.departments.getCourses(teacherData.department);
        if (deptCourses.length > 0 && deptCourses.includes(course)) {
            return true;
        }
        
        // 3. Fallback: Fuzzy Name Match
        return course?.toLowerCase().includes(dept) || 
               dept?.includes(course?.toLowerCase());
      });
      setStudents(filteredStudents.map(s => ({ ...s, id: s._id || s.id })));
      
      const studentsWithId = filteredStudents.map(s => ({ ...s, id: s._id || s.id }));
      prepareFaceMatchers(studentsWithId);

      const initialMarks = {};
      filteredStudents.forEach(s => {
        initialMarks[s._id || s.id] = 'Present';
      });
      setAttendanceMarks(initialMarks);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const startCamera = async () => {
    // Check for required filters first
    if (!semesterFilter || semesterFilter === 'All') {
      alert("⚠️ Plz select a specific Semester before starting attendance.");
      return;
    }
    if (!selectedCourse || selectedCourse === 'All') {
      alert("⚠️ Plz select a specific Course before starting attendance.");
      return;
    }
    if (!selectedSubject) {
      alert("⚠️ Plz select an Assigned Subject before starting attendance.");
      return;
    }

    // Check for duplicates before starting camera
    if (getIsDuplicate()) {
      alert(`⚠️ ATTENTION: This lecture (${selectedSession}) for ${selectedSubject} has already been marked today.\n\nPlz set other lecture or check the Attendance History tab.`);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 }, 
          facingMode: 'user' 
        } 
      });
      streamRef.current = stream;
      
      // If video element is already in DOM (e.g. re-scanning), attach immediately
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.warn("Auto-play failed:", e));
      }

      setIsCameraOpen(true);
      setIsScanning(true);
      startLiveScan();
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions or ensure you are on HTTPS.");
    }
  };

  // Attach stream when video element is rendered
  useEffect(() => {
    let timeout;
    if (isCameraOpen && streamRef.current) {
      // Ensure video element is attached to the stream once it's in the DOM
      timeout = setTimeout(() => {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(e => console.warn("Video play error:", e));
        }
      }, 150);
    }
    return () => clearTimeout(timeout);
  }, [isCameraOpen, groupPhoto, isScanning]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsCameraOpen(false);
    setIsScanning(false);
    setScanProgress(0);
    setShowScanResults(false);
    setScanResultsData({ present: [], absent: [] });
    setGroupPhoto(null);
    setIsAnalyzing(false);
  };

  const performGroupAnalysis = async () => {
    if (!videoRef.current || !faceMatchers) return;

    setIsAnalyzing(true);
    setScanProgress(10);
    setDetectionLog(['📷 Capturing Group High-Resolution Snapshot...']);

    // 1. CAPTURE THE PHOTO
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    const photoData = canvas.toDataURL('image/jpeg', 0.9);
    setGroupPhoto(photoData);
    setCapturedImage(photoData);
    
    // Stop video to focus on analysis
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }

    setScanProgress(30);
    setDetectionLog(prev => ['🧠 Neural Engine: Analyzing Class Geometry...', ...prev]);

    try {
      // 2. DETECT ALL FACES IN THE CAPTURED PHOTO
      const img = await window.faceapi.fetchImage(photoData);
      const detections = await window.faceapi.detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors();

      setScanProgress(70);
      setDetectionLog(prev => [`🔍 Identified ${detections.length} faces in group photo`, ...prev]);

      if (detections.length === 0) {
        setDetectionLog(prev => ['⚠️ No faces detected. Try adjusting the camera.', ...prev]);
      }

      const foundIds = [];
      detections.forEach(detection => {
        const bestMatch = faceMatchers.findBestMatch(detection.descriptor);
        if (bestMatch.label !== 'unknown') {
          foundIds.push(bestMatch.label);
        }
      });

      setDetectedIds(foundIds);
      setScanProgress(100);
      setDetectionLog(prev => [`✅ Analysis Complete. Matched ${foundIds.length} students.`, ...prev]);

      // 3. FINALIZE RESULTS & ADD OVERLAY TO PROOF
      const newMarks = { ...attendanceMarks };
      const presentList = [];
      const absentList = [];

      filteredBySemester.forEach(student => {
        const isPresent = foundIds.includes(student.id || student._id);
        newMarks[student.id || student._id] = isPresent ? 'Present' : 'Absent';
        if (isPresent) {
          presentList.push(student);
        } else {
          absentList.push(student);
        }
      });

      // ADD OVERLAY TO THE CAPTURED IMAGE
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      const fctx = finalCanvas.getContext('2d');
      fctx.drawImage(img, 0, 0);
      
      // Draw Header Overlay
      fctx.fillStyle = 'rgba(138, 44, 32, 0.85)';
      fctx.fillRect(0, 0, finalCanvas.width, 120);
      
      fctx.fillStyle = 'white';
      fctx.font = 'bold 28px "Inter", Arial';
      const now = new Date();
      fctx.fillText(`MRSPTU ATTENDANCE PROOF | ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 30, 50);
      fctx.font = '22px "Inter", Arial';
      fctx.fillText(`Subject: ${selectedSubject || teacher.primarySubject} | Semester: ${semesterFilter}`, 30, 90);
      
      fctx.textAlign = 'right';
      fctx.font = 'bold 40px "Inter", Arial';
      fctx.fillText(`${presentList.length} STUDENTS PRESENT`, finalCanvas.width - 30, 75);

      const stampedPhoto = finalCanvas.toDataURL('image/jpeg', 0.8);
      setGroupPhoto(stampedPhoto);
      setCapturedImage(stampedPhoto);

      setAttendanceMarks(newMarks);
      setScanResultsData({ present: presentList, absent: absentList });

      setTimeout(() => {
        setIsAnalyzing(false);
        setShowScanResults(true);
      }, 1500);

    } catch (err) {
      console.error("Analysis Error:", err);
      setDetectionLog(prev => ['❌ Error during neural analysis.', ...prev]);
      setIsAnalyzing(false);
    }
  };

  const handleStopLiveScan = () => {
    setIsAnalyzing(true);
    setScanProgress(50);
    setDetectionLog(['🛑 Stopping Live Scanner & Generating Results...']);

    let canvas = document.createElement('canvas');
    let hasVideo = false;
    if (videoRef.current && videoRef.current.videoWidth) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        hasVideo = true;
    } else {
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
    }

    const presentList = [];
    const absentList = [];
    const newMarks = { ...attendanceMarks };

    filteredBySemester.forEach(student => {
      const isPresent = detectedIds.includes(student.id || student._id);
      newMarks[student.id || student._id] = isPresent ? 'Present' : 'Absent';
      if (isPresent) {
        presentList.push(student);
      } else {
        absentList.push(student);
      }
    });

    // Add Overlay to the Proof Image
    const fctx = canvas.getContext('2d');
    if (fctx) {
        fctx.fillStyle = 'rgba(39, 174, 96, 0.85)';
        fctx.fillRect(0, 0, canvas.width, 120);
        fctx.fillStyle = 'white';
        fctx.font = 'bold 28px "Inter", Arial';
        const now = new Date();
        fctx.fillText(`MRSPTU CONTINUOUS SCAN PROOF | ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 30, 50);
        fctx.font = '22px "Inter", Arial';
        fctx.fillText(`Subject: ${selectedSubject || teacher.primarySubject} | Semester: ${semesterFilter}`, 30, 90);
        fctx.textAlign = 'right';
        fctx.font = 'bold 40px "Inter", Arial';
        fctx.fillText(`${presentList.length} STUDENTS PRESENT`, canvas.width - 30, 75);
    }

    const stampedPhoto = canvas.toDataURL('image/jpeg', 0.8);
    setGroupPhoto(stampedPhoto);
    setCapturedImage(stampedPhoto);

    // Stop video AFTER extracting the image data
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }

    setAttendanceMarks(newMarks);
    setScanResultsData({ present: presentList, absent: absentList });

    setScanProgress(100);

    setTimeout(() => {
      setIsAnalyzing(false);
      setShowScanResults(true);
    }, 1000);
  };

  const startLiveScan = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    
    setDetectionLog(prev => ['🚀 Live Neural Engine Active', ...prev]);
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !faceMatchers || isAnalyzing || showScanResults) return;
      
      try {
        // Use TinyFaceDetector for real-time performance
        const detections = await window.faceapi.detectAllFaces(
          videoRef.current, 
          new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
        ).withFaceLandmarks().withFaceDescriptors();
        
        if (detections.length > 0) {
          const foundIdsInFrame = [];
          detections.forEach(detection => {
            const bestMatch = faceMatchers.findBestMatch(detection.descriptor);
            if (bestMatch.label !== 'unknown') {
              foundIdsInFrame.push(bestMatch.label);
              
              // If it's a new match, trigger the popup
              setDetectedIds(prev => {
                if (!prev.includes(bestMatch.label)) {
                   const student = students.find(s => (s.id === bestMatch.label || s._id === bestMatch.label));
                   if (student) {
                      setLastDetectedStudent(student.fullName);
                      setLastDetectedPhoto(student.enrolledFace || student.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}&background=8a2c20&color=fff`);
                      setTimeout(() => setLastDetectedStudent(''), 2500);
                   }
                   return [...prev, bestMatch.label];
                }
                return prev;
              });

              // Mark as present in attendanceMarks
              setAttendanceMarks(prev => ({ ...prev, [bestMatch.label]: 'Present' }));
            }
          });
          
          if (foundIdsInFrame.length > 0) {
             setDetectionLog(prev => [`📡 Live: Detected ${foundIdsInFrame.length} students`, ...prev.slice(0, 5)]);
          }
        }
      } catch (err) {
        console.warn("Live scan frame error:", err);
      }
    }, 1500); // Run every 1.5 seconds for optimal performance/stability
  };

  const manualIdentify = (student) => {
    if (detectedIds.includes(student.id)) return;
    
    setDetectedIds(prev => [...prev, student.id]);
    setAttendanceMarks(prev => ({ ...prev, [student.id]: 'Present' }));
    setLastDetectedStudent(student.fullName);
    setLastDetectedPhoto(student.enrolledFace || student.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}&background=8a2c20&color=fff`);
    setDetectionLog(prev => [`✓ Verified: ${student.fullName}`, ...prev.slice(0, 5)]);
    
    setTimeout(() => {
      setLastDetectedStudent('');
    }, 2000);
  };

  const playBeep = (type = 'success') => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'error') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'scan') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.05);
      }
    } catch (e) {
      console.warn("Audio Context beep failed:", e);
    }
  };

  const generateBiometricProof = (verifiedCount) => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#0a0f1d');
    grad.addColorStop(1, '#070a13');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 640; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 480); ctx.stroke();
    }
    for (let i = 0; i < 480; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(640, i); ctx.stroke();
    }

    ctx.strokeStyle = '#00e676';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 600, 440);

    ctx.fillStyle = '#00e676';
    ctx.fillRect(15, 15, 40, 6);
    ctx.fillRect(15, 15, 6, 40);
    ctx.fillRect(585, 15, 40, 6);
    ctx.fillRect(619, 15, 6, 40);
    ctx.fillRect(15, 459, 40, 6);
    ctx.fillRect(15, 425, 6, 40);
    ctx.fillRect(585, 459, 40, 6);
    ctx.fillRect(619, 425, 6, 40);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MRSPTU BIOMETRIC SYSTEM', 320, 70);

    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('SECURE FINGERPRINT ATTENDANCE VERIFIED', 320, 100);

    ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(320, 210, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(320, 210, 40, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(320, 210, 30, 0, Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(320, 210, 20, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(320, 210, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 230, 118, 0.2)';
    ctx.fillRect(220, 205, 200, 10);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(220, 209, 200, 2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(60, 290, 520, 130);
    ctx.strokeStyle = 'rgba(0, 230, 118, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 290, 520, 130);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#8892b0';
    ctx.font = '14px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`Teacher: ${teacher?.fullName || 'Teacher'}`, 80, 320);
    ctx.fillText(`Subject: ${selectedSubject || teacher?.primarySubject}`, 80, 345);
    ctx.fillText(`Course/Semester: ${selectedCourse} (${semesterFilter})`, 80, 370);
    ctx.fillText(`Date/Session: ${new Date().toLocaleDateString()} - ${selectedSession}`, 80, 395);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00e676';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${verifiedCount} Present`, 540, 330);
    ctx.fillStyle = '#ff8a80';
    ctx.font = 'bold 16px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${filteredBySemester.length - verifiedCount} Absent`, 540, 360);

    ctx.fillStyle = '#00e676';
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(`SYS_REF: FP-SEC-${Date.now().toString().slice(-6)}`, 540, 400);

    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const startFingerprintScan = (student = null) => {
    if (student) {
      if (!student.enrolledFingerprint) {
        alert(`⚠️ Student ${student.fullName} has no fingerprint enrolled. Plz click "Register Print" first.`);
        return;
      }
      setScanningStudent(student);
    } else {
      const candidate = filteredBySemester.find(s => s.enrolledFingerprint && attendanceMarks[s.id] !== 'Present');
      if (!candidate) {
        alert("No unregistered student found with enrolled fingerprint. All enrolled students are marked present!");
        return;
      }
      setScanningStudent(candidate);
    }

    setIsFingerScanning(true);
    setScanFingerProgress(0);
    setBiometricLog(['📡 Biometric Scanner Online', '🔌 Waiting for finger contact...']);

    let prog = 0;
    const interval = setInterval(() => {
      prog += 10;
      setScanFingerProgress(prog);
      playBeep('scan');

      if (prog === 20) {
        setBiometricLog(prev => [...prev, '👆 Finger detected. Scanning pattern...']);
      } else if (prog === 50) {
        setBiometricLog(prev => [...prev, '🔍 Matching minutiae points in database...']);
      } else if (prog === 80) {
        setBiometricLog(prev => [...prev, '🧬 Verifying biometric signature...']);
      } else if (prog === 100) {
        clearInterval(interval);
        playBeep('success');
        
        setTimeout(() => {
          setIsFingerScanning(false);
          const studentId = student ? student.id : candidate.id;
          setAttendanceMarks(prev => {
            const next = { ...prev };
            next[studentId] = 'Present';
            return next;
          });
          setSaveStatus({ text: `Biometric Match: ${student ? student.fullName : candidate.fullName} marked Present!`, type: 'success' });
          setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
        }, 500);
      }
    }, 200);
  };

  const startFingerprintEnrollment = (student) => {
    setEnrollingStudent(student);
    setIsFingerEnrolling(true);
    setEnrollFingerProgress(0);
    setBiometricLog(['🧬 Biometric Enrollment Mode', '🔌 Connect external scanner or place finger on sensor...']);

    let prog = 0;
    const interval = setInterval(() => {
      prog += 5;
      setEnrollFingerProgress(prog);
      playBeep('scan');

      if (prog === 20) {
        setBiometricLog(prev => [...prev, '👆 First Press: Scan ridge details...']);
      } else if (prog === 40) {
        setBiometricLog(prev => [...prev, '☝ Lift finger. Press again to verify...']);
      } else if (prog === 60) {
        setBiometricLog(prev => [...prev, '👆 Second Press: Stitching ridge maps...']);
      } else if (prog === 85) {
        setBiometricLog(prev => [...prev, '💾 Creating cryptosecure biometric template...']);
      } else if (prog === 100) {
        clearInterval(interval);
        playBeep('success');

        setTimeout(async () => {
          setIsFingerEnrolling(false);
          
          try {
            const mockPrintTemplate = `FP-TEMPLATE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const sId = student._id || student.id;
            
            await api.students.update(sId, {
              enrolledFingerprint: 'Active',
              fingerprintData: mockPrintTemplate
            });

            setStudents(prev => prev.map(s => {
              if (s.id === sId || s._id === sId) {
                return { ...s, enrolledFingerprint: 'Active', fingerprintData: mockPrintTemplate };
              }
              return s;
            }));

            setSaveStatus({ text: `Fingerprint Enrolled for ${student.fullName}!`, type: 'success' });
            setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
          } catch (err) {
            console.error('Biometric Enrollment error:', err);
            alert(`Biometric Enrollment failed: ${err.message || 'Server error'}`);
          }
        }, 500);
      }
    }, 150);
  };

  const getAvailableSemesters = () => {
    const month = new Date().getMonth(); // 0-11
    const isEvenSession = month < 6; // Jan to June
    const sems = [
      "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
      "5th Semester", "6th Semester", "7th Semester", "8th Semester",
      "9th Semester", "10th Semester"
    ];

    return sems.filter((_, index) => {
      const semNum = index + 1;
      return isEvenSession ? semNum % 2 === 0 : semNum % 2 !== 0;
    });
  };

  const getIsDuplicate = () => {
    if (!semesterFilter || !selectedSubject || !selectedSession) return false;
    const now = new Date();
    const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return attendanceRecords.some(r => 
      r.date === localDate && 
      r.semester === semesterFilter && 
      r.subject === selectedSubject && 
      r.session === selectedSession
    );
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMarks(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (semesterFilter === 'All' || !semesterFilter) {
      alert("Please select a specific semester before saving attendance.");
      return false;
    }
    if (!selectedCourse || selectedCourse === 'All') {
      alert("Please select a specific course before saving attendance.");
      return false;
    }
    if (!selectedSubject) {
      alert("Please select a subject before saving attendance.");
      return false;
    }
    
    // Duplicate Check logic before final save
    if (getIsDuplicate()) {
      alert(`⚠️ DUPLICATE ENTRY: Attendance for ${selectedSubject} (${selectedSession}) has already been marked today.\n\nPlz set other lecture session or edit the existing record in History.`);
      return false;
    }

    if (!capturedImage && !groupPhoto) {
      alert("Attendance Proof is REQUIRED. Please use the Class Camera to capture a proof photo of the class before saving.");
      return false;
    }
    return await saveAttendanceData(attendanceMarks, capturedImage || groupPhoto);
  };

  const saveAttendanceData = async (marks, proof) => {
    try {
      const semesterMarks = {};
      filteredBySemester.forEach(s => {
        const sId = s._id || s.id;
        semesterMarks[sId] = marks[sId] || 'Present';
      });

      const now = new Date();
      const localDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      const record = {
        date: localDate,
        teacherId: teacher._id || teacher.id,
        teacherName: teacher.fullName,
        subject: selectedSubject || teacher.primarySubject,
        semester: semesterFilter,
        course: filteredBySemester[0]?.course, // Added for stats filtering
        department: teacher.department,
        attendance: semesterMarks,
        proofPhoto: proof,
        session: selectedSession
      };

      await api.attendance.create(record);

      setSaveStatus({ text: `Attendance for ${semesterFilter} saved successfully!`, type: 'success' });
      setCapturedImage(null); 
      loadHistory(teacher); // Ensure history is updated immediately
      setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
      return true;
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save attendance: ' + err.message); // Added explicit alert for debugging
      setSaveStatus({ text: 'Failed to save attendance: ' + err.message, type: 'error' });
      return false;
    }
  };

  const handleDownloadPDF = () => {
    setShowPdfModal(true);
  };

  const generatePDF = async (withCreds) => {
    const doc = new jsPDF();
    
    // Draw Header using Canvas (to support Punjabi fonts)
    const headerImg = await new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 1600, 360);

      const logoImg = new Image();
      logoImg.src = '/IMAGES/logo.webp';
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        // Logo
        ctx.drawImage(logoImg, 40, 40, 280, 280);
        
        ctx.textAlign = 'left';
        
        // Punjabi Title
        ctx.fillStyle = '#8a2c20';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText('ਮਹਾਰਾਜਾ ਰਣਜੀਤ ਸਿੰਘ ਪੰਜਾਬ ਟੈਕਨੀਕਲ ਯੂਨੀਵਰਸਿਟੀ, ਬਠਿੰਡਾ', 360, 100);
        
        // English Title
        ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Maharaja Ranjit Singh Punjab Technical University, BATHINDA', 360, 160);
        
        // Subtext
        ctx.fillStyle = '#555';
        ctx.font = 'italic 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText('(A State University Established By Govt. of Punjab vide Punjab Act No. 5 of 2015', 360, 200);
        ctx.fillText('and Approved Under Section 2(f) & 12 (B) of UGC)', 360, 230);
        
        // Report Separator
        ctx.fillStyle = '#8a2c20';
        ctx.fillRect(360, 260, 1200, 4);

        // Report Information
        ctx.fillStyle = '#333';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`STUDENT LIST - ${semesterFilter === 'All' ? 'ALL SEMESTERS' : semesterFilter.toUpperCase()}`, 360, 310);

        resolve(canvas.toDataURL('image/png'));
      };
      logoImg.onerror = () => resolve(null);
    });

    if (headerImg) {
      doc.addImage(headerImg, 'PNG', 0, 0, 210, 47);
    } else {
      // Fallback
      doc.setFillColor(138, 44, 32);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.text('MRSPTU ATTENDANCE MANAGEMENT', 105, 20, { align: 'center' });
    }

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 55);
    doc.text(`Professor: ${teacher.fullName}`, 15, 60);
    doc.text(`Department: ${teacher.department}`, 15, 65);

    let headers = [['Name', 'Roll No', 'Course', 'Semester', 'Email']];
    if (withCreds) headers[0].push('Username', 'Password');
    
    const data = filteredBySemester.map(s => {
      const row = [s.fullName, s.enrollmentNumber, s.course, s.semester, s.email];
      if (withCreds) row.push(s.username, s.password);
      return row;
    });

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 75,
      theme: 'grid',
      headStyles: { fillColor: [138, 44, 32], textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`students_list_${Date.now()}.pdf`);
    setShowPdfModal(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdUpdateMsg({ text: '', type: '' });

    if (newPwd !== confirmPwd) {
      setPwdUpdateMsg({ text: 'Passwords do not match!', type: 'error' });
      return;
    }

    if (newPwd.length < 6) {
      setPwdUpdateMsg({ text: 'Password must be at least 6 characters long.', type: 'error' });
      return;
    }

    try {
      const updatedTeacher = { ...teacher, password: newPwd };
      const id = updatedTeacher._id || updatedTeacher.id;
      
      await api.teachers.update(id, updatedTeacher);
      
      setTeacher(updatedTeacher);
      sessionStorage.setItem('loggedInTeacher', JSON.stringify(updatedTeacher));

      setPwdUpdateMsg({ text: 'Password updated successfully!', type: 'success' });
      setTimeout(() => {
        setShowPwdModal(false);
        setNewPwd('');
        setConfirmPwd('');
        setPwdUpdateMsg({ text: '', type: '' });
      }, 2000);
    } catch (err) {
      console.error('Password update error:', err);
      setPwdUpdateMsg({ text: `Failed to update password: ${err.message || 'Server error'}`, type: 'error' });
    }
  };

  const handleDeleteRequest = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
    setDeleteConfirmPwd('');
  };

  const confirmDeletion = async () => {
    if (deleteConfirmPwd !== teacher.password) {
      alert("Incorrect password! Deletion failed.");
      return;
    }

    try {
      const id = recordToDelete._id || recordToDelete.id;
      await api.attendance.delete(id);
      
      setSaveStatus({ text: 'Record deleted successfully from database.', type: 'success' });
      setShowDeleteModal(false);
      setRecordToDelete(null);
      loadHistory(teacher); // Refresh history
      setTimeout(() => setSaveStatus({ text: '', type: '' }), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Failed to delete record: ${err.message || 'Server error'}`);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('loggedInTeacher');
    navigate('/');
  };

  if (!teacher) return null;

  const isAttendanceReady = selectedCourse && selectedCourse !== 'All' && semesterFilter && semesterFilter !== 'All' && selectedSubject;
  const isStudentsReady = selectedCourse && semesterFilter;
  const isHistoryReady = historyCourseFilter && historyCourseFilter !== 'All' && historySemesterFilter && historySemesterFilter !== 'All' && historySubjectFilter;

  const filteredBySemester = (isLoadingStudents) ? [] : students.filter(s => {
    if (activeTab === 'attendance' && !isAttendanceReady) return false;
    if (activeTab === 'students' && !isStudentsReady) return false;

    if (selectedCourse && selectedCourse !== 'All' && s.course !== selectedCourse) return false;
    if (semesterFilter === '' || semesterFilter === 'All') return true;
    const semNum = semesterFilter.split(' ')[0].replace(/[^0-9]/g, '');
    return String(s.semester) === semNum || String(s.semester) === semesterFilter;
  });

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', minHeight: '80vh' }}>
      {saveStatus.text && (
        <div style={{ 
          position: 'fixed', top: '20px', right: '20px', padding: '15px 30px', borderRadius: '8px', zIndex: 1100,
          background: saveStatus.type === 'success' ? '#2e7d32' : '#c62828', color: 'white', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          {saveStatus.text}
        </div>
      )}

      {/* Header Section */}
      <div className="admin-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative' }}>
            <img 
              src={teacher.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.fullName || 'Teacher')}&background=8a2c20&color=fff`} 
              alt="Profile" 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #8a2c20', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <div>
            <h1 style={{ color: '#8a2c20', fontSize: '2.2rem', margin: 0 }}>{teacher.department || 'Academic'} Dashboard</h1>
            <p style={{ color: '#666', margin: '5px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Prof: {teacher.fullName}</p>
          </div>
        </div>
        <div className="admin-actions">
          <button 
            onClick={() => setShowPwdModal(true)}
            style={{ padding: '12px 25px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
          >
            Change Password
          </button>
          <button 
            onClick={handleLogout}
            style={{ padding: '12px 25px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.3s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          onClick={() => setActiveTab('profile')} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'profile' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'profile' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          My Profile
        </button>
        <button 
          onClick={() => { setActiveTab('students'); setSemesterFilter(''); loadSubmissions(teacher); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'students' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'students' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          My Students
        </button>
        <button 
          onClick={() => { setActiveTab('attendance'); setSemesterFilter(''); loadSubmissions(teacher); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'attendance' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'attendance' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          Attendance Management
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setHistorySemesterFilter(''); setHistoryCourseFilter(''); setHistorySubjectFilter(''); }} 
          style={{ 
            padding: '12px 25px', border: 'none', background: 'none', 
            borderBottom: activeTab === 'history' ? '3px solid #8a2c20' : 'none', 
            color: activeTab === 'history' ? '#8a2c20' : '#666', 
            fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', transition: 'all 0.3s' 
          }}
        >
          Attendance History
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '35px', borderRadius: '15px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        {activeTab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
            <div>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Professional Details</h3>
              <p><strong>Department:</strong> {teacher.department}</p>
              <p><strong>Primary Subject:</strong> {teacher.primarySubject}</p>
              <p><strong>Qualification:</strong> {teacher.qualification}</p>
              <p><strong>Experience:</strong> {teacher.experience} Years</p>
            </div>
            <div>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Contact & Info</h3>
              <p><strong>Email:</strong> {teacher.email}</p>
              <p><strong>Phone:</strong> {teacher.phone}</p>
              <p><strong>Gender:</strong> {teacher.gender}</p>
              <p><strong>Joined On:</strong> {teacher.submissionDate}</p>
              <p><strong>Username:</strong> {teacher.username}</p>
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', margin: 0 }}>Students List</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                >
                  <option value="">Select Course</option>
                  {[...new Set(students.map(s => s.course))].filter(Boolean).sort().map(course => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
                <select 
                  value={semesterFilter} 
                  onChange={(e) => setSemesterFilter(e.target.value)}
                  style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                >
                  <option value="">Select Semester</option>
                  {getAvailableSemesters().map(sem => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              </div>
              {filteredBySemester.length > 0 && (
                <button 
                  onClick={handleDownloadPDF}
                  style={{ marginLeft: '10px', background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📥 Download List PDF
                </button>
              )}
            </div>
            
            {!isStudentsReady && !isLoadingStudents ? (
              <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fcfcfc', borderRadius: '15px', border: '2px dashed #eee', marginTop: '20px' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>👥</div>
                <h4 style={{ color: '#8a2c20', margin: '0 0 10px 0' }}>Selection Required</h4>
                <p style={{ color: '#666', margin: 0 }}>Please select a <strong>Course</strong> and <strong>Semester</strong> to view the students list.</p>
              </div>
            ) : (filteredBySemester.length === 0 && !isLoadingStudents) ? (
              <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>No students found {semesterFilter && semesterFilter !== 'All' ? `for ${semesterFilter}` : 'in your department'}.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', textTransform: 'uppercase', fontSize: '13px' }}>
                    <th style={thStyle}>Reg. Photo</th>
                    <th style={thStyle}>Enrolled Face</th>
                    <th style={thStyle}>Fingerprint</th>
                    <th style={thStyle}>Roll No</th>
                    <th style={thStyle}>Full Name</th>
                    <th style={thStyle}>Course</th>
                    <th style={thStyle}>Semester</th>
                    <th style={thStyle}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingStudents ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skel-stud-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '150px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '180px' }}></div></td>
                      </tr>
                    ))
                  ) : (
                    filteredBySemester.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>
                          {s.profilePhoto ? (
                            <img src={s.profilePhoto} alt="Reg" style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #ddd' }} />
                          ) : (
                            <div style={{ width: '35px', height: '35px', borderRadius: '4px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#999' }}>N/A</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {s.enrolledFace ? (
                            <img src={s.enrolledFace} alt="Enrolled" style={{ width: '35px', height: '35px', borderRadius: '4px', objectFit: 'cover', border: '2px solid #27ae60' }} />
                          ) : (
                            <div style={{ width: '35px', height: '35px', borderRadius: '4px', background: '#fff3f3', border: '1px dashed #e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#e74c3c' }}>Missing</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {s.enrolledFingerprint === 'Active' ? (
                            <div style={{ width: '35px', height: '35px', borderRadius: '4px', background: '#e8f5e9', border: '2px solid #2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#2e7d32' }}>👆</div>
                          ) : (
                            <div style={{ width: '35px', height: '35px', borderRadius: '4px', background: '#fff3f3', border: '1px dashed #e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#e74c3c' }}>Missing</div>
                          )}
                        </td>
                        <td style={tdStyle}>{s.enrollmentNumber}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{s.fullName}</td>
                        <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: '#e1f5fe', color: '#0288d1' }}>{s.course}</span></td>
                        <td style={tdStyle}>{s.semester}</td>
                        <td style={tdStyle}>{s.email}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div>
            <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid #edf2f7', overflow: 'hidden', marginBottom: '30px' }}>
              {/* Header & Mode Switcher */}
              <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #fcfcfc, #fff)' }}>
                <div>
                  <h3 style={{ color: '#660000', margin: 0, fontSize: '1.6rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Attendance Management</h3>
                  <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Session management and automated student verification</p>
                </div>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <button 
                    onClick={() => { setMarkingMode('manual'); stopCamera(); }}
                    style={{ 
                      padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: markingMode === 'manual' ? '#660000' : 'transparent',
                      color: markingMode === 'manual' ? 'white' : '#64748b',
                      fontSize: '14px', fontWeight: '700', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: markingMode === 'manual' ? '0 4px 10px rgba(102,0,0,0.2)' : 'none'
                    }}
                  >
                    <span>📝</span> Manual Entry
                  </button>
                  <button 
                    onClick={() => setMarkingMode('smart')}
                    style={{ 
                      padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: markingMode === 'smart' ? '#660000' : 'transparent',
                      color: markingMode === 'smart' ? 'white' : '#64748b',
                      fontSize: '14px', fontWeight: '700', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: markingMode === 'smart' ? '0 4px 10px rgba(102,0,0,0.2)' : 'none'
                    }}
                  >
                    <span>📸</span> Smart Scanner
                  </button>
                  <button 
                    onClick={() => { setMarkingMode('fingerprint'); stopCamera(); alert('Fingerprint Scan feature is Coming Soon!'); }}
                    style={{ 
                      padding: '10px 24px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                      background: markingMode === 'fingerprint' ? '#660000' : 'transparent',
                      color: markingMode === 'fingerprint' ? 'white' : '#64748b',
                      fontSize: '14px', fontWeight: '700', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: markingMode === 'fingerprint' ? '0 4px 10px rgba(102,0,0,0.2)' : 'none'
                    }}
                  >
                    <span>👆</span> Fingerprint Scan
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div style={{ padding: '25px 30px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#660000', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Course / Program</label>
                    <select 
                      value={selectedCourse} 
                      onChange={(e) => { setSelectedCourse(e.target.value); setSelectedSubject(''); }}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '15px', color: '#1e293b', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Choose Course</option>
                      {[...new Set([...Object.keys(subjectMapping), ...students.map(s => s.course)])].filter(Boolean).sort().map(course => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: '#660000', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Academic Semester</label>
                    <select 
                      value={semesterFilter} 
                      onChange={(e) => { setSemesterFilter(e.target.value); setSelectedSubject(''); }}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '15px', color: '#1e293b', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Choose Semester</option>
                      {getAvailableSemesters().map(sem => (
                        <option key={sem} value={sem}>{sem}</option>
                      ))}
                    </select>
                  </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     <label style={{ fontSize: '12px', color: '#660000', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned Subject</label>
                     <select 
                       value={selectedSubject} 
                       onChange={(e) => setSelectedSubject(e.target.value)}
                       style={{ padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '15px', color: '#1e293b', appearance: 'none', cursor: 'pointer' }}
                     >
                       <option value="">Choose Subject</option>
                       {(() => {
                         const semNum = semesterFilter?.match(/\d+/)?.[0];
                         const subjects = (subjectMapping[selectedCourse] && semNum) ? subjectMapping[selectedCourse][semNum] : null;
                         if (subjects) return subjects.map(s => <option key={s} value={s}>{s}</option>);
                         return <option value={teacher.primarySubject}>{teacher.primarySubject}</option>;
                       })()}
                     </select>
                   </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '12px', color: '#660000', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class Session</label>
                      {attendanceRecords.some(r => 
                        r.date === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}` && 
                        r.semester === semesterFilter && 
                        r.subject === selectedSubject && 
                        r.session === selectedSession
                      ) && (
                        <span style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 'bold' }}>⚠️ ALREADY MARKED</span>
                      )}
                    </div>
                    <select 
                      value={selectedSession} 
                      onChange={(e) => setSelectedSession(e.target.value)}
                      style={{ padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: '600', fontSize: '15px', color: '#1e293b', appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="Lecture 1">Lecture 1</option>
                      <option value="Lecture 2">Lecture 2</option>
                      <option value="Lecture 3">Lecture 3</option>
                      <option value="Extra Lecture">Extra Lecture</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Utility & Actions Footer */}
              <div style={{ padding: '20px 30px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '10px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                     <span style={{ fontSize: '18px' }}>📅</span>
                     <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '14px' }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                   </div>
                   
                   <div style={{ display: 'flex', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '4px 4px 4px 15px', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', gap: '5px' }}>
                     <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>ROLL NO:</span>
                     <input 
                       type="text" 
                       placeholder="Optional" 
                       value={targetRollNo}
                       onChange={(e) => setTargetRollNo(e.target.value)}
                       style={{ border: 'none', outline: 'none', width: '70px', fontSize: '13px', fontWeight: '700', color: '#660000', background: 'transparent' }}
                     />
                     <button 
                       onClick={() => {
                           const url = `${window.location.origin}/upload-face${targetRollNo ? `?rollNo=${targetRollNo}` : ''}`;
                           navigator.clipboard.writeText(url);
                           setSaveStatus({ text: 'Face link copied!', type: 'success' });
                           setTimeout(() => setSaveStatus({ text: '', type: '' }), 2000);
                       }}
                       style={{ background: '#f1f5f9', color: '#1e293b', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s' }}
                     >
                       COPY FACE 📸
                     </button>
                     <button 
                       onClick={() => {
                           const url = `${window.location.origin}/upload-fingerprint${targetRollNo ? `?rollNo=${targetRollNo}` : ''}`;
                           navigator.clipboard.writeText(url);
                           setSaveStatus({ text: 'Fingerprint link copied!', type: 'success' });
                           setTimeout(() => setSaveStatus({ text: '', type: '' }), 2000);
                       }}
                       style={{ background: '#00e676', color: '#0b1528', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '800', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s' }}
                     >
                       COPY FINGER 👆
                     </button>
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  {markingMode === 'manual' && filteredBySemester.length > 0 && (
                    <>
                      <button 
                        onClick={startCamera}
                        style={{ 
                          background: '#0ea5e9', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', 
                          cursor: 'pointer', fontWeight: '800', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px',
                          transition: 'all 0.3s', boxShadow: '0 4px 12px rgba(14,165,233,0.2)'
                        }}
                      >
                        <span>📸</span> Capture Proof
                      </button>
                      <button 
                        onClick={handleSaveAttendance}
                        disabled={!capturedImage}
                        style={{ 
                          background: capturedImage ? '#660000' : '#cbd5e1', 
                          color: 'white', border: 'none', padding: '12px 32px', borderRadius: '12px', 
                          cursor: capturedImage ? 'pointer' : 'not-allowed', 
                          fontWeight: '800', fontSize: '14px', transition: 'all 0.3s',
                          boxShadow: capturedImage ? '0 4px 15px rgba(102,0,0,0.25)' : 'none'
                        }}
                      >
                        Finalize & Submit
                      </button>
                    </>
                  )}
                  {markingMode === 'fingerprint' && filteredBySemester.length > 0 && (
                    <button 
                      onClick={async () => {
                        const verifiedCount = Object.values(attendanceMarks).filter(status => status === 'Present').length;
                        const proofImg = generateBiometricProof(verifiedCount);
                        const isSaved = await saveAttendanceData(attendanceMarks, proofImg);
                        if (isSaved) {
                          // Clear marking states
                        }
                      }}
                      style={{ 
                        background: '#2e7d32', 
                        color: 'white', border: 'none', padding: '12px 32px', borderRadius: '12px', 
                        cursor: 'pointer', 
                        fontWeight: '800', fontSize: '14px', transition: 'all 0.3s',
                        boxShadow: '0 4px 15px rgba(46,125,50,0.25)'
                      }}
                    >
                      Finalize Biometric Session
                    </button>
                  )}
                </div>
              </div>
            </div>

            {capturedImage && markingMode === 'manual' && (
              <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #bae6fd', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <img src={capturedImage} style={{ width: '100px', height: '60px', borderRadius: '6px', objectFit: 'cover', border: '2px solid #0ea5e9' }} alt="Proof" />
                <div>
                   <div style={{ fontWeight: 'bold', color: '#0369a1' }}>✅ Session Proof Captured</div>
                   <div style={{ fontSize: '12px', color: '#0c4a6e' }}>This photo will be saved as official evidence of this attendance session.</div>
                </div>
                <button 
                  onClick={() => { setCapturedImage(null); setGroupPhoto(null); }}
                  style={{ marginLeft: 'auto', background: 'none', border: '1px solid #0ea5e9', color: '#0ea5e9', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Change Photo
                </button>
              </div>
            )}

            {markingMode === 'manual' ? (
              <>
                {(isAttendanceReady || isLoadingStudents) ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px' }}>Student Photo</th>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px' }}>Roll Number</th>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px' }}>Full Name</th>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px' }}>Session</th>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px' }}>Subject</th>
                    <th style={{ ...thStyle, color: '#475569', padding: '15px', textAlign: 'center' }}>Attendance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingStudents ? (
                    Array(5).fill(0).map((_, i) => (
                      <tr key={`skel-att-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}><div className="skeleton skeleton-avatar"></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80%' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                        <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '15px' }}>
                            <div className="skeleton skeleton-text" style={{ width: '60px' }}></div>
                            <div className="skeleton skeleton-text" style={{ width: '60px' }}></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : filteredBySemester.length > 0 ? (
                    filteredBySemester.map((s) => (
                      <tr key={`att-${s.id}`} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={tdStyle}>
                          {s.profilePhoto ? (
                            <img src={s.profilePhoto} alt="S" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ddd' }} />
                          ) : (
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: '#888' }}>
                              {s.fullName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td style={tdStyle}>{s.enrollmentNumber}</td>
                        <td style={tdStyle}>{s.fullName}</td>
                        <td style={tdStyle}>{selectedSession}</td>
                        <td style={{ ...tdStyle, color: '#660000', fontWeight: 'bold' }}>{selectedSubject || 'Not Selected'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '15px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`status-${s.id}`} 
                                checked={attendanceMarks[s.id] === 'Present'} 
                                onChange={() => handleStatusChange(s.id, 'Present')}
                              /> Present
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                              <input 
                                type="radio" 
                                name={`status-${s.id}`} 
                                checked={attendanceMarks[s.id] === 'Absent'} 
                                onChange={() => handleStatusChange(s.id, 'Absent')}
                              /> Absent
                            </label>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ padding: '60px 40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>👥</div>
                        <h4 style={{ color: '#1e293b', margin: '0 0 10px 0', fontSize: '18px', fontWeight: '800' }}>No Students Found</h4>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>
                          We couldn't find any students for {semesterFilter !== 'All' ? semesterFilter : 'your department'} in {selectedCourse !== 'All' ? selectedCourse : 'any course'}.<br/>
                          Try adjusting your filters or contact the administrator.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
                ) : (
                  <div style={{ textAlign: 'center', padding: '80px 40px', background: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0', margin: '20px 0', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '5rem', marginBottom: '25px', filter: 'grayscale(100%) brightness(1.2)', opacity: 0.5 }}>📋</div>
                    <h3 style={{ color: '#1e293b', fontSize: '1.8rem', fontWeight: '800', margin: '0 0 10px 0' }}>Data Selection Required</h3>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                      Please select a <strong>Course</strong>, <strong>Semester</strong> and <strong>Assigned Subject</strong> from the control panel above to load the student attendance sheet.
                    </p>
                  </div>
                )}
              </>
            ) : markingMode === 'smart' ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                {!isCameraOpen ? (
                  <div style={{ padding: '60px', border: '2px dashed #ddd', borderRadius: '20px', background: '#fcfcfc' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📷</div>
                    <h2 style={{ color: '#333' }}>Smart Class Scanner</h2>
                    <p style={{ color: '#666', maxWidth: '500px', margin: '0 auto 30px' }}>
                      Use the class scanner to automatically identify and mark students in <strong>{semesterFilter || 'the selected semester'}</strong> using their enrolled face profiles.
                    </p>
                    <button 
                      onClick={startCamera}
                      style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '12px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 10px 20px rgba(138,44,32,0.2)' }}
                    >
                      Open Class Camera
                    </button>
                  </div>
                ) : (
                  <div style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: 0, 
                    width: '100vw', 
                    height: '100vh', 
                    background: '#000', 
                    zIndex: 3000, 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Inter', sans-serif"
                  }}>
                    {/* FULL SCREEN VIDEO */}
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      muted
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover',
                        position: 'absolute'
                      }} 
                    />

                    {/* SCANNER OVERLAYS (ONLY IF NOT SHOWING RESULTS) */}
                    {!showScanResults ? (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', display: 'flex' }}>
                        {/* MAIN CAMERA VIEW */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                          {/* Header Overlay */}
                          <div style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)', padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ color: 'white' }}>
                              <div style={{ fontSize: '12px', letterSpacing: '2px', color: '#8a2c20', fontWeight: 'bold', marginBottom: '5px' }}>GROUP_PHOTO_ANALYSIS_ENGINE</div>
                              <h2 style={{ margin: 0, fontSize: '24px' }}>{semesterFilter} Smart Attendance</h2>
                              <div style={{ fontSize: '14px', opacity: 0.7 }}>{selectedSubject || teacher.primarySubject}</div>
                            </div>
                            <div style={{ textAlign: 'right', color: 'white', fontFamily: 'monospace' }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{currentTime.toLocaleTimeString()}</div>
                              <div style={{ fontSize: '12px', opacity: 0.8 }}>{currentTime.toLocaleDateString()}</div>
                            </div>
                          </div>

                          {/* Center Frame - NOW FULL SCREEN */}
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {groupPhoto ? (
                                <img src={groupPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Group Class" />
                            ) : (
                                <div style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    border: '2px solid rgba(138,44,32,0.3)', 
                                    position: 'relative'
                                  }}>
                                    {/* Corners */}
                                    <div style={{ position: 'absolute', top: '20px', left: '20px', width: '60px', height: '60px', borderTop: '8px solid #8a2c20', borderLeft: '8px solid #8a2c20', borderTopLeftRadius: '20px' }}></div>
                                    <div style={{ position: 'absolute', top: '20px', right: '20px', width: '60px', height: '60px', borderTop: '8px solid #8a2c20', borderRight: '8px solid #8a2c20', borderTopRightRadius: '20px' }}></div>
                                    <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '60px', height: '60px', borderBottom: '8px solid #8a2c20', borderLeft: '8px solid #8a2c20', borderBottomLeftRadius: '20px' }}></div>
                                    <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '60px', height: '60px', borderBottom: '8px solid #8a2c20', borderRight: '8px solid #8a2c20', borderBottomRightRadius: '20px' }}></div>
                                </div>
                            )}

                            {/* Analysis Status Overlay */}
                            {isAnalyzing && (
                              <div style={{ 
                                position: 'absolute', 
                                top: '50%', 
                                left: '50%', 
                                transform: 'translate(-50%, -50%)', 
                                background: 'rgba(0,0,0,0.85)', 
                                padding: '40px', 
                                borderRadius: '30px', 
                                textAlign: 'center',
                                border: '1px solid #8a2c20',
                                backdropFilter: 'blur(10px)',
                                zIndex: 3200,
                                minWidth: '400px'
                              }}>
                                <div style={{ fontSize: '3rem', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>🧠</div>
                                <h3 style={{ color: 'white', margin: '0 0 10px 0' }}>Analyzing Group Photo</h3>
                                <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>Running neural identification algorithms...</p>
                                <div style={{ width: '100%', height: '6px', background: '#333', borderRadius: '3px' }}>
                                  <div style={{ width: `${scanProgress}%`, height: '100%', background: '#8a2c20', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                                </div>
                                <div style={{ color: '#8a2c20', fontSize: '12px', marginTop: '10px', fontWeight: 'bold' }}>{scanProgress}% COMPLETE</div>
                              </div>
                            )}

                            {/* Match Popup */}
                            {lastDetectedStudent && (
                              <div style={{ 
                                position: 'absolute', 
                                bottom: '15%', 
                                left: '50%', 
                                transform: 'translateX(-50%)', 
                                background: 'rgba(0,0,0,0.85)', 
                                backdropFilter: 'blur(10px)',
                                border: '2px solid #8a2c20',
                                padding: '15px 35px', 
                                borderRadius: '50px', 
                                color: 'white', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '15px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                                animation: 'slideUp 0.3s ease-out',
                                zIndex: 3200
                              }}>
                                <img src={lastDetectedPhoto} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #8a2c20', objectFit: 'cover' }} alt="" />
                                <div>
                                  <div style={{ fontSize: '10px', color: '#8a2c20', fontWeight: 'bold', letterSpacing: '2px' }}>STUDENT_VERIFIED</div>
                                  <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{lastDetectedStudent}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Detection Log Overlay */}
                          <div style={{ position: 'absolute', bottom: '120px', left: '30px', width: '300px', background: 'rgba(0,0,0,0.6)', padding: '15px', borderRadius: '12px', color: '#00e676', fontSize: '11px', fontFamily: 'monospace', textAlign: 'left', border: '1px solid rgba(0,230,118,0.3)' }}>
                            <div style={{ marginBottom: '8px', borderBottom: '1px solid rgba(0,230,118,0.2)', paddingBottom: '5px', fontWeight: 'bold' }}>NEURAL_ENGINE_STATUS</div>
                            {detectionLog.map((log, i) => (
                              <div key={i} style={{ marginBottom: '4px', opacity: 1 - (i * 0.15) }}>{log}</div>
                            ))}
                          </div>

                          {/* Footer Controls */}
                          <div style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '40px', display: 'flex', justifyContent: 'center', gap: '20px', pointerEvents: 'auto' }}>
                            <button 
                              onClick={stopCamera}
                              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '15px 35px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', backdropFilter: 'blur(5px)' }}
                            >
                              Exit Scanner
                            </button>
                            {!groupPhoto ? (
                                <>
                                  <button 
                                    onClick={performGroupAnalysis}
                                    disabled={isAnalyzing || !semesterFilter || !modelsLoaded}
                                    style={{ 
                                      background: (isAnalyzing || !semesterFilter || !modelsLoaded) ? '#555' : '#8a2c20', 
                                      color: 'white', border: 'none', padding: '15px 30px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
                                      boxShadow: '0 5px 20px rgba(138,44,32,0.4)', transition: 'all 0.3s'
                                    }}
                                  >
                                    {!modelsLoaded ? 'Loading AI Engine...' : 'Capture Group Photo'}
                                  </button>
                                  <button 
                                    onClick={handleStopLiveScan}
                                    disabled={isAnalyzing || !semesterFilter || !modelsLoaded}
                                    style={{ 
                                      background: (isAnalyzing || !semesterFilter || !modelsLoaded) ? '#555' : '#27ae60', 
                                      color: 'white', border: 'none', padding: '15px 30px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer',
                                      boxShadow: '0 5px 20px rgba(39,174,96,0.4)', transition: 'all 0.3s'
                                    }}
                                  >
                                    {!modelsLoaded ? 'Loading AI Engine...' : 'Stop & Finalize Live Scan'}
                                  </button>
                                </>
                            ) : (
                                <button 
                                  onClick={() => { setGroupPhoto(null); startCamera(); }}
                                  style={{ background: '#3498db', color: 'white', border: 'none', padding: '15px 40px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                  Retake Group Photo
                                </button>
                            )}
                          </div>
                        </div>

                        {/* IDENTIFICATION SIDEBAR */}
                        <div style={{ 
                          width: '350px', 
                          background: 'rgba(0,0,0,0.8)', 
                          backdropFilter: 'blur(20px)', 
                          borderLeft: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          pointerEvents: 'auto',
                          zIndex: 3100
                        }}>
                          <div style={{ padding: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Identification Panel</h3>
                            <p style={{ color: '#888', fontSize: '12px', margin: '5px 0 0 0' }}>Click on students to verify their presence in the class.</p>
                          </div>
                          
                          <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }} className="custom-scrollbar">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                              {filteredBySemester.map(s => {
                                const isDetected = detectedIds.includes(s.id);
                                return (
                                  <div 
                                    key={s.id} 
                                    onClick={() => isScanning && manualIdentify(s)}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '12px', 
                                      background: isDetected ? 'rgba(46,125,50,0.2)' : 'rgba(255,255,255,0.05)', 
                                      padding: '12px', 
                                      borderRadius: '15px', 
                                      cursor: isScanning && !isDetected ? 'pointer' : 'default',
                                      border: isDetected ? '1px solid #2e7d32' : '1px solid rgba(255,255,255,0.05)',
                                      transition: 'all 0.2s',
                                      opacity: isAnalyzing ? 1 : 0.5
                                    }}
                                  >
                                    <div style={{ position: 'relative' }}>
                                      <img 
                                        src={s.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName)}&background=8a2c20&color=fff`} 
                                        style={{ width: '45px', height: '45px', borderRadius: '12px', objectFit: 'cover' }} 
                                        alt="" 
                                      />
                                      {isDetected && (
                                        <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', background: '#2e7d32', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid #000' }}>
                                          ✓
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{s.fullName}</div>
                                      <div style={{ fontSize: '11px', color: '#888' }}>{s.enrollmentNumber}</div>
                                    </div>
                                    {!isDetected && isAnalyzing && (
                                      <div style={{ color: '#8a2c20', fontSize: '10px', fontWeight: 'bold', border: '1px solid #8a2c20', padding: '2px 8px', borderRadius: '10px' }}>
                                        ANALYZING...
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ padding: '20px', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white', fontSize: '13px', marginBottom: '5px' }}>
                              <span>Identified</span>
                              <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{detectedIds.length} / {filteredBySemester.length}</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px' }}>
                                <div style={{ width: `${(detectedIds.length / filteredBySemester.length) * 100}%`, height: '100%', background: '#27ae60', borderRadius: '3px', transition: 'width 0.3s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* RESULTS VIEW OVERLAY */
                      <div style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, right: 0, bottom: 0, 
                        background: 'rgba(0,0,0,0.92)', 
                        backdropFilter: 'blur(15px)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px',
                        color: 'white',
                        zIndex: 3100
                      }}>
                        <div style={{ maxWidth: '1000px', width: '100%', height: '90%', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎯</div>
                            <h2 style={{ fontSize: '2.5rem', margin: '0 0 10px 0', color: '#8a2c20' }}>Attendance Scan Results</h2>
                            <p style={{ color: '#aaa', fontSize: '1.1rem' }}>Identified <strong>{scanResultsData.present.length}</strong> students present out of {filteredBySemester.length} total.</p>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', flex: 1, overflow: 'hidden' }}>
                            {/* Present Column */}
                            <div style={{ background: 'rgba(46,125,50,0.1)', borderRadius: '25px', padding: '30px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(46,125,50,0.3)' }}>
                              <h3 style={{ color: '#4caf50', display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '1.4rem' }}>
                                <span>Present Students</span>
                                <span style={{ background: '#2e7d32', color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '1rem' }}>{scanResultsData.present.length}</span>
                              </h3>
                              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                                {scanResultsData.present.map(s => (
                                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <img src={s.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName)}&background=2e7d32&color=fff`} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{s.fullName}</div>
                                      <div style={{ fontSize: '12px', color: '#888' }}>{s.enrollmentNumber}</div>
                                    </div>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✓</div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Absent Column */}
                            <div style={{ background: 'rgba(211,47,47,0.1)', borderRadius: '25px', padding: '30px', display: 'flex', flexDirection: 'column', border: '1px solid rgba(211,47,47,0.3)' }}>
                              <h3 style={{ color: '#f44336', display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '1.4rem' }}>
                                <span>Absent Students</span>
                                <span style={{ background: '#c62828', color: 'white', padding: '2px 12px', borderRadius: '12px', fontSize: '1rem' }}>{scanResultsData.absent.length}</span>
                              </h3>
                              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="custom-scrollbar">
                                {scanResultsData.absent.map(s => (
                                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '15px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <img src={s.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName)}&background=c62828&color=fff`} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: '15px', fontWeight: 'bold' }}>{s.fullName}</div>
                                      <div style={{ fontSize: '12px', color: '#888' }}>{s.enrollmentNumber}</div>
                                    </div>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#c62828', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✗</div>
                                  </div>
                                ))}
                                {scanResultsData.absent.length === 0 && (
                                  <div style={{ textAlign: 'center', color: '#666', marginTop: '40px', fontStyle: 'italic' }}>
                                    Perfect Attendance! No absences detected.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '40px' }}>
                            <button 
                              onClick={() => {
                                setShowScanResults(false);
                                setScanProgress(0);
                                setGroupPhoto(null);
                                setDetectedIds([]);
                                startCamera();
                              }}
                              style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '15px 40px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem' }}
                            >
                              Discard & Re-scan
                            </button>
                            <button 
                              onClick={async () => {
                                const isSaved = await handleSaveAttendance();
                                if (isSaved) {
                                  setShowScanResults(false);
                                  stopCamera();
                                  setMarkingMode('manual');
                                }
                              }}
                              style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '15px 60px', borderRadius: '15px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 10px 30px rgba(138,44,32,0.4)' }}
                            >
                              Confirm & Save to Database
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <style>{`
                      @keyframes laserScan {
                        0% { top: 5%; opacity: 0.3; }
                        50% { top: 95%; opacity: 1; }
                        100% { top: 5%; opacity: 0.3; }
                      }
                      @keyframes scanLineFull {
                        0% { top: 10%; opacity: 0.8; }
                        50% { top: 90%; opacity: 1; }
                        100% { top: 10%; opacity: 0.8; }
                      }
                      @keyframes slideUp {
                        from { transform: translate(-50%, 20px); opacity: 0; }
                        to { transform: translate(-50%, 0); opacity: 1; }
                      }
                      .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(255,255,255,0.05);
                        border-radius: 10px;
                      }
                      .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.2);
                        border-radius: 10px;
                      }
                    `}</style>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '20px' }}>
                <div style={{ padding: '40px 20px', background: '#0a0f1d', borderRadius: '24px', border: '1px solid rgba(0, 230, 118, 0.2)', textAlign: 'center', color: 'white', maxWidth: '600px', margin: '40px auto', boxShadow: '0 15px 35px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative', width: '100px', height: '100px', background: 'rgba(0, 230, 118, 0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(0, 230, 118, 0.3)', animation: 'pulseGreen 2s infinite' }}>
                    <svg width="60" height="70" viewBox="0 0 24 28" fill="none" stroke="#00e676" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 13.92 2.55 15.7 3.5 17.2M22 12C22 6.48 17.52 2 12 2" />
                      <path d="M5.5 19.5C6.75 21 8.5 22 10.5 22.3M18.5 19.5C19.38 18.5 20 17.2 20.3 15.8" />
                      <path d="M8.5 7.5C10 6.5 12 6.5 13.5 7.5M6.5 11C7 9.5 8.5 8.5 10.5 8.2M15.5 12.5C15 14 13.5 15 11.5 15.3" />
                      <path d="M10 11C10 11.5 10.5 12 11 12C11.5 12 12 11.5 12 11C12 10.5 11.5 10 11 10C10.5 10 10 10.5 10 11" />
                    </svg>
                  </div>
                  <span style={{ background: 'rgba(230, 126, 34, 0.15)', color: '#e67e22', border: '1px solid #e67e22', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Coming Soon</span>
                  <h3 style={{ fontSize: '24px', margin: 0, color: 'white', fontWeight: 'bold' }}>Teacher-Side Biometric Scanning</h3>
                  <p style={{ color: '#8892b0', fontSize: '15px', lineHeight: '1.6', maxWidth: '480px', margin: 0 }}>
                    We are currently implementing real-time WebUSB device interfaces for administrative fingerprint devices. 
                    Please use the <strong>Smart Scanner (Face)</strong> or <strong>Manual Mode</strong> to record attendance for today's session.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (() => {
          const teacherHistory = attendanceRecords
            .filter(r => {
              const matchesSem = historySemesterFilter === 'All' || r.semester === historySemesterFilter;
              const matchesCourse = historyCourseFilter === 'All' || r.course === historyCourseFilter || (!r.course && historyCourseFilter === '');
              const matchesSubject = historySubjectFilter === 'All' || r.subject === historySubjectFilter;
              return matchesSem && matchesCourse && matchesSubject;
            })
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#8a2c20', borderBottom: '1px solid #eee', paddingBottom: '10px', margin: 0 }}>Previous Attendance Records</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    value={historyCourseFilter} 
                    onChange={(e) => { setHistoryCourseFilter(e.target.value); setHistorySubjectFilter(''); }}
                    style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                  >
                    <option value="">Choose Course</option>
                    {[...new Set([...Object.keys(subjectMapping), ...students.map(s => s.course)])].filter(Boolean).sort().map(course => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>

                  <select 
                    value={historySemesterFilter} 
                    onChange={(e) => { setHistorySemesterFilter(e.target.value); setHistorySubjectFilter(''); }}
                    style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                  >
                    <option value="">Choose Semester</option>
                    {getAvailableSemesters().map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>

                  <select 
                    value={historySubjectFilter} 
                    onChange={(e) => setHistorySubjectFilter(e.target.value)}
                    style={{ padding: '8px 15px', borderRadius: '6px', border: '1px solid #ddd', outline: 'none' }}
                  >
                    <option value="">Choose Subject</option>
                    {(() => {
                      const semNum = historySemesterFilter?.match(/\d+/)?.[0];
                      const subjects = (subjectMapping[historyCourseFilter] && semNum) ? subjectMapping[historyCourseFilter][semNum] : null;
                      if (subjects) return subjects.map(s => <option key={s} value={s}>{s}</option>);
                      return <option value={teacher.primarySubject}>{teacher.primarySubject}</option>;
                    })()}
                  </select>
                  {isHistoryReady && teacherHistory.length > 0 && (
                    <button 
                      onClick={() => {
                        const semStudents = students.filter(s => {
                          const semNum = historySemesterFilter.split(' ')[0].replace(/[^0-9]/g, '');
                          return (String(s.semester) === semNum || String(s.semester) === historySemesterFilter) &&
                                 (historyCourseFilter === 'All' || s.course === historyCourseFilter);
                        });
                        api.attendance.generateClassPDF(semStudents, teacherHistory, historySubjectFilter, historySemesterFilter);
                      }}
                      style={{ background: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      📥 Download Report
                    </button>
                  )}
                </div>
              </div>
              
              {!isHistoryReady ? (
                <div style={{ textAlign: 'center', padding: '60px 40px', background: '#fcfcfc', borderRadius: '15px', border: '2px dashed #eee', marginTop: '20px' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.5 }}>📊</div>
                  <h4 style={{ color: '#8a2c20', margin: '0 0 10px 0' }}>History Filtering Required</h4>
                  <p style={{ color: '#666', margin: 0 }}>Please select a <strong>Course</strong>, <strong>Semester</strong> and <strong>Subject</strong> to view previous attendance records.</p>
                </div>
              ) : teacherHistory.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#999', fontStyle: 'italic' }}>
                  {historySemesterFilter === 'All' ? 'No attendance history found yet.' : `No history records found for the selected criteria.`}
                </p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Proof</th>
                      <th style={thStyle}>Semester</th>
                      <th style={thStyle}>Subject</th>
                      <th style={thStyle}>Session</th>
                      <th style={thStyle}>Total Students</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingHistory ? (
                      Array(5).fill(0).map((_, i) => (
                        <tr key={`skel-hist-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '45px', height: '30px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '120px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '80px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '60px' }}></div></td>
                          <td style={tdStyle}><div className="skeleton skeleton-text" style={{ width: '100px' }}></div></td>
                        </tr>
                      ))
                    ) : (
                      teacherHistory.map(record => (
                        <tr key={record.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={tdStyle}>{record.dateDisplay}</td>
                          <td style={tdStyle}>
                            {record.proofPhoto ? (
                              <img 
                                src={record.proofPhoto} 
                                alt="Proof" 
                                style={{ width: '45px', height: '30px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #eee', cursor: 'pointer' }}
                                onClick={() => setSelectedHistory(record)}
                              />
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '11px' }}>N/A</span>
                            )}
                          </td>
                          <td style={tdStyle}>{record.semester}</td>
                          <td style={tdStyle}>{record.subject}</td>
                          <td style={tdStyle}><span style={{ padding: '4px 8px', borderRadius: '4px', background: '#f5f5f5', fontSize: '12px', fontWeight: 'bold' }}>{record.session || 'Lecture 1'}</span></td>
                          <td style={tdStyle}>{Object.keys(record.attendance).length} Students</td>
                          <td style={tdStyle}>
                            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ Saved</span>
                          </td>
                          <td style={tdStyle}>
                           <button 
                              onClick={() => setSelectedHistory(record)}
                              style={{ background: '#3498db', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              View
                            </button>
                            <button 
                              onClick={() => handleDeleteRequest(record)}
                              style={{ background: '#c62828', color: 'white', border: 'none', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </div>

      {/* Attendance History Details Modal */}
      {selectedHistory && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '15px', width: '850px', maxWidth: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 15px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#8a2c20' }}>Attendance Details</h2>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>{selectedHistory.subject} | {selectedHistory.session || 'Lecture 1'} | {selectedHistory.semester} | {selectedHistory.dateDisplay}</p>
              </div>
              <button onClick={() => setSelectedHistory(null)} style={{ background: '#eee', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '5px 10px', borderRadius: '50%' }}>×</button>
            </div>

            {/* Statistics Row */}
            {(() => {
              const studentsInRecord = Object.keys(selectedHistory.attendance);
              const presentCount = studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Present').length;
              const absentCount = studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').length;

              return (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Total Students</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>{studentsInRecord.length}</span>
                    </div>
                    <div style={{ background: '#e8f5e9', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#4caf50', textTransform: 'uppercase' }}>Present</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>{presentCount}</span>
                    </div>
                    <div style={{ background: '#ffebee', padding: '15px', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '12px', color: '#f44336', textTransform: 'uppercase' }}>Absent</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#c62828' }}>{absentCount}</span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    {/* Present List */}
                    <div>
                      <h4 style={{ color: '#2e7d32', borderBottom: '2px solid #e8f5e9', paddingBottom: '8px', marginBottom: '15px' }}>Present Students</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Present').map(id => {
                          const s = students.find(std => (std._id || std.id)?.toString() === id.toString());
                          return s ? (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={s.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || 'Student')}&background=8a2c20&color=fff`} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} alt="S" />
                              <span style={{ fontSize: '14px' }}>{s.fullName}</span>
                              <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{s.enrollmentNumber}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>

                    {/* Absent List */}
                    <div>
                      <h4 style={{ color: '#c62828', borderBottom: '2px solid #ffebee', paddingBottom: '8px', marginBottom: '15px' }}>Absent Students</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').map(id => {
                          const s = students.find(std => (std._id || std.id)?.toString() === id.toString());
                          return s ? (
                            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                              <img src={s.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fullName || 'Student')}&background=8a2c20&color=fff`} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} alt="S" />
                              <span style={{ fontSize: '14px' }}>{s.fullName}</span>
                              <span style={{ fontSize: '12px', color: '#999', marginLeft: 'auto' }}>{s.enrollmentNumber}</span>
                            </div>
                          ) : null;
                        })}
                        {studentsInRecord.filter(id => selectedHistory.attendance[id] === 'Absent').length === 0 && (
                          <p style={{ color: '#999', fontSize: '14px', fontStyle: 'italic' }}>No absences recorded.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedHistory.proofPhoto && (
                    <div style={{ marginTop: '30px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
                      <h4 style={{ color: '#8a2c20', marginBottom: '15px' }}>Session Proof Image</h4>
                      <div style={{ background: '#f8f9fa', padding: '10px', borderRadius: '12px', textAlign: 'center' }}>
                        <img 
                          src={selectedHistory.proofPhoto} 
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} 
                          alt="Attendance Proof" 
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPwdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginBottom: '20px', color: '#8a2c20' }}>Change Your Password</h3>
            
            {pwdUpdateMsg.text && (
              <div style={{ 
                backgroundColor: pwdUpdateMsg.type === 'error' ? '#ffebee' : '#e8f5e9', 
                color: pwdUpdateMsg.type === 'error' ? '#c62828' : '#2e7d32', 
                padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' 
              }}>
                {pwdUpdateMsg.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>New Password</label>
                <input 
                  type="password" 
                  value={newPwd} 
                  onChange={(e) => setNewPwd(e.target.value)} 
                  required 
                  placeholder="Enter new password"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Confirm Password</label>
                <input 
                  type="password" 
                  value={confirmPwd} 
                  onChange={(e) => setConfirmPwd(e.target.value)} 
                  required 
                  placeholder="Confirm new password"
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowPwdModal(false); setPwdUpdateMsg({ text: '', type: '' }); }} 
                  style={{ background: '#eee', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  style={{ background: '#8a2c20', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Secure Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1200 }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⚠️</div>
              <h3 style={{ color: '#c62828', margin: 0 }}>Confirm Security Deletion</h3>
              <p style={{ color: '#666', fontSize: '14px', marginTop: '10px' }}>
                You are about to delete the attendance record for <strong>{recordToDelete?.subject}</strong> ({recordToDelete?.dateDisplay}).
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Enter Password to Confirm</label>
              <input 
                type="password" 
                value={deleteConfirmPwd} 
                onChange={(e) => setDeleteConfirmPwd(e.target.value)} 
                placeholder="Teacher Password"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, background: '#eee', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeletion}
                style={{ flex: 2, background: '#c62828', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Verify & Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: 'white', padding: '40px', borderRadius: '15px', width: '450px', boxShadow: '0 15px 40px rgba(0,0,0,0.3)', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>📄</div>
            <h3 style={{ color: '#8a2c20', marginBottom: '10px' }}>Export Student List PDF</h3>
            <p style={{ color: '#666', marginBottom: '25px', fontSize: '15px' }}>
              Would you like to include sensitive login credentials (<strong>Username & Password</strong>) in the exported student list?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button 
                onClick={() => generatePDF(true)} 
                style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Yes, Include Credentials
              </button>
              <button 
                onClick={() => generatePDF(false)} 
                style={{ background: '#3498db', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                No, Basic Info Only
              </button>
            </div>
            <button 
              onClick={() => setShowPdfModal(false)} 
              style={{ marginTop: '20px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>
              Cancel Export
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '15px', textAlign: 'left', borderBottom: '2px solid #eee' };
const tdStyle = { padding: '15px', borderBottom: '1px solid #eee', fontSize: '14px' };

export default TeacherProfile;
