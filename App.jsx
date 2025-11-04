import React, { useState, useContext, createContext, useMemo, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Users, LogOut, Bell, X, AlertCircle, Shield, Calendar, Search, FileText, CheckCircle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================================
// CONTEXT & STATE MANAGEMENT
// ============================================================================

const AppContext = createContext();

const initialUsers = [
  { 
    id: 1, 
    email: 'lender@demo.com', 
    password: 'demo123', 
    name: 'John Lender', 
    accountBalance: 50000, 
    creditScore: 750, 
    totalInvested: 25000, 
    totalReturns: 1850, 
    loansFunded: [], 
    loansBorrowed: [], 
    accountCreated: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), 
    verified: true, 
    riskProfile: 'conservative' 
  },
  { 
    id: 2, 
    email: 'borrower@demo.com', 
    password: 'demo123', 
    name: 'Sarah Borrower', 
    accountBalance: 1000, 
    creditScore: 680, 
    totalInvested: 0, 
    totalReturns: 0, 
    loansFunded: [], 
    loansBorrowed: [], 
    accountCreated: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 
    verified: true, 
    riskProfile: 'moderate' 
  }
];

const initialLoanRequests = [
  { 
    id: 1, 
    borrowerId: 2, 
    borrowerName: 'Sarah Borrower', 
    borrowerCredit: 680, 
    amount: 15000, 
    interestRate: 8.5, 
    duration: 36, 
    status: 'pending', 
    requestDate: new Date().toLocaleDateString(), 
    purpose: 'Business Expansion', 
    riskRating: 'B+' 
  }
];

// ============================================================================
// UTILITY FUNCTIONS - CALCULATIONS
// ============================================================================

const calculations = {
  calculateAmortization: (amount, rate, duration) => {
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -duration));
    const totalInterest = monthlyPayment * duration - amount;
    return { 
      monthlyPayment: monthlyPayment.toFixed(2), 
      totalInterest: totalInterest.toFixed(2) 
    };
  },
  
  calculateMinimumPayment: (loan) => {
    if (!loan) return '0.00';
    const monthlyRate = (loan.interestRate || 0) / 100 / 12;
    const totalPayments = loan.totalPayments || 1;
    const amount = loan.amount || 0;
    if (monthlyRate === 0 || totalPayments === 0 || amount === 0) return '0.00';
    const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments));
    return monthlyPayment.toFixed(2);
  },
  
  calculateRiskRating: (creditScore, amount, duration) => {
    let score = 0;
    if (creditScore >= 740) score += 3;
    else if (creditScore >= 670) score += 2;
    else score += 1;
    
    if (amount < 10000) score += 3;
    else if (amount < 25000) score += 2;
    else score += 1;
    
    if (duration <= 24) score += 3;
    else if (duration <= 48) score += 2;
    else score += 1;
    
    const ratings = ['C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    return ratings[Math.min(score - 1, 8)];
  },
  
  generatePaymentSchedule: (loan) => {
    const payments = [];
    if (!loan) return payments;
    
    const remainingBalance = loan.outstandingBalance || 0;
    const monthlyRate = (loan.interestRate || 0) / 100 / 12;
    const totalPayments = loan.totalPayments || 1;
    const amount = loan.amount || 0;
    const paymentsMade = loan.paymentsMade || 0;
    
    if (monthlyRate === 0 || totalPayments === 0 || remainingBalance <= 0) return payments;
    
    const monthlyPayment = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -totalPayments));
    let balance = remainingBalance;
    
    for (let i = paymentsMade + 1; i <= totalPayments && i <= paymentsMade + 6; i++) {
      if (balance <= 0) break;
      const paymentDate = new Date(loan.fundedDate || new Date());
      paymentDate.setMonth(paymentDate.getMonth() + i);
      payments.push({ 
        paymentNumber: i, 
        dueDate: paymentDate.toLocaleDateString(), 
        amount: Math.min(monthlyPayment, balance).toFixed(2) 
      });
      balance -= monthlyPayment;
    }
    
    return payments;
  },
  
  calculateROI: (invested, returns) => {
    if (invested === 0) return 0;
    return ((returns / invested) * 100).toFixed(2);
  },
  
  calculateDefaultRate: (loans) => {
    if (loans.length === 0) return 0;
    const defaulted = loans.filter(l => l.status === 'defaulted').length;
    return ((defaulted / loans.length) * 100).toFixed(2);
  }
};

// ============================================================================
// UTILITY FUNCTIONS - VALIDATORS
// ============================================================================

const validators = {
  validateLoanRequest: (amount, rate, duration) => {
    const errors = {};
    if (!amount || parseFloat(amount) < 1000 || parseFloat(amount) > 1000000) {
      errors.amount = 'Amount must be between $1,000 and $1,000,000';
    }
    if (!rate || parseFloat(rate) <= 0 || parseFloat(rate) > 50) {
      errors.rate = 'Interest rate must be between 0.1% and 50%';
    }
    if (!duration || parseInt(duration) < 1 || parseInt(duration) > 360) {
      errors.duration = 'Duration must be between 1 and 360 months';
    }
    return errors;
  },
  
  validateEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  validatePassword: (password) => {
    return password && password.length >= 6;
  },
  
  validateAmount: (amount, min = 0, max = Infinity) => {
    const num = parseFloat(amount);
    return !isNaN(num) && num >= min && num <= max;
  }
};

// ============================================================================
// UTILITY FUNCTIONS - STYLES
// ============================================================================

const styles = {
  getNotificationStyle: (type) => {
    const styleMap = {
      credit_request: 'bg-yellow-900 border-yellow-700 text-yellow-200',
      loan_funded: 'bg-green-900 border-green-700 text-green-200',
      counter_offer: 'bg-blue-900 border-blue-700 text-blue-200',
      payment_received: 'bg-emerald-900 border-emerald-700 text-emerald-200',
      error: 'bg-red-900 border-red-700 text-red-200',
      deposit: 'bg-green-900 border-green-700 text-green-200',
      withdraw: 'bg-orange-900 border-orange-700 text-orange-200',
      payment_made: 'bg-blue-900 border-blue-700 text-blue-200',
      login: 'bg-gray-700 border-gray-600 text-gray-200',
    };
    return styleMap[type] || 'bg-gray-700 border-gray-600 text-gray-200';
  },
  
  getActivityColor: (action) => {
    const lendingActions = ['funded', 'counter_offered', 'offer_accepted'];
    const borrowingActions = ['requested', 'payment_made', 'accepted_offer'];
    if (lendingActions.includes(action)) return 'bg-blue-900 border-blue-700 text-blue-200';
    if (borrowingActions.includes(action)) return 'bg-orange-900 border-orange-700 text-orange-200';
    return 'bg-gray-700 border-gray-600 text-gray-200';
  },
  
  getRiskColor: (rating) => {
    const colors = {
      'A+': 'text-green-400', 'A': 'text-green-500', 'A-': 'text-lime-400',
      'B+': 'text-yellow-400', 'B': 'text-yellow-500', 'B-': 'text-orange-400',
      'C+': 'text-orange-500', 'C': 'text-red-400', 'C-': 'text-red-500',
    };
    return colors[rating] || 'text-gray-400';
  },
  
  getStatusColor: (status) => {
    const colors = {
      'active': 'text-green-400',
      'pending': 'text-yellow-400',
      'paid_off': 'text-blue-400',
      'defaulted': 'text-red-400',
      'cancelled': 'text-gray-400'
    };
    return colors[status] || 'text-gray-400';
  }
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useNotifications = () => {
  const { notifications, setNotifications, currentUser } = useContext(AppContext);
  
  const addNotification = (userId, type, message) => {
    setNotifications(prev => [...prev, { 
      id: Date.now(), 
      userId, 
      type, 
      message, 
      isRead: false, 
      timestamp: new Date() 
    }]);
  };
  
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };
  
  const dismissAll = () => {
    setNotifications(prev => prev.map(n => 
      n.userId === currentUser?.id ? { ...n, isRead: true } : n
    ));
  };
  
  const userNotifications = useMemo(() => 
    notifications.filter(n => n.userId === currentUser?.id && !n.isRead),
    [notifications, currentUser]
  );
  
  return { addNotification, markAsRead, dismissAll, userNotifications };
};

