import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header';
import SpecsTable from './components/SpecsTable';
import Visualizer from './components/Visualizer';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import { CUFF_OPTIONS } from './data';
import { BellowsPart } from './types';
import { db } from './api/database';

declare global {
  interface Window {
    jspdf: any;
    XLSX: any;
  }
}

/** 
 * EMAIL SERVICE CONFIGURATION
 * To activate this, replace the placeholder URL with your Formspree, Zapier, or BSI Backend URL.
 * Target Recipient: webmaster@bellows-systems.com
 */
const EMAIL_SERVICE_ENDPOINT = 'https://formspree.io/f/placeholder-id'; 

const APPLICATION_OPTIONS = [
  "Oil & Gas",
  "Power Generation",
  "Aerospace, Space and Defense",
  "Marine Bellows and Expansion Joints",
  "Industrial and OEM",
  "Water and Wastewater",
  "Automotive",
  "Pulp and Paper",
  "Other"
];

const IN_TO_MM = 25.4;
const PSIG_TO_BAR = 0.0689476;
const LBF_IN_TO_NMM = 0.175127;
const LBF_IN_TO_KGMM = 0.017858;
const LBF_IN_TO_KGCM = 1.7858;
const FTLBS_TO_NM = 1.35582;

const parseValue = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

const convertFtoC = (f: string) => {
  const val = parseValue(f);
  return Math.round((val - 32) * 5 / 9).toString();
};

const convertCtoF = (c: string) => {
  const val = parseValue(c);
  return Math.round((val * 9 / 5) + 32).toString();
};

