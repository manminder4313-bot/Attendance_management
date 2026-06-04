export const registerDeviceBiometrics = async (student) => {
  if (!navigator.credentials || !navigator.credentials.create) {
    throw new Error("Device biometrics (WebAuthn) is not supported in this browser/device.");
  }
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const userIdStr = student._id || student.id || "student-id";
  const userId = new Uint8Array(userIdStr.split('').map(c => c.charCodeAt(0)));
  
  const publicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "MRSPTU Attendance System",
      id: window.location.hostname
    },
    user: {
      id: userId,
      name: student.username || student.email || "student",
      displayName: student.fullName || student.name || "Student"
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" }, // ES256
      { alg: -257, type: "public-key" } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform", // forces local biometric sensors (fingerprint scanner)
      userVerification: "required"
    },
    timeout: 60000
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions
  });

  // Return base64 encoded credential ID to store in MongoDB
  return btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
};

export const verifyDeviceBiometrics = async (storedCredentialId) => {
  if (!navigator.credentials || !navigator.credentials.get) {
    throw new Error("Device biometrics (WebAuthn) is not supported in this browser.");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const rawIdBytes = Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0));

  const publicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [{
      id: rawIdBytes,
      type: 'public-key'
    }],
    userVerification: "required",
    timeout: 60000
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions
  });

  return assertion !== null;
};

export const detectUsbBiometricDevice = async () => {
  if (!navigator.usb) {
    throw new Error("WebUSB API is not supported in this browser.");
  }
  
  // Common vendor classes or blank filters to let user pick any device
  const device = await navigator.usb.requestDevice({ 
    filters: [] 
  });
  return device;
};
