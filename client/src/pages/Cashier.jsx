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
  PrinterIcon
} from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';

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
  const itemsPerPage = 5;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [printError, setPrintError] = useState('');
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const printerDevice = useRef(null);
  const [generatedCodes, setGeneratedCodes] = useState([]);
  const [showCodesModal, setShowCodesModal] = useState(false);

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
      '      2GONZ LOYALTY REWARD\n' +
      '    -------------------------\n\n' +
      `    Code: ${generatedCode}\n` +
      `    ${new Date().toLocaleString()}\n\n` +
      '    HOW TO REDEEM:\n' +
      '    1. Visit: www.2gonz.com\n' +
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
        '      2GONZ LOYALTY REWARD\n' +
        '    -------------------------\n\n' +
        `    Code: ${generatedCode}\n` +
        `    ${new Date().toLocaleString()}\n\n` +
        '    HOW TO REDEEM:\n' +
        '    1. Visit: www.2gonz.com\n' +
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
            { id: 'rewards', icon: GiftIcon, label: 'Rewards' }
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
      </div>
    </div>
  );
}