function App() {
  const [bellowsList, setBellowsList] = useState<BellowsPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [selectedPartNumber, setSelectedPartNumber] = useState<string>('');
  const [diameterInput, setDiameterInput] = useState<string>('');
  const [oalInput, setOalInput] = useState<string>('');

  const [diameterUnit, setDiameterUnit] = useState<string>('IN');
  const [oalUnit, setOalUnit] = useState<string>('IN');

  const [pressure, setPressure] = useState('');
  const [pressureUnit, setPressureUnit] = useState('PSIG');
  const [temperature, setTemperature] = useState('');
  const [tempUnit, setTempUnit] = useState('°F');
  const [cyclesValue, setCyclesValue] = useState('');
  const [cycleType, setCycleType] = useState('Non-concurrent');
  const [materialSpec, setMaterialSpec] = useState('');
  const [materialGrade, setMaterialGrade] = useState('');
  const [numberOfPlys, setNumberOfPlys] = useState('');
  const [application, setApplication] = useState('');
  const [customApplication, setCustomApplication] = useState('');

  const [axialEnabled, setAxialEnabled] = useState(false);
  const [lateralEnabled, setLateralEnabled] = useState(false);
  const [angularEnabled, setAngularEnabled] = useState(false);

  const [axialDistUnit, setAxialDistUnit] = useState<'in' | 'mm'>('in');
  const [axialSpringUnit, setAxialSpringUnit] = useState<'LBF/IN' | 'N/mm' | 'kg/mm' | 'kg/cm'>('LBF/IN');
  const [lateralDistUnit, setLateralDistUnit] = useState<'in' | 'mm'>('in');
  const [lateralSpringUnit, setLateralSpringUnit] = useState<'LBF/IN' | 'N/mm' | 'kg/mm' | 'kg/cm'>('LBF/IN');
  const [angularSpringUnit, setAngularSpringUnit] = useState<'FT. LBS/DEG' | 'n-m/deg'>('FT. LBS/DEG');

  const [baseAxialMove, setBaseAxialMove] = useState<string>('0');
  const [baseAxialSpring, setBaseAxialSpring] = useState<string>('0');
  const [baseLateralMove, setBaseLateralMove] = useState<string>('0');
  const [baseLateralSpring, setBaseLateralSpring] = useState<string>('0');
  const [baseAngularMove, setBaseAngularMove] = useState<string>('0');
  const [baseAngularSpring, setBaseAngularSpring] = useState<string>('0');

  const [cuffType, setCuffType] = useState<string>(CUFF_OPTIONS[0]);

  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      try {
        const session = await db.auth.getSession();
        if (session) setIsAdmin(true);
        await refreshData();
      } catch (e) {
        console.error("Initialization Error", e);
      } finally {
        setLoading(false);
      }
    };
    initApp();
  }, []);

  const refreshData = async () => {
    const data = await db.getAll();
    setBellowsList(data);
  };

  const getDisplayLength = (val: number, unit: string) => {
    if (unit === 'MM' || unit === 'DM') return (val * 25.4).toFixed(2);
    if (unit === 'FT') return (val / 12).toFixed(3);
    return val.toString();
  };

  const selectedPart = useMemo(() => {
    return bellowsList.find(p => p.part_number === selectedPartNumber) || null;
  }, [selectedPartNumber, bellowsList]);

  const catalogDiameters = useMemo(() => {
    const sizes = bellowsList.map(p => p.pipe_size);
    return Array.from(new Set(sizes)).sort((a: number, b: number) => a - b);
  }, [bellowsList]);

  const availableOALs = useMemo(() => {
    if (!diameterInput) return [];
    const filtered = bellowsList.filter(p => getDisplayLength(p.pipe_size, diameterUnit) === diameterInput);
    const lengths = filtered.map(p => p.overall_length_oal_in);
    return Array.from(new Set(lengths)).sort((a: number, b: number) => a - b);
  }, [bellowsList, diameterInput, diameterUnit]);

  const availablePartNumbers = useMemo(() => {
    return bellowsList.filter(p => {
      const diaMatch = !diameterInput || getDisplayLength(p.pipe_size, diameterUnit) === diameterInput;
      const oalMatch = !oalInput || getDisplayLength(p.overall_length_oal_in, oalUnit) === oalInput;
      return diaMatch && oalMatch;
    });
  }, [bellowsList, diameterInput, diameterUnit, oalInput, oalUnit]);

  useEffect(() => {
    if (selectedPart) {
      setPressure(String(selectedPart.pressure_psig));
      setPressureUnit('PSIG');
      setCyclesValue(String(selectedPart.number_of_cycles));
      setCycleType(selectedPart.cycles_format);
      setMaterialSpec(selectedPart.bellows_material);
      setMaterialGrade(selectedPart.bellows_material_grade);
      setNumberOfPlys(selectedPart.number_of_plys);
      
      setBaseAxialMove(String(selectedPart.axial_movement_in));
      setBaseAxialSpring(String(selectedPart.axial_spring_rate_lbf_in));
      setBaseLateralMove(String(selectedPart.lateral_movement_in));
      setBaseLateralSpring(String(selectedPart.lateral_spring_rate_lbf_in));
      setBaseAngularMove(String(selectedPart.angular_movement_deg));
      setBaseAngularSpring(String(selectedPart.angular_spring_rate_ft_lbs_deg));

      if (tempUnit === '°F') {
        setTemperature(selectedPart.temperature_f);
      } else {
        setTemperature(convertFtoC(selectedPart.temperature_f));
      }
    }
  }, [selectedPart, tempUnit]);

  const getDisplayAxialMove = () => (parseValue(baseAxialMove) * (axialDistUnit === 'mm' ? IN_TO_MM : 1)).toFixed(3);
  const getDisplayAxialSpring = () => {
    const val = parseValue(baseAxialSpring);
    if (axialSpringUnit === 'N/mm') return (val * LBF_IN_TO_NMM).toFixed(3);
    if (axialSpringUnit === 'kg/mm') return (val * LBF_IN_TO_KGMM).toFixed(3);
    if (axialSpringUnit === 'kg/cm') return (val * LBF_IN_TO_KGCM).toFixed(3);
    return val.toString();
  };

  const getDisplayLateralMove = () => (parseValue(baseLateralMove) * (lateralDistUnit === 'mm' ? IN_TO_MM : 1)).toFixed(3);
  const getDisplayLateralSpring = () => {
    const val = parseValue(baseLateralSpring);
    if (lateralSpringUnit === 'N/mm') return (val * LBF_IN_TO_NMM).toFixed(3);
    if (lateralSpringUnit === 'kg/mm') return (val * LBF_IN_TO_KGMM).toFixed(3);
    if (lateralSpringUnit === 'kg/cm') return (val * LBF_IN_TO_KGCM).toFixed(3);
    return val.toString();
  };

  const getDisplayAngularSpring = () => {
    const val = parseValue(baseAngularSpring);
    if (angularSpringUnit === 'n-m/deg') return (val * FTLBS_TO_NM).toFixed(3);
    return val.toString();
  };

  const resetConfigurator = () => {
    setPressure('');
    setPressureUnit('PSIG');
    setTemperature('');
    setCyclesValue('');
    setCycleType('Non-concurrent');
    setMaterialSpec('');
    setMaterialGrade('');
    setNumberOfPlys('');
    setAxialEnabled(false);
    setLateralEnabled(false);
    setAngularEnabled(false);
    setApplication('');
    setCustomApplication('');
    setCuffType(CUFF_OPTIONS[0]);
    setTempUnit('°F');
  };

  const handleDiameterChange = (val: string) => {
    setDiameterInput(val);
    setSelectedPartNumber('');
    resetConfigurator();
  };

  const handleOALChange = (val: string) => {
    setOalInput(val);
    setSelectedPartNumber('');
    resetConfigurator();
  };

  const handlePartNumberChange = (partNum: string) => {
    if (!partNum) {
      setSelectedPartNumber('');
      resetConfigurator();
      return;
    }
    setSelectedPartNumber(partNum);
    const part = bellowsList.find(p => p.part_number === partNum);
    if (part) {
      setDiameterInput(getDisplayLength(part.pipe_size, diameterUnit));
      setOalInput(getDisplayLength(part.overall_length_oal_in, oalUnit));
    }
  };

  const handlePressureUnitChange = (newUnit: string) => {
    if (pressure && pressureUnit !== newUnit) {
      const prefixMatch = pressure.match(/^[^\d.]+/);
      const prefix = prefixMatch ? prefixMatch[0].trim() + " " : '';
      const currentVal = parseValue(pressure);
      
      if (currentVal !== 0) {
        let newVal;
        if (newUnit === 'BAR') {
          newVal = (currentVal * PSIG_TO_BAR).toFixed(2);
        } else {
          newVal = (currentVal / PSIG_TO_BAR).toFixed(2);
        }
        setPressure(`${prefix}${newVal}`);
      }
    }
    setPressureUnit(newUnit);
  };

  const handleTempUnitChange = (newUnit: string) => {
    if (temperature && tempUnit !== newUnit) {
      if (newUnit === '°C') {
        setTemperature(convertFtoC(temperature));
      } else {
        setTemperature(convertCtoF(temperature));
      }
    }
    setTempUnit(newUnit);
  };

  const handleLogout = async () => {
    await db.auth.signOut();
    setIsAdmin(false);
    setShowDashboard(false);
  };

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = url;
    });
  };

  /**
   * AUTOMATED INQUIRY SUBMISSION
   * This sends the lead details to the webmaster@bellows-systems.com email via the specified service endpoint.
   */
  const submitInquiryToEmail = async () => {
    if (!contactName || !email) {
      alert("Please provide at least a name and email to proceed with the inquiry.");
      return false;
    }

    setIsSubmitting(true);
    
    // Detailed Payload for Email Summary
    const payload = {
      _subject: `New Configurator Inquiry: ${selectedPart?.part_number || "Custom"} from ${contactName}`,
      _replyto: email,
      recipient: "webmaster@bellows-systems.com",
      Lead_Source: "BSI Online Configurator",
      Timestamp: new Date().toLocaleString(),
      
      // Customer Info
      Customer_Name: contactName,
      Company: companyName,
      Email: email,
      Phone: phone,
      Location: `${address}, ${city}, ${postalCode}, ${country}`,
      
      // Technical Specification
      Part_Number: selectedPart?.part_number || "Custom Configuration",
      Nominal_Diameter: `${diameterInput} ${diameterUnit}`,
      Overall_Length: `${oalInput} ${oalUnit}`,
      End_Configuration: cuffType,
      Application: application === 'Other' ? customApplication : application,
      Design_Pressure: `${pressure} ${pressureUnit}`,
      Design_Temperature: `${temperature} ${tempUnit}`,
      Required_Cycles: `${cyclesValue} (${cycleType})`,
      Material_Spec: `${materialSpec} ${materialGrade}`,
      
      // Movements
      Axial_Movement: axialEnabled ? `${getDisplayAxialMove()} ${axialDistUnit} (Rate: ${getDisplayAxialSpring()} ${axialSpringUnit})` : "None",
      Lateral_Movement: lateralEnabled ? `${getDisplayLateralMove()} ${lateralDistUnit} (Rate: ${getDisplayLateralSpring()} ${lateralSpringUnit})` : "None",
      Angular_Movement: angularEnabled ? `${baseAngularMove} Deg (Rate: ${getDisplayAngularSpring()} ${angularSpringUnit})` : "None"
    };

    try {
      // Triggering the email notification service
      await fetch(EMAIL_SERVICE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });

      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 6000);
      return true;
    } catch (e) {
      console.error("Inquiry Submission Error:", e);
      // Fallback: Notify user but allow PDF download anyway
      alert("Communication error: Could not sync with our mail server, but we will still generate your PDF.");
      return true; 
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedPart) return;
    
    // Step 1: Auto-send the email inquiry
    const submitted = await submitInquiryToEmail();
    if (!submitted) return;

    // Step 2: Proceed with PDF Generation
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const primaryColor = [200, 10, 55]; // BSI Red
    const darkGray = [65, 64, 66];
    
    try {
      const logoImg = await loadImage("https://www.bellows-systems.com/wp-content/uploads/2024/05/BSI-black-Logo.webp");
      doc.addImage(logoImg, 'WEBP', 15, 10, 45, 10);
    } catch (e) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(40, 40, 40);
      doc.text('Bellows Systems', 15, 18);
    }

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION REQUEST SUMMARY', 195, 18, { align: 'right' });
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 25, 195, 25);

    let y = 35;

    const drawSectionBox = (yStart: number, height: number, title: string) => {
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(15, yStart, 180, height);
      doc.setFillColor(250, 250, 250);
      doc.rect(15.1, yStart + 0.1, 179.8, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(title, 20, yStart + 6);
    };

    drawSectionBox(y, 38, 'CUSTOMER CONTACT DETAILS');
    y += 15;
    doc.setFontSize(9);
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    
    const customerInfo = [
      { l: 'Contact Name:', v: contactName || 'N/A', x: 20, vx: 55 },
      { l: 'Company:', v: companyName || 'N/A', x: 105, vx: 135 },
      { l: 'Email Address:', v: email || 'N/A', x: 20, vx: 55 },
      { l: 'Phone Number:', v: phone || 'N/A', x: 105, vx: 135 },
      { l: 'Address:', v: `${address || ''}, ${city || ''} ${postalCode || ''}, ${country || ''}`.trim().replace(/^,/, '') || 'N/A', x: 20, vx: 55 }
    ];

    customerInfo.forEach((item, idx) => {
      const rowY = y + (Math.floor(idx / 2) * 8);
      if (idx === 4) {
         doc.setFont('helvetica', 'bold');
         doc.text(item.l, item.x, y + 16);
         doc.setFont('helvetica', 'normal');
         doc.text(item.v, item.vx, y + 16);
      } else {
         doc.setFont('helvetica', 'bold');
         doc.text(item.l, item.x, rowY);
         doc.setFont('helvetica', 'normal');
         doc.text(item.v, item.vx, rowY);
      }
    });

    y += 35;

    drawSectionBox(y, 65, 'BELLOWS CONFIGURATION');
    const configY = y;
    y += 15;
    
    const configData = [
      ['Part Number:', selectedPart.part_number],
      ['Nominal Diameter:', `${diameterInput} ${diameterUnit}`],
      ['Overall Length:', `${oalInput} ${oalUnit}`],
      ['End Configuration:', cuffType],
      ['Application Type:', (application === 'Other' ? customApplication : application) || 'Standard Industrial'],
      ['No. of Plys:', numberOfPlys || 'N/A']
    ];

    configData.forEach((row, idx) => {
      doc.setFont('helvetica', 'bold');
      doc.text(row[0], 20, y + (idx * 8));
      doc.setFont('helvetica', 'normal');
      doc.text(row[1], 55, y + (idx * 8));
    });

    if (selectedPart.image_url) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.rect(125, configY + 12, 60, 45, 'F');
        doc.setDrawColor(240, 240, 240);
        doc.rect(125, configY + 12, 60, 45, 'S');
        const prodImg = await loadImage(selectedPart.image_url);
        doc.addImage(prodImg, 'PNG', 127.5, configY + 14.5, 55, 40);
      } catch (e) {
        console.error("Could not embed image", e);
      }
    }

    y += 60;

    drawSectionBox(y, 60, 'ENGINEERING DESIGN SPECIFICATIONS');
    y += 15;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(9);

    const techSpecs = [
      { l: 'Design Pressure:', v: `${pressure} ${pressureUnit}`, x: 20, vx: 55 },
      { l: 'Axial Movement:', v: axialEnabled ? `${getDisplayAxialMove()} ${axialDistUnit}` : 'N/A', x: 105, vx: 150 },
      { l: 'Design Temp:', v: `${temperature} ${tempUnit}`, x: 20, vx: 55 },
      { l: 'Axial Spring Rate:', v: axialEnabled ? `${getDisplayAxialSpring()} ${axialSpringUnit}` : 'N/A', x: 105, vx: 150 },
      { l: 'Cycle Life:', v: `${cyclesValue} (${cycleType})`, x: 20, vx: 55 },
      { l: 'Lateral Movement:', v: lateralEnabled ? `${getDisplayLateralMove()} ${lateralDistUnit}` : 'N/A', x: 105, vx: 150 },
      { l: 'Bellows Material:', v: `${materialSpec} ${materialGrade}`, x: 20, vx: 55 },
      { l: 'Lateral Spring Rate:', v: lateralEnabled ? `${getDisplayLateralSpring()} ${lateralSpringUnit}` : 'N/A', x: 105, vx: 150 },
    ];

    techSpecs.forEach((item, idx) => {
      const rowY = y + (Math.floor(idx / 2) * 8);
      doc.setFont('helvetica', 'bold');
      doc.text(item.l, item.x, rowY);
      doc.setFont('helvetica', 'normal');
      doc.text(item.v, item.vx, rowY);
    });

    if (angularEnabled) {
       doc.setFont('helvetica', 'bold');
       doc.text('Angular Movement:', 105, y + 32);
       doc.setFont('helvetica', 'normal');
       doc.text(`${baseAngularMove} Deg`, 150, y + 32);
       
       doc.setFont('helvetica', 'bold');
       doc.text('Angular Spring Rate:', 105, y + 40);
       doc.setFont('helvetica', 'normal');
       doc.text(`${getDisplayAngularSpring()} ${angularSpringUnit}`, 150, y + 40);
    }

    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(15, 275, 195, 275);
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text('© 2024 Bellows Systems, Inc. | Professional Configuration Summary', 105, 282, { align: 'center' });
    doc.text('All designs and data are subject to final engineering verification by BSI.', 105, 286, { align: 'center' });

    doc.save(`BSI_Quotation_${selectedPartNumber}.pdf`);
  };

  const labelStyle = "block text-sm font-semibold text-[#414042] mb-1.5";
  const subLabelStyle = "text-[10px] text-gray-400 block mb-1 uppercase tracking-tight font-bold";
  const inputStyle = "block w-full px-3 py-2.5 text-sm border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#C80A37] focus:border-[#C80A37] rounded border bg-white text-[#414042] transition-shadow";
  const editableInputStyle = "block w-full px-3 py-2.5 text-sm border-[#C80A37]/20 focus:outline-none focus:ring-1 focus:ring-[#C80A37] focus:border-[#C80A37] rounded border bg-white text-[#414042] font-semibold transition-all";
  const selectAddonStyle = "bg-gray-50 border border-gray-300 border-l-0 px-2 py-2.5 text-xs font-semibold text-gray-500 rounded-r focus:outline-none focus:border-[#C80A37]";

  if (showDashboard && isAdmin) {
    return (
      <AdminDashboard 
        onClose={() => setShowDashboard(false)} 
        onDataChange={refreshData} 
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Poppins'] text-[#414042]">
      <Header 
        isAdmin={isAdmin} 
        onLoginClick={() => setShowLogin(true)} 
        onLogout={handleLogout}
        onDashboardClick={() => setShowDashboard(true)}
      />
      
      {isAdmin && (
        <div className="bg-gray-800 text-white px-8 py-2 hidden md:flex justify-between items-center text-xs sticky top-20 md:top-24 z-40 shadow-xl">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Cloud Database Active
            </span>
          </div>
          <div className="flex gap-4">
            <span className="text-gray-400 font-medium uppercase">Admin Mode</span>
          </div>
        </div>
      )}

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {loading && (
          <div className="fixed inset-0 z-[200] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-[#C80A37] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Synchronizing Catalog...</span>
          </div>
        )}

        {submitSuccess && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[210] bg-green-600 text-white px-8 py-4 rounded-xl shadow-2xl font-black uppercase tracking-widest text-xs animate-in slide-in-from-top-4 flex items-center gap-3">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
             Inquiry Transmitted to Bellows Systems Team
          </div>
        )}

        <div className="mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-4xl font-black text-[#414042] leading-tight">Bellows Configurator</h2>
            <p className="mt-3 text-base md:text-lg text-gray-500 max-w-3xl">Professional engineering tool for configuring metal bellows from our comprehensive database.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">1</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Part Selection</h3>
              </div>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelStyle}>Nominal Diameter</label>
                    <div className="flex relative">
                      <input type="text" list="diameters" value={diameterInput} onChange={(e) => handleDiameterChange(e.target.value)} placeholder="Type size..." className={`${inputStyle} rounded-r-none border-r-0`} />
                      <datalist id="diameters">{catalogDiameters.map((size) => (<option key={size} value={getDisplayLength(size, diameterUnit)} />))}</datalist>
                      <select value={diameterUnit} onChange={(e) => setDiameterUnit(e.target.value)} className={selectAddonStyle}>
                        <option value="DM">DM</option><option value="NB">NB</option><option value="IN">IN</option><option value="MM">MM</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelStyle}>Overall Length</label>
                    <div className="flex relative">
                      <input type="text" list="lengths" value={oalInput} onChange={(e) => handleOALChange(e.target.value)} placeholder="Type length..." className={`${inputStyle} rounded-r-none border-r-0`} />
                      <datalist id="lengths">{availableOALs.map((len) => (<option key={len} value={getDisplayLength(len, oalUnit)} />))}</datalist>
                      <select value={oalUnit} onChange={(e) => setOalUnit(e.target.value)} className={selectAddonStyle}>
                        <option value="IN">IN</option><option value="MM">MM</option><option value="FT">FT</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label htmlFor="partNumber" className="text-sm font-semibold text-[#414042]">Part Number</label>
                    <span className="text-[11px] font-semibold text-[#C80A37] bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                      {availablePartNumbers.length} available
                    </span>
                  </div>
                  <select id="partNumber" value={selectedPartNumber} onChange={(e) => handlePartNumberChange(e.target.value)} className={inputStyle}>
                    <option value="">-- Select Part Number --</option>
                    {availablePartNumbers.map((part) => (<option key={part.part_number} value={part.part_number}>{part.part_number}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelStyle}>No of Plys</label>
                  <input type="text" readOnly value={numberOfPlys} className={`${inputStyle} bg-gray-50 cursor-not-allowed font-medium text-gray-500`} placeholder="N/A" />
                </div>
                <div>
                  <label htmlFor="cuffType" className={labelStyle}>End Configuration</label>
                  <select id="cuffType" value={cuffType} onChange={(e) => setCuffType(e.target.value)} className={inputStyle}>{CUFF_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">2</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Design Specification</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">PRESSURE</h4>
                  <div className="flex">
                    <input type="text" value={pressure} onChange={(e) => setPressure(e.target.value)} className={`${inputStyle} rounded-r-none border-r-0`} placeholder="Enter Pressure" />
                    <select value={pressureUnit} onChange={(e) => handlePressureUnitChange(e.target.value)} className={selectAddonStyle}><option value="PSIG">PSIG</option><option value="BAR">BAR</option></select>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Temperature</h4>
                  <div className="flex gap-2">
                    <input type="text" value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputStyle} placeholder="TEMPERATURE" />
                    <select value={tempUnit} onChange={(e) => handleTempUnitChange(e.target.value)} className={`${inputStyle} w-32`}><option value="°F">°F</option><option value="°C">°C</option></select>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Number of Cycles</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={subLabelStyle}>Cycles</label>
                      <input type="text" value={cyclesValue} onChange={(e) => setCyclesValue(e.target.value)} className={inputStyle} placeholder="0" />
                    </div>
                    <div>
                      <label className={subLabelStyle}>Format</label>
                      <select value={cycleType} onChange={(e) => setCycleType(e.target.value)} className={inputStyle}><option value="Non-concurrent">Non-concurrent</option><option value="Concurrent">Concurrent</option></select>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#414042] mb-3 uppercase tracking-wide border-b border-gray-100 pb-1">Bellows SPEC</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={subLabelStyle}>SPEC</label><input type="text" value={materialSpec} onChange={(e) => setMaterialSpec(e.target.value)} className={inputStyle} placeholder="Spec" /></div>
                    <div><label className={subLabelStyle}>GRADE</label><input type="text" value={materialGrade} onChange={(e) => setMaterialGrade(e.target.value)} className={inputStyle} placeholder="Grade" /></div>
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-[#414042] mb-4 uppercase tracking-wide">Movement</h4>
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={axialEnabled} onChange={(e) => setAxialEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Axial Movement</span>
                    </label>
                    {axialEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div>
                          <label className={subLabelStyle}>Axial Value</label>
                          <div className="flex">
                            <input type="text" value={baseAxialMove} onChange={(e) => setBaseAxialMove(e.target.value)} className={`${editableInputStyle} rounded-r-none border-r-0`} />
                            <select value={axialDistUnit} onChange={(e) => setAxialDistUnit(e.target.value as any)} className={selectAddonStyle}><option value="in">in</option><option value="mm">mm</option></select>
                          </div>
                        </div>
                        <div>
                          <label className={subLabelStyle}>Spring Rate</label>
                          <div className="flex">
                            <input type="text" value={baseAxialSpring} onChange={(e) => setBaseAxialSpring(e.target.value)} className={`${editableInputStyle} rounded-r-none border-r-0`} />
                            <select value={axialSpringUnit} onChange={(e) => setAxialSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="LBF/IN">LBF/IN</option><option value="N/mm">N/mm</option><option value="kg/mm">kg/mm</option><option value="kg/cm">kg/cm</option></select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3 mb-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={lateralEnabled} onChange={(e) => setLateralEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Lateral Movement</span>
                    </label>
                    {lateralEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div>
                          <label className={subLabelStyle}>Lateral Value</label>
                          <div className="flex">
                            <input type="text" value={baseLateralMove} onChange={(e) => setBaseLateralMove(e.target.value)} className={`${editableInputStyle} rounded-r-none border-r-0`} />
                            <select value={lateralDistUnit} onChange={(e) => setLateralDistUnit(e.target.value as any)} className={selectAddonStyle}><option value="in">in</option><option value="mm">mm</option></select>
                          </div>
                        </div>
                        <div>
                          <label className={subLabelStyle}>Spring Rate</label>
                          <div className="flex">
                            <input type="text" value={baseLateralSpring} onChange={(e) => setBaseLateralSpring(e.target.value)} className={`${editableInputStyle} rounded-r-none border-r-0`} />
                            <select value={lateralSpringUnit} onChange={(e) => setLateralSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="LBF/IN">LBF/IN</option><option value="N/mm">N/mm</option><option value="kg/mm">kg/mm</option><option value="kg/cm">kg/cm</option></select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="custom-checkbox" checked={angularEnabled} onChange={(e) => setAngularEnabled(e.target.checked)} />
                      <span className="text-sm font-semibold text-[#414042] group-hover:text-[#C80A37] transition-colors">Angular Movement</span>
                    </label>
                    {angularEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-8">
                        <div>
                          <label className={subLabelStyle}>Angular (deg)</label>
                          <input type="text" value={baseAngularMove} onChange={(e) => setBaseAngularMove(e.target.value)} className={editableInputStyle} />
                        </div>
                        <div>
                          <label className={subLabelStyle}>Spring Rate</label>
                          <div className="flex">
                            <input type="text" value={baseAngularSpring} onChange={(e) => setBaseAngularSpring(e.target.value)} className={`${editableInputStyle} rounded-r-none border-r-0`} />
                            <select value={angularSpringUnit} onChange={(e) => setAngularSpringUnit(e.target.value as any)} className={selectAddonStyle}><option value="FT. LBS/DEG">FT. LBS/DEG</option><option value="n-m/deg">n-m/deg</option></select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">3</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Application</h3>
              </div>
              <div className="space-y-4">
                 <select value={application} onChange={(e) => setApplication(e.target.value)} className={inputStyle}>
                    <option value="">-- Select Application --</option>
                    {APPLICATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                 </select>
                 {application === 'Other' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className={subLabelStyle}>Specify Application</label>
                      <input type="text" value={customApplication} onChange={(e) => setCustomApplication(e.target.value)} className={inputStyle} placeholder="Please specify..." />
                    </div>
                 )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center mb-6">
                  <div className="w-8 h-8 rounded-full bg-[#C80A37] text-white flex items-center justify-center font-bold mr-3 text-sm">4</div>
                  <h3 className="text-lg font-semibold text-[#414042]">Contact Information</h3>
              </div>
              <div className="space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Full Name</label>
                     <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputStyle} placeholder="e.g. John Doe" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Company Name</label>
                     <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputStyle} placeholder="e.g. Bellows Systems" />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Email Address</label>
                     <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputStyle} placeholder="name@example.com" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Phone Number</label>
                     <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputStyle} placeholder="+1 (555) 000-0000" />
                   </div>
                 </div>

                 <div className="space-y-1">
                    <label className={subLabelStyle}>Street Address</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputStyle} placeholder="123 Industrial Way" />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                   <div className="space-y-1">
                     <label className={subLabelStyle}>City</label>
                     <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputStyle} placeholder="City" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Postal Code</label>
                     <input type="text" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputStyle} placeholder="Zip / Postal" />
                   </div>
                   <div className="space-y-1">
                     <label className={subLabelStyle}>Country</label>
                     <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputStyle} placeholder="Country" />
                   </div>
                 </div>
              </div>
            </div>

            <button 
                disabled={!selectedPart || isSubmitting} 
                className={`w-full py-4 px-6 rounded shadow-sm text-base font-semibold text-white transition-all transform active:scale-[0.99] flex items-center justify-center gap-3 ${selectedPart && !isSubmitting ? 'bg-[#C80A37] hover:bg-[#a0082c] shadow-md' : 'bg-gray-300 cursor-not-allowed'}`} 
                onClick={handleDownloadPDF}
             >
                {isSubmitting && (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting ? 'TRANSMITTING INQUIRY...' : 'REQUEST QUOTE / DOWNLOAD PDF'}
             </button>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <Visualizer part={selectedPart} cuffType={cuffType} />
            <SpecsTable part={selectedPart} />
          </div>
        </div>
      </main>

      {showLogin && (
        <LoginModal 
          onClose={() => setShowLogin(false)} 
          onLogin={(success) => {
            if (success) {
              setIsAdmin(true);
              setShowLogin(false);
            }
          }}
        />
      )}

      <footer className="bg-white border-t border-gray-100 mt-auto"><div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8"><p className="text-center text-sm text-gray-400 font-light">&copy; {new Date().getFullYear()} Bellows Systems. All rights reserved.</p></div></footer>
    </div>
  );
}

export default App;