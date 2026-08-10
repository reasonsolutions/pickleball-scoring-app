import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVendorMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '../services/vendorItemsService';
import { uploadVendorMenuItem } from '../utils/cloudinary';
import { createOrder, getVendorOrders } from '../services/vendorOrdersService';

export default function VendorHome() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [currentView, setCurrentView] = useState('order'); // order, items, history, analytics, settings
  const [menuItems, setMenuItems] = useState([]);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Food',
    type: 'Veg',
    price: '',
    stock: '',
    photo: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  
  // Order/Cart state
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tableNumber, setTableNumber] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  
  // History state
  const [orders, setOrders] = useState([]);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    // Check if vendor is logged in
    const vendorSession = sessionStorage.getItem('vendorSession') || localStorage.getItem('vendorSession');
    
    if (!vendorSession) {
      navigate('/vendor/login');
      return;
    }

    try {
      const vendorData = JSON.parse(vendorSession);
      setVendor(vendorData);
      loadMenuItems(vendorData.id);
      loadOrders(vendorData.id);
    } catch (error) {
      console.error('Error parsing vendor session:', error);
      navigate('/vendor/login');
    }
  }, [navigate]);

  const loadMenuItems = async (vendorId) => {
    try {
      const items = await getVendorMenuItems(vendorId);
      setMenuItems(items);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const loadOrders = async (vendorId) => {
    try {
      const ordersList = await getVendorOrders(vendorId);
      setOrders(ordersList);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('vendorSession');
    localStorage.removeItem('vendorSession');
    navigate('/vendor/login');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image size must be less than 5MB');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    setNewItem({ ...newItem, photo: '' });
  };

  const handleCloseModal = () => {
    setShowAddItemModal(false);
    setEditingItem(null);
    setNewItem({ name: '', category: 'Food', type: 'Veg', price: '', stock: '', photo: '' });
    setSelectedFile(null);
    setPhotoPreview(null);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItem({
      name: item.name,
      category: item.category,
      type: item.type || 'Veg',
      price: item.price.toString(),
      stock: item.stock.toString(),
      photo: item.photo || ''
    });
    setPhotoPreview(item.photo || null);
    setShowAddItemModal(true);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    
    if (!newItem.name || !newItem.price || !newItem.stock) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setUploadProgress(editingItem ? 'Updating...' : 'Uploading...');
    
    try {
      let photoUrl = newItem.photo; // Keep existing photo if no new file
      
      // Upload photo to Cloudinary if file is selected
      if (selectedFile) {
        setUploadProgress('Uploading image...');
        const uploadResult = await uploadVendorMenuItem(selectedFile);
        photoUrl = uploadResult.secure_url;
      }

      const itemData = {
        ...newItem,
        photo: photoUrl
      };

      if (editingItem) {
        // Update existing item
        setUploadProgress('Updating item...');
        await updateMenuItem(editingItem.id, itemData);
        setMenuItems(menuItems.map(item =>
          item.id === editingItem.id ? { ...item, ...itemData } : item
        ));
      } else {
        // Create new item
        setUploadProgress('Creating item...');
        const createdItem = await createMenuItem(vendor.id, itemData);
        setMenuItems([...menuItems, createdItem]);
      }
      
      // Reset form and switch to items view
      setShowAddItemModal(false);
      setCurrentView('items');
      setEditingItem(null);
      setNewItem({ name: '', category: 'Food', type: 'Veg', price: '', stock: '', photo: '' });
      setSelectedFile(null);
      setPhotoPreview(null);
      setUploadProgress(null);
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Failed to save item: ' + error.message);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await deleteMenuItem(itemId);
      setMenuItems(menuItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  // Cart management functions
  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.10; // 10% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleConfirmOrder = async () => {
    if (!customerPhone) {
      alert('Please enter customer phone number');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        vendorId: vendor.id,
        items: cart.map(item => ({
          itemId: item.id,
          name: item.name,
          price: parseFloat(item.price),
          quantity: item.quantity,
          photo: item.photo || ''
        })),
        subtotal: calculateSubtotal(),
        tax: calculateTax(),
        total: calculateTotal(),
        tableNumber: tableNumber || null,
        customerPhone: customerPhone,
        paymentMethod: paymentMethod
      };

      await createOrder(orderData);
      
      // Clear cart, table number, and checkout data
      setCart([]);
      setTableNumber('');
      setCustomerPhone('');
      setPaymentMethod('Cash');
      setShowCheckoutModal(false);
      alert('Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  // Filter items based on search and category
  const getFilteredItems = () => {
    return menuItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  };

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#15151b' }}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const colors = {
    bg: '#15151b',
    sidebar: '#1b1b23',
    card: '#212129',
    card2: '#26262f',
    border: '#33333f',
    text: '#f5f5f7',
    textSub: '#8d8d9c',
    accent: '#f2574f',
    accentSoft: 'rgba(242,87,79,0.16)',
    input: '#1c1c25'
  };

  return (
    <div className="min-h-screen" style={{ background: colors.bg, color: colors.text, fontFamily: "'Manrope', sans-serif" }}>
      {/* Top Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        padding: '12px 24px',
        background: colors.sidebar,
        borderBottom: `1px solid ${colors.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 15,
        height: '64px'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: colors.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 6px 14px -4px ${colors.accentSoft}`
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M7 3v6M7 3c-1.4 0-2.3 1.6-2.3 3.5S5.6 10 7 10M7 10v11M17 3c-2 0-3.5 2.4-3.5 5.5S15 14 17 14v10" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '0.1px' }}>CCPL Vendor</span>
        </div>

        {/* Navigation Pills */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          background: colors.card2,
          borderRadius: '999px',
          padding: '4px',
          flex: 1,
          justifyContent: 'center'
        }}>
          {[
            { id: 'order', label: 'Order', icon: 'M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V9.5Z' },
            { id: 'items', label: 'Items', icon: 'M3.5 3.5h7v7h-7zM13.5 3.5h7v7h-7zM3.5 13.5h7v7h-7zM13.5 13.5h7v7h-7z' },
            { id: 'history', label: 'History', icon: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 7.5V12l3 2' },
            { id: 'analytics', label: 'Analytics', icon: 'M4 20V10M12 20V4M20 20v-7' }
          ].map(nav => (
            <button
              key={nav.id}
              onClick={() => setCurrentView(nav.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '9px 16px',
                border: currentView === nav.id ? '1px solid rgba(255,255,255,0.28)' : '1px solid transparent',
                borderRadius: '999px',
                cursor: 'pointer',
                background: currentView === nav.id ? `linear-gradient(160deg, rgba(242,87,79,0.9), rgba(242,87,79,0.68))` : 'transparent',
                backdropFilter: currentView === nav.id ? 'blur(10px)' : 'none',
                boxShadow: currentView === nav.id ? `0 6px 16px -6px ${colors.accentSoft}, inset 0 1px 0 rgba(255,255,255,0.35)` : 'none',
                color: currentView === nav.id ? '#ffffff' : colors.textSub,
                fontSize: '13.5px',
                fontWeight: currentView === nav.id ? 700 : 600,
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d={nav.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{nav.label}</span>
            </button>
          ))}
        </nav>

        {/* Profile and Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: colors.accentSoft,
              color: colors.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '12px'
            }}>
              {vendor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700 }}>{vendor.name}</div>
              <div style={{ fontSize: '10.5px', color: colors.textSub }}>{vendor.category}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              border: `1px solid ${colors.border}`,
              background: 'transparent',
              color: colors.accent,
              fontWeight: 700,
              fontSize: '13px',
              padding: '10px 16px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px 28px' }}>
        {/* ORDER SCREEN */}
        {currentView === 'order' && (
          <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 140px)' }}>
            {/* Left: Menu Items */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: colors.text }}>{vendor?.name || 'Vendor'}</h1>
                <p style={{ fontSize: '13px', color: colors.textSub, marginTop: '2px' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Search */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: colors.input,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search menu here..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: colors.text,
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Category Filters */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                {['All', 'Food', 'Drink', 'Other'].map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      padding: '10px 20px',
                      background: selectedCategory === category ? colors.accent : colors.card,
                      border: `1px solid ${selectedCategory === category ? colors.accent : colors.border}`,
                      borderRadius: '10px',
                      color: selectedCategory === category ? '#fff' : colors.text,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Menu Items Grid */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px',
                paddingBottom: '20px',
                alignContent: 'start',
                gridAutoRows: 'max-content'
              }}>
                {getFilteredItems().map(item => {
                  const inCart = cart.find(c => c.id === item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => addToCart(item)}
                      style={{
                        position: 'relative',
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '14px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = colors.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      {inCart && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: colors.accent,
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {inCart.quantity}x
                        </div>
                      )}
                      {item.photo && (
                        <img
                          src={item.photo}
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            marginBottom: '10px'
                          }}
                        />
                      )}
                      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '6px' }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: colors.accent }}>
                          ₹{parseFloat(item.price).toFixed(2)}
                        </span>
                        <span style={{ fontSize: '11px', color: colors.textSub }}>
                          {item.stock} items
                        </span>
                      </div>
                    </div>
                  );
                })}
                {getFilteredItems().length === 0 && (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '40px',
                    color: colors.textSub,
                    fontSize: '14px'
                  }}>
                    {searchQuery ? `No menu items match "${searchQuery}"` : 'No menu items available'}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cart Panel */}
            <div style={{
              width: '380px',
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Cart Header */}
              <div style={{ marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: colors.text }}>Order</h2>
                <input
                  type="text"
                  placeholder="Table number (optional)"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '10px 12px',
                    background: colors.input,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Cart Items */}
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
                {cart.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: colors.textSub,
                    fontSize: '13px'
                  }}>
                    Tap a menu item to add it to this order.
                  </div>
                ) : (
                  cart.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '16px',
                        padding: '12px',
                        background: colors.cardHover,
                        borderRadius: '10px'
                      }}
                    >
                      {item.photo && (
                        <img
                          src={item.photo}
                          alt={item.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '8px'
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                          {item.name} ({item.quantity}x)
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: colors.input,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '6px',
                              color: colors.text,
                              fontSize: '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '13px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            style={{
                              width: '28px',
                              height: '28px',
                              background: colors.input,
                              border: `1px solid ${colors.border}`,
                              borderRadius: '6px',
                              color: colors.text,
                              fontSize: '16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{
                              marginLeft: 'auto',
                              padding: '6px 12px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: colors.accent }}>
                        ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Cart Summary */}
              {cart.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: colors.textSub }}>Sub Total</span>
                    <span style={{ color: colors.text }}>₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                    <span style={{ color: colors.textSub }}>Tax (10%)</span>
                    <span style={{ color: colors.text }}>₹{calculateTax().toFixed(2)}</span>
                  </div>
                  <div style={{ height: '1px', background: colors.border, marginBottom: '12px' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '16px', fontWeight: 700 }}>
                    <span style={{ color: colors.text }}>Total</span>
                    <span style={{ color: colors.accent }}>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: colors.accent,
                      border: 'none',
                      borderRadius: '10px',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ITEMS SCREEN */}
        {currentView === 'items' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Menu Items</h1>
                <p style={{ fontSize: '13px', color: colors.textSub, marginTop: '2px' }}>Manage dishes, prices and inventory</p>
              </div>
              <button
                onClick={() => setShowAddItemModal(true)}
                style={{
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: `linear-gradient(160deg, rgba(242,87,79,0.92), rgba(242,87,79,0.7))`,
                  backdropFilter: 'blur(10px)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '15px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: `0 10px 24px -10px ${colors.accentSoft}, inset 0 1px 0 rgba(255,255,255,0.3)`
                }}
              >
                + Add Item
              </button>
            </div>

            {/* Items Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {menuItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    position: 'relative',
                    background: colors.card,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '16px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.card2;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.card;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Item Photo */}
                  <div style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '14px',
                    background: colors.card2,
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}>
                    {item.photo ? (
                      <img src={item.photo} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: colors.textSub, fontSize: '12px' }}>No Photo</span>
                    )}
                  </div>

                  {/* Item Name */}
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{item.name}</div>

                  {/* Category */}
                  <div style={{ fontSize: '12px', color: colors.textSub, marginBottom: '8px' }}>{item.category}</div>

                  {/* Price and Stock */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: colors.accent }}>₹{parseFloat(item.price).toFixed(2)}</span>
                    <span style={{ fontSize: '12px', color: colors.textSub }}>{item.stock} in stock</span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${colors.border}`
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#4facf2',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79,172,242,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: colors.accent,
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(242,87,79,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: colors.textSub
                }}>
                  <p>No menu items yet. Click "+ Add Item" to create your first item.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {currentView === 'history' && (
          <div style={{ padding: '24px' }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px'
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.text, marginBottom: '4px' }}>
                  Order History
                </h2>
                <p style={{ fontSize: '13px', color: colors.textSub }}>
                  {orders.length} {orders.length === 1 ? 'order' : 'orders'} total
                </p>
              </div>
            </div>

            {/* Orders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {orders.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: colors.textSub
                }}>
                  <p>No orders yet.</p>
                </div>
              ) : (
                orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const orderTime = order.createdAt?.toDate ?
                    order.createdAt.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
                    'N/A';
                  
                  return (
                    <div
                      key={order.id}
                      style={{
                        background: colors.card,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Order Header - Clickable */}
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        style={{
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = colors.cardHover}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          {/* Order ID */}
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: colors.text }}>
                              #{order.id.slice(-6).toUpperCase()}
                            </div>
                            {order.tableNumber && (
                              <div style={{ fontSize: '12px', color: colors.textSub }}>
                                Table {order.tableNumber}
                              </div>
                            )}
                          </div>

                          {/* Item Count */}
                          <div style={{ fontSize: '13px', color: colors.textSub }}>
                            {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                          </div>

                          {/* Time */}
                          <div style={{ fontSize: '13px', color: colors.textSub }}>
                            {orderTime}
                          </div>

                          {/* Status */}
                          <div style={{
                            padding: '4px 12px',
                            background: order.status === 'completed' ? 'rgba(34,197,94,0.15)' :
                                       order.status === 'pending' ? 'rgba(251,191,36,0.15)' :
                                       'rgba(239,68,68,0.15)',
                            color: order.status === 'completed' ? '#22c55e' :
                                   order.status === 'pending' ? '#fbbf24' :
                                   '#ef4444',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            textTransform: 'capitalize'
                          }}>
                            {order.status}
                          </div>
                        </div>

                        {/* Total and Chevron */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: colors.text }}>
                            ₹{parseFloat(order.total).toFixed(2)}
                          </div>
                          <div style={{
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            color: colors.textSub
                          }}>
                            ▼
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div style={{
                          padding: '0 20px 20px 20px',
                          borderTop: `1px solid ${colors.border}`
                        }}>
                          {/* Customer Info */}
                          {(order.customerPhone || order.paymentMethod) && (
                            <div style={{
                              padding: '16px 0',
                              borderBottom: `1px solid ${colors.border}`,
                              display: 'flex',
                              gap: '24px',
                              fontSize: '13px'
                            }}>
                              {order.customerPhone && (
                                <div>
                                  <span style={{ color: colors.textSub }}>Phone: </span>
                                  <span style={{ color: colors.text, fontWeight: 600 }}>{order.customerPhone}</span>
                                </div>
                              )}
                              {order.paymentMethod && (
                                <div>
                                  <span style={{ color: colors.textSub }}>Payment: </span>
                                  <span style={{ color: colors.text, fontWeight: 600 }}>{order.paymentMethod}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Items List */}
                          <div style={{ padding: '16px 0' }}>
                            {order.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '8px 0',
                                  fontSize: '13px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: colors.textSub, fontWeight: 600 }}>
                                    {item.quantity}x
                                  </span>
                                  <span style={{ color: colors.text }}>
                                    {item.name}
                                  </span>
                                </div>
                                <span style={{ color: colors.text, fontWeight: 600 }}>
                                  ₹{(parseFloat(item.price) * item.quantity).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Summary */}
                          <div style={{
                            paddingTop: '16px',
                            borderTop: `1px solid ${colors.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '13px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: colors.textSub }}>Subtotal</span>
                              <span style={{ color: colors.text }}>₹{parseFloat(order.subtotal).toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: colors.textSub }}>Tax</span>
                              <span style={{ color: colors.text }}>₹{parseFloat(order.tax).toFixed(2)}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              paddingTop: '8px',
                              borderTop: `1px solid ${colors.border}`,
                              fontSize: '15px',
                              fontWeight: 700
                            }}>
                              <span style={{ color: colors.text }}>Total</span>
                              <span style={{ color: colors.accent }}>₹{parseFloat(order.total).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* OTHER SCREENS - Placeholder */}
        {currentView !== 'items' && currentView !== 'history' && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.textSub }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: colors.text, marginBottom: '8px' }}>
              {currentView.charAt(0).toUpperCase() + currentView.slice(1)}
            </h2>
            <p>This section is coming soon!</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px'
        }} onClick={handleCloseModal}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '20px' }}>
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>

            <form onSubmit={handleAddItem}>
              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Cheese Burger"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: colors.input,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                  Category *
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: colors.input,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="Food">Food</option>
                  <option value="Drink">Drink</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Type (Veg/Non-Veg) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: colors.textSub }}>
                  Type *
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['Veg', 'Non-Veg'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewItem({ ...newItem, type })}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: newItem.type === type ? colors.accent : colors.input,
                        border: `1px solid ${newItem.type === type ? colors.accent : colors.border}`,
                        borderRadius: '10px',
                        color: newItem.type === type ? '#fff' : colors.text,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{type === 'Veg' ? '🟢' : '🔴'}</span>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price and Stock */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="0.00"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: colors.input,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={newItem.stock}
                    onChange={(e) => setNewItem({ ...newItem, stock: e.target.value })}
                    placeholder="0"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: colors.input,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '10px',
                      color: colors.text,
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                  Photo (optional, max 5MB)
                </label>
                
                {!photoPreview ? (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                      id="photo-upload"
                    />
                    <label
                      htmlFor="photo-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '40px 20px',
                        background: colors.input,
                        border: `2px dashed ${colors.border}`,
                        borderRadius: '10px',
                        color: colors.textSub,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = colors.accent;
                        e.currentTarget.style.background = colors.cardHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = colors.border;
                        e.currentTarget.style.background = colors.input;
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
                        <div>Click to upload image</div>
                        <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                          Max size: 5MB
                        </div>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '32px',
                        height: '32px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        color: 'white',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {uploadProgress && (
                <div style={{
                  marginBottom: '20px',
                  padding: '12px',
                  background: colors.cardHover,
                  borderRadius: '8px',
                  color: colors.accent,
                  fontSize: '13px',
                  textAlign: 'center'
                }}>
                  {uploadProgress}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    background: `linear-gradient(160deg, rgba(242,87,79,0.92), rgba(242,87,79,0.7))`,
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? (editingItem ? 'Updating...' : 'Adding...') : (editingItem ? 'Update Item' : 'Add Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={() => setShowCheckoutModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.card,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: colors.text }}>
              Complete Order
            </h2>
            <p style={{ fontSize: '13px', color: colors.textSub, marginBottom: '24px' }}>
              Enter customer details to complete the order
            </p>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmOrder(); }}>
              {/* Customer Phone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: colors.textSub }}>
                  Customer Phone Number *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: colors.input,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Payment Method */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: colors.textSub }}>
                  Payment Method *
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['Cash', 'UPI', 'Card'].map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: paymentMethod === method ? colors.accent : colors.input,
                        border: `1px solid ${paymentMethod === method ? colors.accent : colors.border}`,
                        borderRadius: '10px',
                        color: paymentMethod === method ? '#fff' : colors.text,
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div style={{
                background: colors.cardHover,
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: colors.text }}>
                  Order Summary
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: colors.textSub }}>Items ({cart.length})</span>
                  <span style={{ color: colors.text }}>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                  <span style={{ color: colors.textSub }}>Tax (10%)</span>
                  <span style={{ color: colors.text }}>₹{calculateTax().toFixed(2)}</span>
                </div>
                <div style={{ height: '1px', background: colors.border, margin: '10px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
                  <span style={{ color: colors.text }}>Total</span>
                  <span style={{ color: colors.accent }}>₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'transparent',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '10px',
                    color: colors.text,
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: colors.accent,
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Placing Order...' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