const useLoanHistory = () => {
  const { loanHistory, setLoanHistory, currentUser } = useContext(AppContext);
  
  const addHistory = (userId, action, loan) => {
    setLoanHistory(prev => [...prev, {
      id: Date.now(), 
      userId, 
      action, 
      loanId: loan.id,
      amount: loan.amount, 
      timestamp: new Date()
    }]);
  };
  
  const getUserHistory = useMemo(() => 
    loanHistory.filter(h => h.userId === currentUser?.id).slice(-10),
    [loanHistory, currentUser]
  );
  
  return { addHistory, getUserHistory };
};

const useAuth = () => {
  const { currentUser, setCurrentUser, users } = useContext(AppContext);
  
  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true };
    }
    return { success: false, error: 'Invalid credentials' };
  };
  
  const logout = () => {
    setCurrentUser(null);
  };
  
  const signup = (email, password, name) => {
    if (!validators.validateEmail(email)) {
      return { success: false, error: 'Invalid email format' };
    }
    if (!validators.validatePassword(password)) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    return { success: true };
  };
  
  return { login, logout, signup, currentUser, isAuthenticated: !!currentUser };
};

// ============================================================================
// UI COMPONENTS - COMMON
// ============================================================================

const ModalWrapper = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-800 rounded-xl ${maxWidth} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, icon: Icon, children, className = '' }) => {
  return (
    <div className={`bg-gray-800 rounded-xl p-6 ${className}`}>
      {title && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && <Icon className="w-6 h-6 text-indigo-400" />}
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
      )}
      {children}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend, trendValue }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm">{title}</h3>
        {Icon && <Icon className="w-8 h-8 text-indigo-400" />}
      </div>
      <div className="text-3xl font-bold text-white mb-2">{value}</div>
      {trend && (
        <div className={`text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'} flex items-center gap-1`}>
          <TrendingUp className="w-4 h-4" />
          <span>{trendValue}</span>
        </div>
      )}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`py-2.5 md:py-2 px-4 rounded-lg font-semibold transition active:scale-95 ${variantStyles[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, error, placeholder, ...props }) => {
  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-300">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 ${error ? 'ring-2 ring-red-500' : 'focus:ring-indigo-500'}`}
        {...props}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - LOAN PREVIEW
// ============================================================================

