import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  CameraIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ExclamationIcon,
  LogoutIcon,
  DocumentReportIcon
} from '@heroicons/react/outline';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import logo from '../assets/2gonzlogo.png';

// More robust Buffer polyfill
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = class Buffer extends Uint8Array {
    constructor(input, encodingOrOffset, length) {
      if (typeof input === 'string') {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(input);
        super(bytes);
      } else if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        super(input);
      } else if (Array.isArray(input)) {
        super(input);
      } else {
        super(input || 0);
      }
    }

    static from(input, encodingOrOffset, length) {
      return new Buffer(input, encodingOrOffset, length);
    }

    static isBuffer(obj) {
      return obj instanceof Buffer;
    }

    toString(encoding = 'utf8') {
      const decoder = new TextDecoder(encoding);
      return decoder.decode(this);
    }
  };
}

export default function ConciergePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('scanner');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const [scannedCodes, setScannedCodes] = useState(() => {
    const savedCodes = localStorage.getItem('scannedCodes');
    return savedCodes ? new Set(JSON.parse(savedCodes)) : new Set();
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [borrowedSearchTerm, setBorrowedSearchTerm] = useState('');
  const [currentBorrowedPage, setCurrentBorrowedPage] = useState(1);
  const [returnedItems, setReturnedItems] = useState([]);
  const [returnedSearchTerm, setReturnedSearchTerm] = useState('');
  const [currentReturnedPage, setCurrentReturnedPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 5;

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  // Convert logo to base64 data URL with error handling
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoError, setLogoError] = useState(null);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState({ type: '', message: '' });

  useEffect(() => {
    const convertLogoToDataUrl = async () => {
      try {
        const response = await fetch(logo);
        if (!response.ok) {
          throw new Error(`Failed to fetch logo: ${response.statusText}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoDataUrl(reader.result);
          setLogoError(null);
        };
        reader.onerror = () => {
          setLogoError('Failed to convert logo to data URL');
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error converting logo:', error);
        setLogoError(error.message);
      }
    };

    convertLogoToDataUrl();
  }, []);

  // Date validation
  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('End date cannot be before start date');
      return false;
    }
    return true;
  };

  // Scanner logic
  const startScanner = async () => {
    try {
      const qrCode = new Html5Qrcode("reader");
      setHtml5QrCode(qrCode);
      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0,
          disableFlip: false,
          delayBetweenScanAttempts: 500,
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        (decodedText) => {
          handleScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore errors during scanning
        }
      );
      const readerElement = document.getElementById('reader');
      if (readerElement) {
        readerElement.style.border = '2px solid #4F46E5';
        readerElement.style.borderRadius = '1rem';
        readerElement.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      showStatusMessage('error', 'Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        setHtml5QrCode(null);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
    
    // Cleanup function
    return () => {
      if (html5QrCode) {
        stopScanner();
      }
    };
  }, [scanning]);

  // Add useEffect to persist scanned codes to localStorage
  useEffect(() => {
    localStorage.setItem('scannedCodes', JSON.stringify([...scannedCodes]));
  }, [scannedCodes]);

  const handleScan = async (decodedText) => {
    try {
      setScanning(false);
      
      // Parse QR code data first
      let orderData;
      try {
        orderData = JSON.parse(decodedText);
      } catch (e) {
        showStatusMessage('error', 'Invalid QR code format');
        return;
      }

      if (!orderData.studentId || !orderData.items) {
        showStatusMessage('error', 'Invalid QR code data');
        return;
      }

      const scanIdentifier = `${orderData.studentId}-${orderData.timestamp}`;
      
      // Check both local state and localStorage for scanned codes
      const savedCodes = localStorage.getItem('scannedCodes');
      const savedCodesSet = savedCodes ? new Set(JSON.parse(savedCodes)) : new Set();
      
      // Check for duplicates before making API call
      if (scannedCodes.has(scanIdentifier) || savedCodesSet.has(scanIdentifier)) {
        showStatusMessage('error', 'This QR code has already been scanned. Please wait a moment before trying again.');
        setScanning(true); // Restart scanner
        return;
      }

      if (isCooldown) {
        showStatusMessage('error', 'Please wait a moment before scanning again.');
        setScanning(true); // Restart scanner
        return;
      }
      
      // Set cooldown and update scanned codes BEFORE making API call
      setIsCooldown(true);
      const newScannedCodes = new Set([...scannedCodes, scanIdentifier]);
      setScannedCodes(newScannedCodes);
      localStorage.setItem('scannedCodes', JSON.stringify([...newScannedCodes]));
      
      // Check if this is a return QR code
      if (orderData.type === 'return') {
        const response = await axios.post(
          `${baseUrl}/api/concierge/return-item`,
          orderData,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        
        showStatusMessage('success', 'Items returned successfully!');
      } else {
        // Handle regular borrow QR code
        try {
          const response = await axios.post(
            `${baseUrl}/api/concierge/scan`,
            orderData,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          
          showStatusMessage('success', 'QR Code scanned successfully!');
        } catch (error) {
          // If server detects a duplicate, show the server's error message
          if (error.response?.data?.message) {
            showStatusMessage('error', error.response.data.message);
          } else {
            showStatusMessage('error', 'Failed to process QR code. Please try again.');
          }
          // Remove the scan from our local tracking since it failed
          const updatedCodes = new Set([...scannedCodes]);
          updatedCodes.delete(scanIdentifier);
          setScannedCodes(updatedCodes);
          localStorage.setItem('scannedCodes', JSON.stringify([...updatedCodes]));
        }
      }
      
      // Set cooldown to 3 seconds
      setTimeout(() => {
        setIsCooldown(false);
        setScanning(true); // Restart scanner after cooldown
      }, 3000);
    } catch (err) {
      console.error('Error scanning QR code:', err);
      showStatusMessage('error', err.response?.data?.message || 'Invalid QR Code or failed to save');
      // Reset cooldown on error and restart scanner
      setTimeout(() => {
        setIsCooldown(false);
        setScanning(true);
      }, 3000);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };
  const handleConfirmLogout = () => {
    // Clear all local storage items
    localStorage.removeItem('cafeteria-user');
    localStorage.removeItem('scannedCodes');
    
    // Stop scanner if active
    if (html5QrCode) {
      stopScanner();
    }
    
    // Clear all state
    setScannedCodes(new Set());
    setBorrowedItems([]);
    setReturnedItems([]);
    setError('');
    setSuccess('');
    
    // Logout and navigate
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };
  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Fetch borrowed items with date filter
  const fetchBorrowedItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/concierge/borrowed-items?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Get current items and new items
      const currentItems = borrowedItems;
      const newItems = res.data.data.filter(item => item.status === 'borrowed')
        .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));

      // Create a Set of existing item identifiers for faster lookup
      const existingItemIds = new Set(
        currentItems.map(item => 
          `${item.studentId}-${item.borrowTime.getTime()}-${JSON.stringify(item.items)}`
        )
      );

      // Only add items that don't already exist in our current list
      const uniqueNewItems = newItems.filter(item => {
        const itemId = `${item.studentId}-${new Date(item.borrowTime).getTime()}-${JSON.stringify(item.items)}`;
        return !existingItemIds.has(itemId);
      });

      // If we have new items, update the state
      if (uniqueNewItems.length > 0) {
        console.log('New borrowed items found:', uniqueNewItems.length);
        setBorrowedItems(prevItems => [...uniqueNewItems, ...prevItems]);
      }
    } catch (err) {
      console.error('Error fetching borrowed items:', err);
      setError('Failed to fetch borrowed items');
    }
  };

  // Polling for borrowed tab with cleanup
  useEffect(() => {
    let pollInterval;
    let isMounted = true;

    const pollBorrowedItems = async () => {
      if (isMounted && activeTab === 'borrowed') {
        await fetchBorrowedItems();
      }
    };

    if (activeTab === 'borrowed') {
      // Initial fetch
      pollBorrowedItems();
      // Poll every 5 seconds instead of 3
      pollInterval = setInterval(pollBorrowedItems, 5000);
    }

    return () => {
      isMounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [activeTab, token, startDate, endDate]);

  // Filter and paginate
  const filteredBorrowedItems = borrowedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(borrowedSearchTerm.toLowerCase())
  );
  const totalBorrowedPages = Math.ceil(filteredBorrowedItems.length / itemsPerPage);
  const paginatedBorrowedItems = filteredBorrowedItems.slice(
    (currentBorrowedPage - 1) * itemsPerPage,
    currentBorrowedPage * itemsPerPage
  );
  const handleBorrowedPageChange = (page) => setCurrentBorrowedPage(page);
  const handleBorrowedSearch = (e) => {
    setBorrowedSearchTerm(e.target.value);
    setCurrentBorrowedPage(1);
  };

  // Fetch returned items with date filter
  const fetchReturnedItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/concierge/returned-history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      const sortedReturned = items.sort((a, b) => new Date(b.returnTime) - new Date(a.returnTime));
      setReturnedItems(sortedReturned);
    } catch (err) {
      setError('Failed to fetch returned items');
    }
  };

  // Polling for returned tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'returned') {
      fetchReturnedItems();
      pollInterval = setInterval(fetchReturnedItems, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token]);

  // Filter and paginate
  const filteredReturnedItems = returnedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(returnedSearchTerm.toLowerCase())
  );
  const itemsPerPageReturned = 5;
  const totalReturnedPages = Math.ceil(filteredReturnedItems.length / itemsPerPageReturned);
  const paginatedReturnedItems = filteredReturnedItems.slice(
    (currentReturnedPage - 1) * itemsPerPageReturned,
    currentReturnedPage * itemsPerPageReturned
  );
  const handleReturnedPageChange = (page) => setCurrentReturnedPage(page);
  const handleReturnedSearch = (e) => {
    setReturnedSearchTerm(e.target.value);
    setCurrentReturnedPage(1);
  };

  // PDF styles and component
  const styles = StyleSheet.create({
    page: { padding: 10 },
    header: { 
      marginTop: 5,
      fontSize: 20, 
      marginBottom: 5, 
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    },
    logo: {
      width: 150,
      height: 150,
      marginBottom: 0,
      objectFit: 'contain'
    },
    table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf', marginTop: 5 },
    tableRow: { flexDirection: 'row' },
    tableCol: { borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf' },
    tableCell: { padding: 5, fontSize: 10, fontFamily: 'Helvetica' },
    headerCell: { padding: 5, fontSize: 12, fontWeight: 'bold', backgroundColor: '#f0f0f0', fontFamily: 'Helvetica-Bold' },
    title: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a1a',
      marginTop: 2
    },
    subtitle: {
      fontSize: 12,
      fontFamily: 'Helvetica',
      color: '#666666',
      marginTop: 1
    }
  });

  const PDFDocument = ({ data, type }) => {
    if (!data || data.length === 0) {
      return (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>No data available</Text>
          </Page>
        </Document>
      );
    }

    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Calculate column widths based on type
    const columnWidths = type === 'borrowed' 
      ? { studentId: '25%', items: '35%', borrowTime: '25%', status: '15%' }
      : { studentId: '20%', items: '30%', borrowTime: '20%', returnTime: '20%', status: '10%' };

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {logoDataUrl && !logoError && (
              <Image 
                src={logoDataUrl}
                style={styles.logo}
              />
            )}
            <Text style={styles.title}>{type === 'borrowed' ? 'Borrowed Items Report' : 'Returned Items Report'}</Text>
            <Text style={styles.subtitle}>
              {`From ${formatDate(startDate)} to ${formatDate(endDate)}`}
            </Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCol, { width: columnWidths.studentId }]}>
                <Text style={styles.headerCell}>Student ID</Text>
              </View>
              <View style={[styles.tableCol, { width: columnWidths.items }]}>
                <Text style={styles.headerCell}>Items</Text>
              </View>
              <View style={[styles.tableCol, { width: columnWidths.borrowTime }]}>
                <Text style={styles.headerCell}>Borrow Time</Text>
              </View>
              {type === 'returned' && (
                <View style={[styles.tableCol, { width: columnWidths.returnTime }]}>
                  <Text style={styles.headerCell}>Return Time</Text>
                </View>
              )}
              <View style={[styles.tableCol, { width: columnWidths.status }]}>
                <Text style={styles.headerCell}>Status</Text>
              </View>
            </View>
            {data.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: columnWidths.studentId }]}>
                  <Text style={styles.tableCell}>{item.studentIdNumber}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.items }]}>
                  <Text style={styles.tableCell}>{item.items.map(i => `${i.name} (x${i.quantity})`).join('; ')}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.borrowTime }]}>
                  <Text style={styles.tableCell}>{new Date(item.borrowTime).toLocaleString()}</Text>
                </View>
                {type === 'returned' && (
                  <View style={[styles.tableCol, { width: columnWidths.returnTime }]}>
                    <Text style={styles.tableCell}>{new Date(item.returnTime).toLocaleString()}</Text>
                  </View>
                )}
                <View style={[styles.tableCol, { width: columnWidths.status }]}>
                  <Text style={styles.tableCell}>{type === 'borrowed' ? 'borrowed' : 'returned'}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  };

  // Function to show status modal
  const showStatusMessage = (type, message) => {
    setStatusModalData({ type, message });
    setShowStatusModal(true);
  };

  // Function to close status modal
  const closeStatusModal = () => {
    setShowStatusModal(false);
    setStatusModalData({ type: '', message: '' });
  };

  // Export logic with enhanced error handling
  const handleExport = async (type, format) => {
    if (!validateDates()) {
      showStatusMessage('error', 'Please select both start and end dates');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      const endpoint = type === 'borrowed' ? 'export/borrowed-items' : 'export/returned-items';
      
      // Add timeout to the request
      const res = await axios.get(`${baseUrl}/api/concierge/${endpoint}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout
      });
      
      const data = res.data.data;

      if (!data || data.length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      if (format === 'excel') {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Items Report');
          
          // Define columns based on type with exact PDF widths
          const columns = type === 'borrowed' 
            ? [
                { header: 'Student ID', key: 'studentId', width: 25 },
                { header: 'Items', key: 'items', width: 35 },
                { header: 'Borrow Time', key: 'borrowTime', width: 25 },
                { header: 'Status', key: 'status', width: 15 }
              ]
            : [
                { header: 'Student ID', key: 'studentId', width: 20 },
                { header: 'Items', key: 'items', width: 30 },
                { header: 'Borrow Time', key: 'borrowTime', width: 20 },
                { header: 'Return Time', key: 'returnTime', width: 20 },
                { header: 'Status', key: 'status', width: 10 }
              ];
          
          worksheet.columns = columns;

          // Style the header row
          const headerRow = worksheet.getRow(1);
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.font = { 
              bold: true,
              size: 12,
              color: { argb: '1a1a1a' },
              name: 'Helvetica-Bold'
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f0f0f0' }
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'bfbfbf' } },
              left: { style: 'thin', color: { argb: 'bfbfbf' } },
              bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
              right: { style: 'thin', color: { argb: 'bfbfbf' } }
            };
          });
          
          // Add data starting from row 2
          data.forEach((item) => {
            const rowData = {
              studentId: item.studentIdNumber,
              items: item.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
              borrowTime: new Date(item.borrowTime).toLocaleString(),
              status: type === 'borrowed' ? 'borrowed' : 'returned',
            };
            
            if (type === 'returned') {
              rowData.returnTime = new Date(item.returnTime).toLocaleString();
            }
            
            const row = worksheet.addRow(rowData);
            row.height = 20;

            // Style each cell in the row
            row.eachCell((cell) => {
              cell.font = { 
                size: 10,
                name: 'Helvetica'
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: 'left',
                wrapText: true
              };
              cell.border = {
                top: { style: 'thin', color: { argb: 'bfbfbf' } },
                left: { style: 'thin', color: { argb: 'bfbfbf' } },
                bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
                right: { style: 'thin', color: { argb: 'bfbfbf' } }
              };
            });
          });

          // Set column widths based on content
          worksheet.columns.forEach(column => {
            const headerLength = column.header.length;
            const maxDataLength = Math.max(
              ...data.map(item => {
                const value = item[column.key];
                return value ? value.toString().length : 0;
              }),
              headerLength
            );
            column.width = Math.min(Math.max(maxDataLength + 2, 10), column.width);
          });
          
          const buffer = await workbook.xlsx.writeBuffer();
          const excelBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(excelBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${type}_items_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          showStatusMessage('success', `Successfully exported ${type} items report to Excel`);
        } catch (excelError) {
          console.error('Excel generation error:', excelError);
          showStatusMessage('error', 'Failed to generate Excel file. Please try again.');
          return;
        }
      } else if (format === 'pdf') {
        try {
          if (logoError) {
            console.warn('Logo error:', logoError);
          }

          const tempPDFDocument = (
            <PDFDocument data={data} type={type} />
          );
          
          const pdfBlob = await pdf(tempPDFDocument).toBlob();
          const url = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${type}_items_${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          showStatusMessage('success', `Successfully exported ${type} items report to PDF`);
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          showStatusMessage('error', 'Failed to generate PDF. Please try again.');
          return;
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      if (err.code === 'ECONNABORTED') {
        showStatusMessage('error', 'Request timed out. Please try again.');
      } else if (err.response?.status === 401) {
        showStatusMessage('error', 'Session expired. Please login again.');
        logout();
        navigate('/login');
      } else {
        showStatusMessage('error', 'Failed to export items. Please try again.');
      }
    }
  };

  // Update the PDFExportButton to show loading state
  const PDFExportButton = ({ type }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      try {
        await handleExport(type, 'pdf');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{isLoading ? 'Generating...' : 'PDF'}</span>
      </button>
    );
  };

  // Update the date input handlers
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setError('');
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header with Welcome Message and Logout */}
      <div className="bg-white shadow-lg fixed top-0 left-0 right-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{user?.name?.[0] || 'U'}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Concierge Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCancelLogout}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Confirm Logout
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to logout? You will need to login again to access the dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelLogout}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* Status Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={closeStatusModal}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                      statusModalData.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {statusModalData.type === 'success' ? (
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        {statusModalData.type === 'success' ? 'Success' : 'Error'}
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {statusModalData.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={closeStatusModal}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${
                      statusModalData.type === 'success' 
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    }`}
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-white fixed top-[72px] left-0 right-0 z-[90] shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'scanner', icon: CameraIcon, label: 'Scanner' },
            { id: 'borrowed', icon: ArrowLeftIcon, label: 'Borrowed' },
            { id: 'returned', icon: ArrowRightIcon, label: 'Returned' },
            { id: 'reports', icon: DocumentReportIcon, label: 'Reports' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Main Content - Scanner Tab only for now */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-[144px] min-h-[calc(100vh-144px)] flex flex-col">
        {activeTab === 'scanner' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 flex-1 flex flex-col"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">QR Scanner</h2>
                <p className="text-gray-600 mt-1">Scan student QR codes to process requests</p>
              </div>
              <button
                onClick={() => setScanning(!scanning)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  scanning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <CameraIcon className="w-5 h-5" />
                <span>{scanning ? 'Stop Scanning' : 'Start Scanning'}</span>
              </button>
            </div>
            {scanning && (
              <div className="relative flex-1 flex items-center justify-center">
                <div id="reader" className="w-full max-w-md rounded-xl overflow-hidden shadow-lg"></div>
                <div className="absolute inset-0 pointer-events-none border-4 border-indigo-500 rounded-xl animate-pulse"></div>
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">
                  Position QR code within the frame
                </div>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'borrowed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Borrowed Items</h2>
                <p className="text-gray-600 mt-1">Track all currently borrowed items</p>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student ID..."
                    value={borrowedSearchTerm}
                    onChange={handleBorrowedSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Number
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrow Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBorrowedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedBorrowedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No borrowed items found.</p>
                </div>
              )}
            </div>
            {/* Pagination for Borrowed Items */}
            {totalBorrowedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleBorrowedPageChange(Math.max(1, currentBorrowedPage - 1))}
                  disabled={currentBorrowedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentBorrowedPage} of {totalBorrowedPages}
                </span>
                <button
                  onClick={() => handleBorrowedPageChange(Math.min(totalBorrowedPages, currentBorrowedPage + 1))}
                  disabled={currentBorrowedPage === totalBorrowedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === totalBorrowedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
        {activeTab === 'returned' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Returned Items History</h2>
                <p className="text-gray-600 mt-1">View history of all returned items</p>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student ID..."
                    value={returnedSearchTerm}
                    onChange={handleReturnedSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Number
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrow Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedReturnedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.returnTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedReturnedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No returned items found.</p>
                </div>
              )}
            </div>
            {/* Pagination for Returned Items */}
            {totalReturnedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleReturnedPageChange(Math.max(1, currentReturnedPage - 1))}
                  disabled={currentReturnedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentReturnedPage} of {totalReturnedPages}
                </span>
                <button
                  onClick={() => handleReturnedPageChange(Math.min(totalReturnedPages, currentReturnedPage + 1))}
                  disabled={currentReturnedPage === totalReturnedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === totalReturnedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DocumentReportIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">History Reports</h2>
                  <p className="text-gray-600 mt-1">Generate and export reports for borrowed and returned items</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range Selection */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Select Date Range</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-6">
                {/* Borrowed Items Export */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-800">Borrowed Items History</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('borrowed', 'excel')}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Excel</span>
                    </button>
                    <PDFExportButton type="borrowed" />
                  </div>
                </div>

                {/* Returned Items Export */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-800">Returned Items History</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('returned', 'excel')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Excel</span>
                    </button>
                    <PDFExportButton type="returned" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 