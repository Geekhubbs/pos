import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./Sales.css";

const API = "http://localhost:5000/api";
const TAX_RATE = 0.1;
const STORE_NAME = "My Store";

function Sales() {
  const navigate = useNavigate();
  const location = useLocation();
  const username = localStorage.getItem("username") || "User";
  const role = localStorage.getItem("role") || "guest";
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Read ?tab=history from URL to set initial tab
  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") === "history" ? "history" : "register";
  const [tab, setTab] = useState(initialTab);

  // Products & cart
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);

  // Sales history
  const [sales, setSales] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modals
  const [checkoutModal, setCheckoutModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(false);
  const [currentSale, setCurrentSale] = useState(null);

  // Checkout form
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState("mtn");
  const [isPolling, setIsPolling] = useState(false);
  const [isOtpRequired, setIsOtpRequired] = useState(false);
  const [momoOtp, setMomoOtp] = useState("");
  const [momoReference, setMomoReference] = useState("");
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (tab === "history") loadSales();
  }, [tab]);

  // ── Products ──
  async function loadProducts() {
    try {
      const res = await axios.get(`${API}/products`, { headers });
      const products = res.data;
      setAllProducts(products);
      setFilteredProducts(products);
      const cats = [...new Set(products.map((p) => p.category))].sort();
      setCategories(cats);
    } catch (err) {
      console.error("Products load failed", err);
    }
  }

  function filterCategory(cat) {
    setActiveCategory(cat);
    setSearch("");
    if (cat === "all") setFilteredProducts(allProducts);
    else setFilteredProducts(allProducts.filter((p) => p.category === cat));
  }

  function handleSearch(val) {
    setSearch(val);
    if (!val) {
      setFilteredProducts(
        activeCategory === "all"
          ? allProducts
          : allProducts.filter((p) => p.category === activeCategory),
      );
      return;
    }
    setFilteredProducts(
      allProducts.filter(
        (p) =>
          p.product_name.toLowerCase().includes(val.toLowerCase()) ||
          (p.barcode && p.barcode.includes(val)),
      ),
    );
  }

  // ── Cart ──
  function addToCart(product) {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          alert(
            `Only ${product.quantity} units available for ${product.product_name}`,
          );
          return prev;
        }
        return prev.map((i) =>
          i.product_id === product.product_id
            ? {
                ...i,
                quantity: i.quantity + 1,
                subtotal: (i.quantity + 1) * parseFloat(i.price),
              }
            : i,
        );
      }
      return [
        ...prev,
        { ...product, quantity: 1, subtotal: parseFloat(product.price) },
      ];
    });
  }

  function updateQty(product_id, delta) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === product_id
            ? {
                ...i,
                quantity: i.quantity + delta,
                subtotal: (i.quantity + delta) * parseFloat(i.price),
              }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function removeFromCart(product_id) {
    setCart((prev) => prev.filter((i) => i.product_id !== product_id));
  }

  function clearCart() {
    setCart([]);
    setDiscount(0);
  }

  // ── Totals ──
  const getSym = (c) => c === 'EUR' ? '€' : c === 'GBP' ? '£' : c === 'GHS' ? '₵' : '$';
  const ratesToGHS = { USD: 14.50, EUR: 15.80, GBP: 18.20, GHS: 1.00 };

  const subtotal = cart.reduce((sum, item) => {
    const rate = ratesToGHS[item.currency] || 1;
    return sum + (item.subtotal * rate);
  }, 0);

  const TAX_RATE = 0.10;
  const taxable = Math.max(0, subtotal - (parseFloat(discount) || 0));
  const tax = taxable * TAX_RATE;
  const grandTotal = taxable + tax;
  const change = parseFloat(amountPaid || 0) - grandTotal;
  const cartCurrency = '₵';

  // ── Checkout ──
  function openCheckout() {
    if (!cart.length) {
      alert("Cart is empty");
      return;
    }
    setPaymentMethod("Cash");
    setAmountPaid("");
    setCheckoutError("");
    setCheckoutModal(true);
  }

  async function saveSaleToDB(method, paid) {
    try {
      const user_id = JSON.parse(atob(token.split(".")[1])).user_id;
      const res = await axios.post(
        `${API}/sales`,
        {
          user_id,
          customer_id: null,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price: parseFloat(i.price),
          })),
          payment_method: method,
          amount_paid: parseFloat(paid),
        },
        { headers },
      );

      setCurrentSale({
        ...res.data,
        cart: [...cart],
        grandTotal,
        tax,
        subtotal,
        discount: parseFloat(discount || 0),
        paymentMethod: method,
        amountPaid: parseFloat(paid),
        change: Math.max(0, method === "Cash" ? parseFloat(paid) - grandTotal : 0),
      });
      setCheckoutModal(false);
      setReceiptModal(true);
    } catch (err) {
      setCheckoutError("Database save failed.");
    }
  }

  async function pollVerification(reference) {
    setIsPolling(true);
    setCheckoutError("");
    pollIntervalRef.current = setInterval(async () => {
      try {
        const verifyRes = await axios.post(`${API}/sales/verify-paystack`, { reference }, { headers });
        if (verifyRes.data.success) {
          clearInterval(pollIntervalRef.current);
          setIsPolling(false);
          saveSaleToDB("Mobile Money", grandTotal);
        } else if (verifyRes.data.status && !['pending', 'ongoing', 'processing', 'send_pin', 'send_otp', 'pay_offline'].includes(verifyRes.data.status)) {
          clearInterval(pollIntervalRef.current);
          setIsPolling(false);
          setCheckoutError(`Payment failed or cancelled: ${verifyRes.data.status}`);
        }
      } catch (err) {
        // Continue polling until timeout if there are temporary network errors
      }
    }, 5000);

    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        setIsPolling(false);
        setCheckoutError("Payment timed out. Please try again.");
      }
    }, 120000); // 2 minutes
  }

  async function processPayment() {
    if (paymentMethod === "Cash") {
      if (parseFloat(amountPaid || 0) < grandTotal) {
        setCheckoutError("Amount tendered is less than the total.");
        return;
      }
      saveSaleToDB("Cash", amountPaid || grandTotal);
    } else if (paymentMethod === "Mobile Money") {
      setCheckoutError("");
      if (!momoPhone || momoPhone.length < 9) {
        setCheckoutError("Please enter a valid phone number.");
        return;
      }
      setIsPolling(true);
      try {
        const paystackAmount = Math.round(grandTotal * 100);
        const res = await axios.post(`${API}/sales/charge-momo`, {
            amount: paystackAmount,
            phone: momoPhone,
            provider: momoProvider,
            email: `guest_${Date.now()}@paystack-pos.com`
        }, { headers });
        
        if (res.data.success && res.data.data.reference) {
             if (res.data.data.status === 'send_otp' || res.data.data.status === 'send_pin') {
                 setIsPolling(false);
                 setMomoReference(res.data.data.reference);
                 setIsOtpRequired(true);
             } else {
                 pollVerification(res.data.data.reference);
             }
        } else {
             setIsPolling(false);
             setCheckoutError("Could not initiate MoMo charge.");
        }
      } catch(err) {
        setIsPolling(false);
        setCheckoutError(err.response?.data?.message || "Error initiating MoMo charge.");
      }
    }
  }

  async function submitOtp() {
    if (!momoOtp) return setCheckoutError("Please enter the OTP or Voucher Code.");
    setIsPolling(true);
    setCheckoutError("");
    try {
      const res = await axios.post(`${API}/sales/submit-otp`, {
        otp: momoOtp,
        reference: momoReference
      }, { headers });
      
      if (res.data.success) {
        setIsOtpRequired(false);
        pollVerification(momoReference);
      } else {
        setIsPolling(false);
        setCheckoutError("Failed to submit OTP.");
      }
    } catch (err) {
      setIsPolling(false);
      setCheckoutError(err.response?.data?.message || "Error submitting OTP.");
    }
  }

  function cancelPayment() {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsPolling(false);
    setIsOtpRequired(false);
    setCheckoutError("Payment cancelled by cashier.");
  }

  function handlePhoneChange(e) {
    const num = e.target.value.replace(/\D/g, ""); // Allow only digits
    setMomoPhone(num);
    setCheckoutError("");

    if (num.length >= 3) {
      const prefix = num.substring(0, 3);
      if (['024', '054', '055', '059', '025', '053'].includes(prefix)) {
        setMomoProvider('mtn');
      } else if (['020', '050'].includes(prefix)) {
        setMomoProvider('vod');
      } else if (['027', '057', '026', '056'].includes(prefix)) {
        setMomoProvider('tgo');
      } else if (num.length >= 4) {
        setCheckoutError("Unrecognized network prefix. The number might be invalid.");
      }
    }
  }

  function newSale() {
    setCart([]);
    setDiscount(0);
    setCurrentSale(null);
    setReceiptModal(false);
    loadProducts();
  }

  // ── Sales History ──
  async function loadSales() {
    try {
      const res = await axios.get(`${API}/sales`, { headers });
      setSales(res.data);
    } catch (err) {
      console.error("Sales load failed", err);
    }
  }

  const filteredSales = sales.filter((s) => {
    if (!startDate && !endDate) return true;
    const d = new Date(s.date);
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate + "T23:59:59")) return false;
    return true;
  });

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <div className="sales-wrapper">
      {/* Navbar */}
      <nav className="sales-navbar">
        <div className="sales-brand">🛒 POS System</div>
        <div className="sales-nav-right">
          <span className="sales-username">👤 {username}</span>
          <span className="sales-role-badge">{role}</span>
          <button className="sales-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="sales-tabs">
        {role !== "normal" && (
          <button
            className="sales-tab"
            onClick={() => navigate("/dashboard")}
          >
            ⬅ Dashboard
          </button>
        )}
        <button
          className={`sales-tab ${tab === "register" ? "active" : ""}`}
          onClick={() => setTab("register")}
        >
          Register
        </button>
        <button
          className={`sales-tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          Sales History
        </button>
      </div>

      {/* ── Register Tab ── */}
      {tab === "register" && (
        <div className="pos-layout">
          {/* Products Panel */}
          <div className="pos-products">
            <div className="pos-search-bar">
              <input
                type="text"
                placeholder="Search product or scan barcode..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="category-filter">
              <button
                className={`filter-btn ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => filterCategory("all")}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`filter-btn ${activeCategory === cat ? "active" : ""}`}
                  onClick={() => filterCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="product-grid">
              {filteredProducts.length === 0 ? (
                <p className="no-products">No products found.</p>
              ) : (
                filteredProducts.map((p) => (
                  <div
                    key={p.product_id}
                    className={`product-card ${p.quantity <= 0 ? "out-of-stock" : ""}`}
                    onClick={() => p.quantity > 0 && addToCart(p)}
                  >
                    {p.image_url && <img src={p.image_url} className="product-image" alt={p.product_name} />}
                    <div className="product-name">{p.product_name}</div>
                    <div className="product-price">
                      {getSym(p.currency)}{parseFloat(p.price).toFixed(2)}
                    </div>
                    <div className="product-stock">Stock: {p.quantity}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Panel */}
          <div className="pos-cart">
            <div className="cart-header">
              <h3>Current Sale</h3>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="cart-empty">No items in cart</div>
              ) : (
                cart.map((item) => (
                  <div key={item.product_id} className="cart-item">
                    <img src={item.image_url || 'https://via.placeholder.com/40?text=Img'} className="cart-item-image" alt="" />
                    <div className="cart-item-name">{item.product_name}</div>
                    <div className="cart-item-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.product_id, -1)}
                      >
                        -
                      </button>
                      <span className="cart-item-qty">{item.quantity}</span>
                      <button
                        className="qty-btn"
                        onClick={() => updateQty(item.product_id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-price">
                      <div>{getSym(item.currency)}{item.subtotal.toFixed(2)}</div>
                      {item.currency !== 'GHS' && (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          (₵{(item.subtotal * (ratesToGHS[item.currency] || 1)).toFixed(2)})
                        </div>
                      )}
                    </div>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeFromCart(item.product_id)}
                    >
                      &times;
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="cart-totals">
              <div className="total-row">
                <span>Subtotal (GHS)</span>
                <span>{cartCurrency}{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Discount ({cartCurrency})</span>
                <input
                  className="discount-input"
                  type="number"
                  value={discount}
                  min="0"
                  step="0.01"
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="total-row">
                <span>Tax (10%)</span>
                <span>{cartCurrency}{tax.toFixed(2)}</span>
              </div>
              <div className="total-row grand-total">
                <span>Total</span>
                <span>{cartCurrency}{grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="cart-actions">
              <button className="cart-btn cart-btn-danger" onClick={clearCart}>
                Clear Cart
              </button>
              <button
                className="cart-btn cart-btn-success"
                onClick={openCheckout}
              >
                Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Tab ── */}
      {tab === "history" && (
        <div className="history-container">
          <div className="history-header">
            <h2 className="history-title">Sales History</h2>
            <div className="history-filters">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Sale #</th>
                  <th>Date</th>
                  <th>Cashier</th>
                  <th>Total</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      No sales found.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.sale_id}>
                      <td>#{s.sale_id}</td>
                      <td>{new Date(s.date).toLocaleString()}</td>
                      <td>{s.username}</td>
                      <td>${parseFloat(s.total_amount).toFixed(2)}</td>
                      <td>
                        <span className="s-badge s-badge-info">
                          {s.payment_method}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Checkout Modal ── */}
      {checkoutModal && (
        <div
          className="s-modal-overlay"
          onClick={() => {
            if (isPolling) cancelPayment();
            setCheckoutModal(false);
          }}
        >
          <div className="s-modal" onClick={(e) => e.stopPropagation()}>
            <div className="s-modal-header">
              <h3>Complete Payment</h3>
              <button
                className="s-modal-close"
                onClick={() => {
                  if (isPolling) cancelPayment();
                  setCheckoutModal(false);
                }}
              >
                &times;
              </button>
            </div>
            <div className="s-modal-body">
              <div className="checkout-summary">
                Total: <strong>{cartCurrency}{grandTotal.toFixed(2)}</strong>
              </div>
              <div className="s-form-group">
                <label>Payment Method</label>
                <div className="payment-methods">
                  {["Cash", "Mobile Money"].map((m) => (
                    <button
                      key={m}
                      className={`payment-btn ${paymentMethod === m ? "active" : ""}`}
                      onClick={() => {
                        setPaymentMethod(m);
                        setAmountPaid("");
                        setCheckoutError("");
                        setIsOtpRequired(false);
                        setMomoOtp("");
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              {paymentMethod === "Cash" && (
                <div className="s-form-group">
                  <label>Amount Tendered</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                  {parseFloat(amountPaid) > 0 && (
                    <div
                      className={`change-display ${change < 0 ? "change-insufficient" : "change-ok"}`}
                    >
                      Change: <strong>${Math.max(0, change).toFixed(2)}</strong>
                    </div>
                  )}
                </div>
              )}
              {paymentMethod === "Mobile Money" && !isOtpRequired && (
                <div className="s-form-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0541234567"
                    value={momoPhone}
                    onChange={handlePhoneChange}
                    disabled={isPolling}
                  />
                  <label style={{ marginTop: '10px', display: 'block' }}>Network Provider</label>
                  <select 
                    value={momoProvider} 
                    onChange={(e) => setMomoProvider(e.target.value)} 
                    disabled={isPolling}
                    className="discount-input"
                    style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                  >
                    <option value="mtn">MTN</option>
                    <option value="vod">Telecel/Vodafone</option>
                    <option value="tgo">AirtelTigo</option>
                  </select>
                </div>
              )}
              {paymentMethod === "Mobile Money" && isOtpRequired && (
                <div className="s-form-group">
                  <label>Enter OTP / Voucher Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 123456"
                    value={momoOtp}
                    onChange={(e) => setMomoOtp(e.target.value)}
                    disabled={isPolling}
                  />
                  <button 
                    className="s-btn s-btn-success" 
                    onClick={submitOtp}
                    disabled={isPolling}
                    style={{ marginTop: '10px', width: '100%' }}
                  >
                    {isPolling ? "Verifying..." : "Submit Code"}
                  </button>
                </div>
              )}
              {checkoutError && <div className="s-error">{checkoutError}</div>}
              {isPolling && (
                <div style={{ textAlign: "center", color: "#0ea5e9", margin: "10px 0", fontWeight: "bold" }}>
                  ⏳ Waiting for customer to enter PIN...
                </div>
              )}
            </div>
            <div className="s-modal-footer">
              <button
                className="s-btn s-btn-outline"
                onClick={() => {
                  if (isPolling) {
                    cancelPayment();
                  } else {
                    setCheckoutModal(false);
                  }
                }}
              >
                Cancel
              </button>
              {!isOtpRequired && (
                <button 
                  className="s-btn s-btn-success" 
                  onClick={processPayment}
                  disabled={isPolling}
                >
                  {isPolling ? "Processing..." : "Confirm Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {receiptModal && currentSale && (
        <div className="s-modal-overlay">
          <div className="s-modal">
            <div className="s-modal-header">
              <h3>Receipt</h3>
            </div>
            <div className="s-modal-body">
              <div className="receipt">
                <div className="receipt-header">
                  <h2>{STORE_NAME}</h2>
                  <p>Official Receipt</p>
                </div>
                <hr className="receipt-divider" />
                <div>
                  <strong>Transaction #:</strong> {currentSale.sale_id}
                </div>
                <div>
                  <strong>Date:</strong> {new Date().toLocaleString()}
                </div>
                <div>
                  <strong>Cashier:</strong> {username}
                </div>
                <hr className="receipt-divider" />
                {currentSale.cart.map((i) => {
                  const rate = ratesToGHS[i.currency] || 1;
                  const itemGHS = i.subtotal * rate;
                  return (
                    <div key={i.product_id} className="receipt-item">
                      <span>
                        {i.product_name} x{i.quantity} @ {getSym(i.currency)}
                        {parseFloat(i.price).toFixed(2)}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <div>{getSym(i.currency)}{i.subtotal.toFixed(2)}</div>
                        {i.currency !== "GHS" && (
                          <div style={{ fontSize: "10px", color: "#64748b" }}>
                            (₵{itemGHS.toFixed(2)})
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <hr className="receipt-divider" />
                <div className="receipt-totals">
                  <div className="receipt-total-row">
                    <span>Subtotal</span>
                    <span>{cartCurrency}{currentSale.subtotal.toFixed(2)}</span>
                  </div>
                  {currentSale.discount > 0 && (
                    <div className="receipt-total-row">
                      <span>Discount</span>
                      <span>-{cartCurrency}{currentSale.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="receipt-total-row">
                    <span>Tax (10%)</span>
                    <span>{cartCurrency}{currentSale.tax.toFixed(2)}</span>
                  </div>
                  <div className="receipt-total-row final">
                    <span>TOTAL</span>
                    <span>{cartCurrency}{currentSale.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="receipt-total-row">
                    <span>Payment</span>
                    <span>{currentSale.paymentMethod}</span>
                  </div>
                  {currentSale.paymentMethod === "Cash" && (
                    <div className="receipt-total-row">
                      <span>Amount Paid</span>
                      <span>{cartCurrency}{currentSale.amountPaid.toFixed(2)}</span>
                    </div>
                  )}
                  {currentSale.paymentMethod === "Cash" &&
                    currentSale.change > 0 && (
                      <div className="receipt-total-row">
                        <span>Change</span>
                        <span>{cartCurrency}{currentSale.change.toFixed(2)}</span>
                      </div>
                    )}
                </div>
                <hr className="receipt-divider" />
                <div className="receipt-footer">
                  Thank you for shopping at {STORE_NAME}!
                </div>
              </div>
            </div>
            <div className="s-modal-footer">
              <button
                className="s-btn s-btn-outline"
                onClick={() => window.print()}
              >
                Print
              </button>
              <button className="s-btn s-btn-primary" onClick={newSale}>
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;
