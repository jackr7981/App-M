import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MarinerDocument, DocumentCategory } from '../types';
import { Plus, X, Camera, Upload, Calendar, Hash, FileText, Check, Loader2, Trash2, Filter, Edit, SwitchCamera, AlertCircle, RefreshCw, FileSpreadsheet, File, Download, AlertTriangle, ChevronLeft, ChevronRight, Layers, Trash, Clock, List, Grid, Eye, ScanLine, Copy, Merge, QrCode, Award, Stethoscope, CreditCard, Plane, FileCheck, Shield, Sparkles } from 'lucide-react';
import { analyzeDocumentImage } from '../services/geminiService';
import { Document, Page, pdfjs } from 'react-pdf';
// @ts-ignore - jsqr is imported via importmap
import jsQR from 'jsqr';
import { supabase, isMockMode } from '../services/supabase';
import { formatDate } from '../utils/format';

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
                    <input type="file" multiple className="