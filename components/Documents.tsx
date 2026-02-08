import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MarinerDocument, DocumentCategory } from '../types';
import { Plus, X, Camera, Upload, Calendar, Hash, FileText, Check, Loader2, Trash2, Filter, Edit, SwitchCamera, AlertCircle, RefreshCw, FileSpreadsheet, File, Download, AlertTriangle, ChevronLeft, ChevronRight, Layers, Trash, Clock, List, Grid, Eye, ScanLine, Copy, Merge, QrCode, Award, Stethoscope, CreditCard, Plane, FileCheck, Shield, Sparkles } from 'lucide-react';
import { analyzeDocumentImage } from '../services/geminiService';
import { Document, Page, pdfjs } from 'react-pdf';
// @ts-ignore - jsqr is imported via importmap
import jsQR from 'jsqr';
import { supabase, isMockMode } from '../services/supabase';

// Configure PDF worker - Use unpkg script version for better compatibility in no-build environments
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;

interface DocumentsProps {
  documents: MarinerDocument[];
  onAddDocument: (doc: MarinerDocument) => void;
  onUpdateDocument: (doc: MarinerDocument) => void;
  onDeleteDocument: (id: string) => void;
  userName?: string;
  readOnly?: boolean; // New Prop
}

interface PendingFile {
  id: string;
  fileUrl: string; // Base64 for preview
  fileName: string;
  originalBlob?: Blob; // Added for Supabase Upload
}

type ExpiryFilterType = 'all' | 'expired' | '1m' | '3m' | '6m' | '12m';

