import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  KeyIcon, 
  GiftIcon, 
  LogoutIcon, 
  ExclamationIcon,
  ClipboardCopyIcon,
  CheckIcon,
  PrinterIcon,
  ClipboardListIcon,
  ClockIcon
} from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';

export default function CashierPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('generator');
  const [generatedCode, setGeneratedCode] = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentRewardsPage, setCurrentRewardsPage] = useState(1);
  const [rewardsSearchTerm, setRewardsSearchTerm] = useState('');
  const itemsPerPage = 10;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [printError, setPrintError] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const printerDevice = useRef(null);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [showCodesModal, setShowCodesModal] = useState(false);
  const [mealRegistrations, setMealRegistrations] = useState([]);
  const [isLoadingMealRegistrations, setIsLoadingMealRegistrations] = useState(false);
  const [currentMealRegistrationsPage, setCurrentMealRegistrationsPage] = useState(1);
  const [mealRegistrationsSearchTerm, setMealRegistrationsSearchTerm] = useState('');
  const [availingMeals, setAvailingMeals] = useState({}); // Track which meals are being availed
  const [showAvailConfirmModal, setShowAvailConfirmModal] = useState(false);
  const [pendingAvail, setPendingAvail] = useState(null); // { registrationId, mealType, studentName, accountID }
  const [availHistory, setAvailHistory] = useState([]);
  const [isLoadingAvailHistory, setIsLoadingAvailHistory] = useState(false);
  const [currentAvailHistoryPage, setCurrentAvailHistoryPage] = useState(1);
  const [availHistoryFilters, setAvailHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    mealType: '',
    accountID: '',
    search: ''
  });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingBilling, setIsExportingBilling] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [availHistoryPagination, setAvailHistoryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [mealRegistrationsPagination, setMealRegistrationsPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  const handleGenerateCode = async () => {
    try {
      setIsGenerating(true);
      
      // Add minimum loading time of 1.5 seconds
      const loadingPromise = new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate code
      const codePromise = axios.post(
        `${baseUrl}/api/cashier/generate-code`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Wait for both the minimum loading time and code generation
      const [codeResponse] = await Promise.all([codePromise, loadingPromise]);
      
      setGeneratedCode(codeResponse.data.code.code);
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Error generating code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      setError('Failed to copy code');
    }
  };

  // Connect to Bluetooth printer
  const connectToPrinter = async () => {
    try {
      // Check if Web Bluetooth is supported
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.');
      }

      // Request Bluetooth device
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // Common printer service
      });
      
      // Connect to the GATT server
      const server = await device.gatt.connect();
      
      // Get the service
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      
      // Get the characteristic for writing
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
      
      // Store the device for later use
      printerDevice.current = {
        device,
        characteristic
      };
      
      return true;
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      setPrintError(`Printer connection failed: ${error.message}`);
      return false;
    }
  };

  // Print the generated code
  const printCode = async () => {
    if (!generatedCode) return;
    
    setIsPrinting(true);
    setPrintError('');
    
    try {
      // Try to connect to printer if not already connected
      if (!printerDevice.current) {
        const connected = await connectToPrinter();
        if (!connected) {
          return;
        }
      }

      // Format the code for printing with double-strike text (bolder appearance)
      // ESC E enables emphasis (bold) and ESC F disables it for most thermal printers
      const startBold = '\x1B\x45\x01';  // ESC E 1
      const endBold = '\x1B\x45\x00';    // ESC E 0
      
      // Alternatively, use double-strike mode for even bolder text
      // const startBold = '\x1B\x47\x01';  // ESC G 1
      // const endBold = '\x1B\x47\x00';    // ESC G 0
      
      // Or use larger font (if supported by the printer)
      // const startBold = '\x1D\x21\x11';  // GS ! n (double height and width)
      // const endBold = '\x1D\x21\x00';    // GS ! 0 (normal size)
      
      // Build the print text with the selected bold control codes
      const printText = 
      '\n\n' + // Reduced empty lines at top
      '    -------------------------\n' +
      '      VARDA LOYALTY REWARD\n' +
      '    -------------------------\n\n' +
      `    Code: ${generatedCode}\n` +
      `    ${new Date().toLocaleString()}\n\n` +
      '    HOW TO REDEEM:\n' +
      '    1. Visit: www.vgconcierge.com\n' +
      '    2. Log in or register\n' +
      '       if you havent\n' +
      '    3. Go to Redeem Page\n' +
      '    4. Enter code to earn\n' +
      '       1 point\n' +
      '    5. Get extra points by\n' +
      '       giving feedback!\n\n' +
      '           Thank you!\n' +
      '    -------------------------\n\n\n\n'; // Extra blank lines for paper cut

        
        
      // Apply bold to the entire content
      const finalPrintText = startBold + printText + endBold;

      // Convert text to bytes (UTF-8)
      const encoder = new TextEncoder();
      const data = encoder.encode(finalPrintText);
      
      // Send data to printer in chunks to avoid buffer overflow
      const CHUNK_SIZE = 20; // Adjust based on your printer's MTU
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await printerDevice.current.characteristic.writeValue(chunk);
      }
      
      // Add paper cut command if supported by the printer
      // This is printer-specific and may need adjustment
      const cutCommand = new Uint8Array([0x1B, 0x69]); // ESC i - common cut command
      await printerDevice.current.characteristic.writeValue(cutCommand);
      
    } catch (error) {
      console.error('Print error:', error);
      setPrintError(`Print failed: ${error.message}`);
      // Reset printer connection on error
      if (printerDevice.current) {
        try {
          await printerDevice.current.device.gatt.disconnect();
        } catch (e) {}
        printerDevice.current = null;
      }
    } finally {
      setIsPrinting(false);
    }
  };

  // Auto-print when a new code is generated
  useEffect(() => {
    if (generatedCode) {
      printCode().catch(console.error);
    }
  }, [generatedCode]);

  const fetchClaimed = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/cashier/claimed-rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort newest first
      const sorted = res.data.sort(
        (a, b) => new Date(b.dateClaimed) - new Date(a.dateClaimed)
      );
      setClaimedRewards(sorted);
    } catch (err) {
      console.error('Error fetching claimed rewards:', err);
    }
  };

  // Set up polling for rewards tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'rewards') {
      fetchClaimed();
      pollInterval = setInterval(fetchClaimed, 120000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token]);

  // Fetch meal registrations for LIMA
  const fetchMealRegistrations = async () => {
    if (user.role !== 'cashierlima') return;
    
    try {
      setIsLoadingMealRegistrations(true);
      const params = new URLSearchParams();
      if (mealRegistrationsSearchTerm) params.append('search', mealRegistrationsSearchTerm);
      // Add pagination parameters
      params.append('page', currentMealRegistrationsPage);
      params.append('limit', itemsPerPage);

      const res = await axios.get(`${baseUrl}/api/cashier/lima-meal-registrations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMealRegistrations(res.data.data); // Use res.data.data instead of res.data
      setMealRegistrationsPagination(res.data.pagination); // Store pagination info
    } catch (err) {
      console.error('Error fetching meal registrations:', err);
      setError('Error fetching meal registrations');
    } finally {
      setIsLoadingMealRegistrations(false);
    }
  };

  // Set up polling for meal registrations tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'meal-registrations' && user.role === 'cashierlima') {
      fetchMealRegistrations();
      pollInterval = setInterval(fetchMealRegistrations, 60000); // Poll every minute
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token, user.role, currentMealRegistrationsPage, mealRegistrationsSearchTerm]);

  // Fetch avail history
  const fetchAvailHistory = async () => {
    if (user.role !== 'cashierlima') return;
    
    try {
      setIsLoadingAvailHistory(true);
      const params = new URLSearchParams();
      if (availHistoryFilters.startDate) params.append('startDate', availHistoryFilters.startDate);
      if (availHistoryFilters.endDate) params.append('endDate', availHistoryFilters.endDate);
      if (availHistoryFilters.mealType) params.append('mealType', availHistoryFilters.mealType);
      if (availHistoryFilters.accountID) params.append('accountID', availHistoryFilters.accountID);
      if (availHistoryFilters.search) params.append('search', availHistoryFilters.search);
      // Add pagination parameters
      params.append('page', currentAvailHistoryPage);
      params.append('limit', itemsPerPage);

      const res = await axios.get(`${baseUrl}/api/cashier/avail-history?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailHistory(res.data.data); // Use res.data.data instead of res.data
      setAvailHistoryPagination(res.data.pagination); // Store pagination info
    } catch (err) {
      console.error('Error fetching avail history:', err);
      setError('Error fetching avail history');
    } finally {
      setIsLoadingAvailHistory(false);
    }
  };

  // Set up polling for avail history tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'avail-history' && user.role === 'cashierlima') {
      fetchAvailHistory();
      pollInterval = setInterval(fetchAvailHistory, 60000); // Poll every minute
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token, user.role, availHistoryFilters, currentAvailHistoryPage]);
      
  // Filter rewards based on search term
  const filteredRewards = claimedRewards.filter(reward => 
    reward?.name?.toLowerCase().includes(rewardsSearchTerm.toLowerCase()) ||
    reward?.reward?.toLowerCase().includes(rewardsSearchTerm.toLowerCase())
  );
      
  // Pagination calculations for rewards
  const totalRewardsPages = Math.ceil(filteredRewards.length / itemsPerPage);
  const paginatedRewards = filteredRewards.slice(
    (currentRewardsPage - 1) * itemsPerPage,
    currentRewardsPage * itemsPerPage
  );

  // Handle rewards page change
  const handleRewardsPageChange = (page) => {
    setCurrentRewardsPage(page);
  };

  // Handle rewards search
  const handleRewardsSearch = (e) => {
    setRewardsSearchTerm(e.target.value);
    setCurrentRewardsPage(1);
  };

  // Meal registrations are now paginated server-side, no client-side filtering needed
  // Use mealRegistrations directly (already filtered and paginated by server)

  // Handle meal registrations page change
  const handleMealRegistrationsPageChange = (page) => {
    setCurrentMealRegistrationsPage(page);
  };

  // Handle meal registrations search
  const handleMealRegistrationsSearch = (e) => {
    setMealRegistrationsSearchTerm(e.target.value);
    setCurrentMealRegistrationsPage(1); // Reset to page 1 when search changes
  };

  // Handle clicking Avail button - show confirmation modal
  const handleAvailMealClick = (registrationId, mealType) => {
    const registration = mealRegistrations.find(reg => reg._id === registrationId);
    if (registration) {
      setPendingAvail({
        registrationId,
        mealType,
        studentName: `${registration.firstName} ${registration.lastName}`,
        accountID: registration.accountID || 'N/A'
      });
      setShowAvailConfirmModal(true);
    }
  };

  // Handle confirming and availing a meal
  const handleConfirmAvailMeal = async () => {
    if (!pendingAvail) return;

    const { registrationId, mealType } = pendingAvail;
    const key = `${registrationId}-${mealType}`;
    
    try {
      setShowAvailConfirmModal(false);
      setAvailingMeals(prev => ({ ...prev, [key]: true }));
      setError('');
      setSuccess('');

      const res = await axios.post(
        `${baseUrl}/api/cashier/avail-meal`,
        { registrationId, mealType },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setSuccess(res.data.message);
        // Update the local state to reflect the availed meal
        setMealRegistrations(prev => 
          prev.map(reg => 
            reg._id === registrationId 
              ? { ...reg, mealsAvailed: { ...reg.mealsAvailed, [mealType]: true } }
              : reg
          )
        );
        // Refresh history if on history tab
        if (activeTab === 'avail-history') {
          fetchAvailHistory();
        }
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error availing meal:', err);
      setError(err.response?.data?.message || 'Error availing meal');
      setTimeout(() => setError(''), 5000);
    } finally {
      setAvailingMeals(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      setPendingAvail(null);
    }
  };

  // Handle canceling avail confirmation
  const handleCancelAvailMeal = () => {
    setShowAvailConfirmModal(false);
    setPendingAvail(null);
  };

  // PDF Styles for Avail History Export
  const availHistoryPDFStyles = StyleSheet.create({
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

  // PDF Document Component for Avail History
  const AvailHistoryPDFDocument = ({ data, filters }) => {
    if (!data || data.length === 0) {
      return (
        <Document>
          <Page size="A4" style={availHistoryPDFStyles.page}>
            <Text style={availHistoryPDFStyles.header}>No data available</Text>
          </Page>
        </Document>
      );
    }

    const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Manila'
      });
    };

    const formatDateTime = (dateString) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Manila'
      });
    };

    const getFilterText = () => {
      const parts = [];
      if (filters.startDate && filters.endDate) {
        parts.push(`From ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}`);
      } else if (filters.startDate) {
        parts.push(`From ${formatDate(filters.startDate)}`);
      } else if (filters.endDate) {
        parts.push(`Until ${formatDate(filters.endDate)}`);
      }
      if (filters.mealType) {
        parts.push(`Meal Type: ${filters.mealType.charAt(0).toUpperCase() + filters.mealType.slice(1)}`);
      }
      if (filters.accountID) {
        parts.push(`AccountID: ${filters.accountID}`);
      }
      return parts.length > 0 ? parts.join(' | ') : 'All Records';
    };

    return (
      <Document>
        <Page size="A4" style={availHistoryPDFStyles.page}>
          <View style={availHistoryPDFStyles.header}>
            <Text style={availHistoryPDFStyles.title}>Avail History Report</Text>
            <Text style={availHistoryPDFStyles.subtitle}>{getFilterText()}</Text>
            <Text style={availHistoryPDFStyles.subtitle}>
              Generated on {new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}
            </Text>
          </View>
          <View style={availHistoryPDFStyles.table}>
            <View style={availHistoryPDFStyles.tableRow}>
              <View style={[availHistoryPDFStyles.tableCol, { width: '15%' }]}>
                <Text style={availHistoryPDFStyles.headerCell}>AccountID</Text>
              </View>
              <View style={[availHistoryPDFStyles.tableCol, { width: '15%' }]}>
                <Text style={availHistoryPDFStyles.headerCell}>Meal Type</Text>
              </View>
              <View style={[availHistoryPDFStyles.tableCol, { width: '30%' }]}>
                <Text style={availHistoryPDFStyles.headerCell}>Availed By</Text>
              </View>
              <View style={[availHistoryPDFStyles.tableCol, { width: '20%' }]}>
                <Text style={availHistoryPDFStyles.headerCell}>Availed At</Text>
              </View>
              <View style={[availHistoryPDFStyles.tableCol, { width: '20%' }]}>
                <Text style={availHistoryPDFStyles.headerCell}>Registration Date</Text>
              </View>
            </View>
            {data.map((item, index) => (
              <View key={index} style={availHistoryPDFStyles.tableRow}>
                <View style={[availHistoryPDFStyles.tableCol, { width: '15%' }]}>
                  <Text style={availHistoryPDFStyles.tableCell}>{item.accountID || '-'}</Text>
                </View>
                <View style={[availHistoryPDFStyles.tableCol, { width: '15%' }]}>
                  <Text style={availHistoryPDFStyles.tableCell}>
                    {item.mealType ? item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1) : '-'}
                  </Text>
                </View>
                <View style={[availHistoryPDFStyles.tableCol, { width: '30%' }]}>
                  <Text style={availHistoryPDFStyles.tableCell}>{item.availedBy?.name || 'Unknown'}</Text>
                </View>
                <View style={[availHistoryPDFStyles.tableCol, { width: '20%' }]}>
                  <Text style={availHistoryPDFStyles.tableCell}>{formatDateTime(item.availedAt)}</Text>
                </View>
                <View style={[availHistoryPDFStyles.tableCol, { width: '20%' }]}>
                  <Text style={availHistoryPDFStyles.tableCell}>{formatDate(item.registrationDate)}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  };

  // Export to Excel (Full Report)
  // Helper function to fetch all avail history data for export (without pagination)
  const fetchAllAvailHistoryForExport = async () => {
    const params = new URLSearchParams();
    if (availHistoryFilters.startDate) params.append('startDate', availHistoryFilters.startDate);
    if (availHistoryFilters.endDate) params.append('endDate', availHistoryFilters.endDate);
    if (availHistoryFilters.mealType) params.append('mealType', availHistoryFilters.mealType);
    if (availHistoryFilters.accountID) params.append('accountID', availHistoryFilters.accountID);
    if (availHistoryFilters.search) params.append('search', availHistoryFilters.search);
    // Fetch all data by setting a very high limit
    params.append('page', 1);
    params.append('limit', 10000); // Large limit to get all data

    const res = await axios.get(`${baseUrl}/api/cashier/avail-history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.data;
  };

  const handleExportToExcel = async () => {
    setIsExportingExcel(true);
    try {
      // Fetch all data for export
      const allHistory = await fetchAllAvailHistoryForExport();
      
      if (!allHistory || allHistory.length === 0) {
        setError('No data to export');
        setTimeout(() => setError(''), 3000);
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Avail History');

      // Define columns
      worksheet.columns = [
        { header: 'AccountID', key: 'accountID', width: 15 },
        { header: 'Meal Type', key: 'mealType', width: 15 },
        { header: 'Availed By', key: 'availedBy', width: 30 },
        { header: 'Availed At', key: 'availedAt', width: 25 },
        { header: 'Registration Date', key: 'registrationDate', width: 20 }
      ];

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

      // Add data rows
      allHistory.forEach(item => {
        worksheet.addRow({
          accountID: item.accountID || '-',
          mealType: item.mealType ? item.mealType.charAt(0).toUpperCase() + item.mealType.slice(1) : '-',
          availedBy: item.availedBy?.name || 'Unknown',
          availedAt: item.availedAt ? new Date(item.availedAt).toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : '-',
          registrationDate: item.registrationDate ? new Date(item.registrationDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' }) : '-'
        });
      });

      // Style data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'bfbfbf' } },
              left: { style: 'thin', color: { argb: 'bfbfbf' } },
              bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
              right: { style: 'thin', color: { argb: 'bfbfbf' } }
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'left'
            };
          });
        }
      });

      // Generate filename with filter info
      const filterParts = [];
      if (availHistoryFilters.startDate && availHistoryFilters.endDate) {
        filterParts.push(`${availHistoryFilters.startDate}_to_${availHistoryFilters.endDate}`);
      } else if (availHistoryFilters.startDate) {
        filterParts.push(`from_${availHistoryFilters.startDate}`);
      } else if (availHistoryFilters.endDate) {
        filterParts.push(`until_${availHistoryFilters.endDate}`);
      }
      const filename = `avail_history${filterParts.length > 0 ? '_' + filterParts.join('_') : ''}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccess('Excel file exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setError('Error exporting to Excel');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export to Excel (Billing Report - Only specific columns)
  const handleExportBillingExcel = async () => {
    setIsExportingBilling(true);
    try {
      // Fetch all data for export
      const allHistory = await fetchAllAvailHistoryForExport();
      
      if (!allHistory || allHistory.length === 0) {
        setError('No data to export');
        setTimeout(() => setError(''), 3000);
        return;
      }
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Billing Report');

      // Define columns for billing (only requested columns)
      worksheet.columns = [
        { header: 'AccountID', key: 'accountID', width: 15 },
        { header: 'ID Number', key: 'idNumber', width: 20 },
        { header: 'Availed By', key: 'availedBy', width: 30 },
        { header: 'Availed At', key: 'availedAt', width: 25 }
      ];

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
          fgColor: { argb: 'e8f5e8' } // Light green for billing
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

      // Group by student (accountID or idNumber) to avoid duplicates
      const studentMap = new Map();
      
      allHistory.forEach(item => {
        const key = item.accountID || item.idNumber || 'unknown';
        
        if (!studentMap.has(key)) {
          // First occurrence of this student - store the data
          studentMap.set(key, {
            accountID: item.accountID || '-',
            idNumber: item.idNumber || '-',
            availedBy: item.availedBy?.name || 'Unknown',
            availedAt: item.availedAt ? new Date(item.availedAt) : null
          });
        } else {
          // Student already exists - update availedAt to earliest date
          const existing = studentMap.get(key);
          if (item.availedAt) {
            const itemDate = new Date(item.availedAt);
            if (!existing.availedAt || itemDate < existing.availedAt) {
              existing.availedAt = itemDate;
            }
          }
        }
      });

      // Add data rows for billing (one row per unique student)
      studentMap.forEach((studentData) => {
        worksheet.addRow({
          accountID: studentData.accountID,
          idNumber: studentData.idNumber,
          availedBy: studentData.availedBy,
          availedAt: studentData.availedAt 
            ? studentData.availedAt.toLocaleString('en-US', { timeZone: 'Asia/Manila' }) 
            : '-'
        });
      });

      // Style data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'bfbfbf' } },
              left: { style: 'thin', color: { argb: 'bfbfbf' } },
              bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
              right: { style: 'thin', color: { argb: 'bfbfbf' } }
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'left'
            };
          });
        }
      });

      // Generate filename with filter info for billing
      const filterParts = [];
      if (availHistoryFilters.startDate && availHistoryFilters.endDate) {
        filterParts.push(`${availHistoryFilters.startDate}_to_${availHistoryFilters.endDate}`);
      } else if (availHistoryFilters.startDate) {
        filterParts.push(`from_${availHistoryFilters.startDate}`);
      } else if (availHistoryFilters.endDate) {
        filterParts.push(`until_${availHistoryFilters.endDate}`);
      }
      const filename = `billing_report${filterParts.length > 0 ? '_' + filterParts.join('_') : ''}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      setSuccess('Billing report exported successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting billing report:', error);
      setError('Error exporting billing report');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsExportingBilling(false);
    }
  };

  // Export to PDF
  const handleExportToPDF = async () => {
    setIsExportingPDF(true);
    try {
      // Fetch all data for export
      const allHistory = await fetchAllAvailHistoryForExport();
      
      if (!allHistory || allHistory.length === 0) {
        setError('No data to export');
        setTimeout(() => setError(''), 3000);
        return;
      }

      // Limit data size for PDF generation
      const MAX_PDF_ITEMS = 1000;
      const dataToExport = allHistory.slice(0, MAX_PDF_ITEMS);
      
      if (allHistory.length > MAX_PDF_ITEMS) {
        setError(`Too many items (${allHistory.length}) for PDF export. Exporting first ${MAX_PDF_ITEMS} items. Please use Excel format for complete data.`);
        setTimeout(() => setError(''), 5000);
      }

      const pdfDocument = (
        <AvailHistoryPDFDocument data={dataToExport} filters={availHistoryFilters} />
      );

      const blob = await pdf(pdfDocument).toBlob();
      
      // Generate filename with filter info
      const filterParts = [];
      if (availHistoryFilters.startDate && availHistoryFilters.endDate) {
        filterParts.push(`${availHistoryFilters.startDate}_to_${availHistoryFilters.endDate}`);
      } else if (availHistoryFilters.startDate) {
        filterParts.push(`from_${availHistoryFilters.startDate}`);
      } else if (availHistoryFilters.endDate) {
        filterParts.push(`until_${availHistoryFilters.endDate}`);
      }
      const filename = `avail_history${filterParts.length > 0 ? '_' + filterParts.join('_') : ''}_${new Date().toISOString().split('T')[0]}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(`Successfully exported ${dataToExport.length} records to PDF`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError('Error exporting to PDF');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handleGenerateBulkCodes = async () => {
    try {
      setIsBulkGenerating(true);
      setGeneratedCodes([]);
      
      const codes = [];
      for (let i = 0; i < 100; i++) {
        const res = await axios.post(
          `${baseUrl}/api/cashier/generate-code`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        codes.push(res.data.code.code);
      }
      
      setGeneratedCodes(codes);
      setSuccess('Successfully generated 100 codes!');
    } catch (err) {
      console.error('Error generating bulk codes:', err);
      setError('Error generating some codes. Please try again.');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  const printBulkCodes = async () => {
    if (generatedCodes.length === 0) return;
    
    setIsPrinting(true);
    setPrintError('');
    
    try {
      // Try to connect to printer if not already connected
      if (!printerDevice.current) {
        const connected = await connectToPrinter();
        if (!connected) {
          return;
        }
      }

      // Format each code with the same format as single code print
      for (const code of generatedCodes) {
        const currentDate = new Date().toLocaleString();
        
        // Format the code for printing with double-strike text (bolder appearance)
        const startBold = '\x1B\x45\x01';  // ESC E 1
        const endBold = '\x1B\x45\x00';    // ESC E 0
        
        // Build the print text with the selected bold control codes
        const printText = 
        '\n\n' + // Reduced empty lines at top
        '    -------------------------\n' +
        '      VARDA LOYALTY REWARD\n' +
        '    -------------------------\n\n' +
        `    Code: ${generatedCode}\n` +
        `    ${new Date().toLocaleString()}\n\n` +
        '    HOW TO REDEEM:\n' +
        '    1. Visit: www.vgconcierge.com\n' +
        '    2. Log in or register\n' +
        '       if you havent\n' +
        '    3. Go to Redeem Page\n' +
        '    4. Enter code to earn\n' +
        '       1 point\n' +
        '    5. Get extra points by\n' +
        '       giving feedback!\n\n' +
        '           Thank you!\n' +
        '    -------------------------\n\n\n\n'; // Extra blank lines for paper cut

        // Convert to Uint8Array for printing
        const encoder = new TextEncoder();
        const printData = encoder.encode(printText);
        
        // Split the data into chunks of 500 bytes to stay under the 512-byte limit
        const CHUNK_SIZE = 500;
        for (let i = 0; i < printData.length; i += CHUNK_SIZE) {
          const chunk = printData.slice(i, i + CHUNK_SIZE);
          await printerDevice.current.characteristic.writeValue(chunk);
          // Small delay between chunks to prevent overwhelming the printer
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // Add a small delay between codes to prevent overwhelming the printer
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Add paper cut command if supported (ESC i) after all codes
      const cutCommand = new Uint8Array([0x1B, 0x69]);
      await printerDevice.current.characteristic.writeValue(cutCommand);
      
    } catch (error) {
      console.error('Print error:', error);
      setPrintError(`Print failed: ${error.message}`);
      // Reset printer connection on error
      if (printerDevice.current) {
        try {
          await printerDevice.current.device.gatt.disconnect();
        } catch (e) {}
        printerDevice.current = null;
      }
    } finally {
      setIsPrinting(false);
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
                <h1 className="text-xl font-bold text-gray-800">Employee Dashboard</h1>
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

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-white fixed top-[72px] left-0 right-0 z-[90] shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'generator', icon: KeyIcon, label: 'Generate Code' },
            { id: 'rewards', icon: GiftIcon, label: 'Rewards' },
            ...(user.role === 'cashierlima' ? [
              { id: 'meal-registrations', icon: ClipboardListIcon, label: 'LIMA Meal Registrations' },
              { id: 'avail-history', icon: ClockIcon, label: 'Avail History' }
            ] : [])
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
        {/* Code Generator Tab */}
        {activeTab === 'generator' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                  <KeyIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Generate Redeem Code</h2>
                <p className="text-gray-600 mt-2">
                  Create a unique code for students to redeem their rewards
                </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleGenerateCode}
                    disabled={isGenerating || isBulkGenerating}
                    className={`px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-lg font-medium">Generating Code...</span>
                      </>
                    ) : (
                      <>
                        <KeyIcon className="w-6 h-6" />
                        <span className="text-lg font-medium">Generate New Code</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleGenerateBulkCodes}
                    disabled={isBulkGenerating || isGenerating}
                    className={`px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {isBulkGenerating ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-lg font-medium">Generating 100 Codes...</span>
                      </>
                    ) : (
                      <>
                        <KeyIcon className="w-6 h-6" />
                        <span className="text-lg font-medium">Generate 50 Codes</span>
                      </>
                    )}
                  </button>
                </div>

                {generatedCodes.length > 0 && (
                  <div className="mt-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Generated {generatedCodes.length} Codes</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const text = generatedCodes.join('\n');
                            navigator.clipboard.writeText(text);
                            setSuccess('All codes copied to clipboard!');
                          }}
                          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Copy All
                        </button>
                        <button
                          onClick={printBulkCodes}
                          disabled={isPrinting}
                          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-1"
                        >
                          {isPrinting ? (
                            <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <PrinterIcon className="h-4 w-4 text-gray-500" />
                          )}
                          <span>Print All</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                      <pre className="text-sm text-gray-700 font-mono">
                        {generatedCodes.map((code, index) => (
                          <div key={index} className="py-1 border-b border-gray-100 last:border-0">
                            {code}
                          </div>
                        ))}
                      </pre>
                    </div>
                  </div>
                )}
                
                {generatedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-green-800">Generated Code</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={printCode}
                          disabled={isPrinting}
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Print code"
                        >
                          {isPrinting ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <PrinterIcon className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={handleCopyCode}
                          className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                          title="Copy to clipboard"
                        >
                          {isCopied ? (
                            <CheckIcon className="w-5 h-5" />
                          ) : (
                            <ClipboardCopyIcon className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="font-mono text-3xl text-green-700 bg-white p-6 rounded-xl border border-green-300 text-center tracking-wider shadow-inner">
                        {generatedCode}
                      </div>
                      <div className="mt-4 text-center">
                        <div className="inline-flex items-center space-x-2 text-sm text-green-600 bg-white px-3 py-1 rounded-full shadow-sm border border-green-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Expires in 24 hours</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {(error || printError) && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 p-4 rounded-xl border ${
                      printError ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {printError || error}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <GiftIcon className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Claimed Rewards</h2>
                  <p className="text-gray-600 mt-1">
                    View all claimed rewards by students
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search rewards..."
                    value={rewardsSearchTerm}
                    onChange={handleRewardsSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full table-auto">
              <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points Used</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Claimed</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRewards.map((claim) => (
                    <tr key={claim._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{claim.idNumber}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-900">{claim.reward}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {claim.pointsUsed} points
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(claim.dateClaimed).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedRewards.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No claimed rewards found.</p>
                </div>
            )}
          </div>
            
            {/* Pagination for Rewards */}
            {totalRewardsPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleRewardsPageChange(Math.max(1, currentRewardsPage - 1))}
                  disabled={currentRewardsPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentRewardsPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentRewardsPage} of {totalRewardsPages}
                </span>
                <button
                  onClick={() => handleRewardsPageChange(Math.min(totalRewardsPages, currentRewardsPage + 1))}
                  disabled={currentRewardsPage === totalRewardsPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentRewardsPage === totalRewardsPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
            )}
          </motion.div>
        )}

        {/* Meal Registrations Tab - Only visible to cashierlima */}
        {activeTab === 'meal-registrations' && user.role === 'cashierlima' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ClipboardListIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">LIMA Meal Registrations</h2>
                  <p className="text-gray-600 mt-1">
                    View meal registrations from Lyceum International Maritime Academy students
                  </p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by AccountID, name..."
                    value={mealRegistrationsSearchTerm}
                    onChange={handleMealRegistrationsSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            {(error || success) && (
              <div className={`mb-4 p-4 rounded-xl border ${
                error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {error || success}
              </div>
            )}
            {isLoadingMealRegistrations ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 mt-4">Loading meal registrations...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AccountID</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Breakfast</th>
                        <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Lunch</th>
                        <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dinner</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {mealRegistrations.map((registration) => (
                        <tr key={registration._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {registration.accountID || '-'}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-sm text-gray-900">{registration.firstName} {registration.lastName}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center space-y-2">
                              {registration.meals?.breakfast ? (
                                <>
                                  {registration.mealsAvailed?.breakfast ? (
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 border-2 border-green-500">
                                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <button
                                        onClick={() => handleAvailMealClick(registration._id, 'breakfast')}
                                        disabled={availingMeals[`${registration._id}-breakfast`]}
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                                          availingMeals[`${registration._id}-breakfast`]
                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-200'
                                        }`}
                                      >
                                        {availingMeals[`${registration._id}-breakfast`] ? (
                                          <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                          </span>
                                        ) : (
                                          'Avail'
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300">
                                  <span className="text-gray-400 text-xs">-</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center space-y-2">
                              {registration.meals?.lunch ? (
                                <>
                                  {registration.mealsAvailed?.lunch ? (
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 border-2 border-green-500">
                                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <button
                                        onClick={() => handleAvailMealClick(registration._id, 'lunch')}
                                        disabled={availingMeals[`${registration._id}-lunch`]}
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                                          availingMeals[`${registration._id}-lunch`]
                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-200'
                                        }`}
                                      >
                                        {availingMeals[`${registration._id}-lunch`] ? (
                                          <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                          </span>
                                        ) : (
                                          'Avail'
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300">
                                  <span className="text-gray-400 text-xs">-</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="flex flex-col items-center space-y-2">
                              {registration.meals?.dinner ? (
                                <>
                                  {registration.mealsAvailed?.dinner ? (
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 border-2 border-green-500">
                                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-500">
                                        <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <button
                                        onClick={() => handleAvailMealClick(registration._id, 'dinner')}
                                        disabled={availingMeals[`${registration._id}-dinner`]}
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all transform hover:scale-105 active:scale-95 shadow-md ${
                                          availingMeals[`${registration._id}-dinner`]
                                            ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-purple-200'
                                        }`}
                                      >
                                        {availingMeals[`${registration._id}-dinner`] ? (
                                          <span className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                          </span>
                                        ) : (
                                          'Avail'
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-300">
                                  <span className="text-gray-400 text-xs">-</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(registration.registrationDate).toLocaleString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {mealRegistrations.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No meal registrations found.</p>
                    </div>
                  )}
                </div>
                
                {/* Pagination for Meal Registrations */}
                {mealRegistrationsPagination.totalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 space-x-4">
                    <button
                      onClick={() => handleMealRegistrationsPageChange(Math.max(1, currentMealRegistrationsPage - 1))}
                      disabled={currentMealRegistrationsPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentMealRegistrationsPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-gray-700 font-medium">
                      Page {mealRegistrationsPagination.currentPage} of {mealRegistrationsPagination.totalPages} ({mealRegistrationsPagination.totalItems} total)
                    </span>
                    <button
                      onClick={() => handleMealRegistrationsPageChange(Math.min(mealRegistrationsPagination.totalPages, currentMealRegistrationsPage + 1))}
                      disabled={currentMealRegistrationsPage === mealRegistrationsPagination.totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentMealRegistrationsPage === mealRegistrationsPagination.totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Avail History Tab - Only visible to cashierlima */}
        {activeTab === 'avail-history' && user.role === 'cashierlima' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ClockIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Avail History</h2>
                  <p className="text-gray-600 mt-1">
                    View history of all availed meals
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleExportToExcel}
                  disabled={isExportingExcel || isLoadingAvailHistory || availHistory.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isExportingExcel || isLoadingAvailHistory || availHistory.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isExportingExcel ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Export Excel</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportBillingExcel}
                  disabled={isExportingBilling || isLoadingAvailHistory || availHistory.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isExportingBilling || isLoadingAvailHistory || availHistory.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isExportingBilling ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Billing Export</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportToPDF}
                  disabled={isExportingPDF || isLoadingAvailHistory || availHistory.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                    isExportingPDF || isLoadingAvailHistory || availHistory.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isExportingPDF ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Exporting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>Export PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={availHistoryFilters.startDate}
                  onChange={(e) => {
                    setAvailHistoryFilters(prev => ({ ...prev, startDate: e.target.value }));
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={availHistoryFilters.endDate}
                  onChange={(e) => {
                    setAvailHistoryFilters(prev => ({ ...prev, endDate: e.target.value }));
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Meal Type</label>
                <select
                  value={availHistoryFilters.mealType}
                  onChange={(e) => {
                    setAvailHistoryFilters(prev => ({ ...prev, mealType: e.target.value }));
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">All Meals</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">AccountID</label>
                <input
                  type="number"
                  placeholder="Search AccountID"
                  value={availHistoryFilters.accountID}
                  onChange={(e) => {
                    setAvailHistoryFilters(prev => ({ ...prev, accountID: e.target.value }));
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Search Name/ID</label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={availHistoryFilters.search}
                  onChange={(e) => {
                    setAvailHistoryFilters(prev => ({ ...prev, search: e.target.value }));
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {(availHistoryFilters.startDate || availHistoryFilters.endDate || availHistoryFilters.mealType || availHistoryFilters.accountID || availHistoryFilters.search) && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    setAvailHistoryFilters({
                      startDate: '',
                      endDate: '',
                      mealType: '',
                      accountID: '',
                      search: ''
                    });
                    setCurrentAvailHistoryPage(1);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Success/Error Messages */}
            {(error || success) && (
              <div className={`mb-4 p-4 rounded-xl border ${
                error ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
              }`}>
                {error || success}
              </div>
            )}

            {isLoadingAvailHistory ? (
              <div className="text-center py-12">
                <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-500 mt-4">Loading history...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AccountID</th>
                        <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Meal Type</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availed By</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Availed At</th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registration Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {availHistory.map((history) => (
                        <tr key={history._id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {history.accountID || '-'}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              history.mealType === 'breakfast' ? 'bg-yellow-100 text-yellow-800' :
                              history.mealType === 'lunch' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {history.mealType.charAt(0).toUpperCase() + history.mealType.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-4">
                            <div className="text-sm text-gray-900">{history.availedBy?.name || 'Unknown'}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(history.availedAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {new Date(history.registrationDate).toLocaleDateString()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {availHistory.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No avail history found.</p>
                    </div>
                  )}
                </div>
                
                {/* Pagination for Avail History */}
                {availHistoryPagination.totalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 space-x-4">
                    <button
                      onClick={() => setCurrentAvailHistoryPage(Math.max(1, currentAvailHistoryPage - 1))}
                      disabled={currentAvailHistoryPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        currentAvailHistoryPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-gray-700 font-medium">
                      Page {availHistoryPagination.currentPage} of {availHistoryPagination.totalPages} ({availHistoryPagination.totalItems} total)
                    </span>
                    <button
                      onClick={() => setCurrentAvailHistoryPage(Math.min(availHistoryPagination.totalPages, currentAvailHistoryPage + 1))}
                      disabled={currentAvailHistoryPage === availHistoryPagination.totalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        currentAvailHistoryPage === availHistoryPagination.totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Avail Meal Confirmation Modal */}
      <AnimatePresence>
        {showAvailConfirmModal && pendingAvail && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCancelAvailMeal}
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
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-purple-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Confirm Meal Avail
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to mark <span className="font-semibold text-gray-900">{pendingAvail.mealType.charAt(0).toUpperCase() + pendingAvail.mealType.slice(1)}</span> as availed for:
                        </p>
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900">
                            AccountID: <span className="text-purple-600">{pendingAvail.accountID}</span>
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {pendingAvail.studentName}
                          </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmAvailMeal}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Confirm Avail
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelAvailMeal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}