import { fetchApi } from './base_api';

export const departmentService = {
  getAll: () => fetchApi('/departments'),
  create: (data) => fetchApi('/departments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  getCourses: (deptName) => {
    if (!deptName) return [];
    const name = deptName.toLowerCase();
    
    // Inclusive matching for Computer-related departments
    if (name.includes('computational sciences') || name.includes('computer science') || name.includes('computer applications')) {
      return ['B.Tech CSE', 'B.Tech AI&DS', 'BCA', 'MCA', 'BCA-MCA Integrated', 'BA in Computational Sciences', 'BSE. Graphic'];
    }
    
    if (name.includes('mechanical')) return ['B.Tech Mechanical'];
    if (name.includes('civil')) return ['B.Tech Civil'];
    if (name.includes('electrical')) return ['B.Tech Electrical'];
    if (name.includes('electronics') || name.includes('ece')) return ['B.Tech ECE'];
    if (name.includes('agricultural')) return ['B.Tech Agricultural'];
    if (name.includes('chemical')) return ['B.Tech Chemical'];
    if (name.includes('food')) return ['B.Tech Food Tech'];
    if (name.includes('textile')) return ['B.Tech Textile'];
    if (name.includes('architecture')) return ['B.Arch'];
    if (name.includes('pharmacy')) return ['B.Pharmacy', 'M.Pharmacy'];
    if (name.includes('management') || name.includes('studies')) return ['MBA', 'BBA'];
    if (name.includes('applied science')) return ['B.Sc', 'M.Sc'];
    
    return ['General Course'];
  },
  getSubjects: (deptName) => {
    if (!deptName) return [];
    const name = deptName.toLowerCase();
    
    if (name.includes('computational sciences') || name.includes('computer science') || name.includes('computer applications')) {
      // Return combined subjects for computer fields to cover both cases flexibly
      return [
        'Data Structures', 'Operating Systems', 'Computer Networks', 'Machine Learning', 
        'Artificial Intelligence', 'Cyber Security', 'Programming in C', 'Java Programming', 
        'Database Management Systems', 'Web Development', 'Software Engineering', 'Mobile App Development'
      ];
    }
    if (name.includes('mechanical')) {
      return ['Thermodynamics', 'Fluid Mechanics', 'Theory of Machines', 'Manufacturing Technology', 'Automobile Engineering', 'Robotics'];
    }
    if (name.includes('civil')) {
      return ['Structural Analysis', 'Geotechnical Engineering', 'Surveying', 'Transportation Engineering', 'Hydraulic Engineering', 'Environmental Engineering'];
    }
    if (name.includes('electrical')) {
      return ['Circuit Theory', 'Power Systems', 'Control Systems', 'Electrical Machines', 'Power Electronics', 'Renewable Energy Systems'];
    }
    if (name.includes('electronics') || name.includes('ece')) {
      return ['Analog Electronics', 'Digital Signal Processing', 'Microprocessors', 'Embedded Systems', 'VLSI Design', 'Communication Theory'];
    }
    if (name.includes('agricultural')) {
      return ['Farm Machinery', 'Soil and Water Conservation', 'Irrigation Engineering', 'Agricultural Processing', 'Post Harvest Technology', 'Renewable Energy in Agriculture'];
    }
    if (name.includes('chemical')) {
      return ['Chemical Reaction Engineering', 'Mass Transfer', 'Heat Transfer', 'Process Control', 'Plant Design', 'Polymer Science'];
    }
    if (name.includes('food')) {
      return ['Food Microbiology', 'Food Chemistry', 'Food Preservation', 'Food Packaging', 'Quality Control', 'Beverage Technology'];
    }
    if (name.includes('textile')) {
      return ['Yarn Manufacture', 'Fabric Manufacture', 'Textile Testing', 'Textile Chemical Processing', 'Apparel Technology', 'Fibre Science'];
    }
    if (name.includes('architecture')) {
      return ['Architectural Design', 'Building Construction', 'History of Architecture', 'Town Planning', 'Urban Design', 'Landscape Architecture'];
    }
    if (name.includes('pharmacy')) {
      return ['Pharmaceutics', 'Pharmacology', 'Pharmaceutical Chemistry', 'Pharmacognosy', 'Hospital Pharmacy', 'Clinical Pharmacy'];
    }
    if (name.includes('management') || name.includes('studies')) {
      return ['Financial Management', 'Marketing Management', 'Human Resource Management', 'Business Analytics', 'Entrepreneurship', 'Strategic Management'];
    }
    if (name.includes('applied science')) {
      return ['Engineering Physics', 'Engineering Chemistry', 'Engineering Mathematics', 'Numerical Methods', 'Optics', 'Materials Science'];
    }
    
    return ['General Subject'];
  }
};

export default departmentService;
