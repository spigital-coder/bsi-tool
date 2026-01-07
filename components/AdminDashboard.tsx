import React, { useState, useEffect, useRef } from 'react';
import { BellowsPart } from '../types';
import { BELLOWS_DATA } from '../data';
import { db, supabase } from '../api/database';

interface AdminDashboardProps {
  onDataChange: () => void;
  onClose: () => void;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onDataChange, onClose, onLogout }) => {
  const [data, setData] = useState<BellowsPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPart, setEditingPart] = useState<BellowsPart | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'status'>('inventory');
  const [policyStatus, setPolicyStatus] = useState<{message: string, success: boolean} | null>(null);
  const [storageStatus, setStorageStatus] = useState<{message: string, success: boolean} | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Custom confirmation state
  const [partToDelete, setPartToDelete] = useState<string | null>(null);

  const BUCKET_NAME = 'BSI-product-images';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const catalog = await db.getAll();
    setData(catalog);
    setLoading(false);
  };

  const seedDatabase = async () => {
    if (!confirm('This will import all default catalog parts into your Supabase database. Continue?')) return;
    
    setIsSeeding(true);
    let successCount = 0;
    let failCount = 0;

    for (const part of BELLOWS_DATA) {
      const result = await db.create(part);
      if (result.success) successCount++;
      else failCount++;
    }

    alert(`Seeding complete! ${successCount} parts imported. ${failCount} parts skipped.`);
    setIsSeeding(false);
    await loadData();
    onDataChange();
  };

  const runDiagnostics = async () => {
    setPolicyStatus({ message: 'Probing database permissions...', success: true });
    try {
      const testPart: BellowsPart = {
        part_number: '999-999-9999', // Using valid format for probe
        pipe_size: 0,
        bellows_id_in: 0,
        bellows_od_in: 0,
        live_length_ll_in: 0,
        overall_length_oal_in: 0,
        axial_spring_rate_lbf_in: "0",
        lateral_spring_rate_lbf_in: "0",
        angular_spring_rate_ft_lbs_deg: "0",
        axial_movement_in: 0,
        lateral_movement_in: 0,
        angular_movement_deg: 0,
        max_allowable_pressure_psig: 0,
        bellows_material: "PROBE",
        bellows_material_grade: "PROBE",
        pressure_psig: "0",
        temperature_f: "0",
        number_of_cycles: "0",
        cycles_format: "0",
        number_of_plys: "0",
        weld_neck_material: "0",
        weld_neck_grade: "0",
        image_url: ""
      };

      const dbResult = await db.create(testPart);
      if (!dbResult.success) {
        setPolicyStatus({ message: `Create Failed: ${dbResult.error}`, success: false });
      } else {
        const delResult = await db.delete(testPart.part_number);
        if (delResult.success) {
          setPolicyStatus({ message: 'Database Access Verified: CREATE + DELETE operations are working correctly.', success: true });
        } else {
          setPolicyStatus({ message: `Database Restricted: Create ok, but DELETE failed: ${delResult.error}`, success: false });
        }
      }
    } catch (e: any) {
      setPolicyStatus({ message: `Diagnostics Exception: ${e.message}`, success: false });
    }

    setStorageStatus({ message: `Verifying bucket "${BUCKET_NAME}"...`, success: true });
    try {
      const { error: bucketError } = await supabase.storage.from(BUCKET_NAME).list('', { limit: 1 });
      if (bucketError) {
        setStorageStatus({ message: `Storage Access Error: ${bucketError.message}`, success: false });
      } else {
        setStorageStatus({ message: `Bucket "${BUCKET_NAME}" verified and accessible.`, success: true });
      }
    } catch (e: any) {
      setStorageStatus({ message: `Storage Diagnostics Exception: ${e.message}`, success: false });
    }
  };

  const filteredData = data.filter(p => 
    p.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.bellows_material && p.bellows_material.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const executeDelete = async (partNum: string) => {
    setDeletingId(partNum);
    setPartToDelete(null); // Close the confirmation modal
    try {
      const result = await db.delete(partNum);
      if (result.success) {
        setData(prev => prev.filter(p => p.part_number !== partNum));
        setSuccessMsg(`Successfully deleted ${partNum}`);
        setTimeout(() => setSuccessMsg(null), 3000);
        onDataChange();
      } else {
        alert(`DELETE BLOCKED: ${result.error}`);
      }
    } catch (err: any) {
      alert(`SYSTEM ERROR: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const PartForm = ({ initialData }: { initialData?: BellowsPart }) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>(initialData?.image_url || '');
    const [isUploading, setIsUploading] = useState(false);
    const [pnError, setPnError] = useState<string | null>(null);
    const [pnValue, setPnValue] = useState(initialData?.part_number || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    };

    const handlePnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replace(/\D/g, ''); // Get digits only
      raw = raw.slice(0, 10); // Limit to 10 digits
      
      let formatted = '';
      if (raw.length > 0) {
        formatted += raw.slice(0, 3);
        if (raw.length > 3) {
          formatted += '-' + raw.slice(3, 6);
        }
        if (raw.length > 6) {
          formatted += '-' + raw.slice(6, 10);
        }
      }
      
      setPnValue(formatted);
      setPnError(null);
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setPnError(null);
      
      const formData = new FormData(e.currentTarget);
      const partNumber = pnValue; // Use the state value for PN

      // 1. Format Validation (000-000-0000)
      const partNumberRegex = /^\d{3}-\d{3}-\d{4}$/;
      if (!partNumberRegex.test(partNumber)) {
        setPnError('Invalid format. Must be 10 digits (000-000-0000).');
        const pnInput = e.currentTarget.querySelector('[name="part_number"]');
        pnInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      // 2. Uniqueness Validation
      if (isAdding) {
        const exists = data.some(p => p.part_number.toLowerCase() === partNumber.toLowerCase());
        if (exists) {
          setPnError(`Part number "${partNumber}" already exists in the catalog.`);
          const pnInput = e.currentTarget.querySelector('[name="part_number"]');
          pnInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }

      setIsUploading(true);
      const partData: any = { part_number: partNumber };
      
      formData.forEach((value, key) => {
        if (key === 'part_number') return; // Skip as we handled it
        const numericFields = ['pipe_size', 'bellows_id_in', 'bellows_od_in', 'live_length_ll_in', 'overall_length_oal_in', 'axial_movement_in', 'lateral_movement_in', 'angular_movement_deg', 'max_allowable_pressure_psig'];
        if (numericFields.includes(key)) {
          partData[key] = parseFloat(value as string) || 0;
        } else {
          partData[key] = value;
        }
      });

      if (selectedFile) {
        const { url, error } = await db.storage.uploadImage(selectedFile);
        if (error) {
          alert(`UPLOAD ERROR: ${error}`);
          setIsUploading(false);
          return;
        }
        partData.image_url = url;
      } else {
        partData.image_url = previewUrl;
      }

      let result;
      if (isAdding) {
        result = await db.create(partData as BellowsPart);
      } else {
        result = await db.update(editingPart!.part_number, partData);
      }

      if (result.success) {
        setIsAdding(false);
        setEditingPart(null);
        await loadData();
        onDataChange();
        setSuccessMsg("Entry synchronized successfully.");
        setTimeout(() => setSuccessMsg(null), 3000);
      } else {
        alert(result.error);
      }
      setIsUploading(false);
    };

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-900/70 backdrop-blur-md p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-6 md:p-10 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
            <h3 className="text-xl md:text-2xl font-black text-[#414042]">
              {isAdding ? 'Register New Cloud Entry' : `Update Cloud Entry: ${initialData?.part_number}`}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingPart(null); }} className="text-gray-400 hover:text-red-500 transition-colors">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <form onSubmit={handleFormSubmit} className="space-y-10">
            <div className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-48 h-48 bg-white rounded-xl border border-gray-100 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-300 text-center p-4">
                      <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-[10px] font-bold uppercase tracking-widest">No Image Attached</p>
                    </div>
                  )}
                </div>
                <div className="flex-grow text-center md:text-left space-y-4">
                   <h4 className="text-sm font-black text-gray-700 uppercase tracking-widest">Component Visual Asset</h4>
                   <p className="text-xs text-gray-500 font-medium leading-relaxed">Bucket: <strong>{BUCKET_NAME}</strong></p>
                   <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                     <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-2.5 bg-[#414042] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all">Select Image File</button>
                     <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                   </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                { id: 'part_number', label: 'Part Number', type: 'text', req: true, readOnly: !isAdding, placeholder: "000-000-0000" },
                { id: 'pipe_size', label: 'Pipe Size (IN)', type: 'number', step: "0.01" },
                { id: 'bellows_id_in', label: 'Bellows ID (IN)', type: 'number', step: "0.01" },
                { id: 'bellows_od_in', label: 'Bellows OD (IN)', type: 'number', step: "0.01" },
                { id: 'live_length_ll_in', label: 'Live Length (IN)', type: 'number', step: "0.01" },
                { id: 'overall_length_oal_in', label: 'Overall Length (IN)', type: 'number', step: "0.01" },
                { id: 'axial_spring_rate_lbf_in', label: 'Axial Spring Rate', type: 'text' },
                { id: 'lateral_spring_rate_lbf_in', label: 'Lateral Spring Rate', type: 'text' },
                { id: 'angular_spring_rate_ft_lbs_deg', label: 'Angular Spring Rate', type: 'text' },
                { id: 'axial_movement_in', label: 'Axial Movement (IN)', type: 'number', step: "0.001" },
                { id: 'lateral_movement_in', label: 'Lateral Movement (IN)', type: 'number', step: "0.001" },
                { id: 'angular_movement_deg', label: 'Angular Movement (Deg)', type: 'number', step: "0.01" },
                { id: 'max_allowable_pressure_psig', label: 'Max Pressure (PSIG)', type: 'number' },
                { id: 'bellows_material', label: 'Material', type: 'text' },
                { id: 'bellows_material_grade', label: 'Grade', type: 'text' },
                { id: 'pressure_psig', label: 'Pressure Range', type: 'text' },
                { id: 'temperature_f', label: 'Temperature (F)', type: 'text' },
                { id: 'number_of_cycles', label: 'Cycles', type: 'text' },
                { id: 'cycles_format', label: 'Cycles Format', type: 'text' },
                { id: 'number_of_plys', label: 'No. of Plys', type: 'text' },
              ].map(field => (
                <div key={field.id} className="space-y-1.5">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.15em]">{field.label}</label>
                  <input 
                    name={field.id} 
                    type={field.type} 
                    step={field.step} 
                    placeholder={field.placeholder}
                    value={field.id === 'part_number' ? pnValue : undefined}
                    defaultValue={field.id !== 'part_number' ? (initialData as any)?.[field.id] : undefined} 
                    className={`w-full px-5 py-3.5 rounded-xl border-2 outline-none text-sm transition-all font-semibold 
                      ${field.readOnly ? 'bg-gray-50 cursor-not-allowed opacity-60 border-gray-100' : 'bg-white border-gray-100 focus:ring-4 focus:ring-[#C80A37]/10 focus:border-[#C80A37]'}
                      ${field.id === 'part_number' && pnError ? 'border-red-500 ring-2 ring-red-50' : ''}`}
                    required={field.req} 
                    readOnly={field.readOnly} 
                    onChange={field.id === 'part_number' ? handlePnChange : undefined}
                  />
                  {field.id === 'part_number' && pnError && (
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight leading-tight mt-1">{pnError}</p>
                  )}
                </div>
              ))}
              <div className="sm:col-span-2 lg:col-span-3 flex flex-col md:flex-row justify-end gap-4 mt-8 pt-8 border-t border-gray-100">
                <button type="button" onClick={() => { setIsAdding(false); setEditingPart(null); }} className="px-8 py-3.5 text-gray-500 font-bold hover:text-gray-700 transition-colors order-2 md:order-1" disabled={isUploading}>Discard</button>
                <button type="submit" disabled={isUploading} className="px-10 py-3.5 bg-[#C80A37] text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-red-50 hover:bg-[#a0082c] order-1 md:order-2 transition-transform active:scale-95 disabled:opacity-50 flex items-center gap-3">
                  {isUploading && <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  {isUploading ? 'Synchronizing...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const DeleteConfirmModal = ({ partNum }: { partNum: string }) => (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 md:p-10 border border-red-50 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-black text-[#414042] text-center mb-2 tracking-tight">Confirm Deletion</h3>
        <p className="text-gray-500 text-center text-sm leading-relaxed mb-8">
          Are you absolutely sure you want to permanently remove part <span className="font-black text-[#414042]">{partNum}</span>? This action cannot be undone.
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => executeDelete(partNum)}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-colors shadow-lg shadow-red-100"
          >
            Permanently Delete Record
          </button>
          <button 
            onClick={() => setPartToDelete(null)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-colors"
          >
            Cancel and Discard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in slide-in-from-right duration-300">
      <header className="bg-white border-b border-gray-100 px-4 md:px-8 py-4 md:py-6 flex flex-wrap justify-between items-center shadow-sm gap-4">
        <div className="flex items-center gap-4 md:gap-10">
          <h2 className="text-xl md:text-2xl font-black text-[#414042] tracking-tight">System Infrastructure</h2>
          <nav className="flex gap-1 bg-gray-100 p-1 rounded-xl">
             <button onClick={() => setActiveTab('inventory')} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'inventory' ? 'bg-white shadow-sm text-[#C80A37]' : 'text-gray-500 hover:text-gray-700'}`}>Global Catalog</button>
             <button onClick={() => setActiveTab('status')} className={`px-3 md:px-5 py-2 md:py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'status' ? 'bg-white shadow-sm text-[#C80A37]' : 'text-gray-500 hover:text-gray-700'}`}>Diagnostics & Fix</button>
          </nav>
        </div>
        <div className="flex gap-2">
            <button onClick={loadData} className="p-3 text-gray-400 hover:text-[#C80A37] transition-colors" title="Reload Cloud Data">
              <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={() => setIsAdding(true)} className="px-6 py-2.5 md:py-3 bg-[#C80A37] text-white rounded-xl text-xs md:text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#a0082c] shadow-lg shadow-red-50">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              New Entry
            </button>
            <div className="h-10 w-px bg-gray-100 mx-2 hidden md:block"></div>
            <button onClick={onClose} className="px-6 py-2.5 md:py-3 border-2 border-gray-100 text-gray-600 rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 transition-colors">Exit Console</button>
            <button onClick={onLogout} className="px-6 py-2.5 md:py-3 bg-gray-900 text-white rounded-xl text-xs md:text-sm font-bold hover:bg-black transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Logout
            </button>
        </div>
      </header>
      
      <main className="flex-grow overflow-hidden flex flex-col bg-gray-50/50 relative">
        {successMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[200] bg-green-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-[10px] shadow-2xl animate-in slide-in-from-top-4 duration-300">
            {successMsg}
          </div>
        )}

        {activeTab === 'inventory' ? (
          <div className="p-4 md:p-8 flex-grow flex flex-col overflow-hidden">
            <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div className="relative w-full md:w-auto">
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Filter by part or material..." className="pl-12 pr-6 py-3.5 border-2 border-gray-100 rounded-2xl text-sm w-full md:w-96 focus:ring-4 focus:ring-[#C80A37]/5 focus:border-[#C80A37] outline-none bg-white shadow-sm transition-all font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <button onClick={seedDatabase} disabled={isSeeding} className="text-xs font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors">{isSeeding ? 'Importing Default Data...' : 'Seed Global Catalog'}</button>
            </div>

            <div className="flex-grow bg-white border border-gray-100 rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col relative">
              {loading && data.length === 0 ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <svg className="animate-spin h-10 w-10 text-[#C80A37] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Updating View...</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-gray-100">
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-6">Component Identity</th>
                        <th className="px-8 py-6">Physical Metric</th>
                        <th className="px-8 py-6">Material Profile</th>
                        <th className="px-8 py-6 text-right">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                      {filteredData.map((part) => (
                        <tr key={part.part_number} className="hover:bg-gray-50/80 transition-colors group">
                          <td className="px-8 py-6 font-black text-[#414042]">
                             <div className="flex items-center gap-4">
                               {part.image_url ? (
                                 <img src={part.image_url} alt="" className="w-10 h-10 rounded-lg border border-gray-100 object-contain bg-white shadow-sm" />
                               ) : (
                                 <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-200">
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                 </div>
                               )}
                               <span>{part.part_number}</span>
                             </div>
                          </td>
                          <td className="px-8 py-6">{part.pipe_size}" Nominal</td>
                          <td className="px-8 py-6 text-gray-500 font-semibold">{part.bellows_material} {part.bellows_material_grade}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingPart(part)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Part" disabled={deletingId === part.part_number}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button onClick={() => setPartToDelete(part.part_number)} className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center min-w-[44px]" title="Delete Part" disabled={deletingId === part.part_number}>
                                {deletingId === part.part_number ? (
                                  <svg className="animate-spin h-5 w-5 text-red-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 max-w-5xl mx-auto space-y-10 overflow-y-auto custom-scrollbar">
              <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl">
                 <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-[#414042]">Infrastructure Diagnostics</h3>
                        <p className="text-gray-500 text-sm mt-1">Verifying connection to: <span className="font-bold text-[#C80A37]">{BUCKET_NAME}</span></p>
                    </div>
                    <button onClick={runDiagnostics} className="px-8 py-3.5 bg-[#414042] text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-lg active:scale-95">Execute Diagnostic Check</button>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 col-span-1 md:col-span-2">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#C80A37] mb-4">CRITICAL: Fix Permissions & Format</h4>
                        <p className="text-[12px] text-gray-700 mb-4 leading-relaxed font-bold">Paste and run the SQL below in your <span className="bg-yellow-100 px-1">Supabase SQL Editor</span> to grant explicit DELETE rights and enforce the 000-000-0000 format on the database level:</p>
                        <div className="relative">
                            <pre className="bg-[#414042] text-green-400 p-6 rounded-xl text-[10px] font-mono overflow-x-auto h-48 custom-scrollbar border-2 border-green-500/20 shadow-inner">
{`/* RUN THIS SQL IN YOUR SUPABASE DASHBOARD */

-- 1. Explicitly allow DELETE for authenticated users
DROP POLICY IF EXISTS "Admin Delete" ON bellows_parts;
CREATE POLICY "Admin Delete" ON bellows_parts 
FOR DELETE TO authenticated 
USING (true);

-- 2. Ensure authenticated users can also SELECT/UPDATE/INSERT
DROP POLICY IF EXISTS "Admin All" ON bellows_parts;
CREATE POLICY "Admin All" ON bellows_parts 
FOR ALL TO authenticated 
USING (true);

-- 3. Storage Bucket Permissions
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
CREATE POLICY "Admin Upload" ON storage.objects 
FOR ALL TO authenticated 
USING (bucket_id = '${BUCKET_NAME}');

-- 4. Backend Validation for Part Number Format (Optional but Recommended)
ALTER TABLE bellows_parts 
DROP CONSTRAINT IF EXISTS part_number_format;

ALTER TABLE bellows_parts 
ADD CONSTRAINT part_number_format 
CHECK (part_number ~ '^\\d{3}-\\d{3}-\\d{4}$');`}
                            </pre>
                            <button 
                                onClick={() => {
                                    const sql = `/* RUN THIS SQL IN YOUR SUPABASE DASHBOARD */\n\nDROP POLICY IF EXISTS "Admin Delete" ON bellows_parts;\nCREATE POLICY "Admin Delete" ON bellows_parts \nFOR DELETE TO authenticated \nUSING (true);\n\nDROP POLICY IF EXISTS "Admin All" ON bellows_parts;\nCREATE POLICY "Admin All" ON bellows_parts \nFOR ALL TO authenticated \nUSING (true);\n\nDROP POLICY IF EXISTS "Admin Upload" ON storage.objects;\nCREATE POLICY "Admin Upload" ON storage.objects \nFOR ALL TO authenticated \nUSING (bucket_id = '${BUCKET_NAME}');\n\nALTER TABLE bellows_parts DROP CONSTRAINT IF EXISTS part_number_format;\nALTER TABLE bellows_parts ADD CONSTRAINT part_number_format CHECK (part_number ~ '^\\d{3}-\\d{3}-\\d{4}$');`;
                                    navigator.clipboard.writeText(sql);
                                    alert('SQL Fix Copied! Paste this into the SQL Editor in your Supabase dashboard.');
                                }}
                                className="absolute top-4 right-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-white text-[10px] font-black uppercase"
                            >
                                Copy SQL Fix
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Policy Tests</h4>
                        {policyStatus && (
                            <div className={`p-4 rounded-xl border-2 flex items-center gap-4 ${policyStatus.success ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                <div className={`w-2 h-2 rounded-full ${policyStatus.success ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                <p className="text-[10px] font-bold">{policyStatus.message}</p>
                            </div>
                        )}
                        {storageStatus && (
                            <div className={`p-4 rounded-xl border-2 flex items-center gap-4 ${storageStatus.success ? 'bg-green-50 border-green-100 text-green-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                                <div className={`w-2 h-2 rounded-full ${storageStatus.success ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                <p className="text-[10px] font-bold">{storageStatus.message}</p>
                            </div>
                        )}
                    </div>
                 </div>
              </div>
          </div>
        )}
      </main>
      {(isAdding || editingPart) && <PartForm initialData={editingPart || undefined} />}
      {partToDelete && <DeleteConfirmModal partNum={partToDelete} />}
    </div>
  );
};

export default AdminDashboard;