export const Documents: React.FC<DocumentsProps> = ({ documents, onAddDocument, onUpdateDocument, onDeleteDocument, userName, readOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<MarinerDocument | null>(null);
  const [viewPage, setViewPage] = useState(0); // For multi-page navigation in View
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Upload/Processing State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]); // For merge preview
  // Note: We need to keep track of the blobs for uploading. 
  // In a real app we'd map these better, but for now we'll reconstruct blobs from base64 if needed or store them side-by-side.
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [uploadQueue, setUploadQueue] = useState<PendingFile[]>([]);
  
  // Merge Logic State
  const [isMergePromptOpen, setIsMergePromptOpen] = useState(false);
  const [mergeRejected, setMergeRejected] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<{title: string; expiry: string; number: string; category: string} | null>(null);
  const [isEnhanced, setIsEnhanced] = useState(true); // "Scan" effect toggle
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [activeExpiryFilter, setActiveExpiryFilter] = useState<ExpiryFilterType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  
  // PDF View State
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pdfPageNumber, setPdfPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const categories = ['All', ...Object.values(DocumentCategory)];

  // Helper: Convert Base64 to Blob
  const base64ToBlob = async (base64: string): Promise<Blob> => {
    const res = await fetch(base64);
    return await res.blob();
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case DocumentCategory.MEDICAL: return Stethoscope;
      case DocumentCategory.PERSONAL_ID: return CreditCard;
      case DocumentCategory.VISA: return Plane;
      case DocumentCategory.LICENSE: return Shield;
      case DocumentCategory.CERTIFICATE: return Award;
      default: return FileText;
    }
  };

  // Category Priority for Sorting
  const categoryPriority: Record<string, number> = {
    [DocumentCategory.PERSONAL_ID]: 1,
    [DocumentCategory.VISA]: 2,
    [DocumentCategory.MEDICAL]: 3,
    [DocumentCategory.CERTIFICATE]: 4,
    [DocumentCategory.LICENSE]: 5,
    [DocumentCategory.OTHER]: 6,
  };

  const filteredDocuments = useMemo(() => {
    let docs = activeFilter === 'All' 
      ? documents 
      : documents.filter(doc => doc.category === activeFilter);
    
    if (activeFilter === 'All' && activeExpiryFilter !== 'all') {
      const now = new Date();
      docs = docs.filter(doc => {
        if (!doc.expiryDate || doc.expiryDate === 'N/A') return false;
        const expiry = new Date(doc.expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (activeExpiryFilter) {
          case 'expired': return diffDays < 0;
          case '1m': return diffDays >= 0 && diffDays <= 30;
          case '3m': return diffDays >= 0 && diffDays <= 90;
          case '6m': return diffDays >= 0 && diffDays <= 180;
          case '12m': return diffDays >= 0 && diffDays <= 365;
          default: return true;
        }
      });
    }

    if (activeFilter === 'All') {
      docs.sort((a, b) => {
        const priorityA = categoryPriority[a.category] || 99;
        const priorityB = categoryPriority[b.category] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        if (a.expiryDate && b.expiryDate && a.expiryDate !== 'N/A' && b.expiryDate !== 'N/A') {
             return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
        }
        return 0;
      });
    }

    return docs;
  }, [documents, activeFilter, activeExpiryFilter]);

  // Responsive PDF sizing
  useEffect(() => {
    function handleResize() {
        setContainerWidth(Math.min(window.innerWidth - 48, 800));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset View state when opening a new doc
  useEffect(() => {
    if (viewingDoc) {
      setPdfPageNumber(1);
      setNumPages(null);
      setViewPage(0);
    }
  }, [viewingDoc]);

  // Check for Merge Opportunity when camera/upload closes or queue changes
  useEffect(() => {
    if (!isCameraOpen && !isModalOpen && uploadQueue.length > 1 && !mergeRejected && !isMergePromptOpen) {
       // Logic handles inside process queue usually, but we want to intercept
    }
  }, [isCameraOpen, isModalOpen, uploadQueue, mergeRejected]);

  // Queue Processing Effect
  useEffect(() => {
    // Only process if not scanning, no image selected, no merge prompt open
    if (!isCameraOpen && !selectedImage && uploadQueue.length > 0 && !editingId && !isMergePromptOpen) {
      
      // If we have > 1 items and haven't rejected merge yet, Prompt User
      if (uploadQueue.length > 1 && !mergeRejected) {
         setIsMergePromptOpen(true);
         return;
      }

      const nextFile = uploadQueue[0];
      setUploadQueue(prev => prev.slice(1));
      
      setSelectedImage(nextFile.fileUrl);
      setSelectedPages([]); // Reset pages for single doc
      setSelectedFileName(nextFile.fileName);
      processImage(nextFile.fileUrl, nextFile.fileName);
      
      // Open modal if it's not open (e.g. came from background processing)
      setIsModalOpen(true);
    }
  }, [isCameraOpen, selectedImage, uploadQueue, editingId, isMergePromptOpen, mergeRejected]);

  // Camera handling
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isCameraOpen) {
      setCameraError(null);
      const startCamera = async () => {
        try {
          const constraints = {
            video: { 
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
          };
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
             videoRef.current.srcObject = stream;
             // Explicit play for iOS
             videoRef.current.play().catch(e => console.log("Play error", e));
          }
        } catch (err) {
          console.error("Camera Error:", err);
          setCameraError("Access denied. Please enable camera permissions in your browser settings.");
        }
      };
      startCamera();
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isCameraOpen, facingMode]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const fileName = `Captured_Photo_${Date.now()}.jpg`;
        // Convert to blob immediately for reliable upload later? 
        // We'll trust converting dataUrl back to Blob later to keep state simple
        setUploadQueue(prev => [...prev, {
          id: Date.now().toString(),
          fileUrl: dataUrl,
          fileName: fileName
        }]);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      const newQueueItems: PendingFile[] = [];
      let processedCount = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          newQueueItems.push({
            id: Math.random().toString(36).substr(2, 9),
            fileUrl: base64,
            fileName: file.name,
            originalBlob: file // Keep reference for upload
          });
          processedCount++;
          if (processedCount === files.length) {
            setUploadQueue(prev => [...prev, ...newQueueItems]);
            // Reset merge rejected state when new files come in
            setMergeRejected(false);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const scanQRCodeFromImage = async (base64: string): Promise<{expiry?: string, number?: string} | null> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) { resolve(null); return; }
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // Attempt QR Code Scan
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: "dontInvert",
              });

              if (code) {
                  const text = code.data;
                  console.log("QR Code Found:", text);
                  
                  // Simple heuristic extraction
                  // 1. Look for Date (YYYY-MM-DD or DD/MM/YYYY)
                  const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/;
                  const dateMatch = text.match(dateRegex);
                  let foundExpiry = undefined;
                  if (dateMatch) {
                      foundExpiry = dateMatch[0].replace(/\//g, '-'); // Normalize to dashes if needed, but ISO preferred
                  }

                  // 2. Look for Number (simple alphanumeric > 3 chars, maybe following 'No:' or just raw if it's a short string)
                  let foundNumber = undefined;
                  const numberMatch = text.match(/(?:No|Doc|CDC)[:\s]*([A-Z0-9/-]+)/i);
                  if (numberMatch) {
                      foundNumber = numberMatch[1];
                  } else if (text.length < 20 && /^[A-Z0-9/-]+$/.test(text)) {
                      // If the entire QR is just a code
                      foundNumber = text;
                  }

                  resolve({ expiry: foundExpiry, number: foundNumber });
              } else {
                  resolve(null);
              }
          };
          img.src = base64;
      });
  };

  const processImage = async (base64: string, fileName: string) => {
    setIsScanning(true);
    setDuplicateWarning(null);
    const startTime = Date.now();
    
    // Parallel execution: Gemini Analysis + QR Code Scan
    try {
      const [geminiData, qrData] = await Promise.all([
          analyzeDocumentImage(base64),
          scanQRCodeFromImage(base64)
      ]);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 500 - elapsed); // Faster scan feeling
      
      setTimeout(() => {
        let formattedTitle = geminiData.documentName;
        if (!formattedTitle || formattedTitle === 'Unknown Document') {
            formattedTitle = fileName.split('.').slice(0, -1).join('.') || fileName; 
        }
        formattedTitle = formattedTitle.replace(/Certificate of Proficiency/gi, 'COP');
        if (userName && !formattedTitle.toLowerCase().includes(userName.toLowerCase())) {
          formattedTitle = `${formattedTitle} - ${userName}`;
        }

        // Merge QR Data with Gemini Data (QR takes precedence for specifics if found)
        const finalExpiry = qrData?.expiry || (geminiData.expiryDate !== 'N/A' ? geminiData.expiryDate : '');
        const finalNumber = qrData?.number || (geminiData.documentNumber !== 'N/A' ? geminiData.documentNumber : '');

        setScanResult({
          title: formattedTitle,
          expiry: finalExpiry,
          number: finalNumber,
          category: geminiData.category !== 'N/A' ? geminiData.category : DocumentCategory.OTHER
        });
        setIsScanning(false);
      }, remaining);
    } catch (error) {
      console.error(error);
      setIsScanning(false);
      const fallbackTitle = fileName.split('.').slice(0, -1).join('.') || fileName;
      setScanResult({ title: fallbackTitle, expiry: '', number: '', category: DocumentCategory.OTHER });
    }
  };

  const handleMergeConfirm = () => {
    setIsMergePromptOpen(false);
    
    // Combine all queue items
    if (uploadQueue.length > 0) {
        const first = uploadQueue[0];
        const allFiles = uploadQueue.map(q => q.fileUrl);
        
        // Clear queue
        setUploadQueue([]);
        
        // Setup editing environment for the merged doc
        setSelectedImage(first.fileUrl);
        setSelectedPages(allFiles);
        setSelectedFileName(first.fileName);
        
        // Process only the first page for metadata
        processImage(first.fileUrl, first.fileName);
        setIsModalOpen(true);
    }
  };

  const handleMergeReject = () => {
      setIsMergePromptOpen(false);
      setMergeRejected(true);
      // Logic continues in useEffect to process one by one
  };

  const handleEditClick = (doc: MarinerDocument, e: React.MouseEvent) => {
    e.stopPropagation();
    if (readOnly) return;
    setEditingId(doc.id);
    setSelectedImage(doc.fileUrl);
    setSelectedPages(doc.pages || []);
    setSelectedFileName(doc.title); 
    setScanResult({
      title: doc.title,
      expiry: doc.expiryDate,
      number: doc.documentNumber,
      category: doc.category
    });
    setUploadQueue([]); 
    setIsModalOpen(true);
  };

  // UPDATED HANDLE SAVE FOR SUPABASE
  const handleSave = async () => {
    if (selectedImage && scanResult) {
      if (!duplicateWarning && !editingId) {
        const duplicate = documents.find(d => 
            (d.documentNumber === scanResult.number && scanResult.number && scanResult.number !== 'N/A')
        );
        if (duplicate) {
            setDuplicateWarning(`Possible duplicate: Document #${duplicate.documentNumber} already exists ("${duplicate.title}")`);
            return;
        }
      }

      setIsScanning(true); // Reuse scanning loader

      // Mock Mode Save
      if (isMockMode) {
        setTimeout(() => {
            const mockDoc = {
                id: editingId || Math.random().toString(36).substr(2, 9),
                title: scanResult.title || selectedFileName,
                category: scanResult.category,
                documentNumber: scanResult.number,
                expiryDate: scanResult.expiry || null,
                fileUrl: selectedImage,
                pages: selectedPages.length > 0 ? selectedPages : undefined,
                uploadDate: Date.now()
            };

            if (editingId) {
                onUpdateDocument(mockDoc as any);
            } else {
                onAddDocument(mockDoc as any);
            }
            handleCloseModal();
        }, 1000);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        let mainFilePath = '';
        let pagePaths: string[] = [];

        // Upload Helper
        const uploadFile = async (blob: Blob, fileName: string) => {
            const ext = fileName.split('.').pop() || 'jpg';
            const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
            const { error } = await supabase.storage.from('documents').upload(path, blob);
            if (error) throw error;
            return path;
        };

        // 1. Upload Main Image (Page 1)
        const mainBlob = await base64ToBlob(selectedImage);
        mainFilePath = await uploadFile(mainBlob, selectedFileName);

        // 2. Upload Additional Pages if Merged
        if (selectedPages.length > 1) {
            // Re-upload all pages to ensure structure is clean, or just upload the rest.
            // For simplicity in this logic, we upload all as pages array, index 0 matches mainFilePath content but different pointer is fine, 
            // OR strictly: mainFilePath is the thumbnail/first page, pagePaths contains ALL page paths.
            
            for (const pageBase64 of selectedPages) {
                const pageBlob = await base64ToBlob(pageBase64);
                const pPath = await uploadFile(pageBlob, 'page.jpg');
                pagePaths.push(pPath);
            }
        }

        // 3. Insert/Update Database
        const docPayload = {
            user_id: user.id,
            title: scanResult.title || selectedFileName,
            category: scanResult.category,
            document_number: scanResult.number,
            expiry_date: scanResult.expiry || null,
            file_path: mainFilePath,
            page_paths: pagePaths.length > 0 ? pagePaths : null
        };

        if (editingId) {
            const { error } = await supabase.from('documents').update(docPayload).eq('id', editingId);
            if (error) throw error;
            onUpdateDocument({ ...docPayload, id: editingId, fileUrl: '', uploadDate: 0 } as any); // Optimistic ish, but fetch will override
        } else {
            const { error } = await supabase.from('documents').insert(docPayload);
            if (error) throw error;
            onAddDocument({ ...docPayload, id: 'temp', fileUrl: '', uploadDate: 0 } as any);
        }

        handleCloseModal();

      } catch (error: any) {
        console.error('Upload error:', error);
        alert("Failed to save document: " + error.message);
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleSkip = () => {
      setSelectedImage(null);
      setSelectedPages([]);
      setSelectedFileName('');
      setScanResult(null);
      setDuplicateWarning(null);
      if (uploadQueue.length === 0) handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
    setSelectedPages([]);
    setSelectedFileName('');
    setScanResult(null);
    setIsScanning(false);
    setEditingId(null);
    setIsCameraOpen(false);
    setCameraError(null);
    setDuplicateWarning(null);
    setUploadQueue([]); 
    setIsMergePromptOpen(false);
    setMergeRejected(false);
  };
  
  const requestDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (readOnly) return;
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      if (isMockMode) {
         onDeleteDocument(deleteId);
         if (viewingDoc && viewingDoc.id === deleteId) {
            setViewingDoc(null);
         }
         setDeleteId(null);
         return;
      }
      try {
        const { error } = await supabase.from('documents').delete().eq('id', deleteId);
        if (error) throw error;
        onDeleteDocument(deleteId);
        if (viewingDoc && viewingDoc.id === deleteId) {
            setViewingDoc(null);
        }
      } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete document");
      }
      setDeleteId(null);
    }
  };

  const handleViewClick = (doc: MarinerDocument) => {
    setViewingDoc(doc);
  };

  const handleCloseView = () => {
    setViewingDoc(null);
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const getExpiryStatus = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return { label: 'No Expiry', color: 'text-slate-500', bg: 'bg-slate-100' };
    const today = new Date();
    const expiry = new Date(dateString);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Expired', color: 'text-red-700', bg: 'bg-red-50' };
    if (diffDays < 180) return { label: 'Expiring Soon', color: 'text-amber-700', bg: 'bg-amber-50' };
    return { label: 'Valid', color: 'text-green-700', bg: 'bg-green-50' };
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800">My Documents</h2>
           <p className="text-sm text-slate-500">Manage certificates & licenses securely.</p>
        </div>
        
        {!readOnly && (
            <div className="flex gap-2">
                <button 
                onClick={() => setIsCameraOpen(true)}
                className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-900 transition-transform active:scale-95 shadow-lg shadow-slate-900/20"
                >
                <Camera className="w-4 h-4" /> Scan
                </button>
                <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-blue-900/20">
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={handleFileSelect} />
                </label>
            </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="space-y-2">
         {/* Category Filter */}
         <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 self-center mr-2">Type:</span>
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveFilter(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border flex items-center ${
                        activeFilter === cat
                        ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    {activeFilter === cat && <Filter className="w-3 h-3 mr-1.5" />}
                    {cat}
                </button>
            ))}
         </div>

         {/* Expiry Filter */}
         <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2">
             <span className="text-[10px] uppercase font-bold text-slate-400 self-center mr-2">Expiry:</span>
             {[
                 { id: 'all', label: 'All' },
                 { id: 'expired', label: 'Expired' },
                 { id: '1m', label: '< 1 Month' },
                 { id: '6m', label: '< 6 Months' },
             ].map(filter => (
                 <button
                     key={filter.id}
                     onClick={() => setActiveExpiryFilter(filter.id as ExpiryFilterType)}
                     className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                         activeExpiryFilter === filter.id
                         ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                         : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                     }`}
                 >
                     {filter.label}
                 </button>
             ))}
         </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.length === 0 ? (
           <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No documents found matching filters.</p>
              <button onClick={() => {setActiveFilter('All'); setActiveExpiryFilter('all');}} className="text-blue-600 text-sm font-semibold mt-2 hover:underline">Clear Filters</button>
           </div>
        ) : (
           filteredDocuments.map((doc) => {
              const status = getExpiryStatus(doc.expiryDate);
              const Icon = getCategoryIcon(doc.category);
              return (
                <div 
                   key={doc.id} 
                   onClick={() => handleViewClick(doc)}
                   className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative group cursor-pointer overflow-hidden"
                >
                   {/* Thumbnail Area */}
                   <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                       {doc.fileUrl ? (
                           doc.fileUrl.startsWith('http') && doc.fileUrl.includes('.pdf') ? (
                              <FileText className="w-12 h-12 text-slate-300" />
                           ) : (
                              <img src={doc.fileUrl} alt={doc.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
                           )
                       ) : (
                           <Icon className="w-10 h-10 text-slate-300" />
                       )}
                       
                       {/* Overlay Actions */}
                       {!readOnly && (
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                               <button onClick={(e) => handleEditClick(doc, e)} className="p-2 bg-white rounded-full text-slate-700 hover:text-blue-600"><Edit className="w-4 h-4" /></button>
                               <button onClick={(e) => requestDelete(doc.id, e)} className="p-2 bg-white rounded-full text-slate-700 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                           </div>
                       )}

                       {/* Status Badge */}
                       <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold uppercase shadow-sm ${status.bg} ${status.color} border border-white/50 backdrop-blur-sm`}>
                          {status.label}
                       </div>
                   </div>

                   {/* Info Area */}
                   <div className="p-3">
                      <div className="flex items-start justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{doc.category}</span>
                          {doc.pages && doc.pages.length > 1 && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center"><Layers className="w-3 h-3 mr-1"/> {doc.pages.length}</span>}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5em]">{doc.title}</h3>
                      
                      <div className="space-y-1">
                          <div className="flex items-center text-xs text-slate-500">
                             <Hash className="w-3 h-3 mr-1.5 text-slate-400" />
                             <span className="font-mono truncate">{doc.documentNumber}</span>
                          </div>
                          <div className="flex items-center text-xs font-medium text-slate-600">
                             <Calendar className="w-3 h-3 mr-1.5 text-slate-400" />
                             <span>Expires: {doc.expiryDate || 'N/A'}</span>
                          </div>
                      </div>
                   </div>
                </div>
              );
           })
        )}
      </div>

      {/* --- MODALS --- */}

      {/* 1. Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
                <button onClick={handleCloseModal} className="text-white p-2"><X className="w-6 h-6"/></button>
                <span className="text-white font-bold">Scan Document</span>
                <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="text-white p-2">
                    <SwitchCamera className="w-6 h-6"/>
                </button>
            </div>
            
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {cameraError ? (
                    <div className="text-white text-center p-6">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500"/>
                        <p>{cameraError}</p>
                    </div>
                ) : (
                    <>
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {/* Guide Overlay */}
                        <div className="absolute inset-0 border-2 border-white/30 m-8 rounded-2xl pointer-events-none flex items-center justify-center">
                            <div className="w-64 h-48 border-2 border-white/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div className="h-24 bg-black flex items-center justify-center gap-8 pb-4">
                <button 
                    onClick={capturePhoto} 
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-colors"
                >
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                </button>
            </div>
        </div>
      )}

      {/* 2. Upload/Scan Processing Modal */}
      {isModalOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={handleCloseModal}></div>
             <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
                 
                 {/* Header */}
                 <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                         {isScanning ? <Loader2 className="animate-spin w-5 h-5 text-blue-600"/> : (editingId ? <Edit className="w-5 h-5 text-blue-600"/> : <ScanLine className="w-5 h-5 text-blue-600"/>)}
                         {editingId ? 'Edit Document' : (isScanning ? 'Analyzing...' : 'Review & Save')}
                     </h3>
                     <button onClick={handleCloseModal} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400"/></button>
                 </div>

                 {/* Content */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-4">
                     {/* Image Preview */}
                     <div className="relative bg-slate-100 rounded-xl overflow-hidden min-h-[200px] border border-slate-200 group">
                         {selectedImage && (
                             <>
                                <img 
                                    src={selectedImage} 
                                    alt="Preview" 
                                    className={`w-full h-auto object-contain max-h-[300px] transition-all duration-500 ${isEnhanced ? 'contrast-125 brightness-105 saturate-105' : ''}`} 
                                />
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <button 
                                        onClick={() => setIsEnhanced(!isEnhanced)}
                                        className={`p-1.5 rounded-lg backdrop-blur-md text-xs font-bold flex items-center gap-1 ${isEnhanced ? 'bg-blue-600/80 text-white' : 'bg-black/40 text-white'}`}
                                    >
                                        <Sparkles className="w-3 h-3" /> {isEnhanced ? 'Enhanced' : 'Original'}
                                    </button>
                                </div>
                                {selectedPages.length > 1 && (
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-bold">
                                        Page 1 of {selectedPages.length}
                                    </div>
                                )}
                             </>
                         )}
                         {isScanning && (
                             <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                                 <div className="text-center">
                                     <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden mx-auto mb-2">
                                         <div className="h-full bg-blue-600 w-1/2 animate-[shimmer_1s_infinite]"></div>
                                     </div>
                                     <p className="text-xs font-bold text-blue-600 animate-pulse">Extracting Data...</p>
                                 </div>
                             </div>
                         )}
                     </div>

                     {/* Warnings */}
                     {duplicateWarning && (
                         <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-start gap-2 border border-amber-200">
                             <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                             <div>
                                 <span className="font-bold block">Duplicate Detected</span>
                                 {duplicateWarning}
                             </div>
                         </div>
                     )}

                     {/* Form */}
                     <div className="space-y-3">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Title</label>
                             <input 
                                type="text" 
                                value={scanResult?.title || ''} 
                                onChange={(e) => setScanResult(prev => prev ? {...prev, title: e.target.value} : null)}
                                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. CDC"
                             />
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doc Number</label>
                                 <input 
                                    type="text" 
                                    value={scanResult?.number || ''} 
                                    onChange={(e) => setScanResult(prev => prev ? {...prev, number: e.target.value} : null)}
                                    className="w-full p-3 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Number"
                                 />
                             </div>
                             <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                                 <input 
                                    type="date" 
                                    value={scanResult?.expiry || ''} 
                                    onChange={(e) => setScanResult(prev => prev ? {...prev, expiry: e.target.value} : null)}
                                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                 />
                             </div>
                         </div>

                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                             <div className="grid grid-cols-3 gap-2">
                                 {Object.values(DocumentCategory).map(cat => (
                                     <button
                                         key={cat}
                                         onClick={() => setScanResult(prev => prev ? {...prev, category: cat} : null)}
                                         className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all ${
                                             scanResult?.category === cat 
                                             ? 'bg-blue-600 text-white border-blue-600' 
                                             : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                         }`}
                                     >
                                         {cat}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Footer Actions */}
                 <div className="p-4 border-t border-slate-100 flex gap-3">
                     <button 
                        onClick={handleSkip} 
                        className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                     >
                        Skip
                     </button>
                     <button 
                        onClick={handleSave} 
                        disabled={isScanning || !scanResult}
                        className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-700 transition-transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        {isScanning ? 'Processing...' : (
                            <>
                                <Check className="w-5 h-5" /> Save Document
                            </>
                        )}
                     </button>
                 </div>
             </div>
         </div>
      )}

      {/* 3. Merge Prompt Modal */}
      {isMergePromptOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
           <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Merge className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Combine Documents?</h3>
              <p className="text-slate-500 text-sm mb-6">
                 You uploaded {uploadQueue.length + (selectedImage ? 1 : 0)} items. Would you like to merge them into a single multi-page document?
              </p>
              <div className="flex gap-3">
                 <button onClick={handleMergeReject} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">Separate</button>
                 <button onClick={handleMergeConfirm} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg">Merge All</button>
              </div>
           </div>
        </div>
      )}

      {/* 4. Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setDeleteId(null)}></div>
           <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 text-center">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2">Delete Document?</h3>
              <p className="text-slate-500 text-sm mb-6">
                 Are you sure you want to delete this document? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50">Cancel</button>
                 <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg">Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* 5. View Document Modal (PDF/Image) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={handleCloseView}></div>
           <div className="relative w-full max-w-4xl h-[90vh] flex flex-col animate-in zoom-in-95">
              
              {/* Toolbar */}
              <div className="flex justify-between items-center text-white p-4 shrink-0">
                  <div>
                      <h3 className="font-bold text-lg">{viewingDoc.title}</h3>
                      <p className="text-xs text-slate-400 font-mono">{viewingDoc.documentNumber} • Exp: {viewingDoc.expiryDate}</p>
                  </div>
                  <div className="flex gap-2">
                     {/* Download logic simplified for now as a link */}
                     <a href={viewingDoc.fileUrl} download className="p-2 hover:bg-white/10 rounded-full"><Download className="w-5 h-5" /></a>
                     <button onClick={handleCloseView} className="p-2 hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
                  </div>
              </div>

              {/* Viewer */}
              <div className="flex-1 bg-black/50 rounded-xl overflow-hidden relative flex items-center justify-center border border-white/10">
                  {viewingDoc.fileUrl.endsWith('.pdf') || viewingDoc.fileUrl.startsWith('blob:') && viewingDoc.fileUrl.includes('pdf') ? (
                      <div className="h-full overflow-auto p-4 w-full flex justify-center">
                          <Document
                            file={viewingDoc.fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={<Loader2 className="w-8 h-8 text-white animate-spin" />}
                          >
                            <Page 
                                pageNumber={pdfPageNumber} 
                                width={containerWidth} 
                                renderTextLayer={false} 
                                renderAnnotationLayer={false}
                            />
                          </Document>
                          {numPages && numPages > 1 && (
                              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full flex gap-4 items-center backdrop-blur-md border border-white/20">
                                  <button onClick={() => setPdfPageNumber(p => Math.max(1, p - 1))} disabled={pdfPageNumber <= 1} className="disabled:opacity-30"><ChevronLeft className="w-5 h-5"/></button>
                                  <span className="text-sm font-mono">{pdfPageNumber} / {numPages}</span>
                                  <button onClick={() => setPdfPageNumber(p => Math.min(numPages, p + 1))} disabled={pdfPageNumber >= numPages} className="disabled:opacity-30"><ChevronRight className="w-5 h-5"/></button>
                              </div>
                          )}
                      </div>
                  ) : (
                      // Image Viewer with simple multi-page support if 'pages' exists
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                          <img 
                            src={viewingDoc.pages && viewingDoc.pages.length > 0 ? viewingDoc.pages[viewPage] : viewingDoc.fileUrl} 
                            alt="Doc" 
                            className="max-w-full max-h-full object-contain" 
                          />
                          
                          {viewingDoc.pages && viewingDoc.pages.length > 1 && (
                              <>
                                  <button 
                                    onClick={() => setViewPage(p => Math.max(0, p - 1))} 
                                    disabled={viewPage === 0}
                                    className="absolute left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-0 transition-opacity"
                                  >
                                      <ChevronLeft className="w-6 h-6" />
                                  </button>
                                  <button 
                                    onClick={() => setViewPage(p => Math.min(viewingDoc.pages!.length - 1, p + 1))} 
                                    disabled={viewingDoc.pages && viewPage === viewingDoc.pages.length - 1}
                                    className="absolute right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-0 transition-opacity"
                                  >
                                      <ChevronRight className="w-6 h-6" />
                                  </button>
                                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-bold">
                                      {viewPage + 1} / {viewingDoc.pages.length}
                                  </div>
                              </>
                          )}
                      </div>
                  )}
              </div>
           </div>
        </div>
      )}

    </div>
  );
};