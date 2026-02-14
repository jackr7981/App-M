import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MarinerDocument, DocumentCategory } from '../types';
import { Plus, X, Camera, Upload, Calendar, Hash, FileText, Check, Loader2, Trash2, Filter, Edit, SwitchCamera, AlertCircle, RefreshCw, FileSpreadsheet, File, Download, AlertTriangle, ChevronLeft, ChevronRight, Layers, Trash, Clock, List, Grid, Eye, ScanLine, Copy, Merge, QrCode, Award, Stethoscope, CreditCard, Plane, FileCheck, Shield, Sparkles, WifiOff, ImageOff } from 'lucide-react';
import { analyzeDocumentImage } from '../services/geminiService';
import { Document, Page, pdfjs } from 'react-pdf';
// @ts-ignore - jsqr is imported via importmap
import jsQR from 'jsqr';
import { supabase, isMockMode } from '../services/supabase';
import { formatDate } from '../utils/format';

// Configure PDF worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;

interface DocumentsProps {
    documents: MarinerDocument[];
    onAddDocument: (doc: MarinerDocument) => void;
    onUpdateDocument: (doc: MarinerDocument) => void;
    onDeleteDocument: (id: string) => void;
    userName?: string;
    readOnly?: boolean;
}

interface PendingFile {
    id: string;
    fileUrl: string;
    fileName: string;
    originalBlob?: Blob;
}

type ExpiryFilterType = 'all' | 'expired' | '1m' | '3m' | '6m' | '12m';

