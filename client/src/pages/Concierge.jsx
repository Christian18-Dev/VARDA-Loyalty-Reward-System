import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ExclamationIcon,
  LogoutIcon,
  DocumentReportIcon,
  MinusIcon,
  PlusIcon,
  CheckIcon,
  ShoppingBagIcon
} from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import logo from '../assets/2gonzlogo.png';
import completeSetImage from '../assets/completeset.png';
import spoonImage from '../assets/spoon.png';
import forkImage from '../assets/fork.png';
import plateImage from '../assets/plate.png';
import bowlImage from '../assets/bowl.png';
import glassImage from '../assets/glassofwater.png';
import saucerImage from '../assets/saucer.png';

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
  const [activeTab, setActiveTab] = useState('borrowed');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [borrowedSearchTerm, setBorrowedSearchTerm] = useState('');
  const [currentBorrowedPage, setCurrentBorrowedPage] = useState(1);
  const [returnedItems, setReturnedItems] = useState([]);
  const [returnedSearchTerm, setReturnedSearchTerm] = useState('');
  const [currentReturnedPage, setCurrentReturnedPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [processingReturnId, setProcessingReturnId] = useState(null);
  const [availableItems, setAvailableItems] = useState([
    {
      id: 1,
      name: 'Complete Set',
      image: completeSetImage,
      description: 'Complete dining set (Plate, Bowl, Spoon, Fork, Glass, Tray)',
      cartQuantity: 0,
      isSet: true
    },
    { 
      id: 2, 
      name: 'Spoon', 
      image: spoonImage,
      description: 'Stainless steel spoon for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 3, 
      name: 'Fork', 
      image: forkImage,
      description: 'Stainless steel fork for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 4, 
      name: 'Plate', 
      image: plateImage,
      description: 'Ceramic plate',
      cartQuantity: 0
    },
    { 
      id: 5, 
      name: 'Bowl', 
      image: bowlImage,
      description: 'Ceramic bowl',
      cartQuantity: 0
    },
    { 
      id: 6, 
      name: 'Saucer', 
      image: saucerImage,
      description: 'Smaller plate',
      cartQuantity: 0
    },
    { 
      id: 7, 
      name: 'Glass', 
      image: glassImage,
      description: 'Glass for water and beverages',
      cartQuantity: 0
    },
  ]);
  const [showCart, setShowCart] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [modalItems, setModalItems] = useState([]);
  const [modalTime, setModalTime] = useState('');
  const [modalType, setModalType] = useState('');
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

  // Fetch borrowed items with date filter
  const fetchBorrowedItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/concierge/borrowed-items?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      const sortedBorrowed = items.sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));
      setBorrowedItems(sortedBorrowed);
    } catch (err) {
      setError('Failed to fetch borrowed items');
    }
  };

  // Polling for borrowed tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'borrowed') {
      fetchBorrowedItems();
      pollInterval = setInterval(fetchBorrowedItems, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [token, startDate, endDate]);

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
  const filteredBorrowedItems = borrowedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(borrowedSearchTerm.toLowerCase())
  );
  const totalBorrowedPages = Math.ceil(filteredBorrowedItems.length / itemsPerPage);
  const paginatedBorrowedItems = filteredBorrowedItems.slice(
    (currentBorrowedPage - 1) * itemsPerPage,
    currentBorrowedPage * itemsPerPage
  );

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

  // Update the showStatusMessage function to be smoother
  const showStatusMessage = (type, message) => {
    // Update the modal data directly without closing/reopening
    setStatusModalData({ type, message });
    setShowStatusModal(true);
  };

  // Update the StatusModal component to be simpler without animations
  const StatusModal = ({ isOpen, onClose, type, message }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 backdrop-blur-sm bg-white/30"
            aria-hidden="true"
            onClick={onClose}
          />
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div
            className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div className="bg-white px-6 pt-6 pb-4 sm:p-8">
              <div className="sm:flex sm:items-start">
                <div 
                  className={`mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full sm:mx-0 sm:h-14 sm:w-14 ${
                    type === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {type === 'success' ? (
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <ExclamationIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:ml-6 sm:text-left flex-1">
                  <h3 className={`text-2xl font-bold ${type === 'success' ? 'text-green-700' : 'text-red-700'}`} id="modal-headline">
                    {type === 'success' ? 'Success!' : 'Error'}
                  </h3>
                  <div className="mt-4">
                    <p className="text-lg text-gray-700 whitespace-pre-line font-medium leading-relaxed">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse">
              <button
                onClick={onClose}
                className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors sm:ml-3 sm:w-auto ${
                  type === 'success' 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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

  // Handle manual return
  const handleManualReturn = async (item) => {
    if (processingReturnId) return; // Prevent multiple returns at once
    
    try {
      setProcessingReturnId(item._id);
      const returnData = {
        studentId: item.studentId,
        studentIdNumber: item.studentIdNumber,
        items: item.items,
        timestamp: item.borrowTime
      };

      const response = await axios.post(
        `${baseUrl}/api/concierge/manual-return`,
        returnData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccess('Item returned successfully!');
      
      // Immediately update the borrowed items list
      await fetchBorrowedItems();
      setProcessingReturnId(null);
      
      // Also update the returned items list
      await fetchReturnedItems();

    } catch (error) {
      console.error('Error returning item:', error);
      setError('Failed to return item. Please try again.');
      setProcessingReturnId(null);
    }
  };

  // Handle borrow confirmation
  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    
    const itemsToBorrow = availableItems.filter(item => item.cartQuantity > 0);
    
    if (itemsToBorrow.length === 0) {
      setError('Your cart is empty. Please add items before confirming your borrow.');
      return;
    }

    const timestamp = new Date().toISOString();
    const orderDetails = {
      studentId: user._id,
      studentIdNumber: user.idNumber,
      items: itemsToBorrow.map(item => ({
        name: item.name,
        quantity: item.cartQuantity
      })),
      timestamp: timestamp
    };

    try {
      setIsSubmitting(true);
      const response = await axios.post(
        `${baseUrl}/api/student/borrow-items`,
        orderDetails,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      );

      setModalItems(itemsToBorrow);
      setModalTime(new Date().toLocaleString());
      setModalType('borrow');
      setSuccess('Borrow Complete!');
      setShowSuccessModal(true);
      setShowCart(false);

      setAvailableItems(prevItems => 
        prevItems.map(item => ({ ...item, cartQuantity: 0 }))
      );

      await fetchBorrowedItems();
    } catch (error) {
      console.error('Error creating borrow record:', error);
      setError('Failed to create borrow record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
              onClick={() => setShowLogoutModal(true)}
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
                onClick={() => setShowLogoutModal(false)}
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
                    onClick={() => {
                      localStorage.removeItem('cafeteria-user');
                      logout();
                      navigate('/login');
                    }}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLogoutModal(false)}
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
          <StatusModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
            type={statusModalData.type}
            message={statusModalData.message}
          />
        )}
      </AnimatePresence>
      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-white fixed top-[72px] left-0 right-0 z-[90] shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'borrowed', icon: ArrowLeftIcon, label: 'Borrowed' },
            { id: 'returned', icon: ArrowRightIcon, label: 'Returned' },
            { id: 'reports', icon: DocumentReportIcon, label: 'Reports' },
            { id: 'borrow', icon: ShoppingBagIcon, label: 'Borrow' }
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
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-[144px] min-h-[calc(100vh-144px)] flex flex-col">
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
                    onChange={(e) => setBorrowedSearchTerm(e.target.value)}
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
                      Actions
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
                        <button
                          onClick={() => handleManualReturn(item)}
                          disabled={processingReturnId === item._id}
                          className={`px-4 py-2 rounded-lg transition-colors ${
                            processingReturnId === item._id
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {processingReturnId === item._id ? 'Processing...' : 'Process Return'}
                        </button>
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
                  onClick={() => setCurrentBorrowedPage(Math.max(1, currentBorrowedPage - 1))}
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
                  onClick={() => setCurrentBorrowedPage(Math.min(totalBorrowedPages, currentBorrowedPage + 1))}
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
                  <p className="text-gray-600 mt-1">Generate and export reports for borrowed and returned items.</p>
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
        {activeTab === 'borrow' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">Borrow Items</h2>
              <p className="text-gray-600 mt-1">Select items to borrow for your needs</p>
            </div>

            {/* Available Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableItems.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 ${
                    item.isSet ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        <div className="mt-3 flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setAvailableItems(prevItems =>
                                prevItems.map(i =>
                                  i.id === item.id
                                    ? { ...i, cartQuantity: Math.max(0, i.cartQuantity - 1) }
                                    : i
                                )
                              );
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <MinusIcon className="w-5 h-5 text-gray-500" />
                          </button>
                          <span className="w-8 text-center font-medium text-gray-700">
                            {item.cartQuantity}
                          </span>
                          <button
                            onClick={() => {
                              setAvailableItems(prevItems =>
                                prevItems.map(i =>
                                  i.id === item.id
                                    ? { ...i, cartQuantity: i.cartQuantity + 1 }
                                    : i
                                )
                              );
                            }}
                            className="p-1 rounded-full hover:bg-gray-100"
                          >
                            <PlusIcon className="w-5 h-5 text-gray-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Cart Summary */}
            {availableItems.some(item => item.cartQuantity > 0) && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                      {availableItems.filter(item => item.cartQuantity > 0).length} items selected
                    </span>
                  </div>
                  <button
                    onClick={handleConfirmOrder}
                    disabled={isSubmitting}
                    className={`px-6 py-2 rounded-lg font-medium text-white ${
                      isSubmitting
                        ? 'bg-purple-400 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm Borrow'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={() => {
                setShowSuccessModal(false);
                setModalItems([]);
                setModalTime('');
              }}
            >
              <div className="absolute inset-0"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {success}
                    </h3>
                    <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">
                        <span className="font-medium">ID Number:</span> {user.idNumber}
                      </p>
                      <p className="text-gray-700 mt-2">
                        <span className="font-medium">Time:</span> {modalTime}
                      </p>
                      <p className="text-gray-700 mt-2">
                        <span className="font-medium">Items:</span>
                      </p>
                      <ul className="mt-1 space-y-1">
                        {modalItems.map((item, index) => (
                          <li key={index} className="text-gray-600">
                            • {item.name} (x{item.quantity || item.cartQuantity})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setModalItems([]);
                    setModalTime('');
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 