const LoanPreview = ({ amount, rate, duration }) => {
  const { monthlyPayment, totalInterest } = calculations.calculateAmortization(
    parseFloat(amount) || 0,
    parseFloat(rate) || 0,
    parseInt(duration) || 1
  );
  
  const totalRepayment = (parseFloat(amount) || 0) + (parseFloat(totalInterest) || 0);
  
  return (
    <div className="bg-gray-700 rounded-lg p-4 space-y-3">
      <h4 className="text-white font-semibold">Loan Preview</h4>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400">Monthly Payment</p>
          <p className="text-white font-bold text-lg">${monthlyPayment}</p>
        </div>
        <div>
          <p className="text-gray-400">Total Interest</p>
          <p className="text-white font-bold text-lg">${totalInterest}</p>
        </div>
        <div>
          <p className="text-gray-400">Total Repayment</p>
          <p className="text-white font-bold text-lg">${totalRepayment.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400">Duration</p>
          <p className="text-white font-bold text-lg">{duration} months</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - NAVBAR
// ============================================================================

const Navbar = ({ currentModal, setCurrentModal }) => {
  const { currentUser } = useContext(AppContext);
  const { userNotifications } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'marketplace', label: 'Marketplace', icon: Search },
    { id: 'my_loans', label: 'My Loans', icon: FileText },
    { id: 'request_loan', label: 'Request Loan', icon: DollarSign },
    { id: 'negotiations', label: 'Negotiations', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'contact', label: 'Contact', icon: Shield },
  ];
  
  const handleNavClick = (id) => {
    setCurrentModal(id);
    setMobileMenuOpen(false);
    setShowNotifications(false);
  };
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      setMobileMenuOpen(false);
    }
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (!mobileMenuOpen) {
      setShowNotifications(false);
    }
  };
  
  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={toggleMobileMenu}
              className="md:hidden p-2 text-gray-300 hover:bg-gray-700 rounded-lg transition"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            
            <h1 className="text-xl md:text-2xl font-bold text-white">P2P Lending</h1>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
                    currentModal === item.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="relative p-2 text-gray-300 hover:bg-gray-700 rounded-lg transition"
              >
                <Bell className="w-5 h-5" />
                {userNotifications.length > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {userNotifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <NotificationDropdown 
                  notifications={userNotifications} 
                  onClose={() => setShowNotifications(false)} 
                />
              )}
            </div>
            
            {/* User Info */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-2 md:px-4 py-2">
              <div className="text-right hidden sm:block">
                <p className="text-white font-semibold text-sm">{currentUser?.name}</p>
                <p className="text-gray-400 text-xs">${currentUser?.accountBalance.toLocaleString()}</p>
              </div>
              <button
                onClick={() => {
                  setCurrentModal('signin');
                  setShowNotifications(false);
                  setMobileMenuOpen(false);
                }}
                className="p-2 text-gray-300 hover:bg-gray-600 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700 py-4">
            <div className="flex flex-col space-y-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                    currentModal === item.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              
              {/* Mobile User Info */}
              <div className="px-4 py-3 bg-gray-700 rounded-lg mt-4">
                <p className="text-white font-semibold">{currentUser?.name}</p>
                <p className="text-gray-400 text-sm">Balance: ${currentUser?.accountBalance.toLocaleString()}</p>
                <p className="text-gray-400 text-sm">Credit Score: {currentUser?.creditScore}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const NotificationDropdown = ({ notifications, onClose }) => {
  const { markAsRead, dismissAll } = useNotifications();
  
  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" 
        onClick={onClose}
      />
      
      {/* Notification panel */}
      <div className="fixed md:absolute right-0 top-16 md:top-full md:mt-2 left-0 md:left-auto md:right-0 md:w-96 bg-gray-800 border-t md:border border-gray-700 md:rounded-xl shadow-xl max-h-[70vh] md:max-h-96 overflow-y-auto z-50">
        <div className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10">
          <h3 className="text-white font-semibold">Notifications</h3>
          <div className="flex items-center gap-3">
            <button onClick={dismissAll} className="text-sm text-indigo-400 hover:text-indigo-300">
              Mark all as read
            </button>
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No new notifications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-700 transition cursor-pointer ${styles.getNotificationStyle(notif.type)}`}
                onClick={() => {
                  markAsRead(notif.id);
                  onClose();
                }}
              >
                <p className="text-sm">{notif.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {new Date(notif.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// UI COMPONENTS - AUTHENTICATION
// ============================================================================

const SignIn = ({ setCurrentModal }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { addNotification } = useNotifications();
  
  const handleSignIn = () => {
    const result = login(email, password);
    if (result.success) {
      addNotification(result.user?.id, 'login', 'Welcome back!');
      setCurrentModal('dashboard');
    } else {
      setError(result.error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">P2P Lending</h1>
          <p className="text-gray-400">Connect borrowers and lenders directly</p>
        </div>
        
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            error={error}
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
          
          <Button onClick={handleSignIn} className="w-full py-3">
            Sign In
          </Button>
        </div>
        
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <p className="text-gray-300 text-sm mb-2">Demo Accounts:</p>
          <div className="space-y-1 text-xs text-gray-400">
            <p>Lender: lender@demo.com / demo123</p>
            <p>Borrower: borrower@demo.com / demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - MARKETPLACE
// ============================================================================

const Marketplace = ({ setDetailsModal, setSelectedLoan, setCreditReportModal, setSelectedCreditRequest }) => {
  const { currentUser, loanRequests, creditReportRequests } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('amount');
  
  const userCreditRequests = creditReportRequests.filter(r => r.requesterId === currentUser.id);
  
  const filteredLoans = loanRequests
    .filter(loan => loan.status === 'pending' && loan.borrowerId !== currentUser.id)
    .filter(loan => {
      if (searchTerm) {
        return loan.borrowerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               loan.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(loan => {
      if (filterRisk === 'all') return true;
      return loan.riskRating?.startsWith(filterRisk);
    })
    .sort((a, b) => {
      if (sortBy === 'amount') return b.amount - a.amount;
      if (sortBy === 'rate') return b.interestRate - a.interestRate;
      if (sortBy === 'risk') return a.riskRating?.localeCompare(b.riskRating || '');
      return 0;
    });
  
  const handleViewDetails = (loan) => {
    setSelectedLoan(loan);
    setDetailsModal(true);
  };
  
  const handleViewCreditRequest = (request) => {
    setSelectedCreditRequest(request);
    setCreditReportModal(true);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Loan Marketplace</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2.5 md:py-2 text-sm md:text-base"
          >
            <option value="all">All Risk Levels</option>
            <option value="A">A Rated</option>
            <option value="B">B Rated</option>
            <option value="C">C Rated</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-700 text-white rounded-lg px-4 py-2.5 md:py-2 text-sm md:text-base"
          >
            <option value="amount">Sort by Amount</option>
            <option value="rate">Sort by Rate</option>
            <option value="risk">Sort by Risk</option>
          </select>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search by borrower name or purpose..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm md:text-base"
        />
      </div>
      
      {userCreditRequests.length > 0 && (
        <Card title="Pending Credit Report Requests" icon={AlertCircle}>
          <div className="space-y-3">
            {userCreditRequests.map(request => (
              <div key={request.id} className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <p className="text-yellow-200 font-semibold text-sm md:text-base">
                    Credit report request for {request.borrowerName}'s loan
                  </p>
                  <p className="text-yellow-300 text-xs md:text-sm mt-1">
                    Loan Amount: ${request.loanAmount.toLocaleString()}
                  </p>
                </div>
                {request.status === 'pending' && (
                  <span className="text-yellow-200 text-sm">Awaiting Response</span>
                )}
                {request.status === 'approved' && (
                  <Button onClick={() => handleViewCreditRequest(request)} variant="success" className="text-sm w-full sm:w-auto">
                    View Report
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {filteredLoans.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-base md:text-lg">No loans match your criteria</p>
          </div>
        ) : (
          filteredLoans.map(loan => (
            <div key={loan.id} className="bg-gray-800 rounded-xl p-4 md:p-6 hover:bg-gray-750 transition cursor-pointer active:scale-98" onClick={() => handleViewDetails(loan)}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-white font-bold text-base md:text-lg">{loan.borrowerName}</h3>
                  <p className="text-gray-400 text-xs md:text-sm">Credit Score: {loan.borrowerCredit}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${styles.getRiskColor(loan.riskRating)}`}>
                  {loan.riskRating}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Amount</p>
                  <p className="text-white font-bold text-lg md:text-xl">${loan.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Interest Rate</p>
                  <p className="text-white font-bold text-lg md:text-xl">{loan.interestRate}%</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Duration</p>
                  <p className="text-white font-semibold text-sm md:text-base">{loan.duration} months</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Purpose</p>
                  <p className="text-white font-semibold truncate text-sm md:text-base">{loan.purpose}</p>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-gray-400 text-xs mb-1">Estimated Monthly Payment</p>
                <p className="text-white font-bold text-base md:text-lg">
                  ${calculations.calculateAmortization(loan.amount, loan.interestRate, loan.duration).monthlyPayment}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - MY LOANS
// ============================================================================

const MyLoans = ({ setPaymentModal, setSelectedLoan }) => {
  const { currentUser, fundedLoans } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('borrowed');
  
  const borrowedLoans = fundedLoans.filter(l => l.borrowerId === currentUser.id);
  const fundedByMe = fundedLoans.filter(l => l.lenderId === currentUser.id);
  
  const displayLoans = activeTab === 'borrowed' ? borrowedLoans : fundedByMe;
  
  const handleMakePayment = (loan) => {
    setSelectedLoan(loan);
    setPaymentModal(true);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">My Loans</h1>
      
      <div className="flex gap-4 border-b border-gray-700">
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'borrowed'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Borrowed ({borrowedLoans.length})
        </button>
        <button
          onClick={() => setActiveTab('funded')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'funded'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Funded ({fundedByMe.length})
        </button>
      </div>
      
      {displayLoans.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">
            {activeTab === 'borrowed' ? 'You have no borrowed loans' : 'You have not funded any loans'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayLoans.map(loan => (
            <Card key={loan.id}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-xl">
                        {activeTab === 'borrowed' ? `Loan from ${loan.lenderName}` : `Loan to ${loan.borrowerName}`}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Funded on {new Date(loan.fundedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${styles.getStatusColor(loan.status)}`}>
                      {loan.status.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Loan Amount</p>
                      <p className="text-white font-bold text-lg">${loan.amount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Interest Rate</p>
                      <p className="text-white font-bold text-lg">{loan.interestRate}%</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs">Monthly Payment</p>
                      <p className="text-white font-bold text-lg">${calculations.calculateMinimumPayment(loan)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Progress</span>
                      <span className="text-white font-semibold">
                        {loan.paymentsMade || 0} / {loan.totalPayments || 0} payments
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-3">
                      <div
                        className="bg-indigo-500 h-3 rounded-full transition-all"
                        style={{ width: `${((loan.paymentsMade || 0) / (loan.totalPayments || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">Outstanding Balance</p>
                    <p className="text-white font-bold text-2xl">
                      ${(loan.outstandingBalance || 0).toLocaleString()}
                    </p>
                  </div>
                  
                  {activeTab === 'borrowed' && loan.status === 'active' && (
                    <Button onClick={() => handleMakePayment(loan)} variant="success" className="w-full">
                      Make Payment
                    </Button>
                  )}
                  
                  {activeTab === 'funded' && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-2">Expected Return</p>
                      <p className="text-green-400 font-bold text-xl">
                        ${calculations.calculateAmortization(loan.amount, loan.interestRate, loan.duration).totalInterest}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {loan.status === 'active' && calculations.generatePaymentSchedule(loan).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h4 className="text-white font-semibold mb-3">Upcoming Payments</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {calculations.generatePaymentSchedule(loan).slice(0, 3).map(payment => (
                      <div key={payment.paymentNumber} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Payment #{payment.paymentNumber}</span>
                          <span className="text-white font-bold">${payment.amount}</span>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Due: {payment.dueDate}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - REQUEST LOAN
// ============================================================================

const RequestLoan = () => {
  const { currentUser, loanRequests, setLoanRequests, users } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const { addHistory } = useLoanHistory();
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [duration, setDuration] = useState('');
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  
  const handleSubmit = () => {
    const validationErrors = validators.validateLoanRequest(amount, rate, duration);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const riskRating = calculations.calculateRiskRating(
      currentUser.creditScore,
      parseFloat(amount),
      parseInt(duration)
    );
    
    const newLoan = {
      id: Date.now(),
      borrowerId: currentUser.id,
      borrowerName: currentUser.name,
      borrowerCredit: currentUser.creditScore,
      amount: parseFloat(amount),
      interestRate: parseFloat(rate),
      duration: parseInt(duration),
      status: 'pending',
      requestDate: new Date().toLocaleDateString(),
      purpose,
      riskRating
    };
    
    setLoanRequests(prev => [...prev, newLoan]);
    addHistory(currentUser.id, 'requested', newLoan);
    addNotification(currentUser.id, 'loan_funded', `Loan request submitted for $${amount}`);
    
    // Notify potential lenders
    users.filter(u => u.id !== currentUser.id).forEach(user => {
      addNotification(user.id, 'credit_request', `New loan request available: $${amount} at ${rate}%`);
    });
    
    // Reset form
    setAmount('');
    setRate('');
    setDuration('');
    setPurpose('');
    setErrors({});
    setShowPreview(false);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Request a Loan</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Loan Details" icon={FileText}>
          <div className="space-y-4">
            <Input
              label="Loan Amount"
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setShowPreview(false);
              }}
              placeholder="Enter amount"
              error={errors.amount}
            />
            
            <Input
              label="Interest Rate (%)"
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => {
                setRate(e.target.value);
                setShowPreview(false);
              }}
              placeholder="Enter interest rate"
              error={errors.rate}
            />
            
            <Input
              label="Duration (months)"
              type="number"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                setShowPreview(false);
              }}
              placeholder="Enter duration"
              error={errors.duration}
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Describe the purpose of this loan..."
                rows="4"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <Button
              onClick={() => setShowPreview(true)}
              variant="secondary"
              className="w-full"
              disabled={!amount || !rate || !duration}
            >
              Preview Loan
            </Button>
            
            <Button
              onClick={handleSubmit}
              variant="success"
              className="w-full"
              disabled={!amount || !rate || !duration || !showPreview}
            >
              Submit Loan Request
            </Button>
          </div>
        </Card>
        
        <div className="space-y-6">
          <Card title="Your Profile" icon={Users}>
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Credit Score</span>
                <span className="text-white font-bold">{currentUser.creditScore}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Account Age</span>
                <span className="text-white font-bold">
                  {Math.floor((Date.now() - currentUser.accountCreated) / (1000 * 60 * 60 * 24))} days
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Risk Profile</span>
                <span className="text-white font-bold capitalize">{currentUser.riskProfile}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">Verified</span>
                <span className="text-green-400 font-bold">{currentUser.verified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </Card>
          
          {showPreview && amount && rate && duration && (
            <Card title="Loan Preview" icon={DollarSign}>
              <LoanPreview amount={amount} rate={rate} duration={duration} />
              <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm mb-1">Estimated Risk Rating</p>
                <p className={`font-bold text-xl ${styles.getRiskColor(calculations.calculateRiskRating(currentUser.creditScore, parseFloat(amount), parseInt(duration)))}`}>
                  {calculations.calculateRiskRating(currentUser.creditScore, parseFloat(amount), parseInt(duration))}
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - NEGOTIATIONS
// ============================================================================

const Negotiations = ({ setCounterOfferModal, setSelectedLoan, setCounterAmount, setCounterRate, setCounterDuration }) => {
  const { currentUser, negotiations, setNegotiations, loanRequests, setLoanRequests } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const { addHistory } = useLoanHistory();
  
  const myNegotiations = negotiations.filter(n => 
    n.borrowerId === currentUser.id || n.lenderId === currentUser.id
  );
  
  const handleAcceptOffer = (negotiation) => {
    const loan = loanRequests.find(l => l.id === negotiation.loanId);
    if (!loan) return;
    
    // Update the loan with accepted terms
    setLoanRequests(prev => prev.map(l => 
      l.id === negotiation.loanId
        ? { ...l, amount: negotiation.counterAmount, interestRate: negotiation.counterRate, duration: negotiation.counterDuration }
        : l
    ));
    
    // Remove negotiation
    setNegotiations(prev => prev.filter(n => n.id !== negotiation.id));
    
    addNotification(negotiation.lenderId, 'counter_offer', `${currentUser.name} accepted your counter offer`);
    addNotification(currentUser.id, 'counter_offer', 'You accepted the counter offer');
    addHistory(currentUser.id, 'accepted_offer', loan);
  };
  
  const handleRejectOffer = (negotiation) => {
    setNegotiations(prev => prev.filter(n => n.id !== negotiation.id));
    addNotification(negotiation.lenderId, 'counter_offer', `${currentUser.name} rejected your counter offer`);
    addNotification(currentUser.id, 'counter_offer', 'You rejected the counter offer');
  };
  
  const handleModifyOffer = (negotiation) => {
    const loan = loanRequests.find(l => l.id === negotiation.loanId);
    if (!loan) return;
    
    setSelectedLoan(loan);
    setCounterAmount(negotiation.counterAmount);
    setCounterRate(negotiation.counterRate);
    setCounterDuration(negotiation.counterDuration);
    setCounterOfferModal(true);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Negotiations</h1>
      
      {myNegotiations.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No active negotiations</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myNegotiations.map(negotiation => {
            const isLender = negotiation.lenderId === currentUser.id;
            const isBorrower = negotiation.borrowerId === currentUser.id;
            
            return (
              <Card key={negotiation.id}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-bold text-xl">
                        {isLender ? `Counter offer to ${negotiation.borrowerName}` : `Counter offer from ${negotiation.lenderName}`}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        Submitted on {new Date(negotiation.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-blue-900 border border-blue-700 rounded-full text-blue-200 text-sm font-semibold">
                      Pending
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Original Amount</p>
                      <p className="text-white font-semibold line-through">${negotiation.originalAmount.toLocaleString()}</p>
                      <p className="text-indigo-400 font-bold text-lg">${negotiation.counterAmount.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Original Rate</p>
                      <p className="text-white font-semibold line-through">{negotiation.originalRate}%</p>
                      <p className="text-indigo-400 font-bold text-lg">{negotiation.counterRate}%</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">Original Duration</p>
                      <p className="text-white font-semibold line-through">{negotiation.originalDuration}mo</p>
                      <p className="text-indigo-400 font-bold text-lg">{negotiation.counterDuration}mo</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-gray-400 text-xs mb-1">New Monthly</p>
                      <p className="text-indigo-400 font-bold text-lg">
                        ${calculations.calculateAmortization(negotiation.counterAmount, negotiation.counterRate, negotiation.counterDuration).monthlyPayment}
                      </p>
                    </div>
                  </div>
                  
                  <LoanPreview
                    amount={negotiation.counterAmount}
                    rate={negotiation.counterRate}
                    duration={negotiation.counterDuration}
                  />
                  
                  <div className="flex gap-3">
                    {isBorrower && (
                      <>
                        <Button onClick={() => handleAcceptOffer(negotiation)} variant="success" className="flex-1">
                          Accept Offer
                        </Button>
                        <Button onClick={() => handleModifyOffer(negotiation)} variant="primary" className="flex-1">
                          Counter Again
                        </Button>
                        <Button onClick={() => handleRejectOffer(negotiation)} variant="danger" className="flex-1">
                          Reject
                        </Button>
                      </>
                    )}
                    {isLender && (
                      <div className="flex-1 bg-yellow-900 border border-yellow-700 rounded-lg p-3 text-center">
                        <p className="text-yellow-200">Waiting for borrower's response</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - ANALYTICS
// ============================================================================

const Analytics = () => {
  const { currentUser, fundedLoans, loanRequests } = useContext(AppContext);
  
  const myFundedLoans = fundedLoans.filter(l => l.lenderId === currentUser.id);
  const myBorrowedLoans = fundedLoans.filter(l => l.borrowerId === currentUser.id);
  
  const chartData = [
    { month: 'Jan', invested: 5000, returns: 150 },
    { month: 'Feb', invested: 8000, returns: 280 },
    { month: 'Mar', invested: 12000, returns: 450 },
    { month: 'Apr', invested: 15000, returns: 620 },
    { month: 'May', invested: 18000, returns: 890 },
    { month: 'Jun', invested: 25000, returns: 1850 },
  ];
  
  const riskDistribution = [
    { risk: 'A', count: myFundedLoans.filter(l => l.riskRating?.startsWith('A')).length, color: 'bg-green-500' },
    { risk: 'B', count: myFundedLoans.filter(l => l.riskRating?.startsWith('B')).length, color: 'bg-yellow-500' },
    { risk: 'C', count: myFundedLoans.filter(l => l.riskRating?.startsWith('C')).length, color: 'bg-red-500' },
  ];
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StatCard
          title="Portfolio Value"
          value={`$${myFundedLoans.reduce((sum, l) => sum + l.amount, 0).toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+12.5%"
        />
        <StatCard
          title="Average ROI"
          value={`${calculations.calculateROI(currentUser.totalInvested, currentUser.totalReturns)}%`}
          icon={TrendingUp}
          trend="up"
          trendValue="+2.3%"
        />
        <StatCard
          title="Active Investments"
          value={myFundedLoans.filter(l => l.status === 'active').length}
          icon={Activity}
        />
      </div>
      
      <Card title="Investment Performance" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#F3F4F6' }}
            />
            <Legend />
            <Line type="monotone" dataKey="invested" stroke="#6366F1" strokeWidth={2} name="Invested" />
            <Line type="monotone" dataKey="returns" stroke="#10B981" strokeWidth={2} name="Returns" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Risk Distribution" icon={AlertCircle}>
          <div className="space-y-4">
            {riskDistribution.map(item => (
              <div key={item.risk}>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-300 font-semibold">Grade {item.risk}</span>
                  <span className="text-white font-bold">{item.count} loans</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className={`${item.color} h-3 rounded-full transition-all`}
                    style={{ width: `${(item.count / Math.max(myFundedLoans.length, 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card title="Loan Status" icon={FileText}>
          <div className="space-y-3">
            {[
              { status: 'Active', count: fundedLoans.filter(l => l.status === 'active').length, color: 'text-green-400' },
              { status: 'Paid Off', count: fundedLoans.filter(l => l.status === 'paid_off').length, color: 'text-blue-400' },
              { status: 'Pending', count: loanRequests.filter(l => l.status === 'pending').length, color: 'text-yellow-400' },
              { status: 'Defaulted', count: fundedLoans.filter(l => l.status === 'defaulted').length, color: 'text-red-400' },
            ].map(item => (
              <div key={item.status} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                <span className="text-gray-300">{item.status}</span>
                <span className={`font-bold text-lg ${item.color}`}>{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - CONTACT
// ============================================================================

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      setName('');
      setEmail('');
      setMessage('');
      setSubmitted(false);
    }, 3000);
  };
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Contact Us</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Send us a message" icon={FileText}>
          <div className="space-y-4">
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you?"
                rows="6"
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            {submitted ? (
              <div className="bg-green-900 border border-green-700 text-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p>Message sent successfully!</p>
              </div>
            ) : (
              <Button
                onClick={handleSubmit}
                variant="primary"
                className="w-full"
                disabled={!name || !email || !message}
              >
                Send Message
              </Button>
            )}
          </div>
        </Card>
        
        <Card title="Contact Information" icon={Shield}>
          <div className="space-y-6">
            <div>
              <h3 className="text-white font-semibold mb-2">Customer Support</h3>
              <p className="text-gray-400">Available 24/7 to assist you</p>
              <p className="text-indigo-400 font-semibold mt-2">support@p2plending.com</p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-2">Business Inquiries</h3>
              <p className="text-gray-400">For partnership opportunities</p>
              <p className="text-indigo-400 font-semibold mt-2">business@p2plending.com</p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-2">Phone</h3>
              <p className="text-gray-400">Mon-Fri, 9AM - 6PM EST</p>
              <p className="text-indigo-400 font-semibold mt-2">1-800-P2P-LEND</p>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Office Address</h3>
              <p className="text-gray-400 text-sm">
                123 Finance Street<br />
                New York, NY 10004<br />
                United States
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - DASHBOARD
// ============================================================================

const Dashboard = ({ setDepositModal, setWithdrawModal, setEditProfileModal }) => {
  const { currentUser, fundedLoans, loanRequests } = useContext(AppContext);
  const { getUserHistory } = useLoanHistory();
  
  const userFundedLoans = fundedLoans.filter(l => l.lenderId === currentUser.id);
  const userBorrowedLoans = fundedLoans.filter(l => l.borrowerId === currentUser.id);
  const activeLoans = [...userFundedLoans, ...userBorrowedLoans].filter(l => l.status === 'active');
  
  const totalLent = userFundedLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const totalBorrowed = userBorrowedLoans.reduce((sum, loan) => sum + loan.amount, 0);
  const roi = calculations.calculateROI(currentUser.totalInvested, currentUser.totalReturns);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => setDepositModal(true)} variant="success" className="w-full sm:w-auto">
            Deposit Funds
          </Button>
          <Button onClick={() => setWithdrawModal(true)} variant="secondary" className="w-full sm:w-auto">
            Withdraw
          </Button>
          <Button onClick={() => setEditProfileModal(true)} variant="secondary" className="w-full sm:w-auto">
            Edit Profile
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Account Balance"
          value={`$${currentUser.accountBalance.toLocaleString()}`}
          icon={DollarSign}
          trend="up"
          trendValue="+5.2%"
        />
        <StatCard
          title="Total Invested"
          value={`$${currentUser.totalInvested.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Returns"
          value={`$${currentUser.totalReturns.toLocaleString()}`}
          icon={CreditCard}
        />
        <StatCard
          title="Active Loans"
          value={activeLoans.length}
          icon={FileText}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="Portfolio Overview" icon={TrendingUp}>
          <div className="space-y-3 md:space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300 text-sm md:text-base">Total Lent</span>
              <span className="text-white font-bold text-sm md:text-base">${totalLent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300 text-sm md:text-base">Total Borrowed</span>
              <span className="text-white font-bold text-sm md:text-base">${totalBorrowed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300 text-sm md:text-base">ROI</span>
              <span className="text-green-400 font-bold text-sm md:text-base">{roi}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300 text-sm md:text-base">Credit Score</span>
              <span className="text-white font-bold text-sm md:text-base">{currentUser.creditScore}</span>
            </div>
          </div>
        </Card>
        
        <Card title="Recent Activity" icon={Activity}>
          <div className="space-y-3">
            {getUserHistory.length === 0 ? (
              <p className="text-gray-400 text-center py-8 text-sm md:text-base">No recent activity</p>
            ) : (
              getUserHistory.map(item => (
                <div
                  key={item.id}
                  className={`p-3 rounded-lg ${styles.getActivityColor(item.action)}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium capitalize text-sm md:text-base">{item.action.replace('_', ' ')}</span>
                    <span className="font-bold text-sm md:text-base">${item.amount?.toLocaleString()}</span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============================================================================
// UI COMPONENTS - MODALS
// ============================================================================

const LoanDetailsModal = ({ isOpen, onClose, loan, setCounterOfferModal, setCounterAmount, setCounterRate, setCounterDuration }) => {
  const { currentUser, users, setUsers, fundedLoans, setFundedLoans, loanRequests, setLoanRequests, negotiations, setNegotiations, creditReportRequests, setCreditReportRequests } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const { addHistory } = useLoanHistory();
  
  if (!loan) return null;
  
  const hasCreditRequest = creditReportRequests.some(r => r.loanId === loan.id && r.requesterId === currentUser.id);
  const submittedReport = creditReportRequests.find(r => r.loanId === loan.id && r.requesterId === currentUser.id && r.status === 'approved');
  
  const handleRequestCredit = () => {
    const newRequest = {
      id: Date.now(),
      loanId: loan.id,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      loanAmount: loan.amount,
      status: 'pending',
      timestamp: new Date()
    };
    
    setCreditReportRequests(prev => [...prev, newRequest]);
    addNotification(loan.borrowerId, 'credit_request', `${currentUser.name} requested your credit report for loan #${loan.id}`);
    addNotification(currentUser.id, 'credit_request', 'Credit report request sent');
  };
  
  const handleFundLoan = () => {
    if (currentUser.accountBalance < loan.amount) {
      addNotification(currentUser.id, 'error', 'Insufficient funds');
      return;
    }
    
    const fee = loan.amount * 0.015;
    const net = loan.amount - fee;
    
    const fundedLoan = {
      ...loan,
      id: Date.now(),
      lenderId: currentUser.id,
      lenderName: currentUser.name,
      status: 'active',
      fundedDate: new Date(),
      outstandingBalance: loan.amount,
      totalPayments: loan.duration,
      paymentsMade: 0
    };
    
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          accountBalance: u.accountBalance - loan.amount,
          totalInvested: u.totalInvested + loan.amount,
          loansFunded: [...u.loansFunded, fundedLoan.id]
        };
      }
      if (u.id === loan.borrowerId) {
        return {
          ...u,
          accountBalance: u.accountBalance + net,
          loansBorrowed: [...u.loansBorrowed, fundedLoan.id]
        };
      }
      return u;
    }));
    
    setFundedLoans(prev => [...prev, fundedLoan]);
    setLoanRequests(prev => prev.filter(l => l.id !== loan.id));
    setNegotiations(prev => prev.filter(n => n.loanId !== loan.id));
    setCreditReportRequests(prev => prev.filter(r => r.loanId !== loan.id));
    addHistory(currentUser.id, 'funded', fundedLoan);
    addNotification(loan.borrowerId, 'loan_funded', `Loan funded! $${net.toFixed(2)} deposited (after 1.5% fee)`);
    addNotification(currentUser.id, 'loan_funded', `Successfully funded loan to ${loan.borrowerName}`);
    onClose();
  };
  
  const handleCounterOffer = () => {
    setCounterAmount(loan.amount);
    setCounterRate(loan.interestRate);
    setCounterDuration(loan.duration);
    setCounterOfferModal(true);
    onClose();
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Loan Details" maxWidth="max-w-2xl">
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">Borrower</p>
              <p className="text-white font-semibold">{loan.borrowerName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Credit Score</p>
              <p className="text-white font-semibold">{loan.borrowerCredit}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Amount</p>
              <p className="text-white font-semibold">${loan.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Interest Rate</p>
              <p className="text-white font-semibold">{loan.interestRate}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Duration</p>
              <p className="text-white font-semibold">{loan.duration} months</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className="text-white font-semibold capitalize">{loan.status.replace('_', ' ')}</p>
            </div>
            {loan.riskRating && (
              <div>
                <p className="text-sm text-gray-400">Risk Rating</p>
                <p className={`font-semibold ${styles.getRiskColor(loan.riskRating)}`}>{loan.riskRating}</p>
              </div>
            )}
            {loan.purpose && (
              <div className="col-span-2">
                <p className="text-sm text-gray-400">Purpose</p>
                <p className="text-white font-semibold">{loan.purpose}</p>
              </div>
            )}
          </div>
        </div>
        
        <LoanPreview amount={loan.amount} rate={loan.interestRate} duration={loan.duration} />
        
        {submittedReport && submittedReport.creditReport && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4">
            <h4 className="text-green-200 font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Credit Report
            </h4>
            <div className="space-y-2 text-sm text-green-100">
              <div className="flex justify-between">
                <span>Credit Score:</span>
                <span className="font-semibold">{submittedReport.creditReport.score}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment History:</span>
                <span className="font-semibold">{submittedReport.creditReport.paymentHistory}</span>
              </div>
              <div className="flex justify-between">
                <span>Credit Utilization:</span>
                <span className="font-semibold">{submittedReport.creditReport.creditUtilization}</span>
              </div>
              <div className="flex justify-between">
                <span>Account Age:</span>
                <span className="font-semibold">{submittedReport.creditReport.accountAge}</span>
              </div>
              <div className="flex justify-between">
                <span>Recent Inquiries:</span>
                <span className="font-semibold">{submittedReport.creditReport.recentInquiries}</span>
              </div>
            </div>
          </div>
        )}
        
        {loan.borrowerId !== currentUser.id && (
          <div className="space-y-3">
            <Button onClick={handleFundLoan} variant="success" className="w-full py-3">
              Fund This Loan
            </Button>
            <Button onClick={handleCounterOffer} variant="primary" className="w-full py-3">
              Make Counter Offer
            </Button>
            {!submittedReport && !hasCreditRequest && (
              <Button onClick={handleRequestCredit} variant="warning" className="w-full py-3">
                Request Credit Report
              </Button>
            )}
            {hasCreditRequest && !submittedReport && (
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-3 text-center">
                <p className="text-yellow-200 text-sm">Credit report requested - awaiting borrower response</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
};

const CounterOfferModal = ({ isOpen, onClose, loan, counterAmount, setCounterAmount, counterRate, setCounterRate, counterDuration, setCounterDuration }) => {
  const { currentUser, negotiations, setNegotiations } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const { addHistory } = useLoanHistory();
  const [errors, setErrors] = useState({});
  
  if (!loan) return null;
  
  const handleSubmit = () => {
    const validationErrors = validators.validateLoanRequest(counterAmount, counterRate, counterDuration);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    const newNegotiation = {
      id: Date.now(),
      loanId: loan.id,
      lenderId: currentUser.id,
      lenderName: currentUser.name,
      borrowerId: loan.borrowerId,
      borrowerName: loan.borrowerName,
      originalAmount: loan.amount,
      originalRate: loan.interestRate,
      originalDuration: loan.duration,
      counterAmount: parseFloat(counterAmount),
      counterRate: parseFloat(counterRate),
      counterDuration: parseInt(counterDuration),
      timestamp: new Date()
    };
    
    setNegotiations(prev => [...prev, newNegotiation]);
    addNotification(loan.borrowerId, 'counter_offer', `${currentUser.name} made a counter offer on your loan request`);
    addNotification(currentUser.id, 'counter_offer', 'Counter offer submitted successfully');
    addHistory(currentUser.id, 'counter_offered', loan);
    onClose();
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Make Counter Offer">
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-3">Original Terms</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400">Amount</p>
              <p className="text-white font-bold">${loan.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400">Rate</p>
              <p className="text-white font-bold">{loan.interestRate}%</p>
            </div>
            <div>
              <p className="text-gray-400">Duration</p>
              <p className="text-white font-bold">{loan.duration}mo</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Input
            label="Counter Amount"
            type="number"
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            error={errors.amount}
          />
          
          <Input
            label="Counter Interest Rate (%)"
            type="number"
            step="0.1"
            value={counterRate}
            onChange={(e) => setCounterRate(e.target.value)}
            error={errors.rate}
          />
          
          <Input
            label="Counter Duration (months)"
            type="number"
            value={counterDuration}
            onChange={(e) => setCounterDuration(e.target.value)}
            error={errors.duration}
          />
        </div>
        
        {counterAmount && counterRate && counterDuration && (
          <LoanPreview amount={counterAmount} rate={counterRate} duration={counterDuration} />
        )}
        
        <div className="flex gap-3">
          <Button onClick={handleSubmit} variant="primary" className="flex-1">
            Submit Counter Offer
          </Button>
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </ModalWrapper>
  );
};

const CreditReportModal = ({ isOpen, onClose, request }) => {
  const { currentUser, creditReportRequests, setCreditReportRequests } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const [reportData, setReportData] = useState({
    score: '',
    paymentHistory: '',
    creditUtilization: '',
    accountAge: '',
    recentInquiries: ''
  });
  
  if (!request) return null;
  
  const isRequester = request.requesterId === currentUser.id;
  const isBorrower = request.borrowerId === currentUser.id;
  
  const handleSubmitReport = () => {
    setCreditReportRequests(prev => prev.map(r => 
      r.id === request.id
        ? { ...r, status: 'approved', creditReport: reportData }
        : r
    ));
    
    addNotification(request.requesterId, 'credit_request', `${currentUser.name} submitted their credit report`);
    addNotification(currentUser.id, 'credit_request', 'Credit report submitted successfully');
    onClose();
  };
  
  const handleDenyReport = () => {
    setCreditReportRequests(prev => prev.filter(r => r.id !== request.id));
    addNotification(request.requesterId, 'credit_request', `${currentUser.name} denied your credit report request`);
    addNotification(currentUser.id, 'credit_request', 'Credit report request denied');
    onClose();
  };
  
  if (isRequester && request.status === 'approved') {
    return (
      <ModalWrapper isOpen={isOpen} onClose={onClose} title="Credit Report">
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <h4 className="text-green-200 font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Credit Report for {request.borrowerName}
          </h4>
          <div className="space-y-3 text-green-100">
            <div className="flex justify-between p-3 bg-green-800 rounded-lg">
              <span>Credit Score:</span>
              <span className="font-bold">{request.creditReport.score}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-800 rounded-lg">
              <span>Payment History:</span>
              <span className="font-bold">{request.creditReport.paymentHistory}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-800 rounded-lg">
              <span>Credit Utilization:</span>
              <span className="font-bold">{request.creditReport.creditUtilization}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-800 rounded-lg">
              <span>Account Age:</span>
              <span className="font-bold">{request.creditReport.accountAge}</span>
            </div>
            <div className="flex justify-between p-3 bg-green-800 rounded-lg">
              <span>Recent Inquiries:</span>
              <span className="font-bold">{request.creditReport.recentInquiries}</span>
            </div>
          </div>
        </div>
      </ModalWrapper>
    );
  }
  
  if (isBorrower && request.status === 'pending') {
    return (
      <ModalWrapper isOpen={isOpen} onClose={onClose} title="Submit Credit Report">
        <div className="space-y-4">
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
            <p className="text-yellow-200">
              {request.requesterName} has requested your credit report for a loan of ${request.loanAmount.toLocaleString()}
            </p>
          </div>
          
          <div className="space-y-4">
            <Input
              label="Credit Score"
              type="number"
              value={reportData.score}
              onChange={(e) => setReportData({ ...reportData, score: e.target.value })}
              placeholder="e.g., 720"
            />
            
            <Input
              label="Payment History"
              value={reportData.paymentHistory}
              onChange={(e) => setReportData({ ...reportData, paymentHistory: e.target.value })}
              placeholder="e.g., Excellent - No missed payments"
            />
            
            <Input
              label="Credit Utilization"
              value={reportData.creditUtilization}
              onChange={(e) => setReportData({ ...reportData, creditUtilization: e.target.value })}
              placeholder="e.g., 25%"
            />
            
            <Input
              label="Account Age"
              value={reportData.accountAge}
              onChange={(e) => setReportData({ ...reportData, accountAge: e.target.value })}
              placeholder="e.g., 5 years"
            />
            
            <Input
              label="Recent Inquiries"
              value={reportData.recentInquiries}
              onChange={(e) => setReportData({ ...reportData, recentInquiries: e.target.value })}
              placeholder="e.g., 2 in last 6 months"
            />
          </div>
          
          <div className="flex gap-3">
            <Button onClick={handleSubmitReport} variant="success" className="flex-1">
              Submit Report
            </Button>
            <Button onClick={handleDenyReport} variant="danger" className="flex-1">
              Deny Request
            </Button>
          </div>
        </div>
      </ModalWrapper>
    );
  }
  
  return null;
};

const PaymentModal = ({ isOpen, onClose, loan }) => {
  const { currentUser, users, setUsers, fundedLoans, setFundedLoans } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const { addHistory } = useLoanHistory();
  const [paymentAmount, setPaymentAmount] = useState('');
  
  if (!loan) return null;
  
  const minimumPayment = parseFloat(calculations.calculateMinimumPayment(loan));
  
  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    
    if (!amount || amount <= 0) {
      addNotification(currentUser.id, 'error', 'Invalid payment amount');
      return;
    }
    
    if (amount < minimumPayment) {
      addNotification(currentUser.id, 'error', `Minimum payment is $${minimumPayment}`);
      return;
    }
    
    if (amount > currentUser.accountBalance) {
      addNotification(currentUser.id, 'error', 'Insufficient funds');
      return;
    }
    
    const newBalance = Math.max(0, loan.outstandingBalance - amount);
    const newPaymentsMade = loan.paymentsMade + 1;
    const isPaidOff = newBalance === 0;
    
    setUsers(prev => prev.map(u => {
      if (u.id === currentUser.id) {
        return { ...u, accountBalance: u.accountBalance - amount };
      }
      if (u.id === loan.lenderId) {
        return {
          ...u,
          accountBalance: u.accountBalance + amount,
          totalReturns: u.totalReturns + (amount - loan.amount / loan.totalPayments)
        };
      }
      return u;
    }));
    
    setFundedLoans(prev => prev.map(l => 
      l.id === loan.id
        ? {
            ...l,
            outstandingBalance: newBalance,
            paymentsMade: newPaymentsMade,
            status: isPaidOff ? 'paid_off' : 'active'
          }
        : l
    ));
    
    addHistory(currentUser.id, 'payment_made', loan);
    addNotification(loan.lenderId, 'payment_received', `Received $${amount} payment from ${currentUser.name}`);
    addNotification(currentUser.id, 'payment_made', `Payment of $${amount} processed successfully`);
    
    if (isPaidOff) {
      addNotification(currentUser.id, 'loan_funded', 'Congratulations! Loan paid off in full');
      addNotification(loan.lenderId, 'loan_funded', `${currentUser.name} paid off their loan in full`);
    }
    
    onClose();
    setPaymentAmount('');
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Make Payment">
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Outstanding Balance</p>
              <p className="text-white font-bold text-xl">${loan.outstandingBalance?.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Minimum Payment</p>
              <p className="text-white font-bold text-xl">${minimumPayment.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Payments Made</p>
              <p className="text-white font-semibold">{loan.paymentsMade} / {loan.totalPayments}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Your Balance</p>
              <p className="text-white font-semibold">${currentUser.accountBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <Input
          label="Payment Amount"
          type="number"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder={`Minimum: $${minimumPayment.toFixed(2)}`}
        />
        
        <div className="flex gap-2">
          <Button onClick={() => setPaymentAmount(minimumPayment.toString())} variant="secondary" className="flex-1">
            Min Payment
          </Button>
          <Button onClick={() => setPaymentAmount(loan.outstandingBalance?.toString())} variant="secondary" className="flex-1">
            Pay in Full
          </Button>
        </div>
        
        <Button onClick={handlePayment} variant="success" className="w-full py-3">
          Process Payment
        </Button>
      </div>
    </ModalWrapper>
  );
};

const DepositModal = ({ isOpen, onClose }) => {
  const { currentUser, users, setUsers } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const [amount, setAmount] = useState('');
  
  const handleDeposit = () => {
    const depositAmount = parseFloat(amount);
    
    if (!depositAmount || depositAmount <= 0) {
      addNotification(currentUser.id, 'error', 'Invalid deposit amount');
      return;
    }
    
    setUsers(prev => prev.map(u => 
      u.id === currentUser.id
        ? { ...u, accountBalance: u.accountBalance + depositAmount }
        : u
    ));
    
    addNotification(currentUser.id, 'deposit', `Successfully deposited $${depositAmount.toLocaleString()}`);
    onClose();
    setAmount('');
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Deposit Funds" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Current Balance</p>
          <p className="text-white font-bold text-2xl">${currentUser?.accountBalance.toLocaleString()}</p>
        </div>
        
        <Input
          label="Deposit Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount to deposit"
        />
        
        <div className="grid grid-cols-3 gap-2">
          {[1000, 5000, 10000].map(preset => (
            <Button key={preset} onClick={() => setAmount(preset.toString())} variant="secondary">
              ${preset.toLocaleString()}
            </Button>
          ))}
        </div>
        
        <Button onClick={handleDeposit} variant="success" className="w-full py-3">
          Deposit
        </Button>
      </div>
    </ModalWrapper>
  );
};

const WithdrawModal = ({ isOpen, onClose }) => {
  const { currentUser, users, setUsers } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const [amount, setAmount] = useState('');
  
  const handleWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      addNotification(currentUser.id, 'error', 'Invalid withdrawal amount');
      return;
    }
    
    if (withdrawAmount > currentUser.accountBalance) {
      addNotification(currentUser.id, 'error', 'Insufficient funds');
      return;
    }
    
    setUsers(prev => prev.map(u => 
      u.id === currentUser.id
        ? { ...u, accountBalance: u.accountBalance - withdrawAmount }
        : u
    ));
    
    addNotification(currentUser.id, 'withdraw', `Successfully withdrew $${withdrawAmount.toLocaleString()}`);
    onClose();
    setAmount('');
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Withdraw Funds" maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Available Balance</p>
          <p className="text-white font-bold text-2xl">${currentUser?.accountBalance.toLocaleString()}</p>
        </div>
        
        <Input
          label="Withdrawal Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount to withdraw"
        />
        
        <Button onClick={handleWithdraw} variant="warning" className="w-full py-3">
          Withdraw
        </Button>
      </div>
    </ModalWrapper>
  );
};

const EditProfileModal = ({ isOpen, onClose }) => {
  const { currentUser, users, setUsers } = useContext(AppContext);
  const { addNotification } = useNotifications();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [riskProfile, setRiskProfile] = useState(currentUser?.riskProfile || 'moderate');
  
  const handleSave = () => {
    if (!validators.validateEmail(email)) {
      addNotification(currentUser.id, 'error', 'Invalid email format');
      return;
    }
    
    setUsers(prev => prev.map(u => 
      u.id === currentUser.id
        ? { ...u, name, email, riskProfile }
        : u
    ));
    
    addNotification(currentUser.id, 'login', 'Profile updated successfully');
    onClose();
  };
  
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} title="Edit Profile" maxWidth="max-w-md">
      <div className="space-y-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
        
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Risk Profile</label>
          <select
            value={riskProfile}
            onChange={(e) => setRiskProfile(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-2">Account Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Credit Score</span>
              <span className="text-white font-semibold">{currentUser?.creditScore}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Verified</span>
              <span className="text-green-400 font-semibold">{currentUser?.verified ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Member Since</span>
              <span className="text-white font-semibold">
                {new Date(currentUser?.accountCreated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <Button onClick={handleSave} variant="primary" className="w-full py-3">
          Save Changes
        </Button>
      </div>
    </ModalWrapper>
  );
};

// ============================================================================
// APPLICATION PROVIDER & MAIN COMPONENT
// ============================================================================

const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(initialUsers);
  const [loanRequests, setLoanRequests] = useState(initialLoanRequests);
  const [fundedLoans, setFundedLoans] = useState([]);
  const [negotiations, setNegotiations] = useState([]);
  const [creditReportRequests, setCreditReportRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loanHistory, setLoanHistory] = useState([]);
  
  useEffect(() => {
    if (currentUser) {
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    }
  }, [users]);
  
  const resetDemo = () => {
    setUsers(initialUsers);
    setLoanRequests(initialLoanRequests);
    setFundedLoans([]);
    setNegotiations([]);
    setCreditReportRequests([]);
    setNotifications([]);
    setLoanHistory([]);
    setCurrentUser(null);
  };
  
  return (
    <AppContext.Provider value={{
      currentUser,
      setCurrentUser,
      users,
      setUsers,
      loanRequests,
      setLoanRequests,
      fundedLoans,
      setFundedLoans,
      negotiations,
      setNegotiations,
      creditReportRequests,
      setCreditReportRequests,
      notifications,
      setNotifications,
      loanHistory,
      setLoanHistory,
      resetDemo
    }}>
      {children}
    </AppContext.Provider>
  );
};

const AmericanP2P = () => {
  const [currentModal, setCurrentModal] = useState('signin');
  const [detailsModal, setDetailsModal] = useState(false);
  const [counterOfferModal, setCounterOfferModal] = useState(false);
  const [creditReportModal, setCreditReportModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedCreditRequest, setSelectedCreditRequest] = useState(null);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterRate, setCounterRate] = useState('');
  const [counterDuration, setCounterDuration] = useState('');
  const { currentUser } = useContext(AppContext);
  
  if (currentModal === 'signin') return <SignIn setCurrentModal={setCurrentModal} />;
  
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar currentModal={currentModal} setCurrentModal={setCurrentModal} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {currentModal === 'dashboard' && (
          <Dashboard
            setDepositModal={setDepositModal}
            setWithdrawModal={setWithdrawModal}
            setEditProfileModal={setEditProfileModal}
          />
        )}
        {currentModal === 'marketplace' && (
          <Marketplace
            setDetailsModal={setDetailsModal}
            setSelectedLoan={setSelectedLoan}
            setCreditReportModal={setCreditReportModal}
            setSelectedCreditRequest={setSelectedCreditRequest}
          />
        )}
        {currentModal === 'my_loans' && (
          <MyLoans
            setPaymentModal={setPaymentModal}
            setSelectedLoan={setSelectedLoan}
          />
        )}
        {currentModal === 'request_loan' && <RequestLoan />}
        {currentModal === 'negotiations' && (
          <Negotiations
            setCounterOfferModal={setCounterOfferModal}
            setSelectedLoan={setSelectedLoan}
            setCounterAmount={setCounterAmount}
            setCounterRate={setCounterRate}
            setCounterDuration={setCounterDuration}
          />
        )}
        {currentModal === 'analytics' && <Analytics />}
        {currentModal === 'contact' && <Contact />}
      </div>
      
      {/* All Modals */}
      <LoanDetailsModal
        isOpen={detailsModal}
        onClose={() => setDetailsModal(false)}
        loan={selectedLoan}
        setCounterOfferModal={setCounterOfferModal}
        setCounterAmount={setCounterAmount}
        setCounterRate={setCounterRate}
        setCounterDuration={setCounterDuration}
      />
      <CounterOfferModal
        isOpen={counterOfferModal}
        onClose={() => setCounterOfferModal(false)}
        loan={selectedLoan}
        counterAmount={counterAmount}
        setCounterAmount={setCounterAmount}
        counterRate={counterRate}
        setCounterRate={setCounterRate}
        counterDuration={counterDuration}
        setCounterDuration={setCounterDuration}
      />
      <CreditReportModal
        isOpen={creditReportModal}
        onClose={() => setCreditReportModal(false)}
        request={selectedCreditRequest}
      />
      <PaymentModal
        isOpen={paymentModal}
        onClose={() => setPaymentModal(false)}
        loan={selectedLoan}
      />
      <DepositModal
        isOpen={depositModal}
        onClose={() => setDepositModal(false)}
      />
      <WithdrawModal
        isOpen={withdrawModal}
        onClose={() => setWithdrawModal(false)}
      />
      <EditProfileModal
        isOpen={editProfileModal}
        onClose={() => setEditProfileModal(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AmericanP2P />
    </AppProvider>
  );
}