export const Documents: React.FC<DocumentsProps> = ({ documents, onAddDocument, onUpdateDocument, onDeleteDocument, userName, readOnly = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<MarinerDocument | null>(null);
    const [viewPage, setViewPage] = useState(0);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Offline State
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Upload/Processing State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedPages, setSelectedPages] = useState<string[]>([]);
    const [selectedFileName, setSelectedFileName] = useState<string>('');
    const [uploadQueue, setUploadQueue] = useState<PendingFile[]>([]);

    // Merge Logic State
    const [isMergePromptOpen, setIsMergePromptOpen] = useState(false);
    const [mergeRejected, setMergeRejected] = useState(false);

    const [isScanning, setIsScanning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [scanResult, setScanResult] = useState<{ title: string; expiry: string; number: string; category: string } | null>(null);

    // Form Data State (Controlled Inputs)
    const [formData, setFormData] = useState({
        title: '',
        documentNumber: '',
        expiryDate: '',
        category: ''
    });

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
    const [cameraMode, setCameraMode] = useState<'photo' | 'qr'>('photo');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync scanResult with formData when scan completes
    useEffect(() => {
        if (scanResult) {
            setFormData({
                title: scanResult.title || '',
                documentNumber: scanResult.number || '',
                expiryDate: normalizeDate(scanResult.expiry || ''),
                category: scanResult.category || DocumentCategory.OTHER
            });
        }
    }, [scanResult]);

    // Helper: Convert Base64 to Blob
    const base64ToBlob = async (base64: string): Promise<Blob> => {
        const res = await fetch(base64);
        return await res.blob();
    };

    // Helper: Normalize date to YYYY-MM-DD format
    const normalizeDate = (dateString: string): string => {
        if (!dateString || dateString === 'N/A' || dateString.trim() === '') return '';

        try {
            // Try parsing the date string
            const date = new Date(dateString);

            // Check if date is valid
            if (isNaN(date.getTime())) {
                // Try alternative formats: DD/MM/YYYY, DD-MM-YYYY, etc.
                const parts = dateString.split(/[/-]/);
                if (parts.length === 3) {
                    // Try DD/MM/YYYY format
                    const [day, month, year] = parts;
                    const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    if (!isNaN(parsedDate.getTime())) {
                        const yyyy = parsedDate.getFullYear();
                        const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
                        const dd = String(parsedDate.getDate()).padStart(2, '0');
                        return `${yyyy}-${mm}-${dd}`;
                    }
                }
                return '';
            }

            // Format as YYYY-MM-DD
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            // Validate year is in reasonable range
            if (year < 1900 || year > 2099) {
                console.warn(`Date year ${year} out of valid range (1900-2099)`);
                return '';
            }

            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Date normalization error:', error);
            return '';
        }
    };

    // Helper: Compress image via canvas — max 1200px, JPEG quality 0.7
    const compressImage = (base64: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const MAX_DIM = 1200;
                let w = img.width;
                let h = img.height;
                if (w > MAX_DIM || h > MAX_DIM) {
                    if (w > h) { h = Math.round((h / w) * MAX_DIM); w = MAX_DIM; }
                    else { w = Math.round((w / h) * MAX_DIM); h = MAX_DIM; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => resolve(base64); // Fallback to original on error
            img.src = base64;
        });
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
        return docs;
    }, [documents, activeFilter, activeExpiryFilter]);

    useEffect(() => {
        function handleResize() {
            setContainerWidth(Math.min(window.innerWidth - 48, 800));
        }
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Queue Processing
    useEffect(() => {
        if (!isCameraOpen && !selectedImage && uploadQueue.length > 0 && !editingId && !isMergePromptOpen) {
            if (uploadQueue.length > 1 && !mergeRejected) {
                setIsMergePromptOpen(true);
                return;
            }
            const nextFile = uploadQueue[0];
            setUploadQueue(prev => prev.slice(1));

            setSelectedImage(nextFile.fileUrl);
            setSelectedPages([]);
            setSelectedFileName(nextFile.fileName);
            processImage(nextFile.fileUrl, nextFile.fileName);
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
                        videoRef.current.play().catch(e => console.log("Play error", e));
                    }
                } catch (err) {
                    console.error("Camera Error:", err);
                    setCameraError("Access denied. Please enable camera permissions.");
                }
            };
            startCamera();
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isCameraOpen, facingMode]);

    const capturePhoto = async () => {
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
                const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                const compressed = await compressImage(rawDataUrl);
                const fileName = `Captured_Photo_${Date.now()}.jpg`;
                setUploadQueue(prev => [...prev, {
                    id: Date.now().toString(),
                    fileUrl: compressed,
                    fileName: fileName
                }]);
                setIsCameraOpen(false);
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
                reader.onloadend = async () => {
                    const rawBase64 = reader.result as string;
                    // Compress images (skip PDFs)
                    const isPdf = file.type === 'application/pdf';
                    const base64 = isPdf ? rawBase64 : await compressImage(rawBase64);
                    newQueueItems.push({
                        id: Math.random().toString(36).substr(2, 9),
                        fileUrl: base64,
                        fileName: file.name,
                        originalBlob: file
                    });
                    processedCount++;
                    if (processedCount === files.length) {
                        setUploadQueue(prev => [...prev, ...newQueueItems]);
                        setMergeRejected(false);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const scanQRCodeFromImage = async (base64: string): Promise<{ expiry?: string, number?: string } | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }

                // PERFORMANCE FIX: Downscale to max 800px for QR scanning to prevent thread lockup
                const MAX_SCAN_DIMENSION = 800;
                let width = img.width;
                let height = img.height;
                if (width > MAX_SCAN_DIMENSION || height > MAX_SCAN_DIMENSION) {
                    if (width > height) {
                        height = (height / width) * MAX_SCAN_DIMENSION;
                        width = MAX_SCAN_DIMENSION;
                    } else {
                        width = (width / height) * MAX_SCAN_DIMENSION;
                        height = MAX_SCAN_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "dontInvert",
                });

                if (code) {
                    const text = code.data;
                    const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/;
                    const dateMatch = text.match(dateRegex);
                    let foundExpiry = undefined;
                    if (dateMatch) {
                        foundExpiry = dateMatch[0].replace(/\//g, '-');
                    }
                    let foundNumber = undefined;
                    const numberMatch = text.match(/(?:No|Doc|CDC)[:\s]*([A-Z0-9/-]+)/i);
                    if (numberMatch) {
                        foundNumber = numberMatch[1];
                    } else if (text.length < 20 && /^[A-Z0-9/-]+$/.test(text)) {
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
        // Guard: prevent duplicate scans from useEffect re-triggers
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        setIsScanning(true);
        setDuplicateWarning(null);
        setFormData({ title: fileName, documentNumber: '', expiryDate: '', category: DocumentCategory.OTHER });

        // Stagger process to allow loader to render
        setTimeout(async () => {
            try {
                // If offline, skip Gemini analysis
                if (isOffline) {
                    setScanResult({
                        title: fileName,
                        expiry: '',
                        number: '',
                        category: DocumentCategory.OTHER
                    });
                    setIsScanning(false);
                    return;
                }

                const [geminiData, qrData] = await Promise.all([
                    analyzeDocumentImage(base64),
                    scanQRCodeFromImage(base64)
                ]);

                let formattedTitle = geminiData.documentName;
                if (!formattedTitle || formattedTitle === 'Unknown Document' || formattedTitle === '') {
                    formattedTitle = fileName.split('.').slice(0, -1).join('.') || fileName;
                }
                // Replace long certificate names with abbreviations
                formattedTitle = formattedTitle.replace(/Certificate of Proficiency/gi, 'COP');
                formattedTitle = formattedTitle.replace(/Certificate of Competency/gi, 'COC');

                const finalExpiry = qrData?.expiry || (geminiData.expiryDate !== 'N/A' ? geminiData.expiryDate : '');
                const finalNumber = qrData?.number || (geminiData.documentNumber !== 'N/A' ? geminiData.documentNumber : '');
                const finalCategory = geminiData.category !== 'N/A' && geminiData.category !== 'Other' ? geminiData.category : DocumentCategory.CERTIFICATE;

                setScanResult({
                    title: formattedTitle,
                    expiry: finalExpiry,
                    number: finalNumber,
                    category: finalCategory
                });
                setIsScanning(false);
                isProcessingRef.current = false;
            } catch (error: any) {
                console.error("Scanning Error:", error);
                setIsScanning(false);
                isProcessingRef.current = false;
                // Alert on ALL errors to help debugging
                alert("Document Scan Failed: " + (error.message || "Unknown error"));
            }
        }, 100);
    };

    const handleEditClick = (doc: MarinerDocument, e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly || isOffline) return; // Prevent edit if offline
        setEditingId(doc.id);
        setSelectedImage(doc.fileUrl);
        setSelectedPages(doc.pages || []);
        setSelectedFileName(doc.title);
        setFormData({
            title: doc.title,
            documentNumber: doc.documentNumber,
            expiryDate: normalizeDate(doc.expiryDate),
            category: doc.category
        });
        setUploadQueue([]);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (isOffline) {
            alert("You are offline. Cannot save changes.");
            return;
        }

        if (selectedImage) {
            if (!duplicateWarning && !editingId) {
                const duplicate = documents.find(d =>
                    (d.documentNumber === formData.documentNumber && formData.documentNumber && formData.documentNumber !== 'N/A')
                );
                if (duplicate) {
                    setDuplicateWarning(`Possible duplicate: Document #${duplicate.documentNumber} already exists ("${duplicate.title}")`);
                    return;
                }
            }

            setIsSaving(true);

            // Validate and normalize expiry date
            let validatedExpiryDate = null;
            if (formData.expiryDate && formData.expiryDate !== 'N/A') {
                const normalized = normalizeDate(formData.expiryDate);
                if (normalized) {
                    // Double-check date is in valid range
                    const year = parseInt(normalized.split('-')[0]);
                    if (year >= 1900 && year <= 2099) {
                        validatedExpiryDate = normalized;
                    } else {
                        setIsSaving(false);
                        alert(`Invalid expiry date: Year ${year} is out of valid range (1900-2099). Please enter a valid date.`);
                        return;
                    }
                } else if (formData.expiryDate.trim() !== '') {
                    // User entered something but it's not a valid date
                    setIsSaving(false);
                    alert('Invalid expiry date format. Please use the date picker or enter a valid date.');
                    return;
                }
            }

            const finalDocData = {
                title: formData.title || selectedFileName,
                category: formData.category,
                documentNumber: formData.documentNumber,
                expiryDate: validatedExpiryDate,
            };

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Not authenticated");

                let mainFilePath = '';
                let pagePaths: string[] = [];

                const uploadFile = async (blob: Blob, fileName: string) => {
                    const ext = fileName.split('.').pop() || 'jpg';
                    const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
                    const { error } = await supabase.storage.from('documents').upload(path, blob);
                    if (error) throw error;
                    return path;
                };

                const mainBlob = await base64ToBlob(selectedImage);
                mainFilePath = await uploadFile(mainBlob, selectedFileName);

                if (selectedPages.length > 0) {
                    for (const pageBase64 of selectedPages) {
                        const pageBlob = await base64ToBlob(pageBase64);
                        const pPath = await uploadFile(pageBlob, 'page.jpg');
                        pagePaths.push(pPath);
                    }
                }

                const docPayload = {
                    user_id: user.id,
                    title: finalDocData.title,
                    category: finalDocData.category,
                    document_number: finalDocData.documentNumber,
                    expiry_date: finalDocData.expiryDate,
                    file_path: mainFilePath,
                    page_paths: pagePaths.length > 0 ? pagePaths : null
                };

                if (editingId) {
                    const { error } = await supabase.from('documents').update(docPayload).eq('id', editingId);
                    if (error) throw error;
                    onUpdateDocument({ ...docPayload, id: editingId, fileUrl: '', uploadDate: 0, category: finalDocData.category as DocumentCategory, title: finalDocData.title, documentNumber: finalDocData.documentNumber, expiryDate: finalDocData.expiryDate || 'N/A' } as any);
                } else {
                    const { error } = await supabase.from('documents').insert(docPayload);
                    if (error) throw error;
                    onAddDocument({ ...docPayload, id: 'temp', fileUrl: '', uploadDate: 0, category: finalDocData.category as DocumentCategory, title: finalDocData.title, documentNumber: finalDocData.documentNumber, expiryDate: finalDocData.expiryDate || 'N/A' } as any);
                }
                handleCloseModal();
            } catch (error: any) {
                console.error('Upload error:', error);
                alert("Failed to save document: " + error.message);
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
        setSelectedPages([]);
        setSelectedFileName('');
        setScanResult(null);
        setIsScanning(false);
        setIsSaving(false);
        setEditingId(null);
        setIsCameraOpen(false);
        setCameraError(null);
        setDuplicateWarning(null);
        setUploadQueue([]);
        setIsMergePromptOpen(false);
        setMergeRejected(false);
        setFormData({ title: '', documentNumber: '', expiryDate: '', category: '' });
    };

    const confirmDelete = async () => {
        if (isOffline) {
            alert("You are offline. Cannot delete documents.");
            return;
        }
        if (deleteId) {
            try {
                // 1. Clean up Storage (Prevent Orphans)
                const { data: docData } = await supabase
                    .from('documents')
                    .select('file_path, page_paths')
                    .eq('id', deleteId)
                    .single();

                if (docData) {
                    const filesToRemove = [docData.file_path, ...(docData.page_paths || [])].filter(Boolean);
                    if (filesToRemove.length > 0) {
                        const { error: storageError } = await supabase.storage.from('documents').remove(filesToRemove);
                        if (storageError) console.warn("Storage cleanup warning:", storageError.message);
                    }
                }

                // 2. Delete DB Record
                const { error } = await supabase.from('documents').delete().eq('id', deleteId);
                if (error) throw error;

                onDeleteDocument(deleteId);
                if (viewingDoc && viewingDoc.id === deleteId) {
                    setViewingDoc(null);
                }
            } catch (error: any) {
                console.error("Delete failed", error);
                alert("Failed to delete document: " + (error.message || "Unknown Error"));
            } finally {
                setDeleteId(null);
            }
        }
    };

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

            {/* Offline Banner */}
            {isOffline && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded-xl flex items-center gap-3 text-sm">
                    <WifiOff className="w-5 h-5 shrink-0" />
                    <div>
                        <span className="font-bold block">Offline Mode</span>
                        You can view cached documents, but cannot upload or edit.
                    </div>
                </div>
            )}

            {/* Header Actions */}
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">My Documents</h2>
                    <p className="text-sm text-slate-500">Manage certificates & licenses securely.</p>
                </div>

                {!readOnly && (
                    <div className={`grid grid-cols-3 gap-2 ${isOffline ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <button
                            onClick={() => { setCameraMode('qr'); setIsCameraOpen(true); }}
                            className="flex flex-col items-center justify-center gap-1 bg-slate-800 text-white p-3 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-transform active:scale-95 shadow-lg"
                            disabled={isOffline}
                        >
                            <QrCode className="w-5 h-5" />
                            <span>QR Scan</span>
                        </button>

                        <button
                            onClick={() => { setCameraMode('photo'); setIsCameraOpen(true); }}
                            className="flex flex-col items-center justify-center gap-1 bg-blue-600 text-white p-3 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-transform active:scale-95 shadow-lg"
                            disabled={isOffline}
                        >
                            <Camera className="w-5 h-5" />
                            <span>Photo</span>
                        </button>

                        <label className="flex flex-col items-center justify-center gap-1 bg-emerald-600 text-white p-3 rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-transform active:scale-95 cursor-pointer shadow-lg">
                            <Upload className="w-5 h-5" />
                            <span>File</span>
                            <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={handleFileSelect} disabled={isOffline} />
                        </label>
                    </div>
                )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
                {['All', ...Object.values(DocumentCategory)].map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center ${activeFilter === cat
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                    >
                        {cat === 'All' && <Filter className="w-3 h-3 mr-1.5" />}
                        {cat}
                    </button>
                ))}
            </div>

            {/* Documents Grid */}
            <div className="grid grid-cols-1 gap-4">
                {filteredDocuments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">No documents found.</p>
                        {!readOnly && !isOffline && (
                            <button onClick={() => { setCameraMode('photo'); setIsCameraOpen(true); }} className="text-blue-600 text-sm font-semibold mt-2 hover:underline">
                                Scan your first document
                            </button>
                        )}
                    </div>
                ) : (
                    filteredDocuments.map((doc) => {
                        const status = getExpiryStatus(doc.expiryDate);
                        const Icon = getCategoryIcon(doc.category);

                        return (
                            <div
                                key={doc.id}
                                onClick={() => setViewingDoc(doc)}
                                className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start mb-3 relative z-10">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${status.bg}`}>
                                            <Icon className={`w-5 h-5 ${status.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 leading-tight line-clamp-2">{doc.title}</h4>
                                            <p className="text-xs text-slate-500 mt-1 font-mono">{doc.documentNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${status.bg} ${status.color}`}>
                                            {status.label}
                                        </span>
                                        {doc.expiryDate !== 'N/A' && (
                                            <span className="text-[10px] text-slate-400 flex items-center">
                                                <Clock className="w-3 h-3 mr-1" /> {formatDate(doc.expiryDate)}
                                            </span>
                                        )}
                                        {doc.fileUrl && (
                                            <span className="text-[9px] text-slate-400 font-mono">
                                                {(() => { try { const b = Math.round((doc.fileUrl.length * 3) / 4); return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : (b / 1024).toFixed(0) + ' KB'; } catch { return ''; } })()}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Thumbnail Strip */}
                                {doc.fileUrl && !(doc.fileUrl.toLowerCase().includes('.pdf') || doc.fileUrl.includes('application/pdf')) && (
                                    <div className="h-24 w-full bg-slate-100 rounded-lg overflow-hidden relative mt-2">
                                        <img
                                            src={doc.fileUrl}
                                            alt="preview"
                                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            onError={(e) => {
                                                // Fallback for offline images
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                                const iconContainer = document.createElement('div');
                                                iconContainer.className = "flex flex-col items-center justify-center text-slate-400";
                                                iconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-1"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M21 21l-9-9-9 9"></path><path d="M21 5v13.5"></path><path d="M3 5v16h16"></path><path d="M3 5l16 16"></path></svg><span class="text-[10px]">Image Unavailable Offline</span>`;
                                                e.currentTarget.parentElement?.appendChild(iconContainer);
                                            }}
                                        />
                                        {doc.pages && doc.pages.length > 0 && (
                                            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center backdrop-blur-sm">
                                                <Layers className="w-3 h-3 mr-1" /> +{doc.pages.length}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Edit/Delete Actions - ALWAYS VISIBLE for Mobile UX */}
                                {!readOnly && (
                                    <div className="absolute top-2 right-2 flex gap-2 z-20">
                                        <button
                                            onClick={(e) => handleEditClick(doc, e)}
                                            className={`p-2 bg-white/90 text-slate-700 rounded-full shadow-sm hover:text-blue-600 border border-slate-200 backdrop-blur-sm transition-colors ${isOffline ? 'hidden' : ''}`}
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteId(doc.id); }}
                                            className={`p-2 bg-white/90 text-slate-700 rounded-full shadow-sm hover:text-red-600 border border-slate-200 backdrop-blur-sm transition-colors ${isOffline ? 'hidden' : ''}`}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Document?</h3>
                        <p className="text-sm text-slate-500 mb-6">This action cannot be undone. The file will be permanently removed.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-900/20">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Detail Viewer */}
            {viewingDoc && (
                <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-in slide-in-from-bottom">
                    <div className="bg-black/50 backdrop-blur-md text-white p-4 flex justify-between items-center z-10">
                        <button onClick={() => { setViewingDoc(null); setViewPage(0); }} className="p-2 hover:bg-white/10 rounded-full"><ChevronLeft className="w-6 h-6" /></button>
                        <div className="text-center">
                            <h3 className="font-bold text-sm max-w-[200px] truncate">{viewingDoc.title}</h3>
                            <p className="text-xs text-slate-400">{viewPage + 1} / {(viewingDoc.pages?.length || 0) + 1}</p>
                        </div>
                        <div className="w-10"></div> {/* Spacer */}
                    </div>

                    <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
                        {/* Main Image or Page */}
                        {viewPage === 0 ? (
                            viewingDoc.fileUrl.toLowerCase().includes('.pdf') || viewingDoc.fileUrl.includes('application/pdf') ? (
                                <div className="bg-white p-2 rounded shadow-lg max-w-full">
                                    <Document
                                        file={{ url: viewingDoc.fileUrl }}
                                        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                                        onLoadError={(error) => {
                                            console.error('PDF load error:', error);
                                        }}
                                        loading={
                                            <div className="flex flex-col items-center justify-center p-8">
                                                <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
                                                <p className="text-slate-600 text-sm">Loading PDF...</p>
                                            </div>
                                        }
                                        error={
                                            <div className="flex flex-col items-center justify-center p-8 bg-slate-100 rounded-lg">
                                                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                                                <p className="text-slate-700 font-semibold mb-2">Failed to load PDF</p>
                                                <p className="text-slate-500 text-sm mb-4">The PDF preview is not available</p>
                                                <a
                                                    href={viewingDoc.fileUrl}
                                                    download
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download PDF
                                                </a>
                                            </div>
                                        }
                                    >
                                        <Page
                                            pageNumber={pdfPageNumber}
                                            width={Math.min(window.innerWidth - 40, 600)}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </Document>
                                    {numPages && (
                                        <div className="flex justify-between items-center mt-2 px-2">
                                            <button disabled={pdfPageNumber <= 1} onClick={() => setPdfPageNumber(p => p - 1)} className="text-slate-800 disabled:opacity-30 p-2 hover:bg-slate-100 rounded"><ChevronLeft /></button>
                                            <span className="text-xs text-slate-600 font-medium">Page {pdfPageNumber} of {numPages}</span>
                                            <button disabled={pdfPageNumber >= numPages} onClick={() => setPdfPageNumber(p => p + 1)} className="text-slate-800 disabled:opacity-30 p-2 hover:bg-slate-100 rounded"><ChevronRight /></button>
                                        </div>
                                    )}
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <a
                                            href={viewingDoc.fileUrl}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                        >
                                            <Download className="w-4 h-4" />
                                            Download PDF
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <img
                                    src={viewingDoc.fileUrl}
                                    alt="Document"
                                    className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'text-white');
                                        const msg = document.createElement('div');
                                        msg.innerHTML = '<div class="p-4 bg-slate-800 rounded-xl flex flex-col items-center"><svg class="w-12 h-12 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-sm font-bold">Image Unavailable Offline</span></div>';
                                        e.currentTarget.parentElement?.appendChild(msg);
                                    }}
                                />
                            )
                        ) : (
                            <img
                                src={viewingDoc.pages?.[viewPage - 1]}
                                alt={`Page ${viewPage}`}
                                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                    </div>

                    {/* Thumbnails Footer */}
                    {(viewingDoc.pages && viewingDoc.pages.length > 0) && (
                        <div className="h-20 bg-black/80 flex items-center gap-2 px-4 overflow-x-auto">
                            <button
                                onClick={() => setViewPage(0)}
                                className={`h-14 w-10 shrink-0 rounded border-2 overflow-hidden transition-all ${viewPage === 0 ? 'border-blue-500 opacity-100 scale-105' : 'border-transparent opacity-50'}`}
                            >
                                {viewingDoc.fileUrl.toLowerCase().includes('.pdf') || viewingDoc.fileUrl.includes('application/pdf') ? (
                                    <div className="w-full h-full bg-white flex items-center justify-center"><FileText className="w-4 h-4 text-slate-800" /></div>
                                ) : (
                                    <img src={viewingDoc.fileUrl} className="w-full h-full object-cover" alt="Main" />
                                )}
                            </button>
                            {viewingDoc.pages.map((page, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setViewPage(idx + 1)}
                                    className={`h-14 w-10 shrink-0 rounded border-2 overflow-hidden transition-all ${viewPage === idx + 1 ? 'border-blue-500 opacity-100 scale-105' : 'border-transparent opacity-50'}`}
                                >
                                    <img src={page} className="w-full h-full object-cover" alt={`p${idx}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-5">

                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-lg text-slate-800">{editingId ? 'Edit Document' : 'Save Document'}</h3>
                            <button onClick={handleCloseModal} className="p-1 rounded-full hover:bg-slate-200"><X className="w-6 h-6 text-slate-500" /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5">

                            {/* Image Preview */}
                            <div className="relative h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center group">
                                {selectedImage ? (
                                    <>
                                        <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                        <button onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <span className="text-xs text-slate-400 font-medium">No image selected</span>
                                    </div>
                                )}
                                {(isScanning || isSaving) && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2 text-emerald-400" />
                                        <span className="text-sm font-bold">{isSaving ? 'Saving Document...' : 'Analyzing with Gemini AI...'}</span>
                                        <span className="text-xs opacity-70 mt-1">{isSaving ? 'Uploading to server' : 'Extracting details automatically'}</span>
                                    </div>
                                )}
                            </div>

                            {/* Duplicate Warning */}
                            {duplicateWarning && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-xs flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block mb-1">Duplicate Detected</span>
                                        {duplicateWarning}
                                        <div className="mt-2 flex gap-2">
                                            <button onClick={() => setDuplicateWarning(null)} className="underline text-amber-900 font-bold">Save Anyway</button>
                                            <button onClick={handleCloseModal} className="text-amber-700">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Form Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Title</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                                        placeholder="e.g. CDC, COC, Passport"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doc Number</label>
                                        <div className="relative">
                                            <Hash className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                value={formData.documentNumber}
                                                onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                                                className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                                                placeholder="XXXXXX"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                            <input
                                                type="date"
                                                value={formData.expiryDate}
                                                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                                min="1900-01-01"
                                                max="2099-12-31"
                                                className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.values(DocumentCategory).map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: cat })}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.category === cat
                                                    ? 'bg-slate-800 text-white border-slate-800'
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

                        <div className="p-4 border-t border-slate-100 flex gap-3">
                            <button onClick={handleCloseModal} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={isScanning || isSaving || !formData.title || isOffline}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center transition-all"
                            >
                                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : isScanning ? <Loader2 className="animate-spin w-5 h-5" /> : (editingId ? 'Update' : 'Save Document')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Merge Prompt Modal */}
            {isMergePromptOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-in zoom-in-95">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600 mx-auto">
                            <Merge className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Multiple Pages Detected</h3>
                        <p className="text-sm text-slate-500 text-center mb-6">
                            You uploaded {uploadQueue.length + 1} images. Do you want to merge them into a single document (e.g. front & back)?
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    // Merge logic: Take first as main, others as pages
                                    const main = uploadQueue[0];
                                    const others = uploadQueue.slice(1);

                                    setSelectedImage(main.fileUrl);
                                    setSelectedFileName(main.fileName);
                                    setSelectedPages(others.map(f => f.fileUrl));

                                    // Process main image
                                    processImage(main.fileUrl, main.fileName);

                                    // Clear queue and open modal
                                    setUploadQueue([]);
                                    setIsMergePromptOpen(false);
                                    setIsModalOpen(true);
                                }}
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700"
                            >
                                Yes, Merge All
                            </button>
                            <button
                                onClick={() => {
                                    setMergeRejected(true);
                                    setIsMergePromptOpen(false);
                                }}
                                className="w-full py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50"
                            >
                                No, Upload Separately
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Camera Interface */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[60] bg-black flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                        <button onClick={() => setIsCameraOpen(false)} className="text-white p-2 rounded-full bg-white/10 backdrop-blur-md"><X className="w-6 h-6" /></button>
                        <span className="text-white font-bold text-lg drop-shadow-md">{cameraMode === 'qr' ? 'Scan QR Code' : 'Take Photo'}</span>
                        <button onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')} className="text-white p-2 rounded-full bg-white/10 backdrop-blur-md"><SwitchCamera className="w-6 h-6" /></button>
                    </div>

                    <div className="flex-1 relative overflow-hidden">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline muted></video>
                        <canvas ref={canvasRef} className="hidden"></canvas>

                        {/* OVERLAYS */}
                        {cameraMode === 'qr' ? (
                            // QR Overlay
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-64 h-64 border-2 border-emerald-400 relative rounded-xl bg-black/10 backdrop-blur-[2px]">
                                    <div className="absolute inset-0 border-[20px] border-black/30 mask-image-scan"></div>
                                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg -mt-1 -ml-1"></div>
                                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg -mt-1 -mr-1"></div>
                                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg -mb-1 -ml-1"></div>
                                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg -mb-1 -mr-1"></div>
                                    <div className="w-full h-0.5 bg-red-500 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
                                </div>
                                <p className="absolute bottom-1/4 text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">Point at QR Code</p>
                            </div>
                        ) : (
                            // Document Photo Overlay
                            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                                {/* Darkened background with clear center using box-shadow */}
                                <div className="w-[85%] aspect-[3/4] rounded-lg relative shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                                    {/* Corner Markers */}
                                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-lg shadow-sm"></div>
                                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-lg shadow-sm"></div>
                                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-lg shadow-sm"></div>
                                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-lg shadow-sm"></div>

                                    {/* Grid Lines (Optional) */}
                                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
                                        <div className="border-r border-white"></div>
                                        <div className="border-r border-white"></div>
                                        <div className="border-b border-white col-span-3 row-start-1"></div>
                                        <div className="border-b border-white col-span-3 row-start-2"></div>
                                    </div>
                                </div>
                                <p className="absolute bottom-[15%] text-white text-sm font-bold bg-black/60 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 shadow-lg mt-8">Align Document within Frame</p>
                            </div>
                        )}

                        {cameraError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 p-6 text-center">
                                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                    <p className="text-white font-bold">{cameraError}</p>
                                    <button onClick={() => setIsCameraOpen(false)} className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg">Close</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer / Trigger */}
                    <div className="p-8 bg-black/50 backdrop-blur-md flex justify-center items-center gap-8 absolute bottom-0 left-0 right-0 z-10">
                        {cameraMode === 'photo' && (
                            <button
                                onClick={capturePhoto}
                                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform shadow-lg relative"
                            >
                                <div className="w-16 h-16 bg-white rounded-full"></div>
                            </button>
                        )}
                        {cameraMode === 'qr' && (
                            <p className="text-white text-xs opacity-70 max-w-[200px] text-center">
                                Camera is scanning... Results will appear automatically.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};