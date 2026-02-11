import React, { useState, useMemo, useEffect } from 'react';
import { MedicalCenter } from '../types';
import { Search, MapPin, Phone, Stethoscope, Building, ExternalLink, Filter, Map, X, Mail, Globe, Eye, UserCheck, ChevronRight } from 'lucide-react';

// ─── Real Data from Authorized Doctors List (Department of Shipping) ───

const AUTHORIZED_DOCTORS: MedicalCenter[] = [
  // ── DHAKA AREA ──
  {
    id: 'dhk-1',
    name: 'Dr. Md. Mizanur Rahman',
    centerName: 'Ibn Sina Diagnostic and Consultation Center',
    approvalNumber: 'A-13508',
    address: 'House # 479, DIT Road, Malibagh, Dhaka 1217',
    phone: '01711156230',
    email: 'selimmizan@gmail.com',
    website: 'www.drmizan.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-2',
    name: 'Dr. Md. Asif Masud Chowdhury',
    centerName: 'Dhaka National Medical College & Hospital',
    approvalNumber: 'A-32919',
    address: '53/1, Jhonson Road, Dhaka',
    phone: '01711152220',
    email: 'dashif2006@gmail.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-3',
    name: 'Dr. Mir Md. Raihan',
    centerName: 'Radical Hospitals Limited',
    approvalNumber: 'A-55144',
    address: '35, Shah Makhdum Avenue, Sector 12, Uttara, Dhaka',
    phone: '01716134074',
    email: 'dr_mmraihan@yahoo.com',
    website: 'www.drraihanbd.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-4',
    name: 'Dr. Mohammad Saifuddin',
    centerName: 'New Popular Medical Services',
    approvalNumber: 'A-41434',
    address: 'MaddayaBadda Highschool Road, Gulshan Badda Ling Road, Dhaka-1212',
    phone: '01715257606',
    email: 'newpopularms@gmail.com',
    website: 'www.newpopularmedicalservices.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-5',
    name: 'Dr. A. T. M. Anwarul Haque',
    centerName: 'Marine Health Care Pvt. Ltd.',
    approvalNumber: 'A-27902',
    address: 'Ka-196/1/B, Tatultala, Khilkhet, Dhaka-1229',
    phone: '01907798504',
    email: 'marinehcpl@gmail.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-6',
    name: 'Dr. Saymon Sahariar',
    centerName: 'Praava Health Bangladesh Ltd',
    approvalNumber: 'A-99771',
    address: 'Plot-9, Road-17, Block-C, Banani, Dhaka-1212',
    phone: '01715610306',
    email: 'saymon.sahariar@yahoo.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-7',
    name: 'Dr. Ashutosh Saha',
    centerName: 'Praava Health Bangladesh Ltd',
    approvalNumber: 'A-80473',
    address: 'Plot-9, Road-17, Block-C, Banani, Dhaka-1212',
    phone: '01712143607',
    email: 'dr.ashutosh@praavahealth.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-8',
    name: 'Dr. Sonjay Sutradhar',
    centerName: 'Praava Health Bangladesh Ltd',
    approvalNumber: 'A-94676',
    address: 'Plot-9, Road-17, Block-C, Banani, Dhaka-1212',
    phone: '01786222134',
    email: 'sonjaysutradhar333@gmail.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'dhk-9',
    name: 'Dr. Tuli Akter',
    centerName: 'Sumaiya Pharmacy',
    approvalNumber: 'A-106062',
    address: '69/1, Peererbag Middle, 60ft Road, Agargaon, Dhaka-1207',
    phone: '01950247767',
    email: 'tulisbmc45@gmail.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'dhk-10',
    name: 'Dr. Sabrina Sarkar',
    centerName: 'Bangladesh Critical Care and General Hospital',
    approvalNumber: 'A-103248',
    address: 'Plot No. 2/8-A, Road No. 3, Block-A, Lalmatia, Dhaka-1207',
    phone: '01725433300',
    email: 'sarkarsabrina871@gmail.com',
    city: 'Dhaka',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },

  // ── CHITTAGONG AREA ──
  {
    id: 'ctg-1',
    name: 'Dr. Mesbah Uddin Ahmed',
    approvalNumber: 'A-24912',
    address: 'Road # 4, House # 12, Khulshi, 3rd Floor, Chittagong',
    phone: '01979323529',
    email: 'doctor@brsml.com',
    website: 'www.mesbahbd.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-2',
    name: 'Dr. Md. Ayubur Rahman',
    centerName: 'Saba Diagnostic Centre',
    approvalNumber: 'A-11820',
    address: 'Taher Chamber, 10 Agrabad C/A, Chittagong',
    phone: '01727690222',
    email: 'sdc_ctg@yahoo.com',
    website: 'www.drayubur.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-3',
    name: 'Dr. Ariful Islam',
    centerName: 'College of Dentistry',
    approvalNumber: 'A-62563',
    address: 'House 1, Road 1, Block-L, Lane-5, Halishahar H/E, Chittagong',
    phone: '01717028785',
    email: 'pushon05@gmail.com',
    website: 'www.drariful.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-4',
    name: 'Dr. Sabrina Mostafa',
    centerName: 'Idean Pathology',
    approvalNumber: 'A-68208',
    address: '122, Sk. Mujib Road, Agrabad, Chattagram',
    phone: '01781112677',
    email: 'drsabrinamostafa@gmail.com',
    website: 'www.drsabrinamostafa.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-5',
    name: 'Dr. Md. Rafiqul Islam',
    centerName: 'M/S Bablu Bappi',
    approvalNumber: 'A-22539',
    address: '17/3, Bisic Market, Badamtali, Agrabad, Chattagram',
    phone: '01740721751',
    email: 'rafique58@gmail.com',
    website: 'www.drmdrafiqulislam.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-6',
    name: 'Dr. Habibur Rahman Khan',
    approvalNumber: 'A-10528',
    address: 'Taher Chamber, 10, Agrabad C/A, Chattagram',
    phone: '031-2521388',
    email: 'habib.dr257@gmail.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-7',
    name: 'Dr. Farhan Ferdous Muksed',
    approvalNumber: 'A-25051',
    address: 'House: 03, Road: 06, Block-G, Halishahar Housing Society, Baropul, Chattagram',
    phone: '01977807007',
    email: 'drhemel69@gmail.com',
    website: 'www.drmuksed.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-8',
    name: 'Dr. Naushad Ahmed Khan',
    centerName: 'AKS Khan Diagnostic Ltd',
    approvalNumber: 'A-12627',
    address: 'Faruk Chamber (1st Floor), 1403, Sheikh Mujib Road, Chowmuhoni, Agrabad C/A, Chattogram',
    phone: '01819317880',
    email: 'drnaushadrup@gmail.com',
    website: 'www.drnaushad.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-9',
    name: 'Dr. Hosne Ara Malek',
    approvalNumber: 'A-35191',
    address: 'AKH Tower (4th Floor), Plot-10, Lane-05, Road-01, Block-L, Agrabad Access Road, Boropool, Chittagong-4216',
    phone: '01711386614',
    email: 'runamalek@gmail.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-10',
    name: 'Dr. Paritosh Chakraborty',
    approvalNumber: 'A-16713',
    address: 'Flat No-G/1, Sanmar Mahfuz Manor House-33, Mehedibag Road, Kotwali, Chattogram',
    phone: '01711171054',
    email: 'dr.paritosh7@gmail.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: false
  },
  {
    id: 'ctg-11',
    name: 'Dr. Md. Abdur Rob',
    centerName: 'Asperia Health Care Ltd.',
    approvalNumber: 'A-30462',
    address: 'Al Noor Badrun Center, 1486/1672, O.R. Nizam Road, Probartak Circle, Chattogram',
    phone: '01714080593',
    email: 'imdrrob@gmail.com',
    website: 'www.drabdurrob.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-12',
    name: 'Dr. Farhana Rahman',
    centerName: 'Safe Ideal Health Care Ltd.',
    approvalNumber: 'A-46059',
    address: '1516/1725, 1 K.M. Opposite Shah Waliullah Residential, Bahaddarhat, Chittagong',
    phone: '01715477017',
    email: 'dr.farhanarahman007@gmail.com',
    website: 'www.drfarhanarahman.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-13',
    name: 'Dr. Sharmin Akter',
    centerName: 'International Medical Resource Center (IMRC)',
    approvalNumber: 'A-53430',
    address: '73/74 Korim\'s Icon, Muradpur, Chittagong',
    phone: '01714381416',
    email: 'sharmin26akter@gmail.com',
    website: 'www.drsharminakter.xyz',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-14',
    name: 'Dr. Goutam Das Gupta',
    centerName: 'Safe Ideal Diagnostic Centre / Epic Diagnostic Centre',
    approvalNumber: 'A-34151',
    address: '1 Kilometer, New Chandgaon Thana, Bahaddarhat, Chattogram',
    phone: '01715741351',
    email: 'gautamg307@gmail.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'ctg-15',
    name: 'Dr. Minhaz Mahmud Chowdhury',
    centerName: 'Ocean Diagnostic Centre (Ocean Tower)',
    approvalNumber: 'A-66813',
    address: '3rd & 4th Floor, Halishahar Road, (Banari Para Circle), Near the Access Road, North Agrabad, Chattogram',
    phone: '01620981698',
    email: 'minhazchy13@gmail.com',
    city: 'Chittagong',
    specialty: 'General',
    status: 'Approved',
    isCenter: true
  },

  // ── EYE SPECIALISTS ──
  {
    id: 'eye-1',
    name: 'Col. Dr. Md. Zahidur Rahman',
    centerName: 'Noor Fatema Eye Care and Phaco Center',
    approvalNumber: 'A-24510',
    address: 'House No. 10, Lane No-6, G-Block, Boropole, Halishahor, Chattogram',
    phone: '01714093530',
    city: 'Chittagong',
    specialty: 'Eye Specialist',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'eye-2',
    name: 'Dr. Naushad Ahmed Khan',
    centerName: 'AKS Khan Diagnostics Ltd.',
    approvalNumber: 'A-12627',
    address: 'Faruk Chamber (1st Floor), 1403, Sheikh Mujib Road, Chowmuhoni Agrabad, Chattogram',
    phone: '01819317880',
    email: 'drnaushadrup@gmail.com',
    website: 'www.drnaushad.com',
    city: 'Chittagong',
    specialty: 'Eye Specialist',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'eye-3',
    name: 'Dr. Md. Shahriar Kabir Khan',
    centerName: 'Ideal Pathology, Mustafa Palaza (2nd Floor)',
    approvalNumber: 'A-32254',
    address: 'Mazar Gate, Bandamtoly, 162, Sk. Mujib Road, Agrabad, Chattogram',
    phone: '01716488950',
    email: 'shahriarkabirkhan555@gmail.com',
    city: 'Chittagong',
    specialty: 'Eye Specialist',
    status: 'Approved',
    isCenter: true
  },
  {
    id: 'eye-4',
    name: 'Dr. Md. Abul Kalam Azad',
    approvalNumber: 'A-25031',
    address: '192/A-Doctors Goli, Moghbazar, Dhaka',
    phone: '01711835284',
    city: 'Dhaka',
    specialty: 'Eye Specialist',
    status: 'Approved',
    isCenter: false
  },
];

// ─── Component ────────────────────────────────────────────

export const MedicalCenters: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [specialtyFilter, setSpecialtyFilter] = useState<'All' | 'General' | 'Eye Specialist'>('All');
  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (selectedCenter) setShowMap(false);
  }, [selectedCenter]);

  const cities = useMemo(() => {
    const c = new Set(AUTHORIZED_DOCTORS.map(d => d.city));
    return ['All', ...Array.from(c)];
  }, []);

  const filteredCenters = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    return AUTHORIZED_DOCTORS.filter(center => {
      const matchesSearch =
        center.name.toLowerCase().includes(lowerQuery) ||
        (center.centerName || '').toLowerCase().includes(lowerQuery) ||
        center.approvalNumber.toLowerCase().includes(lowerQuery) ||
        center.address.toLowerCase().includes(lowerQuery) ||
        (center.email || '').toLowerCase().includes(lowerQuery);

      const matchesCity = cityFilter === 'All' || center.city === cityFilter;
      const matchesSpecialty = specialtyFilter === 'All' || center.specialty === specialtyFilter;

      return matchesSearch && matchesCity && matchesSpecialty;
    });
  }, [searchQuery, cityFilter, specialtyFilter]);

  // Stats
  const totalDoctors = AUTHORIZED_DOCTORS.length;
  const dhakaCount = AUTHORIZED_DOCTORS.filter(d => d.city === 'Dhaka').length;
  const ctgCount = AUTHORIZED_DOCTORS.filter(d => d.city === 'Chittagong').length;
  const eyeCount = AUTHORIZED_DOCTORS.filter(d => d.specialty === 'Eye Specialist').length;

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-rose-800 via-rose-700 to-pink-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10">
          <Stethoscope className="w-40 h-40 -mt-8 -mr-8" />
        </div>

        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-5 h-5 text-rose-200" />
          <span className="text-rose-200 text-xs font-semibold uppercase tracking-wider">Department of Shipping</span>
        </div>
        <h2 className="text-2xl font-bold mb-1">Authorized Doctors</h2>
        <p className="text-rose-200 text-sm">Accredited physicians for seafarer medical examinations</p>

        {/* Stats Row */}
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{totalDoctors}</div>
            <div className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">Total</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{dhakaCount}</div>
            <div className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">Dhaka</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{ctgCount}</div>
            <div className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">Chittagong</div>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2 text-center flex-1">
            <div className="text-2xl font-bold">{eyeCount}</div>
            <div className="text-[10px] text-rose-200 uppercase tracking-wider font-semibold">Eye</div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by doctor, center, address, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-none bg-slate-50 text-sm"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          {/* City Filters */}
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex items-center ${cityFilter === city
                  ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {city === 'All' ? <Filter className="w-3 h-3 mr-1.5" /> : <MapPin className="w-3 h-3 mr-1.5" />}
              {city}
            </button>
          ))}

          <div className="w-px bg-slate-200 mx-1"></div>

          {/* Specialty Filters */}
          {(['All', 'General', 'Eye Specialist'] as const).map(spec => (
            <button
              key={spec}
              onClick={() => setSpecialtyFilter(spec)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border flex items-center ${specialtyFilter === spec
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {spec === 'Eye Specialist' ? <Eye className="w-3 h-3 mr-1.5" /> : <Stethoscope className="w-3 h-3 mr-1.5" />}
              {spec === 'All' ? 'All Types' : spec}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400 text-right">
          Showing <span className="font-bold text-slate-600">{filteredCenters.length}</span> of {totalDoctors}
        </div>
      </div>

      {/* Doctor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredCenters.length > 0 ? (
          filteredCenters.map(center => (
            <div
              key={center.id}
              onClick={() => setSelectedCenter(center)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-rose-200 transition-all cursor-pointer relative overflow-hidden group"
            >
              {/* Specialty Badge */}
              {center.specialty === 'Eye Specialist' && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Eye
                </div>
              )}

              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${center.specialty === 'Eye Specialist'
                    ? 'bg-indigo-100 text-indigo-600'
                    : center.isCenter
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                  {center.specialty === 'Eye Specialist'
                    ? <Eye className="w-5 h-5" />
                    : center.isCenter
                      ? <Building className="w-5 h-5" />
                      : <Stethoscope className="w-5 h-5" />
                  }
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-800 text-sm leading-tight group-hover:text-rose-700 transition-colors">
                    {center.name}
                  </h3>
                  {center.centerName && (
                    <p className="text-xs text-rose-600 font-medium mt-0.5 truncate">{center.centerName}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1 truncate flex items-center">
                    <MapPin className="w-3 h-3 mr-1 shrink-0" />
                    {center.address}
                  </p>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-400 transition-colors mt-3 shrink-0" />
              </div>

              {/* Bottom Tags */}
              <div className="flex items-center gap-2 mt-3 ml-14">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 font-mono font-bold text-[10px] rounded border border-slate-200">
                  {center.approvalNumber}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase">
                  {center.city.substring(0, 3)}
                </span>
                {center.website && (
                  <span className="text-[10px] text-blue-500 flex items-center">
                    <Globe className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No doctors found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCenter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedCenter(null)}></div>
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className={`p-6 text-white relative shrink-0 ${selectedCenter.specialty === 'Eye Specialist'
                ? 'bg-gradient-to-r from-indigo-800 to-violet-900'
                : 'bg-gradient-to-r from-rose-800 to-pink-900'
              }`}>
              <button onClick={() => setSelectedCenter(null)} className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-xs font-mono">
                  {selectedCenter.approvalNumber}
                </span>
                <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  {selectedCenter.city}
                </span>
                {selectedCenter.specialty === 'Eye Specialist' && (
                  <span className="bg-amber-400/30 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Eye Specialist
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold leading-tight">{selectedCenter.name}</h3>
              {selectedCenter.centerName && (
                <p className="text-rose-200/80 text-sm mt-1 flex items-center">
                  <Building className="w-4 h-4 mr-1.5 shrink-0" />
                  {selectedCenter.centerName}
                </p>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Address</label>
                  <p className="text-slate-700 text-sm leading-relaxed">{selectedCenter.address}</p>

                  <button
                    onClick={() => setShowMap(!showMap)}
                    className="mt-2 text-xs font-bold text-rose-600 flex items-center hover:underline"
                  >
                    {showMap ? 'Hide Map' : 'View on Map'}
                    <Map className="w-3 h-3 ml-1" />
                  </button>

                  {showMap && (
                    <div className="mt-3 w-full h-48 rounded-lg overflow-hidden border border-slate-200 relative bg-slate-100">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${encodeURIComponent((selectedCenter.centerName ? selectedCenter.centerName + ', ' : '') + selectedCenter.address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCenter.name + ' ' + selectedCenter.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded shadow text-xs font-bold text-rose-600 flex items-center hover:bg-white"
                      >
                        Open in Maps <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone</label>
                  <a href={`tel:${selectedCenter.phone}`} className="text-blue-600 hover:underline text-sm font-medium">
                    {selectedCenter.phone}
                  </a>
                </div>
              </div>

              {/* Email */}
              {selectedCenter.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</label>
                    <a href={`mailto:${selectedCenter.email}`} className="text-blue-600 hover:underline text-sm break-all">
                      {selectedCenter.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Website */}
              {selectedCenter.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Website</label>
                    <a
                      href={`https://${selectedCenter.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline text-sm flex items-center"
                    >
                      {selectedCenter.website}
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <a
                  href={`tel:${selectedCenter.phone}`}
                  className="flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 transition-colors shadow-md"
                >
                  <Phone className="w-4 h-4" /> Call Now
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedCenter.name + ' ' + selectedCenter.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-md"
                >
                  <MapPin className="w-4 h-4" /> Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};